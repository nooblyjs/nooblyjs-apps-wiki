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
const SearchIndexer = require('./src/activities/searchIndexer');

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
  const searchIndexer = new SearchIndexer(logger, dataManager);

  // Make searchIndexer available globally for other modules
  global.searchIndexer = searchIndexer;

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
  startQueueWorker({ dataManager, filing, cache, logger, queue, search, aiService, searchIndexer });

  // Start file watcher for real-time updates
  if (io) {
    startFileWatcher({ dataManager, filing, cache, logger, queue, search, aiService, io, searchIndexer });
  }

  // Start AI Context generation scheduler (after a short delay to let services initialize)
  setTimeout(() => {
    startAIContextScheduler({ dataManager, filing, cache, logger, queue, search, aiService, searchIndexer, serviceRegistry });
  }, 2000);


  // Register routes and views
  options.app = app
  Routes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService, searchIndexer });
  SpacesRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService, searchIndexer });
  NavigationRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService, searchIndexer });
  DocumentRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService, searchIndexer });
  SearchRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService, searchIndexer });
  UserRoutes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService, searchIndexer });
  Views(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, aiService, searchIndexer });

  // Authentication routes
  const authRoutes = require('./src/auth/routes');
  app.use('/api/auth', authRoutes);


  // Serve wizard page
  app.get('/wizard', (req, res) => {
    res.sendFile(path.join(__dirname, './src/views/wizard.html'));
  });

  // Serve wizard JavaScript
  app.get('/wizard.js', (req, res) => {
    res.sendFile(path.join(__dirname, './src/views/js/wizard.js'));
  });

  // Serve README.md from root directory
  app.get('/applications/wiki/README.md', (req, res) => {
    res.sendFile(path.join(__dirname, 'README.md'));
  });

}

/**
 * Start background queue worker for processing tasks
 */
function startQueueWorker(services) {
  const { queue, logger } = services;

  let aiContextGenerationCounter = 0;

  // Process queue every 5 seconds
  setInterval(async () => {
    try {
      const task = queue.dequeue();
      if (task && task.type) {
        logger.info(`Processing task: ${task.type}`);
        await processTask(services, task);
        logger.info(`Completed task: ${task.type}`);
      }

      // Trigger AI Context generation every 60 seconds (12 iterations * 5 seconds)
      aiContextGenerationCounter++;
      if (aiContextGenerationCounter >= 12) {
        aiContextGenerationCounter = 0;
        try {
          logger.info('Triggering scheduled AI Context generation');
          await processTask(services, { type: 'generateAIContexts' });
        } catch (error) {
          logger.error('Error in scheduled AI Context generation:', error);
        }
      }
    } catch (error) {
      logger.error('Error processing queue task:', error);
    }
  }, 5000);

}

/**
 * Start AI Context generation scheduler
 * Runs immediately on startup, then every 60 seconds
 */
function startAIContextScheduler(services) {
  const { logger, dataManager, aiService, serviceRegistry } = services;

  // Import the AI Context Generator
  const AIContextGenerator = require('./src/activities/aiContextGenerator');

  async function runAIContextGeneration() {
    try {
      logger.info('[SCHEDULER] Creating AI Context Generator instance');
      logger.info(`[SCHEDULER] Services available - logger: ${!!logger}, dataManager: ${!!dataManager}, aiService: ${!!aiService}, serviceRegistry: ${!!serviceRegistry}`);

      const contextGenerator = new AIContextGenerator(logger, dataManager, aiService, serviceRegistry);

      // Check if AI is ready before processing
      logger.info('[SCHEDULER] Checking AI readiness');
      const isReady = await contextGenerator.isAIReady();
      if (!isReady) {
        logger.info('[SCHEDULER] AI Context generation skipped: AI service not configured');
        return;
      }

      logger.info('[SCHEDULER] Starting AI Context generation...');
      const stats = await contextGenerator.processAllSpaces();
      logger.info(`[SCHEDULER] AI Context generation completed:
        - Folders processed: ${stats.foldersProcessed}
        - Files processed: ${stats.filesProcessed}
        - Folder contexts created: ${stats.folderContextsCreated}
        - File contexts created: ${stats.fileContextsCreated}
        - Errors: ${stats.errors}`);
    } catch (error) {
      logger.error('[SCHEDULER] Error in AI Context generation scheduler:', error);
    }
  }

  // Run immediately on startup
  logger.info('[SCHEDULER] AI Context generation scheduler started');
  runAIContextGeneration().catch(error => {
    logger.error('[SCHEDULER] Error in initial AI Context generation:', error);
  });

  // Schedule to run every 60 seconds
  setInterval(() => {
    runAIContextGeneration().catch(error => {
      logger.error('[SCHEDULER] Error in scheduled AI Context generation:', error);
    });
  }, 60000);

}
