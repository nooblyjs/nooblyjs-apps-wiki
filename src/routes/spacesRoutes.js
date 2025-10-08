/**
 * @fileoverview Spaces API routes for Wiki application
 * Handles space management, folder trees, and templates
 *
 * @author NooblyJS Core Team
 * @version 1.0.14
 * @since 1.0.0
 */

'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * Load the spaces template configuration
 */
async function loadSpacesTemplate() {
  const templatePath = path.join(__dirname, '../initialisation/spaces-template.json');
  const data = await fs.readFile(templatePath, 'utf8');
  return JSON.parse(data);
}

/**
 * Check if a folder has existing content (non-hidden files/folders)
 */
async function folderHasContent(folderPath) {
  try {
    const files = await fs.readdir(folderPath);
    // Filter out hidden files (starting with .) and check if there's any content
    const visibleFiles = files.filter(file => !file.startsWith('.'));
    return visibleFiles.length > 0;
  } catch (err) {
    // Folder doesn't exist, so it has no content
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

/**
 * Create folder structure and sample files for a space based on template
 */
async function initializeSpaceFromTemplate(spaceTemplate, basePath, filing, logger, author) {
  // Normalize the space path to ensure consistency
  const spacePath = path.resolve(process.cwd(), basePath);
  const documents = [];

  // Check if folder already has content
  const hasContent = await folderHasContent(spacePath);

  if (hasContent) {
    logger.info(`Folder ${spacePath} already has content, skipping sample data creation`);
    return documents;
  }

  // Create .gitkeep in base directory
  const gitkeepPath = path.join(spacePath, '.gitkeep');
  await filing.create(gitkeepPath, '# Keep this directory in git\n');

  let documentId = Date.now();

  // Create folders and files from template
  for (const folder of spaceTemplate.folders) {
    const folderPath = path.join(spacePath, folder.name);

    for (const file of folder.files) {
      const filePath = path.join(folderPath, file.filename);
      // Create file - this will also create the folder if it doesn't exist
      await filing.create(filePath, file.content);

      // Create document metadata
      const excerpt = file.content
        .replace(/[#*`>\[\]]/g, '')
        .substring(0, 150)
        .trim();

      // Store relative path from space directory for consistency
      const relativePath = path.relative(spacePath, filePath);

      documents.push({
        id: documentId++,
        title: file.title,
        spaceName: spaceTemplate.name,
        spaceId: null, // Will be set by caller
        tags: file.tags || [],
        excerpt: excerpt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: author,
        filePath: relativePath
      });
    }
  }

  logger.info(`Created ${documents.length} sample documents for space at ${spacePath}`);
  return documents;
}

/**
 * Configures and registers spaces routes with the Express application.
 *
 * @param {Object} options - Configuration options object
 * @param {Object} eventEmitter - Event emitter for logging and notifications
 * @param {Object} services - NooblyJS Core services (dataManager, filing, cache, logger, queue, search)
 * @return {void}
 */
module.exports = (options, eventEmitter, services) => {
  const app = options;
  const { dataManager, filing, cache, logger, queue, search } = services;

  // Get all spaces
  app.get('/applications/wiki/api/spaces', async (req, res) => {
    try {
      // Check cache first
      const cacheKey = 'wiki:spaces:list';
      let spaces = await cache.get(cacheKey);

      if (!spaces) {
        // Load from dataServe using the new container-based approach
        try {
          logger.info('Attempting to find spaces in wiki container...');
          spaces = await dataManager.read('spaces');
          logger.info(`Find result: ${spaces ? JSON.stringify(spaces).substring(0, 100) : 'null'}`);

          if (!spaces || !Array.isArray(spaces)) {
            logger.warn('No spaces found or invalid result, initializing empty array');
            spaces = [];
          }

          // Cache for 5 minutes
          await cache.put(cacheKey, spaces, 300);
          logger.info(`Loaded ${spaces.length} spaces from dataServe and cached`);
        } catch (error) {
          logger.error('Error loading spaces from dataServe:', error.message, error.stack);
          spaces = [];
        }
      } else {
        logger.info('Loaded spaces from cache');
      }

      res.json(spaces);
    } catch (error) {
      logger.error('Error fetching spaces:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to fetch spaces', details: error.message });
    }
  });

  // Get single space by ID
  app.get('/applications/wiki/api/spaces/:id', async (req, res) => {
    try {
      const spaceId = parseInt(req.params.id);
      const spaces = await dataManager.read('spaces');
      const space = spaces.find(s => s.id === spaceId);

      if (!space) {
        return res.status(404).json({ error: 'Space not found' });
      }

      res.json(space);
    } catch (error) {
      logger.error('Error fetching space:', error);
      res.status(500).json({ error: 'Failed to fetch space' });
    }
  });

  // Create a new space
  app.post('/applications/wiki/api/spaces', async (req, res) => {
    try {
      const { name, description, visibility, type, path } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: 'Space name is required' });
      }

      if (!path) {
        return res.status(400).json({ success: false, message: 'Folder path is required' });
      }

      if (!type) {
        return res.status(400).json({ success: false, message: 'Space type is required' });
      }

      // Load space templates
      const templatesConfig = await loadSpacesTemplate();
      const spaceTemplate = templatesConfig.spaces.find(t => t.type === type);

      if (!spaceTemplate) {
        return res.status(400).json({ success: false, message: `Invalid space type: ${type}` });
      }

      // Get next space ID
      const spaces = await dataManager.read('spaces');
      let nextId = spaces.length > 0 ? Math.max(...spaces.map(s => s.id)) + 1 : 1;

      // Normalize the path to remove any ./ and ensure consistency
      const fullPath = require('path').resolve(process.cwd(), path);

      // Determine permissions based on type
      const permissions = spaceTemplate.permissions;

      const newSpace = {
        id: nextId,
        name,
        description: description || spaceTemplate.description,
        icon: spaceTemplate.icon,
        visibility: visibility || spaceTemplate.visibility,
        permissions: permissions,
        type: type,
        path: fullPath,
        documentCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: req.user ? req.user.name : 'System'
      };

      // Create folder structure and sample files from template
      try {
        const sampleDocuments = await initializeSpaceFromTemplate(
          spaceTemplate,
          path,
          filing,
          logger,
          newSpace.author
        );

        // Update space ID in documents
        sampleDocuments.forEach(doc => {
          doc.spaceId = nextId;
          doc.spaceName = name;
        });

        // Update document count
        newSpace.documentCount = sampleDocuments.length;

        // Add documents to database
        const allDocuments = await dataManager.read('documents').catch(() => []);
        allDocuments.push(...sampleDocuments);
        await dataManager.write('documents', allDocuments);

        // Index documents in search
        for (const doc of sampleDocuments) {
          search.add(doc.id.toString(), {
            id: doc.id,
            title: doc.title,
            content: '',
            tags: doc.tags || [],
            excerpt: doc.excerpt,
            spaceName: doc.spaceName
          });
        }

        logger.info(`Created ${sampleDocuments.length} sample documents for space: ${name}`);
      } catch (createError) {
        logger.error(`Failed to create directory structure for space ${name}:`, createError);
        return res.status(500).json({ success: false, message: 'Failed to create space structure' });
      }

      // Add to spaces list
      spaces.push(newSpace);
      await dataManager.write('spaces', spaces);

      // Clear relevant caches
      await cache.delete('wiki:spaces:list');
      await cache.delete('wiki:recent:activity');

      logger.info(`Created new space: ${name} (ID: ${nextId}, Type: ${type}) at ${fullPath} with ${newSpace.documentCount} documents`);

      res.json({ success: true, space: newSpace });
    } catch (error) {
      logger.error('Error creating space:', error);
      res.status(500).json({ success: false, message: 'Failed to create space' });
    }
  });

  // Update space
  app.put('/applications/wiki/api/spaces/:id', async (req, res) => {
    try {
      const spaceId = parseInt(req.params.id);
      const { name, description, visibility, type, path } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'Space name is required' });
      }

      if (!path) {
        return res.status(400).json({ success: false, error: 'Folder path is required' });
      }

      if (!type) {
        return res.status(400).json({ success: false, error: 'Space type is required' });
      }

      // Load current spaces
      const spaces = await dataManager.read('spaces');
      const spaceIndex = spaces.findIndex(s => s.id === spaceId);

      if (spaceIndex === -1) {
        return res.status(404).json({ success: false, error: 'Space not found' });
      }

      const currentSpace = spaces[spaceIndex];
      const fullPath = require('path').resolve(process.cwd(), path);
      const pathChanged = currentSpace.path !== fullPath;

      // Load space templates
      const templatesConfig = await loadSpacesTemplate();
      const spaceTemplate = templatesConfig.spaces.find(t => t.type === type);

      if (!spaceTemplate) {
        return res.status(400).json({ success: false, error: `Invalid space type: ${type}` });
      }

      // If path changed, check if new folder has content and initialize if needed
      if (pathChanged) {
        try {
          // Check if new folder has existing content
          const hasContent = await folderHasContent(fullPath);

          if (!hasContent) {
            logger.info(`Initializing new folder for space ${name}: ${fullPath}`);
            const sampleDocuments = await initializeSpaceFromTemplate(
              spaceTemplate,
              path,
              filing,
              logger,
              req.user ? req.user.name : 'System'
            );

            // Update document count
            currentSpace.documentCount = sampleDocuments.length;
            logger.info(`Initialized ${sampleDocuments.length} sample documents in new folder`);
          } else {
            logger.info(`Folder ${fullPath} already has content, skipping sample data creation`);
          }
        } catch (initError) {
          logger.error(`Error initializing new folder for space ${name}:`, initError);
          // Continue anyway, just log the error
        }
      }

      // Update space properties
      currentSpace.name = name;
      currentSpace.description = description || currentSpace.description;
      currentSpace.visibility = visibility || currentSpace.visibility;
      currentSpace.type = type;
      currentSpace.path = fullPath;
      currentSpace.permissions = spaceTemplate.permissions;
      currentSpace.updatedAt = new Date().toISOString();

      // Save updated spaces
      spaces[spaceIndex] = currentSpace;
      await dataManager.write('spaces', spaces);

      // Clear relevant caches
      await cache.delete('wiki:spaces:list');
      await cache.delete(`wiki:space:${spaceId}:documents`);

      logger.info(`Updated space: ${name} (ID: ${spaceId})`);

      res.json({ success: true, space: currentSpace });
    } catch (error) {
      logger.error('Error updating space:', error);
      res.status(500).json({ success: false, error: 'Failed to update space' });
    }
  });

  // Delete a space (only removes from spaces.json, leaves content intact)
  app.delete('/applications/wiki/api/spaces/:id', async (req, res) => {
    try {
      const spaceId = parseInt(req.params.id);

      // Load current spaces
      const spaces = await dataManager.read('spaces');
      const spaceIndex = spaces.findIndex(s => s.id === spaceId);

      if (spaceIndex === -1) {
        return res.status(404).json({ success: false, error: 'Space not found' });
      }

      const deletedSpace = spaces[spaceIndex];

      // Remove the space from the array
      spaces.splice(spaceIndex, 1);

      // Save updated spaces
      await dataManager.write('spaces', spaces);

      // Clear relevant caches
      await cache.delete('wiki:spaces:list');
      await cache.delete(`wiki:space:${spaceId}:documents`);

      logger.info(`Deleted space: ${deletedSpace.name} (ID: ${spaceId}). Content folder preserved at: ${deletedSpace.path}`);

      res.json({ success: true, message: 'Space deleted successfully' });
    } catch (error) {
      logger.error('Error deleting space:', error);
      res.status(500).json({ success: false, error: 'Failed to delete space' });
    }
  });

  // Get documents for a specific space
  app.get('/applications/wiki/api/spaces/:id/documents', async (req, res) => {
    try {
      const spaceId = parseInt(req.params.id);
      const cacheKey = `wiki:space:${spaceId}:documents`;

      let spaceDocuments = await cache.get(cacheKey);

      if (!spaceDocuments) {
        const allDocuments = await dataManager.read('documents');
        spaceDocuments = allDocuments.filter(doc => doc.spaceId === spaceId);

        await cache.put(cacheKey, spaceDocuments, 300); // 5 minutes
        logger.info(`Loaded documents for space ${spaceId}`);
      }

      res.json(spaceDocuments);
    } catch (error) {
      logger.error('Error fetching space documents:', error);
      res.status(500).json({ error: 'Failed to fetch space documents' });
    }
  });

  // Get folder tree for a space
  app.get('/applications/wiki/api/spaces/:spaceId/folders', async (req, res) => {
    try {
      const spaceId = parseInt(req.params.spaceId);
      logger.info(`Fetching folder tree for space ${spaceId}`);

      const tree = await dataManager.getFolderTree(spaceId);
      res.json(tree);
    } catch (error) {
      logger.error('Error fetching folder tree:', error);
      res.status(500).json({ error: 'Failed to fetch folder tree' });
    }
  });

  // Get templates for a space (files in .templates folder)
  app.get('/applications/wiki/api/spaces/:spaceId/templates', async (req, res) => {
    try {
      const spaceId = parseInt(req.params.spaceId);
      logger.info(`Fetching templates for space ${spaceId}`);

      // Find the space
      const spaces = await dataManager.read('spaces');
      const space = spaces.find(s => s.id === spaceId);

      if (!space) {
        return res.status(404).json({ error: 'Space not found' });
      }

      // Read-only spaces should not have templates
      if (space.permissions === 'read-only') {
        logger.info(`Space ${space.name} is read-only, returning empty templates`);
        return res.json([]);
      }

      // Look for files in the .templates folder using space's configured path
      const fs = require('fs').promises;
      const path = require('path');

      // Use space's configured path or fallback to old structure
      let spaceDir;
      if (space.path) {
        spaceDir = space.path;
      } else {
        const documentsDir = path.resolve(__dirname, '../../../documents');
        spaceDir = path.resolve(documentsDir, space.name);
      }

      const templatesPath = path.resolve(spaceDir, '.templates');

      let templates = [];

      try {
        // Check if .templates folder exists
        const templatesStats = await fs.stat(templatesPath);
        if (templatesStats.isDirectory()) {
          // Read all files in .templates folder
          const files = await fs.readdir(templatesPath, { withFileTypes: true });

          for (const file of files) {
            if (file.isFile() && file.name.endsWith('.md')) {
              const filePath = path.join(templatesPath, file.name);
              const stats = await fs.stat(filePath);

              // Read first line as title if it starts with #
              let title = file.name.replace('.md', '');
              try {
                const content = await fs.readFile(filePath, 'utf8');
                const firstLine = content.split('\n')[0];
                if (firstLine.startsWith('# ')) {
                  title = firstLine.substring(2).trim();
                }
              } catch (readError) {
                logger.warn(`Could not read template file ${file.name}:`, readError.message);
              }

              templates.push({
                name: file.name.replace('.md', ''),
                title: title,
                path: `.templates/${file.name}`,
                size: stats.size,
                lastModified: stats.mtime.toISOString(),
                type: 'template'
              });
            }
          }
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          // .templates folder doesn't exist - this is normal for new spaces
          // Users can create templates through the UI as needed
          logger.info(`.templates folder does not exist for space ${space.name} - templates will be created by users`);
        } else {
          logger.error('Error checking .templates folder:', error);
        }
      }

      logger.info(`Found ${templates.length} templates for space ${spaceId}`);
      res.json(templates);
    } catch (error) {
      logger.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });
};
