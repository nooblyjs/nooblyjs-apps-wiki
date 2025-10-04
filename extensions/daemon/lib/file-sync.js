const fs = require('fs').promises;
const path = require('path');

class FileSync {
  constructor(apiClient, stateManager, watchFolder, spaceId) {
    this.apiClient = apiClient;
    this.stateManager = stateManager;
    this.watchFolder = watchFolder;
    this.spaceId = spaceId;
    this.folderWatcher = null; // Will be set by daemon
  }

  /**
   * Set the folder watcher reference
   */
  setFolderWatcher(folderWatcher) {
    this.folderWatcher = folderWatcher;
  }

  /**
   * Upload a local file to the wiki space
   */
  async uploadFile(filePath) {
    try {
      console.log(`[Upload] Processing file: ${filePath}`);

      const fileName = path.basename(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const title = path.basename(filePath, ext);

      // Determine relative path from watch folder
      const relativePath = path.relative(this.watchFolder, filePath);

      // Check if file is already tracked
      const hasChanged = await this.stateManager.hasFileChanged(filePath);
      const isTracked = this.stateManager.isFileTracked(filePath);

      if (isTracked && !hasChanged) {
        console.log(`[Upload] File unchanged, skipping: ${filePath}`);
        return;
      }

      // Check if file is text-based (markdown, txt, etc.)
      const textExtensions = ['.md', '.markdown', '.txt', '.json', '.xml', '.html', '.css', '.js', '.ts', '.py', '.java', '.c', '.cpp'];
      const isTextFile = textExtensions.includes(ext);

      let content = '';

      if (isTextFile) {
        // Read text files as UTF-8
        content = await fs.readFile(filePath, 'utf8');

        // For the wiki API, we create/update using the document endpoint
        console.log(`[Upload] ${isTracked ? 'Updating' : 'Creating'} text document: ${relativePath}`);

        const result = await this.apiClient.createDocument({
          title: title,
          content: content,
          spaceId: this.spaceId,
          tags: ['daemon-sync'],
          path: relativePath,
        });

        // Track the file
        await this.stateManager.trackFile(filePath, relativePath);
        console.log(`[Upload] ✓ ${isTracked ? 'Updated' : 'Created'} document: ${relativePath}`);
      } else {
        // For binary files (docx, xlsx, pdf, etc.), use the upload endpoint
        console.log(`[Upload] ${isTracked ? 'Updating' : 'Uploading'} binary file: ${relativePath}`);

        const fileBuffer = await fs.readFile(filePath);

        // Use the file upload API
        const folderPath = path.dirname(relativePath);
        const result = await this.apiClient.uploadFile(fileBuffer, fileName, this.spaceId, folderPath !== '.' ? folderPath : '');

        // Track the file
        await this.stateManager.trackFile(filePath, relativePath);
        console.log(`[Upload] ✓ ${isTracked ? 'Updated' : 'Uploaded'} file: ${relativePath}`);
      }

    } catch (error) {
      console.error(`[Upload] Error uploading ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Download a document from wiki and save to local folder
   */
  async downloadDocument(document, spaceName) {
    try {
      console.log(`[Download] Processing document: ${document.title}`);
      console.log(`[Download] Document metadata:`, JSON.stringify(document, null, 2));

      // Determine local file path
      const fileName = document.filePath || document.path || `${this.sanitizeFilename(document.title)}.md`;
      const localFilePath = path.join(this.watchFolder, fileName);
      const absoluteFilePath = path.resolve(localFilePath);

      console.log(`[Download] Using fileName: ${fileName}, spaceName: ${spaceName}`);
      console.log(`[Download] Absolute file path: ${absoluteFilePath}`);

      // Get document content from wiki
      const content = await this.apiClient.getDocumentContent(fileName, spaceName);

      // Ensure the directory exists before writing
      const dirPath = path.dirname(localFilePath);
      await fs.mkdir(dirPath, { recursive: true });

      // Tell the watcher to ignore the next change for this file
      if (this.folderWatcher) {
        this.folderWatcher.ignoreFile(localFilePath);
      }

      // Write content to file
      await fs.writeFile(localFilePath, content, 'utf8');

      // Verify the file was written
      try {
        const stats = await fs.stat(localFilePath);
        console.log(`[Download] ✓ File written successfully: ${absoluteFilePath}`);
        console.log(`[Download]   Size: ${stats.size} bytes`);
        console.log(`[Download]   Modified: ${stats.mtime.toISOString()}`);
      } catch (verifyError) {
        console.error(`[Download] ✗ WARNING: File was not written! ${absoluteFilePath}`);
        throw verifyError;
      }

      // Track the file
      const hash = await this.stateManager.calculateFileHash(localFilePath);
      await this.stateManager.trackFile(localFilePath, fileName, hash);

    } catch (error) {
      console.error(`[Download] Error downloading document ${document.title}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete local file when document is removed from space
   */
  async deleteLocalFile(documentPath) {
    try {
      const fileName = path.basename(documentPath);
      const filePath = this.stateManager.getFilePath(fileName);

      if (!filePath) {
        console.log(`[Delete] No local file found for document ${fileName}`);
        return;
      }

      console.log(`[Delete] Removing local file: ${filePath}`);

      // Delete the file
      await fs.unlink(filePath);

      // Untrack the file
      await this.stateManager.untrackDocument(fileName);

      console.log(`[Delete] Deleted file: ${filePath}`);

    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`[Delete] File already deleted: ${filePath}`);
        await this.stateManager.untrackDocument(fileName);
      } else {
        console.error(`[Delete] Error deleting file for document ${documentPath}:`, error.message);
      }
    }
  }

  /**
   * Sync all documents from space to local folder
   */
  async syncFromSpace() {
    try {
      console.log('[Sync] Syncing from space to local folder...');

      // Get all documents from the space
      const documents = await this.apiClient.getSpaceDocuments(this.spaceId);

      // Get space name for API calls
      const spaces = await this.apiClient.getSpaces();
      const space = spaces.find(s => s.id === this.spaceId);

      if (!space) {
        console.error('[Sync] Space not found!');
        return;
      }

      const spaceName = space.name;

      // Track which documents are in the space (using filePath from document metadata)
      const spaceDocPaths = new Set(
        documents.map(doc => doc.filePath || doc.path || `${this.sanitizeFilename(doc.title)}.md`)
      );

      console.log('[Sync] Documents in space:', Array.from(spaceDocPaths));

      // Download new or updated documents
      for (const document of documents) {
        const docPath = document.filePath || document.path || `${this.sanitizeFilename(document.title)}.md`;
        const localFilePath = path.join(this.watchFolder, docPath);
        const isTracked = this.stateManager.isDocumentTracked(docPath);

        // Check if the file actually exists locally
        let fileExists = false;
        try {
          await fs.access(localFilePath);
          fileExists = true;
        } catch {
          fileExists = false;
        }

        if (!isTracked || !fileExists) {
          // New document or file is missing, download it
          console.log(`[Sync] ${!isTracked ? 'New document' : 'Missing file'}, downloading: ${document.title}`);
          await this.downloadDocument(document, spaceName);
        } else {
          // Check if document was updated on server
          const localLastSync = this.stateManager.state.documents[docPath]?.lastSync;

          if (document.updatedAt && new Date(document.updatedAt) > new Date(localLastSync)) {
            console.log(`[Sync] Document ${document.title} updated on server, downloading...`);
            await this.downloadDocument(document, spaceName);
          }
        }
      }

      // Remove local files for documents that no longer exist in space
      const trackedDocs = this.stateManager.getAllTrackedDocuments();
      console.log('[Sync] Tracked documents:', trackedDocs);

      for (const docPath of trackedDocs) {
        if (!spaceDocPaths.has(docPath)) {
          console.log(`[Sync] Document ${docPath} no longer in space, removing local file...`);
          await this.deleteLocalFile(docPath);
        }
      }

      console.log('[Sync] Space sync completed');

      // List all files in watch folder to verify
      await this.listWatchFolderContents();

    } catch (error) {
      console.error('[Sync] Error syncing from space:', error.message);
    }
  }

  /**
   * List all files in the watch folder
   */
  async listWatchFolderContents() {
    try {
      const absolutePath = path.resolve(this.watchFolder);
      console.log(`\n[Sync] === Watch Folder Contents ===`);
      console.log(`[Sync] Path: ${absolutePath}`);

      const files = await this.getAllFiles(this.watchFolder);

      if (files.length === 0) {
        console.log(`[Sync] ⚠️  Watch folder is EMPTY!`);
      } else {
        console.log(`[Sync] Found ${files.length} file(s):`);
        for (const file of files) {
          const stats = await fs.stat(file);
          const relativePath = path.relative(this.watchFolder, file);
          console.log(`[Sync]   - ${relativePath} (${stats.size} bytes)`);
        }
      }
      console.log(`[Sync] ===========================\n`);
    } catch (error) {
      console.error(`[Sync] Error listing watch folder:`, error.message);
    }
  }

  /**
   * Recursively get all files in a directory
   */
  async getAllFiles(dir) {
    const files = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...await this.getAllFiles(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    return files;
  }

  /**
   * Sanitize filename for safe file system usage
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-z0-9]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  /**
   * Ensure watch folder exists
   */
  async ensureWatchFolder() {
    try {
      const absolutePath = path.resolve(this.watchFolder);
      console.log(`[Init] Watch folder configured as: ${this.watchFolder}`);
      console.log(`[Init] Absolute watch folder path: ${absolutePath}`);

      await fs.access(this.watchFolder);
      console.log(`[Init] Watch folder exists: ${absolutePath}`);
    } catch (error) {
      const absolutePath = path.resolve(this.watchFolder);
      console.log(`[Init] Creating watch folder: ${absolutePath}`);
      await fs.mkdir(this.watchFolder, { recursive: true });
      console.log(`[Init] Watch folder created successfully`);
    }
  }
}

module.exports = FileSync;
