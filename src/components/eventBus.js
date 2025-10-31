/**
 * @fileoverview Centralized Event Bus for Wiki file/folder changes
 * Tracks and broadcasts all file/folder operations (create, update, delete)
 * from both the file watcher and API endpoints to connected Socket.IO clients
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-10-31
 */

'use strict';

const EventEmitter = require('events');

/**
 * WikiEventBus - Centralized event management for file/folder changes
 * Normalizes events from multiple sources and broadcasts to Socket.IO clients
 */
class WikiEventBus extends EventEmitter {
  constructor(logger, io) {
    super();
    this.logger = logger;
    this.io = io;
    this.eventHistory = [];
    this.maxHistorySize = 1000; // Keep last 1000 events in history
  }

  /**
   * Emit a file change event
   * Normalizes event format and broadcasts to all connected clients
   *
   * @param {string} operation - 'create', 'update', or 'delete'
   * @param {string} itemType - 'file' or 'folder'
   * @param {Object} metadata - File/folder metadata
   * @param {number} metadata.spaceId - Space ID
   * @param {string} metadata.spaceName - Space name
   * @param {string} metadata.name - File/folder name
   * @param {string} metadata.path - Relative path from space root
   * @param {string} [metadata.parentPath] - Parent directory path
   * @param {string} [metadata.timestamp] - ISO timestamp
   * @param {number} [metadata.size] - File size in bytes
   * @param {string} [metadata.modified] - Last modified timestamp
   * @param {string} [metadata.created] - Creation timestamp
   * @param {string} [metadata.source] - Event source ('file-watcher' or 'api')
   * @return {void}
   */
  emitChange(operation, itemType, metadata = {}) {
    // Validate inputs
    const validOperations = ['create', 'update', 'delete'];
    const validItemTypes = ['file', 'folder'];

    if (!validOperations.includes(operation)) {
      this.logger.warn(`Invalid operation: ${operation}`);
      return;
    }

    if (!validItemTypes.includes(itemType)) {
      this.logger.warn(`Invalid item type: ${itemType}`);
      return;
    }

    // Normalize event data
    const event = this.normalizeEvent(operation, itemType, metadata);

    // Add to history
    this.addToHistory(event);

    // Log event
    this.logEvent(event);

    // Emit internally (for potential local listeners)
    super.emit('change', event);

    // Broadcast to all connected Socket.IO clients
    if (this.io) {
      this.io.emit('wiki:file-change', event);
    }
  }

  /**
   * Normalize event data into a consistent format
   * @private
   */
  normalizeEvent(operation, itemType, metadata) {
    const timestamp = new Date().toISOString();

    return {
      // Event metadata
      event: {
        id: this.generateEventId(),
        timestamp: timestamp,
        type: `${itemType}:${operation}`,
        operation: operation, // 'create', 'update', 'delete'
        itemType: itemType,    // 'file', 'folder'
        source: metadata.source || 'unknown' // 'file-watcher' or 'api'
      },

      // Space information
      space: {
        id: metadata.spaceId,
        name: metadata.spaceName
      },

      // Item information
      item: {
        name: metadata.name,
        path: metadata.path,
        parentPath: metadata.parentPath || '',
        type: itemType,
        ...(metadata.size !== undefined && { size: metadata.size }),
        ...(metadata.created && { created: metadata.created }),
        ...(metadata.modified && { modified: metadata.modified }),
        ...(metadata.timestamp && { timestamp: metadata.timestamp })
      },

      // Additional context
      context: {
        fullPath: `${metadata.spaceName}/${metadata.path}`,
        changed: timestamp,
        ...(metadata.userId && { userId: metadata.userId }),
        ...(metadata.userName && { userName: metadata.userName })
      }
    };
  }

  /**
   * Add event to history (with size limit)
   * @private
   */
  addToHistory(event) {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Log event with detailed information
   * @private
   */
  logEvent(event) {
    const { operation, itemType, source, id } = event.event;
    const spaceName = event.space.name;
    const { path } = event.item;
    const spacePath = event.context.fullPath;
    const timestamp = new Date(event.event.timestamp).toLocaleTimeString();

    // Color coding for console output
    const colors = {
      create: 'color: #4CAF50; font-weight: bold;',  // Green
      update: 'color: #2196F3; font-weight: bold;',  // Blue
      delete: 'color: #F44336; font-weight: bold;'   // Red
    };

    const color = colors[operation] || 'color: #999;';

    // Console group for detailed event logging
    console.group(
      `%c[WIKI-EVENT-BUS] ${operation.toUpperCase()} ${itemType.toUpperCase()} @ ${timestamp}`,
      `${color} background-color: #f5f5f5; padding: 4px 8px; border-radius: 3px;`
    );

    console.log('%c📋 Event ID:', 'color: #666; font-weight: bold;', id);
    console.log('%c🗂️  Space:', 'color: #9C27B0; font-weight: bold;', `${spaceName}`);
    console.log('%c📄 Path:', 'color: #FF9800; font-weight: bold;', path);
    console.log('%c📍 Full Path:', 'color: #673AB7; font-weight: bold;', spacePath);
    console.log('%c📡 Source:', 'color: #0288D1; font-weight: bold;', source);

    console.log('%c📦 Full Event Object:', 'color: #1976D2; font-weight: bold;');
    console.log(event);

    console.groupEnd();

    // Also log to the logger service for persistence
    const logMessage =
      `[WIKI-EVENT] ${operation.toUpperCase()} ${itemType.toUpperCase()} ` +
      `(${source}) | Space: "${spaceName}" | Path: "${path}" | ` +
      `Full: "${spacePath}"`;

    switch (operation) {
      case 'create':
        this.logger.info(logMessage);
        break;
      case 'update':
        this.logger.info(logMessage);
        break;
      case 'delete':
        this.logger.warn(logMessage);
        break;
      default:
        this.logger.debug(logMessage);
    }
  }

  /**
   * Generate unique event ID
   * @private
   */
  generateEventId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get recent events from history
   * @param {number} limit - Number of recent events to return
   * @return {Array} Array of recent events
   */
  getRecentEvents(limit = 50) {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get event history statistics
   * @return {Object} Statistics about event history
   */
  getStatistics() {
    const stats = {
      totalEvents: this.eventHistory.length,
      byOperation: { create: 0, update: 0, delete: 0 },
      byItemType: { file: 0, folder: 0 },
      bySource: { 'file-watcher': 0, api: 0, unknown: 0 },
      bySpace: {}
    };

    for (const event of this.eventHistory) {
      stats.byOperation[event.event.operation] = (stats.byOperation[event.event.operation] || 0) + 1;
      stats.byItemType[event.event.itemType] = (stats.byItemType[event.event.itemType] || 0) + 1;
      stats.bySource[event.event.source] = (stats.bySource[event.event.source] || 0) + 1;

      const spaceName = event.space.name;
      stats.bySpace[spaceName] = (stats.bySpace[spaceName] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clear event history
   * @return {void}
   */
  clearHistory() {
    this.eventHistory = [];
    this.logger.info('Event history cleared');
  }

  /**
   * Filter events from history
   * @param {Function} predicate - Filter function
   * @return {Array} Filtered events
   */
  filterEvents(predicate) {
    return this.eventHistory.filter(predicate);
  }

  /**
   * Subscribe to events locally
   * Allows backend components to listen for file/folder changes
   * @param {string} eventType - Event type to listen for ('change', or specific 'file:create', 'folder:delete', etc.)
   * @param {Function} callback - Callback function called with event object
   * @return {Function} Unsubscribe function
   */
  subscribe(eventType = 'change', callback) {
    // Subscribe to internal event emitter
    this.on(eventType, callback);

    // Return unsubscribe function
    return () => {
      this.off(eventType, callback);
    };
  }

  /**
   * Get a human-readable summary of event activity
   * @return {Object} Summary of recent activity
   */
  getActivitySummary() {
    const stats = this.getStatistics();
    const recent = this.getRecentEvents(5);

    return {
      stats: stats,
      recentEvents: recent.map(event => ({
        id: event.event.id,
        type: event.event.type,
        timestamp: event.event.timestamp,
        spaceName: event.space.name,
        itemName: event.item.name,
        itemPath: event.item.path,
        source: event.event.source
      }))
    };
  }

  /**
   * Display event summary to console
   * Useful for debugging and monitoring
   * @return {void}
   */
  printSummary() {
    const summary = this.getActivitySummary();

    console.group('%c[WIKI-EVENT-BUS] Activity Summary', 'color: white; background-color: #3F51B5; padding: 4px 8px; border-radius: 3px; font-weight: bold;');

    console.log('%c📊 Statistics:', 'color: #1976D2; font-weight: bold;', summary.stats);

    if (summary.recentEvents.length > 0) {
      console.log('%c🕐 Recent Events:', 'color: #F57C00; font-weight: bold;');
      console.table(summary.recentEvents);
    }

    console.groupEnd();

    return summary;
  }
}

module.exports = WikiEventBus;
