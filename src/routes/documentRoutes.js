/**
 * @fileoverview Document API routes for Wiki application
 * Handles document CRUD operations, content management, and file operations
 *
 * @author NooblyJS Core Team
 * @version 1.0.14
 * @since 1.0.0
 */

'use strict';
const path = require('path');
const mime = require('mime-types');

/**
 * Configures and registers document routes with the Express application.
 *
 * @param {Object} options - Configuration options object
 * @param {Object} eventEmitter - Event emitter for logging and notifications
 * @param {Object} services - NooblyJS Core services (dataManager, filing, cache, logger, queue, search)
 * @return {void}
 */
module.exports = (options, eventEmitter, services) => {
  
  const app = options.app;
  const { dataManager, filing, cache, logger, queue, search } = services;

  // Helper function to resolve document paths using space configuration
  async function getDocumentAbsolutePath(spaceName, documentPath) {
    const spaces = await dataManager.read('spaces');
    const space = spaces.find(s => s.name === spaceName);

    if (!space) {
      throw new Error('Space not found');
    }

    let documentsDir, absolutePath;

    if (space.path) {
      // Use the absolute path from space configuration
      documentsDir = space.path;

      // Check if documentPath is already absolute (legacy documents)
      if (path.isAbsolute(documentPath)) {
        absolutePath = documentPath;
      } else {
        // documentPath is relative to space directory
        absolutePath = path.resolve(documentsDir, documentPath);
      }
    } else {
      // Fallback to old behavior for backward compatibility
      documentsDir = path.resolve(__dirname, '../../../documents');
      absolutePath = path.resolve(documentsDir, spaceName, documentPath);
    }

    // Security check: ensure the path is within the designated space directory
    if (!absolutePath.startsWith(documentsDir)) {
      throw new Error('Access denied: path outside space directory');
    }

    return { documentsDir, absolutePath };
  }

  // Utility function to determine file category and viewer type
  function getFileTypeInfo(filePath, mimeType) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);

    // File category mappings
    const categories = {
      // PDF files
      pdf: {
        category: 'pdf',
        viewer: 'pdf',
        extensions: ['.pdf'],
        mimes: ['application/pdf']
      },

      // Images
      image: {
        category: 'image',
        viewer: 'image',
        extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico'],
        mimes: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/svg+xml', 'image/webp', 'image/x-icon']
      },

      // Text files
      text: {
        category: 'text',
        viewer: 'text',
        extensions: ['.txt', '.csv', '.dat', '.log', '.ini', '.cfg', '.conf'],
        mimes: ['text/plain', 'text/csv']
      },

      // Markdown
      markdown: {
        category: 'markdown',
        viewer: 'markdown',
        extensions: ['.md', '.markdown'],
        mimes: ['text/markdown']
      },

      // Code files
      code: {
        category: 'code',
        viewer: 'code',
        extensions: ['.js', '.ts', '.jsx', '.tsx', '.vue', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.r', '.m', '.mm', '.pl', '.sh', '.bash', '.ps1', '.bat', '.cmd'],
        mimes: ['text/javascript', 'application/javascript', 'text/typescript', 'text/x-python', 'text/x-java-source', 'text/x-c', 'text/x-c++', 'text/x-csharp']
      },

      // Web files (HTML, CSS)
      web: {
        category: 'web',
        viewer: 'code',
        extensions: ['.html', '.htm', '.css', '.scss', '.sass', '.less'],
        mimes: ['text/html', 'text/css']
      },

      // Data/Configuration files
      data: {
        category: 'data',
        viewer: 'code',
        extensions: ['.json', '.xml', '.yaml', '.yml', '.toml', '.properties'],
        mimes: ['application/json', 'application/xml', 'text/xml', 'application/yaml', 'application/x-yaml']
      }
    };

    // Check by extension first, then MIME type
    for (const [key, info] of Object.entries(categories)) {
      if (info.extensions.includes(ext) || info.mimes.includes(mimeType)) {
        return {
          category: info.category,
          viewer: info.viewer,
          extension: ext,
          mimeType: mimeType,
          fileName: fileName
        };
      }
    }

    // Default fallback
    return {
      category: 'other',
      viewer: 'default',
      extension: ext,
      mimeType: mimeType,
      fileName: fileName
    };
  }

  // Get all documents
  app.get('/applications/wiki/api/documents', async (req, res) => {
    try {
      // Check cache first
      const cacheKey = 'wiki:documents:list';
      let documents = await cache.get(cacheKey);

      if (!documents) {
        // Load from dataServe using the new container-based approach
        try {
          documents = await dataManager.read('documents');
          if (!documents) documents = [];

          // Cache for 5 minutes
          await cache.put(cacheKey, documents, 300);
          logger.info(`Loaded ${documents.length} documents from dataServe and cached`);
        } catch (error) {
          logger.warn('Could not load documents from dataServe:', error.message);
          documents = [];
        }
      } else {
        logger.info('Loaded documents from cache');
      }

      res.json(documents);
    } catch (error) {
      logger.error('Error fetching documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  // Get recent activity (documents and spaces)
  app.get('/applications/wiki/api/recent', async (req, res) => {
    try {
      const cacheKey = 'wiki:recent:activity';
      let recent = await cache.get(cacheKey);

      if (!recent) {
        const documents = await dataManager.read('documents');
        const spaces = await dataManager.read('spaces');

        // Combine and sort by modification date
        const recentItems = [
          ...documents.map(doc => ({ ...doc, type: 'document' })),
          ...spaces.map(space => ({ ...space, type: 'space' }))
        ].sort((a, b) => new Date(b.modifiedAt || b.updatedAt) - new Date(a.modifiedAt || a.updatedAt))
         .slice(0, 10);

        recent = recentItems;
        await cache.put(cacheKey, recent, 300); // 5 minutes
        logger.info('Generated recent activity list');
      }

      res.json(recent);
    } catch (error) {
      logger.error('Error fetching recent activity:', error);
      res.status(500).json({ error: 'Failed to fetch recent activity' });
    }
  });

  // Read document content by file path (must be before :id route)
  app.get('/applications/wiki/api/documents/content', async (req, res) => {
    try {
      const { path: documentPath, spaceName, metadata, download } = req.query;
      
      if (!documentPath || !spaceName) {
        return res.status(400).json({ error: 'Document path and space name are required' });
      }

      let documentsDir, absolutePath;
      try {
        ({ documentsDir, absolutePath } = await getDocumentAbsolutePath(spaceName, documentPath));
      } catch (pathError) {
        logger.warn(`Path resolution failed: ${pathError.message}`);
        return res.status(pathError.message.includes('Space not found') ? 404 : 403).json({
          error: pathError.message
        });
      }

      try {
        const fs = require('fs').promises;
        const stats = await fs.stat(absolutePath);
        const contentType = mime.lookup(absolutePath) || 'application/octet-stream';
        const fileTypeInfo = getFileTypeInfo(documentPath, contentType);

        // If only metadata is requested, return file info without content
        if (metadata === 'true') {
          return res.json({
            ...fileTypeInfo,
            size: stats.size,
            modified: stats.mtime,
            created: stats.birthtime,
            path: documentPath,
            spaceName: spaceName
          });
        }

        // Determine encoding based on file category
        let encoding = null;
        if (['text', 'markdown', 'code', 'web', 'data'].includes(fileTypeInfo.category) ||
            contentType.startsWith('text/') ||
            contentType === 'application/json' ||
            contentType === 'application/xml') {
          encoding = 'utf8';
        }

        // Read the file content
        const content = await fs.readFile(absolutePath, { encoding });

        // Return enhanced response with metadata
        if (req.query.enhanced === 'true') {
          res.json({
            content: encoding ? content : content.toString('base64'),
            metadata: {
              ...fileTypeInfo,
              size: stats.size,
              modified: stats.mtime,
              created: stats.birthtime,
              path: documentPath,
              spaceName: spaceName,
              encoding: encoding || 'base64'
            }
          });
        } else {
          // Legacy response for backward compatibility
          res.setHeader('Content-Type', contentType);

          // Handle download functionality
          if (download === 'true') {
            res.setHeader('Content-Disposition', `attachment; filename="${fileTypeInfo.fileName}"`);
          }

          res.send(content);
        }
      } catch (fileError) {
        logger.warn(`Failed to read file ${documentPath}: ${fileError.message}`);

        if (metadata === 'true' || req.query.enhanced === 'true') {
          return res.status(404).json({
            error: 'File not found',
            message: `The file ${documentPath} could not be found or read.`,
            details: fileError.message
          });
        }

        // Return a friendly error message as markdown content
        const errorContent = `# File Not Found\n\nThe requested document \
${documentPath}\
 could not be found or read.\n\n**Possible reasons:**\n- File has been moved or deleted\n- Permission issues\n- File path is incorrect\n\nPlease check the file location and try again.`;

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(404).send(errorContent);
      }
    } catch (error) {
      logger.error('Error in document content endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Generate PDF preview thumbnail
  app.get('/applications/wiki/api/documents/pdf-preview', async (req, res) => {
    try {
      const { path: documentPath, spaceName, page = 1 } = req.query;

      if (!documentPath || !spaceName) {
        return res.status(400).json({ error: 'Document path and space name are required' });
      }

      logger.info(`Generating PDF preview for: ${documentPath} in space: ${spaceName}`);

      let documentsDir, absolutePath;
      try {
        ({ documentsDir, absolutePath } = await getDocumentAbsolutePath(spaceName, documentPath));
      } catch (pathError) {
        logger.warn(`Path resolution failed: ${pathError.message}`);
        return res.status(pathError.message.includes('Space not found') ? 404 : 403).json({
          error: pathError.message
        });
      }

      // Verify it's a PDF file
      const ext = path.extname(absolutePath).toLowerCase();
      if (ext !== '.pdf') {
        return res.status(400).json({ error: 'File is not a PDF' });
      }

      try {
        const fs = require('fs').promises;
        const { pdf } = require('pdf-to-img');

        // Check if file exists
        await fs.stat(absolutePath);

        // Generate preview thumbnail (first page, scale 2 for quality)
        const document = await pdf(absolutePath, { scale: 2 });
        const pageBuffer = await document.getPage(parseInt(page));

        // Send the image
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        res.send(pageBuffer);

        logger.info(`Successfully generated PDF preview for ${documentPath}`);
      } catch (error) {
        logger.error(`Failed to generate PDF preview: ${error.message}`);
        res.status(500).json({
          error: 'Failed to generate PDF preview',
          message: error.message
        });
      }
    } catch (error) {
      logger.error('Error in PDF preview endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get recent documents
  app.get('/applications/wiki/api/documents/recent', async (req, res) => {
    try {
      const cacheKey = 'wiki:documents:recent';
      let recentDocs = await cache.get(cacheKey);

      if (!recentDocs) {
        const documents = await dataManager.read('documents');
        recentDocs = documents
          .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt))
          .slice(0, 10);

        await cache.put(cacheKey, recentDocs, 300); // 5 minutes
        logger.info('Generated recent documents list');
      }

      res.json(recentDocs);
    } catch (error) {
      logger.error('Error fetching recent documents:', error);
      res.status(500).json({ error: 'Failed to fetch recent documents' });
    }
  });

  // Get popular documents
  app.get('/applications/wiki/api/documents/popular', async (req, res) => {
    try {
      const cacheKey = 'wiki:documents:popular';
      let popularDocs = await cache.get(cacheKey);

      if (!popularDocs) {
        const documents = await dataManager.read('documents');
        popularDocs = documents
          .sort((a, b) => (b.views || 0) - (a.views || 0))
          .slice(0, 10);

        await cache.put(cacheKey, popularDocs, 600); // 10 minutes - less frequent updates
        logger.info('Generated popular documents list');
      }

      res.json(popularDocs);
    } catch (error) {
      logger.error('Error fetching popular documents:', error);
      res.status(500).json({ error: 'Failed to fetch popular documents' });
    }
  });

  // Get document by ID
  app.get('/applications/wiki/api/documents/:id', async (req, res) => {
    try {
      const docId = parseInt(req.params.id);
      const cacheKey = `wiki:document:${docId}:full`;

      let document = await cache.get(cacheKey);

      if (!document) {
        // Get document metadata from dataServe
        const allDocuments = await dataManager.read('documents');
        const docMeta = allDocuments.find(doc => doc.id === docId);

        if (!docMeta) {
          return res.status(404).json({ error: 'Document not found' });
        }

        // Get document content from filing service
        const filePath = `documents/${docId}.md`;
        let content = '';

        try {
          const rawContent = await filing.read(filePath);
          content = Buffer.isBuffer(rawContent) ? rawContent.toString('utf8') : rawContent;
          logger.info(`Loaded document content for ${docId} from filing service`);
        } catch (error) {
          logger.warn(`No content file found for document ${docId}, using default content`);
          // Default content for documents without files
          content = `# ${docMeta.title}\n\n${docMeta.excerpt || 'No content available yet.'}\n\nThis document is ready for editing.`;

          // Create the file with default content
          queue.enqueue({
            type: 'createDocumentFile',
            documentId: docId,
            content: content
          });
        }

        document = {
          ...docMeta,
          content: content
        };

        // Increment view count
        docMeta.views = (docMeta.views || 0) + 1;
        docMeta.lastViewed = new Date().toISOString();

        // Update document metadata in background
        queue.enqueue({
          type: 'updateDocumentMetadata',
          documentId: docId,
          updates: { views: docMeta.views, lastViewed: docMeta.lastViewed }
        });

        // Cache the full document for 10 minutes
        await cache.put(cacheKey, document, 600);

        // Index document for search
        search.add(docId.toString(), {
          id: docId,
          title: docMeta.title,
          content: content,
          tags: docMeta.tags || [],
          spaceName: docMeta.spaceName,
          excerpt: docMeta.excerpt
        });
      }

      res.json(document);
    } catch (error) {
      logger.error('Error fetching document:', error);
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  });

  // Update document
  app.put('/applications/wiki/api/documents', async (req, res) => {
    try {
      const { id, title, content, spaceId, tags } = req.body;

      if (!id || !title) {
        return res.status(400).json({ success: false, message: 'Document ID and title are required' });
      }

      const docId = parseInt(id);

      // Get current documents
      const documents = await dataManager.read('documents') || [];
      const docIndex = documents.findIndex(doc => doc.id === docId);

      if (docIndex === -1) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }

      // Find space name if spaceId provided
      let spaceName = documents[docIndex].spaceName;
      if (spaceId && spaceId !== documents[docIndex].spaceId) {
        const spaces = await dataManager.read('spaces');
        const space = spaces.find(s => s.id === parseInt(spaceId));
        spaceName = space ? space.name : 'Unknown Space';
      }

      // Update document metadata
      const updatedDocument = {
        ...documents[docIndex],
        title,
        spaceId: spaceId ? parseInt(spaceId) : documents[docIndex].spaceId,
        spaceName,
        excerpt: content ? content.substring(0, 150).replace(/[#*`]/g, '') + (content.length > 150 ? '...' : '') : documents[docIndex].excerpt,
        modifiedAt: new Date().toISOString(),
        tags: tags || documents[docIndex].tags || []
      };

      documents[docIndex] = updatedDocument;

      // Save updated documents list
      await dataManager.write('documents', documents);

      // Update document content in filing service
      if (content !== undefined) {
        const filePath = `documents/${docId}.md`;
        await filing.create(filePath, content);
        logger.info(`Updated document content in ${filePath}`);
      }

      // Update search index
      search.add(docId.toString(), {
        id: docId,
        title,
        content: content || '',
        tags: tags || [],
        spaceName,
        excerpt: updatedDocument.excerpt
      });

      // Clear relevant caches
      await cache.delete('wiki:documents:list');
      await cache.delete('wiki:documents:recent');
      await cache.delete('wiki:recent:activity');
      await cache.delete(`wiki:document:${docId}:full`);
      if (updatedDocument.spaceId) {
        await cache.delete(`wiki:space:${updatedDocument.spaceId}:documents`);
      }

      logger.info(`Updated document: ${title} (ID: ${docId})`);

      res.json({ success: true, document: updatedDocument });
    } catch (error) {
      logger.error('Error updating document:', error);
      res.status(500).json({ success: false, message: 'Failed to update document' });
    }
  });

  // Save document content by file path
  app.put('/applications/wiki/api/documents/content', async (req, res) => {
    try {
      const { path: documentPath, spaceName, content } = req.body;

      if (!documentPath || !spaceName || content === undefined) {
        return res.status(400).json({ error: 'Document path, space name, and content are required' });
      }

      logger.info(`Saving document content to path: ${documentPath} in space: ${spaceName}`);

      let documentsDir, absolutePath;
      try {
        ({ documentsDir, absolutePath } = await getDocumentAbsolutePath(spaceName, documentPath));
      } catch (pathError) {
        logger.warn(`Path resolution failed: ${pathError.message}`);
        return res.status(pathError.message.includes('Space not found') ? 404 : 403).json({
          error: pathError.message
        });
      }

      try {
        const fs = require('fs').promises;

        // Ensure the directory exists
        const dir = path.dirname(absolutePath);
        await fs.mkdir(dir, { recursive: true });

        // Write the file content
        await fs.writeFile(absolutePath, content, 'utf8');

        // Get file stats for response
        const stats = await fs.stat(absolutePath);

        logger.info(`Successfully saved document to ${documentPath}`);

        // Update search index for searchable files
        const fileTypeInfo = getFileTypeInfo(documentPath, mime.lookup(absolutePath) || 'text/plain');
        if (['text', 'markdown', 'code', 'web', 'data'].includes(fileTypeInfo.category)) {
          // Clear search cache to refresh results
          await cache.delete('wiki:search:*');

          // Re-index this document
          setImmediate(() => {
            try {
              const SearchIndexer = require('../activities/searchIndexer');
              const searchIndexer = new SearchIndexer(logger, dataManager);
              searchIndexer.indexFile(absolutePath, {
                name: path.basename(documentPath),
                relativePath: documentPath,
                spaceName: spaceName
              });
            } catch (indexError) {
              logger.warn('Failed to update search index for saved file:', indexError.message);
            }
          });
        }

        res.json({
          success: true,
          message: 'File saved successfully',
          metadata: {
            size: stats.size,
            modified: stats.mtime,
            path: documentPath,
            spaceName: spaceName
          }
        });
      } catch (fileError) {
        logger.error(`Failed to save file ${documentPath}:`, fileError);
        res.status(500).json({
          error: 'Failed to save file',
          message: fileError.message
        });
      }
    } catch (error) {
      logger.error('Error in save document content endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Enhanced document creation to support templates and folder paths
  app.post('/applications/wiki/api/documents', async (req, res) => {
    try {
      const { title, content, spaceId, tags, folderPath, template, path: documentPath } = req.body;

      if (!title) {
        return res.status(400).json({ success: false, message: 'Document title is required' });
      }

      // Find space name if spaceId provided
      let spaceName = 'Personal';
      if (spaceId) {
        const spaces = await dataManager.read('spaces');
        const space = spaces.find(s => s.id === parseInt(spaceId));
        spaceName = space ? space.name : 'Unknown Space';
      }

      // Determine the file path - if it's a template, use the provided path
      let finalPath = documentPath;
      let finalContent = content;

      if (!finalPath) {
        // Generate path from title and folder
        const fileName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '.md';
        finalPath = folderPath ? `${folderPath}/${fileName}` : fileName;
      }

      // If no content provided but has template, load template content
      if (!finalContent && template) {
        finalContent = '# ' + title + '\n\nYour content goes here...';
      }

      // Create the file on disk
      let documentsDir, absolutePath;
      try {
        ({ documentsDir, absolutePath } = await getDocumentAbsolutePath(spaceName, finalPath));
      } catch (pathError) {
        logger.warn(`Path resolution failed: ${pathError.message}`);
        return res.status(pathError.message.includes('Space not found') ? 404 : 403).json({
          success: false,
          message: pathError.message
        });
      }

      try {
        const fs = require('fs').promises;

        // Ensure directory exists
        const dir = path.dirname(absolutePath);
        await fs.mkdir(dir, { recursive: true });

        // Write the file
        await fs.writeFile(absolutePath, finalContent || `# ${title}\n\nYour content goes here...`, 'utf8');

        logger.info(`Created document file: ${finalPath} in space: ${spaceName}`);

        // For templates, we don't need to add to documents list
        const isTemplate = finalPath.startsWith('.templates/');

        let newDocument = {
          success: true,
          message: isTemplate ? 'Template created successfully' : 'Document created successfully',
          path: finalPath,
          spaceName: spaceName
        };

        if (!isTemplate) {
          // Get next document ID and add to documents list
          const allDocuments = await dataManager.read('documents');
          let nextId = allDocuments.length > 0 ? Math.max(...allDocuments.map(d => d.id)) + 1 : 1;

          const docMetadata = {
            id: nextId,
            title,
            spaceId: spaceId ? parseInt(spaceId) : null,
            spaceName,
            path: finalPath,
            excerpt: finalContent ? finalContent.substring(0, 150).replace(/[#*`]/g, '') + (finalContent.length > 150 ? '...' : '') : 'No content yet',
            author: 'Current User',
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
            views: 0,
            tags: tags || []
          };

          // Add to documents list
          allDocuments.push(docMetadata);
          await dataManager.write('documents', allDocuments);

          // Clear relevant caches
          await cache.delete('wiki:documents:list');
          await cache.delete('wiki:documents:recent');
          await cache.delete('wiki:recent:activity');
          if (spaceId) {
            await cache.delete(`wiki:space:${spaceId}:documents`);
          }

          newDocument.document = docMetadata;

          logger.info(`Created new document: ${title} (ID: ${nextId})`);
        }

        res.json(newDocument);
      } catch (fileError) {
        logger.error(`Failed to create file ${finalPath}:`, fileError);
        res.status(500).json({
          success: false,
          message: 'Failed to create file: ' + fileError.message
        });
      }
    } catch (error) {
      logger.error('Error creating document:', error);
      res.status(500).json({ success: false, message: 'Failed to create document' });
    }
  });

  // Check if a document exists without reading it (useful for optional files like home.md)
  app.post('/applications/wiki/api/documents/exists', async (req, res) => {
    try {
      const { path: documentPath, spaceName } = req.body;

      if (!documentPath || !spaceName) {
        return res.status(400).json({ error: 'Document path and space name are required' });
      }

      let documentsDir, absolutePath;
      try {
        ({ documentsDir, absolutePath } = await getDocumentAbsolutePath(spaceName, documentPath));
      } catch (pathError) {
        return res.json({ exists: false });
      }

      try {
        const fs = require('fs').promises;
        await fs.access(absolutePath);
        res.json({ exists: true });
      } catch (error) {
        res.json({ exists: false });
      }
    } catch (error) {
      logger.error('Error checking document existence:', error);
      res.json({ exists: false });
    }
  });

  // Get document content with template support (POST version)
  app.post('/applications/wiki/api/documents/content', async (req, res) => {
    try {
      const { path: documentPath, spaceName } = req.body;

      if (!documentPath || !spaceName) {
        return res.status(400).json({ error: 'Document path and space name are required' });
      }

      logger.info(`Reading document content from path: ${documentPath} in space: ${spaceName}`);

      let documentsDir, absolutePath;
      try {
        ({ documentsDir, absolutePath } = await getDocumentAbsolutePath(spaceName, documentPath));
      } catch (pathError) {
        logger.warn(`Path resolution failed: ${pathError.message}`);
        return res.status(pathError.message.includes('Space not found') ? 404 : 403).json({
          error: pathError.message
        });
      }

      try {
        const fs = require('fs').promises;
        const content = await fs.readFile(absolutePath, 'utf8');
        const stats = await fs.stat(absolutePath);

        // Extract title from first line if it's a markdown heading
        let title = path.basename(documentPath, '.md');
        const firstLine = content.split('\n')[0];
        if (firstLine.startsWith('# ')) {
          title = firstLine.substring(2).trim();
        }

        const document = {
          title: title,
          content: content,
          path: documentPath,
          spaceName: spaceName,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          metadata: {
            viewer: documentPath.endsWith('.md') ? 'markdown' : 'text'
          }
        };

        logger.info(`Successfully read document: ${documentPath}`);
        res.json(document);
      } catch (fileError) {
        if (fileError.code === 'ENOENT') {
          logger.warn(`File not found: ${documentPath}`);
          res.status(404).json({ error: 'Document not found' });
        } else {
          logger.error(`Error reading file ${documentPath}:`, fileError);
          res.status(500).json({ error: 'Failed to read document' });
        }
      }
    } catch (error) {
      logger.error('Error in document content endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // File upload endpoint
  const multer = require('multer');
  const fs = require('fs').promises;

  // Configure multer for memory storage (we'll handle file writing ourselves)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB limit
    }
  });

  app.post('/applications/wiki/api/documents/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file provided' });
      }

      const { spaceId, folderPath = '' } = req.body;

      if (!spaceId) {
        return res.status(400).json({ success: false, error: 'Space ID is required' });
      }

      // Get space information
      const spaces = await dataManager.read('spaces');
      const space = spaces.find(s => s.id === parseInt(spaceId));

      if (!space) {
        return res.status(404).json({ success: false, error: 'Space not found' });
      }

      // Determine the target directory
      let targetDir;
      if (space.path) {
        targetDir = space.path;
      } else {
        const documentsDir = path.resolve(__dirname, '../../../documents');
        targetDir = path.resolve(documentsDir, space.name);
      }

      // Add folder path if specified
      if (folderPath) {
        targetDir = path.resolve(targetDir, folderPath);
      }

      // Ensure directory exists
      await fs.mkdir(targetDir, { recursive: true });

      // Write the file
      const fileName = req.file.originalname;
      const filePath = path.resolve(targetDir, fileName);
      await fs.writeFile(filePath, req.file.buffer);

      logger.info(`File uploaded: ${fileName} to ${targetDir}`);

      // Create document metadata for tracking
      const documentPath = folderPath ? `${folderPath}/${fileName}` : fileName;
      const documents = await dataManager.read('documents');

      // Check if document already exists
      const existingDoc = documents.find(d =>
        d.path === documentPath && d.spaceId === parseInt(spaceId)
      );

      if (existingDoc) {
        // Update existing document
        existingDoc.updatedAt = new Date().toISOString();
        existingDoc.size = req.file.size;
      } else {
        // Create new document entry
        const newDocument = {
          id: documents.length > 0 ? Math.max(...documents.map(d => d.id)) + 1 : 1,
          title: fileName.replace(/\.[^/.]+$/, ''), // Remove extension
          path: documentPath,
          spaceId: parseInt(spaceId),
          spaceName: space.name,
          tags: [],
          excerpt: `Uploaded file: ${fileName}`,
          size: req.file.size,
          mimeType: req.file.mimetype,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: req.user?.username || 'admin'
        };

        documents.push(newDocument);
      }

      await dataManager.write('documents', documents);

      res.json({
        success: true,
        message: 'File uploaded successfully',
        fileName: fileName,
        path: documentPath,
        size: req.file.size
      });

    } catch (error) {
      logger.error('Error uploading file:', error);
      res.status(500).json({ success: false, error: 'Failed to upload file' });
    }
  });

  // Toggle TODO checkbox in markdown files
  app.post('/applications/wiki/api/documents/toggle-todo', async (req, res) => {
    try {
      const { path: documentPath, spaceName, lineNumber } = req.body;

      if (!documentPath || !spaceName || lineNumber === undefined) {
        return res.status(400).json({ success: false, error: 'Document path, space name, and line number are required' });
      }

      logger.info(`Toggling TODO at line ${lineNumber} in ${documentPath} (space: ${spaceName})`);

      let documentsDir, absolutePath;
      try {
        ({ documentsDir, absolutePath } = await getDocumentAbsolutePath(spaceName, documentPath));
      } catch (pathError) {
        logger.warn(`Path resolution failed: ${pathError.message}`);
        return res.status(pathError.message.includes('Space not found') ? 404 : 403).json({
          success: false,
          error: pathError.message
        });
      }

      try {
        const fs = require('fs').promises;

        // Read the file content
        const content = await fs.readFile(absolutePath, 'utf8');
        const lines = content.split('\n');

        // Validate line number
        if (lineNumber < 0 || lineNumber >= lines.length) {
          return res.status(400).json({ success: false, error: 'Invalid line number' });
        }

        const line = lines[lineNumber];

        // Check if this line contains a TODO checkbox
        const uncheckedMatch = line.match(/^(\s*[-*])\s+\[\s\]/);
        const checkedMatch = line.match(/^(\s*[-*])\s+\[x\]/i);

        if (!uncheckedMatch && !checkedMatch) {
          return res.status(400).json({ success: false, error: 'Line does not contain a TODO checkbox' });
        }

        // Toggle the checkbox
        if (uncheckedMatch) {
          // Change [ ] to [x]
          lines[lineNumber] = line.replace(/\[\s\]/, '[x]');
        } else {
          // Change [x] to [ ]
          lines[lineNumber] = line.replace(/\[x\]/i, '[ ]');
        }

        // Write the updated content back to the file
        const updatedContent = lines.join('\n');
        await fs.writeFile(absolutePath, updatedContent, 'utf8');

        logger.info(`Successfully toggled TODO at line ${lineNumber} in ${documentPath}`);

        // Trigger search re-indexing asynchronously
        setImmediate(() => {
          try {
            const SearchIndexer = require('../activities/searchIndexer');
            const searchIndexer = new SearchIndexer(logger, dataManager);
            searchIndexer.indexFile(absolutePath, {
              name: path.basename(documentPath),
              relativePath: documentPath,
              spaceName: spaceName
            });
          } catch (indexError) {
            logger.warn('Failed to update search index after TODO toggle:', indexError.message);
          }
        });

        // Emit document change event for any listeners
        eventEmitter.emit('document:changed', {
          path: documentPath,
          spaceName: spaceName,
          absolutePath: absolutePath,
          type: 'todo-toggle'
        });

        res.json({
          success: true,
          message: 'TODO toggled successfully',
          lineNumber: lineNumber,
          newContent: lines[lineNumber]
        });

      } catch (fileError) {
        logger.error(`Failed to toggle TODO in ${documentPath}:`, fileError);
        res.status(500).json({
          success: false,
          error: 'Failed to toggle TODO: ' + fileError.message
        });
      }
    } catch (error) {
      logger.error('Error in toggle-todo endpoint:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Convert Office documents to Markdown
  app.post('/applications/wiki/api/documents/convert-to-markdown', async (req, res) => {
    try {
      const { path: documentPath, spaceName } = req.body;

      if (!documentPath || !spaceName) {
        return res.status(400).json({ success: false, error: 'Document path and space name are required' });
      }

      logger.info(`Converting document to markdown: ${documentPath} in space: ${spaceName}`);

      // Get the absolute path to the document
      let documentsDir, absolutePath;
      try {
        ({ documentsDir, absolutePath } = await getDocumentAbsolutePath(spaceName, documentPath));
      } catch (pathError) {
        logger.warn(`Path resolution failed: ${pathError.message}`);
        return res.status(pathError.message.includes('Space not found') ? 404 : 403).json({
          success: false,
          error: pathError.message
        });
      }

      // Check if file exists
      try {
        await fs.access(absolutePath);
      } catch (error) {
        return res.status(404).json({ success: false, error: 'File not found' });
      }

      // Determine file type and use appropriate processor
      const ext = path.extname(absolutePath).toLowerCase();
      let markdown = '';
      let processor = null;

      try {
        if (ext === '.docx' || ext === '.doc') {
          processor = require('../processing/docxprocessor');
          markdown = await processor.convertToMarkdown(absolutePath);
        } else if (ext === '.xlsx' || ext === '.xls') {
          processor = require('../processing/xlsxprocessor');
          markdown = await processor.convertToMarkdown(absolutePath);
        } else if (ext === '.pptx' || ext === '.ppt') {
          processor = require('../processing/pptxprocessor');
          markdown = await processor.convertToMarkdown(absolutePath);
        } else if (ext === '.pdf') {
          processor = require('../processing/pdfprocessor');
          markdown = await processor.convertToMarkdown(absolutePath);
        } else {
          return res.status(400).json({ success: false, error: 'Unsupported file type for conversion' });
        }
      } catch (conversionError) {
        logger.error(`Conversion failed: ${conversionError.message}`);
        return res.status(500).json({ success: false, error: `Conversion failed: ${conversionError.message}` });
      }

      // Create .originals folder if it doesn't exist
      const originalsDir = path.join(documentsDir, '.originals');
      await fs.mkdir(originalsDir, { recursive: true });

      // Copy original file to .originals folder
      const originalFileName = path.basename(absolutePath);
      const originalBackupPath = path.join(originalsDir, originalFileName);
      await fs.copyFile(absolutePath, originalBackupPath);

      logger.info(`Backed up original file to: ${originalBackupPath}`);

      // Create markdown file with same name but .md extension
      const fileNameWithoutExt = path.basename(documentPath, ext);
      const markdownFileName = `${fileNameWithoutExt}.md`;
      const markdownPath = path.join(path.dirname(absolutePath), markdownFileName);

      // Write markdown content
      await fs.writeFile(markdownPath, markdown, 'utf8');

      logger.info(`Created markdown file: ${markdownPath}`);

      // Delete the original file
      await fs.unlink(absolutePath);

      logger.info(`Deleted original file: ${absolutePath}`);

      // Calculate the relative path for the markdown file
      const relativePath = path.relative(documentsDir, markdownPath);
      const markdownRelativePath = relativePath.split(path.sep).join('/');

      res.json({
        success: true,
        message: 'Document converted to markdown successfully',
        markdownPath: markdownRelativePath,
        originalBackupPath: path.relative(documentsDir, originalBackupPath).split(path.sep).join('/')
      });

    } catch (error) {
      logger.error('Error converting document to markdown:', error);
      res.status(500).json({ success: false, error: 'Failed to convert document' });
    }
  });
};
