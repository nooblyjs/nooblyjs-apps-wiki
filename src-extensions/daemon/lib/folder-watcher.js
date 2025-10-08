const chokidar = require('chokidar');
const path = require('path');

class FolderWatcher {
  constructor(watchFolder, fileSync, spaceId) {
    this.watchFolder = watchFolder;
    this.fileSync = fileSync;
    this.spaceId = spaceId;
    this.watcher = null;
    this.ignoreNextChange = new Set(); // Track files to ignore on next change event
  }

  /**
   * Start watching the folder
   */
  async start() {
    console.log(`[Watcher] Starting folder watcher on: ${this.watchFolder}`);

    // Ensure watch folder exists
    await this.fileSync.ensureWatchFolder();

    // Initialize chokidar watcher
    this.watcher = chokidar.watch(this.watchFolder, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,      // don't trigger events for existing files on start
      awaitWriteFinish: {       // wait for file writes to complete
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });

    // Watch for file additions
    this.watcher.on('add', async (filePath) => {
      console.log(`[Watcher] File added: ${filePath}`);
      try {
        await this.fileSync.uploadFile(filePath);
      } catch (error) {
        console.error(`[Watcher] Error handling file add:`, error.message);
      }
    });

    // Watch for file changes
    this.watcher.on('change', async (filePath) => {
      // Check if we should ignore this change (file was just downloaded)
      if (this.ignoreNextChange.has(filePath)) {
        console.log(`[Watcher] Ignoring programmatic change: ${filePath}`);
        this.ignoreNextChange.delete(filePath);
        return;
      }

      console.log(`[Watcher] File changed: ${filePath}`);
      try {
        await this.fileSync.uploadFile(filePath);
      } catch (error) {
        console.error(`[Watcher] Error handling file change:`, error.message);
      }
    });

    // Watch for file deletions
    this.watcher.on('unlink', async (filePath) => {
      console.log(`[Watcher] File deleted: ${filePath}`);
      try {
        const fileName = path.basename(filePath);
        const documentId = this.fileSync.stateManager.getDocumentId(filePath);

        if (documentId) {
          await this.fileSync.apiClient.deleteDocument(fileName, this.spaceId);
          await this.fileSync.stateManager.untrackFile(filePath);
          console.log(`[Watcher] Deleted document ${fileName} from space`);
        }
      } catch (error) {
        console.error(`[Watcher] Error handling file deletion:`, error.message);
      }
    });

    // Watch for errors
    this.watcher.on('error', (error) => {
      console.error(`[Watcher] Watcher error:`, error);
    });

    console.log('[Watcher] Folder watcher started successfully');
  }

  /**
   * Stop watching the folder
   */
  async stop() {
    if (this.watcher) {
      console.log('[Watcher] Stopping folder watcher...');
      await this.watcher.close();
      this.watcher = null;
      console.log('[Watcher] Folder watcher stopped');
    }
  }

  /**
   * Check if file is a markdown file
   */
  isMarkdownFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.md' || ext === '.markdown';
  }

  /**
   * Mark a file to be ignored on next change event
   */
  ignoreFile(filePath) {
    this.ignoreNextChange.add(filePath);
    // Auto-cleanup after 2 seconds in case the change event never fires
    setTimeout(() => {
      this.ignoreNextChange.delete(filePath);
    }, 2000);
  }
}

module.exports = FolderWatcher;
