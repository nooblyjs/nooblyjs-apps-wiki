/**
 * @fileoverview First-time setup wizard routes for Wiki application.
 * Handles user onboarding, profile setup, and space initialization
 *
 * @author NooblyJS Core Team
 * @version 1.0.0
 */

'use strict';

const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs').promises;
const { findUserByEmail, createUser, writeUsers, readUsers } = require('../auth/passport-config');

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
 * Create folder structure and sample files for a space
 */
async function initializeSpace(space, basePath, filing, dataManager, author, logger) {
  const spacePath = path.join(process.cwd(), basePath);
  const documents = [];

  // Check if folder already has content
  const hasContent = await folderHasContent(spacePath);

  if (hasContent) {
    if (logger) {
      logger.info(`Folder ${spacePath} already has content, skipping sample data creation`);
    }
    return documents;
  }

  // Create space directory by creating .gitkeep file
  const gitkeepPath = path.join(spacePath, '.gitkeep');
  await filing.create(gitkeepPath, '# Keep this directory in git\n');

  let documentId = Date.now();

  // Create folders and files
  for (const folder of space.folders) {
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

      // Store relative path from space directory for consistency with API expectations
      const relativePath = path.relative(spacePath, filePath);

      documents.push({
        id: documentId++,
        title: file.title,
        spaceName: space.name,
        spaceId: space.id,
        tags: file.tags || [],
        excerpt: excerpt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: author,
        filePath: relativePath
      });
    }
  }

  return documents;
}

/**
 * Initialize user's wiki with spaces and sample content
 */
async function initializeUserWiki(userId, spaceConfigs, filing, dataManager, search, logger, author) {
  try {
    // Load existing data or create new
    let existingDocuments = await dataManager.read('documents').catch(() => []);
    let existingSpaces = await dataManager.read('spaces').catch(() => []);

    const allDocuments = [...existingDocuments];
    const allSpaces = [...existingSpaces];

    // Process each space configuration
    for (const spaceConfig of spaceConfigs) {
      const template = spaceConfig.template;
      const customPath = spaceConfig.customPath || template.defaultPath;

      // Create space metadata
      const space = {
        id: template.id,
        name: template.name,
        description: template.description,
        icon: template.icon,
        visibility: template.visibility,
        documentCount: 0,
        path: path.resolve(process.cwd(), customPath),
        type: template.type,
        permissions: template.permissions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: author
      };

      // Initialize space folders and files
      const documents = await initializeSpace(template, customPath, filing, dataManager, author, logger);

      // Update space document count
      space.documentCount = documents.length;

      // Add to collections
      allSpaces.push(space);
      allDocuments.push(...documents);

      // Index documents in search
      for (const doc of documents) {
        search.add(doc.id.toString(), {
          id: doc.id,
          title: doc.title,
          content: '',
          tags: doc.tags || [],
          excerpt: doc.excerpt,
          spaceName: doc.spaceName
        });
      }

      logger.info(`Initialized space: ${space.name} at ${customPath}`);
    }

    // Save all data
    await dataManager.write('spaces', allSpaces);
    await dataManager.write('documents', allDocuments);

    // Mark user as initialized
    const users = await readUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      user.initialized = true;
      user.initializedAt = new Date().toISOString();
      await writeUsers(users);
    }

    return { success: true, spaces: allSpaces, documentCount: allDocuments.length };
  } catch (error) {
    logger.error('Error initializing user wiki:', error);
    throw error;
  }
}

/**
 * Configure wizard routes
 */
module.exports = (options, eventEmitter, services) => {

  const app = options.app;
  const { dataManager, filing, cache, logger, queue, search } = services;

  // Check if user needs wizard
  app.get('/applications/wiki/api/wizard/check', async (req, res) => {
    try {
      if (!req.user) {
        return res.json({ needsWizard: false, reason: 'not_authenticated' });
      }

      const user = req.user;
      const needsWizard = !user.initialized;

      res.json({
        needsWizard,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || '',
          initialized: user.initialized || false
        }
      });
    } catch (error) {
      logger.error('Error checking wizard status:', error);
      res.status(500).json({ error: 'Failed to check wizard status' });
    }
  });

  // Get wizard configuration (spaces template)
  app.get('/applications/wiki/api/wizard/config', async (req, res) => {
    try {
      const template = await loadSpacesTemplate();
      res.json(template);
    } catch (error) {
      logger.error('Error loading wizard config:', error);
      res.status(500).json({ error: 'Failed to load wizard configuration' });
    }
  });

  // Initialize spaces
  app.post('/applications/wiki/api/wizard/initialize', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { spaces } = req.body;

      if (!spaces || !Array.isArray(spaces)) {
        return res.status(400).json({ error: 'Invalid spaces configuration' });
      }

      // Load template
      const template = await loadSpacesTemplate();

      // Prepare space configurations
      const spaceConfigs = spaces.map(spaceData => {
        const spaceTemplate = template.spaces.find(t => t.id === spaceData.id);
        if (!spaceTemplate) {
          throw new Error(`Invalid space ID: ${spaceData.id}`);
        }

        return {
          template: spaceTemplate,
          customPath: spaceData.path || spaceTemplate.defaultPath
        };
      });

      // Initialize wiki
      const result = await initializeUserWiki(
        req.user.id,
        spaceConfigs,
        filing,
        dataManager,
        search,
        logger,
        req.user.name || req.user.email
      );

      logger.info(`Wiki initialized for user ${req.user.email}: ${result.spaces.length} spaces, ${result.documentCount} documents`);

      res.json({
        success: true,
        message: 'Wiki initialized successfully',
        spaces: result.spaces,
        documentCount: result.documentCount
      });
    } catch (error) {
      logger.error('Error initializing wiki:', error);
      res.status(500).json({ error: error.message || 'Failed to initialize wiki' });
    }
  });

  // Skip wizard (for testing or advanced users)
  app.post('/applications/wiki/api/wizard/skip', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const users = await readUsers();
      const user = users.find(u => u.id === req.user.id);

      if (user) {
        user.initialized = true;
        user.initializedAt = new Date().toISOString();
        user.skippedWizard = true;
        await writeUsers(users);
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('Error skipping wizard:', error);
      res.status(500).json({ error: 'Failed to skip wizard' });
    }
  });
};
