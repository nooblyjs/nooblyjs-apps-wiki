#!/usr/bin/env node

require('dotenv').config();
const path = require('path');
const WikiApiClient = require('./lib/api-client');
const StateManager = require('./lib/state-manager');
const FileSync = require('./lib/file-sync');
const FolderWatcher = require('./lib/folder-watcher');

/**
 * NooblyJS Wiki Daemon
 * Syncs local folder with wiki shared space
 */
class WikiDaemon {
  constructor(config) {
    this.config = config;
    this.apiClient = null;
    this.stateManager = null;
    this.fileSync = null;
    this.folderWatcher = null;
    this.syncIntervalId = null;
  }

  /**
   * Initialize the daemon
   */
  async initialize() {
    console.log('='.repeat(60));
    console.log('NooblyJS Wiki Daemon - Starting...');
    console.log('='.repeat(60));
    console.log(`[Init] Current working directory: ${process.cwd()}`);
    console.log(`[Init] Daemon script location: ${__dirname}`);

    // Validate configuration
    this.validateConfig();

    // Initialize components
    console.log('[Init] Initializing API client...');
    this.apiClient = new WikiApiClient(
      this.config.wikiUrl,
      this.config.username,
      this.config.password
    );

    console.log('[Init] Initializing state manager...');
    this.stateManager = new StateManager(this.config.stateFile);
    await this.stateManager.load();

    console.log('[Init] Initializing file sync...');
    this.fileSync = new FileSync(
      this.apiClient,
      this.stateManager,
      this.config.watchFolder,
      this.config.spaceId
    );

    // Ensure watch folder exists
    await this.fileSync.ensureWatchFolder();

    console.log('[Init] Initializing folder watcher...');
    this.folderWatcher = new FolderWatcher(
      this.config.watchFolder,
      this.fileSync,
      this.config.spaceId
    );

    // Link the file sync and folder watcher
    this.fileSync.setFolderWatcher(this.folderWatcher);

    console.log('[Init] Initialization complete!');
  }

  /**
   * Start the daemon
   */
  async start() {
    try {
      await this.initialize();

      // Perform initial sync from space
      console.log('[Daemon] Performing initial sync from space...');
      await this.fileSync.syncFromSpace();

      // Start folder watcher
      await this.folderWatcher.start();

      // Start periodic sync from space
      console.log(`[Daemon] Starting periodic sync (interval: ${this.config.syncInterval}ms)`);
      this.syncIntervalId = setInterval(async () => {
        console.log('[Daemon] Running periodic sync from space...');
        await this.fileSync.syncFromSpace();
      }, this.config.syncInterval);

      console.log('='.repeat(60));
      console.log('Daemon is running!');
      console.log('');
      console.log(`📁 Watch folder (relative): ${this.config.watchFolder}`);
      console.log(`📁 Watch folder (absolute): ${path.resolve(this.config.watchFolder)}`);
      console.log(`🔄 Syncing with space ID: ${this.config.spaceId}`);
      console.log(`🌐 Wiki URL: ${this.config.wikiUrl}`);
      console.log(`⏱️  Sync interval: ${this.config.syncInterval}ms`);
      console.log('');
      console.log('Press Ctrl+C to stop');
      console.log('='.repeat(60));

    } catch (error) {
      console.error('[Daemon] Failed to start:', error.message);
      process.exit(1);
    }
  }

  /**
   * Stop the daemon
   */
  async stop() {
    console.log('\n[Daemon] Shutting down...');

    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    if (this.folderWatcher) {
      await this.folderWatcher.stop();
    }

    console.log('[Daemon] Daemon stopped');
    process.exit(0);
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    const required = ['wikiUrl', 'username', 'password', 'watchFolder', 'spaceId'];

    for (const field of required) {
      if (!this.config[field]) {
        throw new Error(`Missing required configuration: ${field}`);
      }
    }
  }
}

// Load configuration from environment
const config = {
  wikiUrl: process.env.WIKI_URL,
  username: process.env.WIKI_USERNAME,
  password: process.env.WIKI_PASSWORD,
  watchFolder: process.env.WATCH_FOLDER || './watch',
  spaceId: parseInt(process.env.SHARED_SPACE_ID || '2'),
  syncInterval: parseInt(process.env.SYNC_INTERVAL || '5000'),
  stateFile: path.join(__dirname, '.daemon-state.json'),
};

// Create and start daemon
const daemon = new WikiDaemon(config);

// Handle graceful shutdown
process.on('SIGINT', () => daemon.stop());
process.on('SIGTERM', () => daemon.stop());

// Start the daemon
daemon.start().catch((error) => {
  console.error('[Daemon] Fatal error:', error);
  process.exit(1);
});
