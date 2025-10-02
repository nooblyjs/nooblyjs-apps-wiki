/**
 * @fileoverview Wiki Application
 * Factory module for creating a Wiki application instance.
 * 
 * @author NooblyJS Team
 * @version 1.0.14
 * @since 2025-08-22
 */

'use strict';

const Routes = require('./routes');
const SpacesRoutes = require('./routes/spacesRoutes');
const NavigationRoutes = require('./routes/navigationRoutes');
const DocumentRoutes = require('./routes/documentRoutes');
const SearchRoutes = require('./routes/searchRoutes');
const UserRoutes = require('./routes/userRoutes');
const Views = require('./views');
const { initializeDocumentFiles } = require('./activities/documentContent');
const { processTask } = require('./activities/taskProcessor');
const DataManager = require('./components/dataManager');

/**
 * Creates the wiki service
 * Automatically configures routes and views for the wiki service.
 * Integrates with noobly-core services for data persistence, file storage, caching, etc.
 * @param {Object} options - Configuration options
 * @param {EventEmitter} eventEmitter - Global event emitter for inter-service communication
 * @param {Object} serviceRegistry - NooblyJS Core service registry
 * @return {void}
 */
module.exports = (options, eventEmitter, serviceRegistry) => {
  
  const dataDirectory = options.dataDirectory || './.application/wiki-data'
  const filesDir = options.filesDir || './.application/wiki-files'
  const cacheProvider = options.filesDir || 'memory'
  const filerProvider = options.filesDir || 'local'
  const loggerProvider = options.filesDir || 'console'
  const queueProvider = options.filesDir || 'memory'
  const searchProvider = options.filesDir || 'memory'
  
  const filing = serviceRegistry.filing(filerProvider, { baseDir: filesDir});
  const dataManager = new DataManager(dataDirectory, filing);
  const cache = serviceRegistry.cache(cacheProvider);
  const logger = serviceRegistry.logger(loggerProvider);
  const queue = serviceRegistry.queue(queueProvider);
  const search = serviceRegistry.searching(searchProvider);
  
  // Initialize wiki data if not exists
  (async () => {
    try {
      await initializeWikiData(dataManager, filing, cache, logger, queue, search);
    } catch (error) {
      logger.error('Failed to initialize wiki data:', error);
    }
  })();
  
  // Start background queue worker
  startQueueWorker({ dataManager, filing, cache, logger, queue, search });
  
  // Register routes and views
  Routes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search });
  SpacesRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search });
  NavigationRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search });
  DocumentRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search });
  SearchRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search });
  UserRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search });
  Views(options, eventEmitter, { dataManager, filing, cache, logger, queue, search });
}

/**
 * Initialize default wiki data
 */
async function initializeWikiData(dataManager, filing, cache, logger, queue, search) {
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
    
    // Always initialize document files
    try {
      await initializeDocumentFiles({ filing, logger });
    } catch (error) {
      logger.error('Error initializing document files:', error);
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

/**
 * Start background queue worker for processing tasks
 */
function startQueueWorker(services) {
  const { queue, logger } = services;
  
  // Process queue every 5 seconds
  setInterval(async () => {
    try {
      const task = queue.dequeue();
      if (task && task.type) {
        logger.info(`Processing task: ${task.type}`);
        await processTask(services, task);
        logger.info(`Completed task: ${task.type}`);
      }
    } catch (error) {
      logger.error('Error processing queue task:', error);
    }
  }, 5000);
  
  logger.info('Wiki queue worker started');
}
