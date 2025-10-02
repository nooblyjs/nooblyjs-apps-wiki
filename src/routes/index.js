/**
 * @fileoverview Wiki API routes for Express.js application.
 * Provides RESTful endpoints for structured wiki operations
 *
 * @author NooblyJS Core Team
 * @version 1.0.14
 * @since 1.0.0
 */

'use strict';

/**
 * Configures and registers wiki routes with the Express application.
 * Integrates with noobly-core services for data persistence, caching, file storage, etc.
 *
 * @param {Object} options - Configuration options object
 * @param {Object} options.express-app - The Express application instance
 * @param {Object} eventEmitter - Event emitter for logging and notifications
 * @param {Object} services - NooblyJS Core services (dataServe, filing, cache, logger, queue, search)
 * @return {void}
 */
module.exports = (options, eventEmitter, services) => {

  const app = options;
  const { dataManager, filing, cache, logger, queue, search } = services;

  // Application status endpoint
  app.get('/applications/wiki/api/status', (req, res) => {
    res.json({
      status: 'running',
      application: 'Wiki Management',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Load and register route modules
  const documentRoutes = require('./documentRoutes');
  const spacesRoutes = require('./spacesRoutes');
  const searchRoutes = require('./searchRoutes');
  const navigationRoutes = require('./navigationRoutes');
  const userRoutes = require('./userRoutes');
  const wizardRoutes = require('./wizardRoutes');

  // Register all routes
  documentRoutes(app, eventEmitter, services);
  spacesRoutes(app, eventEmitter, services);
  searchRoutes(app, eventEmitter, services);
  navigationRoutes(app, eventEmitter, services);
  userRoutes(app, eventEmitter, services);
  wizardRoutes(app, eventEmitter, services);

};
