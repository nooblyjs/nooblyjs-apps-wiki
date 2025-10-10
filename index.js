/**
 * @fileoverview Wiki Application
 * Factory module for creating a Wiki application instance.
 * 
 * @author NooblyJS Team
 * @version 1.0.14
 * @since 2025-08-22
 */

'use strict';

const Routes = require('./src/routes');
const SpacesRoutes = require('./src/routes/spacesRoutes');
const NavigationRoutes = require('./src/routes/navigationRoutes');
const DocumentRoutes = require('./src/routes/documentRoutes');
const SearchRoutes = require('./src/routes/searchRoutes');
const UserRoutes = require('./src/routes/userRoutes');
const Views = require('./src/views');

const { initializeDocumentFiles } = require('./src/initialisation/documentContent');
const { initializeWikiData } = require('./src/initialisation/initialiseWikiData');
const { processTask } = require('./src/activities/taskProcessor');
const { startFileWatcher } = require('./src/activities/fileWatcher');
const DataManager = require('./src/components/dataManager');
const AIService = require('./src/components/aiService');

const { Server } = require('socket.io');

/**
 * Creates the wiki service
 * Automatically configures routes and views for the wiki service.
 * Integrates with noobly-core services for data persistence, file storage, caching, etc.
 * @param {Object} app - The Express application instance
 * @param {EventEmitter} eventEmitter - Global event emitter for inter-service communication
 * @param {Object} serviceRegistry - NooblyJS Core service registry
 * @param {Object} options - Configuration options
 * @return {void}
 */
module.exports = (app, server, eventEmitter, serviceRegistry, options) => {
  
  const express = require('express');
  const path = require('path');

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

  // Socket.IO connection handling
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });

    // Send initial connection acknowledgment
    socket.emit('connected', { message: 'Connected to wiki server' });
  });

  // Make io available globally for other modules
  global.io = io;
  
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
  options.app = app
  Routes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService });
  SpacesRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService });
  NavigationRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService });
  DocumentRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService });
  SearchRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService });
  UserRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService });
  Views(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService });

  // Authentication routes
  const authRoutes = require('./src/auth/routes');
  app.use('/api/auth', authRoutes);

  // Launch the application manager
  app.use(express.static(path.join(__dirname, 'public')));

  // Serve wizard page
  app.get('/wizard', (req, res) => {
    res.sendFile(path.join(__dirname, './src/views/wizard.html'));
  });

  // Serve wizard JavaScript
  app.get('/wizard.js', (req, res) => {
    res.sendFile(path.join(__dirname, './src/views/js/wizard.js'));
  });

  // Serve README.md from root directory
  app.get('/README.md', (req, res) => {
    res.sendFile(path.join(__dirname, 'README.md'));
  });

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
