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
const { initializeDocumentFiles } = require('./initialisation/documentContent');
const { initializeWikiData } = require('./initialisation/initialiseWikiData');
const { processTask } = require('./activities/taskProcessor');
const { startFileWatcher } = require('./activities/fileWatcher');
const DataManager = require('./components/dataManager');
const AIService = require('./components/aiService');

/**
 * Creates the wiki service
 * Automatically configures routes and views for the wiki service.
 * Integrates with noobly-core services for data persistence, file storage, caching, etc.
 * @param {Object} options - Configuration options
 * @param {EventEmitter} eventEmitter - Global event emitter for inter-service communication
 * @param {Object} serviceRegistry - NooblyJS Core service registry
 * @param {Object} io - Socket.IO server instance
 * @return {void}
 */
module.exports = (options, eventEmitter, serviceRegistry, io) => {
  
  const dataDirectory = options.dataDirectory || './.application/'
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
  const aiService = new AIService(serviceRegistry, dataManager, logger);
  
  // Initialize wiki data if not exists
  (async () => {
    try {
      await initializeWikiData.run(dataManager, filing, cache, logger, queue, search);
    } catch (error) {
      logger.error('Failed to initialize wiki data:', error);
    }
  })();

  // Start background queue worker
  startQueueWorker({ dataManager, filing, cache, logger, queue, search, aiService });

  // Start file watcher for real-time updates
  if (io) {
    startFileWatcher({ dataManager, filing, cache, logger, queue, search, aiService, io });
  }

  // Register routes and views
  Routes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService });
  SpacesRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService });
  NavigationRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService });
  DocumentRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService });
  SearchRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService });
  UserRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService });
  Views(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService });
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
  
}
