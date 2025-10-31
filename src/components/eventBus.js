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
    const { operation, itemType, source } = event.event;
    const spaceName = event.space.name;
    const { path } = event.item;
    const spacePath = event.context.fullPath;

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
}

module.exports = WikiEventBus;
