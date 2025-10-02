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
      const { name, description, visibility } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: 'Space name is required' });
      }

      // Get next space ID
      const spaces = await dataManager.read('spaces');
      let nextId = spaces.length > 0 ? Math.max(...spaces.map(s => s.id)) + 1 : 1;

      const newSpace = {
        id: nextId,
        name,
        description: description || '',
        icon: '📁',
        visibility: visibility || 'private',
        documentCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'Current User'
      };

      // Add to spaces list
      spaces.push(newSpace);
      await dataManager.write('spaces', spaces);

      // Update next ID
      // Next ID is calculated dynamically

      // Clear relevant caches
      await cache.delete('wiki:spaces:list');
      await cache.delete('wiki:recent:activity');

      logger.info(`Created new space: ${name} (ID: ${nextId})`);

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
          // .templates folder doesn't exist, create it with default templates
          logger.info(`Creating .templates folder for space ${space.name}`);

          try {
            await fs.mkdir(templatesPath, { recursive: true });

            // Create default templates
            const defaultTemplates = [
              {
                name: 'basic-document',
                title: 'Basic Document',
                content: '# Document Title\n\n## Overview\n\nDescription of the document.\n\n## Content\n\nYour content here.\n\n## Conclusion\n\nSummary and next steps.'
              },
              {
                name: 'meeting-notes',
                title: 'Meeting Notes',
                content: '# Meeting Notes\n\n**Date:** YYYY-MM-DD\n**Attendees:** \n**Location:** \n\n## Agenda\n\n1. \n2. \n3. \n\n## Discussion\n\n### Topic 1\n\n### Topic 2\n\n## Action Items\n\n- [ ] Action item 1 - Assigned to:\n- [ ] Action item 2 - Assigned to:\n\n## Next Meeting\n\n**Date:** \n**Time:** '
              },
              {
                name: 'api-documentation',
                title: 'API Documentation',
                content: '# API Documentation\n\n## Overview\n\nBrief description of the API.\n\n## Base URL\n\n```\nhttps://api.example.com/v1\n```\n\n## Authentication\n\nDescription of authentication method.\n\n## Endpoints\n\n### GET /endpoint\n\nDescription of endpoint.\n\n**Parameters:**\n\n| Name | Type | Required | Description |\n|------|------|----------|-------------|\n| param1 | string | Yes | Description |\n\n**Response:**\n\n```json\n{\n  "status": "success",\n  "data": {}\n}\n```\n\n## Error Codes\n\n| Code | Description |\n|------|-------------|\n| 400 | Bad Request |\n| 401 | Unauthorized |\n| 404 | Not Found |'
              },
              {
                name: 'project-requirements',
                title: 'Project Requirements',
                content: '# Project Requirements\n\n## Project Overview\n\n**Project Name:** \n**Project Owner:** \n**Start Date:** \n**Target Completion:** \n\n## Objectives\n\n1. \n2. \n3. \n\n## Scope\n\n### In Scope\n\n- \n- \n\n### Out of Scope\n\n- \n- \n\n## Functional Requirements\n\n### FR1: Requirement Title\n\n**Description:** \n**Priority:** High/Medium/Low\n**Acceptance Criteria:**\n- \n- \n\n## Non-Functional Requirements\n\n### Performance\n\n### Security\n\n### Scalability\n\n## Constraints\n\n## Assumptions\n\n## Dependencies'
              }
            ];

            for (const template of defaultTemplates) {
              const templatePath = path.join(templatesPath, `${template.name}.md`);
              await fs.writeFile(templatePath, template.content, 'utf8');
              const stats = await fs.stat(templatePath);

              templates.push({
                name: template.name,
                title: template.title,
                path: `.templates/${template.name}.md`,
                size: stats.size,
                lastModified: stats.mtime.toISOString(),
                type: 'template'
              });
            }

            logger.info(`Created .templates folder with ${defaultTemplates.length} default templates for space ${space.name}`);
          } catch (createError) {
            logger.error('Error creating .templates folder:', createError);
            // Return empty array if we can't create the folder
          }
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
