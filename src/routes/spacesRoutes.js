/**
 * @fileoverview Spaces API routes for Wiki application
 * Handles space management, folder trees, and templates
 *
 * @author NooblyJS Core Team
 * @version 1.0.14
 * @since 1.0.0
 */

'use strict';

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

  // Create a new space
  app.post('/applications/wiki/api/spaces', async (req, res) => {
    try {
      const { name, description, visibility, permissions, path } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: 'Space name is required' });
      }

      if (!path) {
        return res.status(400).json({ success: false, message: 'Folder path is required' });
      }

      // Get next space ID
      const spaces = await dataManager.read('spaces');
      let nextId = spaces.length > 0 ? Math.max(...spaces.map(s => s.id)) + 1 : 1;

      // Determine space type based on permissions
      let spaceType = 'personal';
      if (permissions === 'read-only') {
        spaceType = 'readonly';
      } else if (visibility === 'team') {
        spaceType = 'shared';
      }

      const fullPath = `${process.cwd()}/${path}`;

      const newSpace = {
        id: nextId,
        name,
        description: description || '',
        icon: '📁',
        visibility: visibility || 'private',
        permissions: permissions || 'read-write',
        type: spaceType,
        path: fullPath,
        documentCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: req.user ? req.user.name : 'System'
      };

      // Create the directory with .gitkeep file
      try {
        const gitkeepPath = `${fullPath}/.gitkeep`;
        await filing.create(gitkeepPath, '# Keep this directory in git\n');
        logger.info(`Created directory for space: ${name} at ${fullPath}`);
      } catch (createError) {
        logger.error(`Failed to create directory for space ${name}:`, createError);
        return res.status(500).json({ success: false, message: 'Failed to create space directory' });
      }

      // Add to spaces list
      spaces.push(newSpace);
      await dataManager.write('spaces', spaces);

      // Clear relevant caches
      await cache.delete('wiki:spaces:list');
      await cache.delete('wiki:recent:activity');

      logger.info(`Created new space: ${name} (ID: ${nextId}) at ${fullPath}`);

      res.json({ success: true, space: newSpace });
    } catch (error) {
      logger.error('Error creating space:', error);
      res.status(500).json({ success: false, message: 'Failed to create space' });
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
