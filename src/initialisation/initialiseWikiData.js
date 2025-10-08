/**
 * @fileoverview Default document content for wiki initialization
 * Contains markdown content for sample documents
 * 
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-08-25
 */

'use strict';

/**
 * Initialize default wiki data
 */
async function run(dataManager, filing, cache, logger, queue, search) {
  try {
    logger.info('Starting wiki data initialization check...');

    // Check if we already have stored wiki data
    const existingSpaces = await dataManager.read('spaces');
    const existingDocuments = await dataManager.read('documents');

    if (existingSpaces.length === 0 || existingDocuments.length === 0) {
      logger.info('No existing wiki data found. User should complete setup wizard.');

      // Initialize empty data structures (wizard will populate them)
      if (existingSpaces.length === 0) {
        await dataManager.write('spaces', []);
        logger.info('Initialized empty spaces.json - waiting for wizard setup');
      }

      if (existingDocuments.length === 0) {
        await dataManager.write('documents', []);
        logger.info('Initialized empty documents.json - waiting for wizard setup');
      }
    } else {
      logger.info('Wiki data already exists, skipping initialization');
    }

    // Always populate search index
    try {
      const documents = await dataManager.read('documents');
      documents.forEach(doc => {
        search.add(doc.id.toString(), {
          id: doc.id,
          title: doc.title,
          content: '', // Will be filled when files are read
          tags: doc.tags || [],
          spaceName: doc.spaceName,
          excerpt: doc.excerpt
        });
      });
      logger.info(`Populated search index with ${documents.length} documents`);
    } catch (error) {
      logger.error('Error populating search index:', error);
    }
  } catch (error) {
    logger.error('Error initializing wiki data:', error.message);
    logger.error('Stack trace:', error.stack);
  }
}