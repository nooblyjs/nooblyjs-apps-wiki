/**
 * @fileoverview CMS Application
 * Factory module for creating a CMS (Website builder) application instance.
 * 
 * @author NooblyJS Team
 * @version 1.0.14
 * @since 2025-08-22
 */

'use strict';

const Routes = require('./routes');
const Views = require('./views');
const DataManager = require('./components/dataManager');

/**
 * Creates the CMS service
 * Automatically configures routes and views for the CMS service.
 * Integrates with noobly-core services for data persistence, file storage, caching, etc.
 * @param {Object} options - Configuration options
 * @param {EventEmitter} eventEmitter - Global event emitter for inter-service communication
 * @param {Object} serviceRegistry - NooblyJS Core service registry
 * @return {void}
 */
module.exports = (options, eventEmitter, serviceRegistry) => {
  // Initialize data manager for JSON file storage
  const dataManager = new DataManager('./data');
  
  // Initialize noobly-core services for the wiki
  const filing = serviceRegistry.filing('local', { 
    baseDir: './wiki-files' 
  });
  const cache = serviceRegistry.cache('memory');
  const logger = serviceRegistry.logger('console');
  const queue = serviceRegistry.queue('memory');
  const search = serviceRegistry.searching('memory');
  
  // Initialize wiki data if not exists
  (async () => {
    try {
      await initializeWikiData(dataManager, filing, cache, logger, queue, search);
    } catch (error) {
      logger.error('Failed to initialize wiki data:', error);
    }
  })();
  
  // Register routes and views
  Routes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search });
  Views(options, eventEmitter, { dataManager, filing, cache, logger, queue, search });
}