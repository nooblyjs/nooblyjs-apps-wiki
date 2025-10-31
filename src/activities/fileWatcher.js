/**
 * @fileoverview Real-time file system watcher for wiki documents
 * Monitors file changes and emits Socket.IO events for live UI updates
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-10-10
 */

'use strict';

const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs').promises;
const { isTextFile, generateCacheKey } = require('../utils/fileTypeUtils');

/**
 * File change event debouncer to prevent duplicate events
 */
class ChangeDebouncer {
  constructor(delay = 500) {
    this.delay = delay;
    this.timers = new Map();
  }

  debounce(key, callback) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    const timer = setTimeout(() => {
      this.timers.delete(key);
      callback();
    }, this.delay);

    this.timers.set(key, timer);
  }
}

/**
 * Start file system watcher for real-time updates
 * @param {Object} services - NooblyJS services object
 */
function startFileWatcher(services) {
  const { dataManager, filing, cache, logger, io } = services;
  const debouncer = new ChangeDebouncer(1000);

  logger.info('Starting file watcher for real-time updates...');

  // Get all space paths to watch
  (async () => {
    try {
      const spaces = await dataManager.read('spaces');
      const watchedPaths = new Map(); // Map of path -> space data

      for (const space of spaces) {
        if (space.path) {
          watchedPaths.set(space.path, space);
        }
      }

      if (watchedPaths.size === 0) {
        logger.warn('No space paths found to watch');
        return;
      }

      // Initialize watcher for all space paths
      const watcher = chokidar.watch(Array.from(watchedPaths.keys()), {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 100
        },
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.DS_Store',
          '**/Thumbs.db'
        ]
      });

      // Handle file/folder added
      watcher.on('add', async (filePath) => {
        debouncer.debounce(`add:${filePath}`, async () => {
          try {
            await handleFileAdded(filePath, watchedPaths, services);
          } catch (error) {
            logger.error(`Error handling file add: ${filePath}`, error);
          }
        });
      });

      // Handle folder added
      watcher.on('addDir', async (dirPath) => {
        debouncer.debounce(`addDir:${dirPath}`, async () => {
          try {
            await handleFolderAdded(dirPath, watchedPaths, services);
          } catch (error) {
            logger.error(`Error handling folder add: ${dirPath}`, error);
          }
        });
      });

      // Handle file changed
      watcher.on('change', async (filePath) => {
        debouncer.debounce(`change:${filePath}`, async () => {
          try {
            await handleFileChanged(filePath, watchedPaths, services);
          } catch (error) {
            logger.error(`Error handling file change: ${filePath}`, error);
          }
        });
      });

      // Handle file/folder deleted
      watcher.on('unlink', async (filePath) => {
        debouncer.debounce(`unlink:${filePath}`, async () => {
          try {
            await handleFileDeleted(filePath, watchedPaths, services);
          } catch (error) {
            logger.error(`Error handling file delete: ${filePath}`, error);
          }
        });
      });

      watcher.on('unlinkDir', async (dirPath) => {
        debouncer.debounce(`unlinkDir:${dirPath}`, async () => {
          try {
            await handleFolderDeleted(dirPath, watchedPaths, services);
          } catch (error) {
            logger.error(`Error handling folder delete: ${dirPath}`, error);
          }
        });
      });

      // Handle watcher errors
      watcher.on('error', (error) => {
        logger.error('File watcher error:', error);
      });

      // Log watcher ready
      watcher.on('ready', () => {
        logger.info(`File watcher initialized. Watching ${watchedPaths.size} space(s)`);
        for (const [spacePath, space] of watchedPaths) {
          logger.info(`  - Watching: ${spacePath} (${space.name})`);
        }
      });

    } catch (error) {
      logger.error('Failed to start file watcher:', error);
    }
  })();
}

/**
 * Clear all relevant caches when folder structure changes
 * Invalidates folder, space, and search caches
 * @private
 */
async function invalidateFolderCaches(relativePath, space, cache, logger) {
  try {
    const parentPath = path.dirname(relativePath);

    // Clear the file content cache if this is a file (not just a folder)
    // File content cache key is: ${spaceName}-${documentPath}
    await cache.delete(`${space.name}-${relativePath}`);
    logger.info(`[Cache] Cleared file content cache: ${space.name}-${relativePath}`);

    // Clear caches for the parent folder and all ancestors
    let currentPath = parentPath;
    while (currentPath && currentPath !== '.') {
      // Folder structure cache for this path
      await cache.delete(`wiki:folder:${space.id}:${currentPath}`);
      await cache.delete(`wiki:folder:${space.name}:${currentPath}`);

      // Move up the directory tree
      const lastSlash = currentPath.lastIndexOf('/');
      currentPath = lastSlash === -1 ? '.' : currentPath.substring(0, lastSlash);
    }

    // Clear root folder cache
    await cache.delete(`wiki:folder:${space.id}:`);
    await cache.delete(`wiki:folder:${space.name}:`);

    // Clear general folder/document list caches
    await cache.delete('wiki:documents:list');
    await cache.delete('wiki:documents:recent');
    await cache.delete('wiki:recent:activity');
    await cache.delete(`wiki:space:${space.id}:documents`);

    // Clear search caches
    await cache.delete('wiki:search:*');

    logger.info(`[Cache] Invalidated folder caches for: ${space.name}/${relativePath}`);
  } catch (error) {
    logger.warn(`Failed to invalidate folder caches:`, error.message);
  }
}

/**
 * Handle file added event
 */
async function handleFileAdded(filePath, watchedPaths, services) {
  const { logger, cache } = services;
  const space = findSpaceForPath(filePath, watchedPaths);

  if (!space) {
    logger.warn(`No space found for file: ${filePath}`);
    return;
  }

  const fileName = path.basename(filePath);
  const relativePath = getRelativePath(filePath, space.path);
  const parentPath = path.dirname(relativePath);

  logger.info(`File added: ${fileName} in ${space.name} at ${relativePath}`);

  // Get file stats
  const stats = await getFileStats(filePath);

  // Pre-cache text-based files
  if (isTextFile(filePath)) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const cacheKey = generateCacheKey(space.name, relativePath);
      await cache.put(cacheKey, content, 1800);
      logger.info(`Pre-cached new file: ${cacheKey}`);
    } catch (error) {
      logger.warn(`Failed to pre-cache ${relativePath}:`, error.message);
    }
  }

  // Invalidate all relevant folder and structure caches
  await invalidateFolderCaches(relativePath, space, cache, logger);

  // Emit event through centralized Event Bus
  if (global.eventBus) {
    global.eventBus.emitChange('create', 'file', {
      spaceId: space.id,
      spaceName: space.name,
      name: fileName,
      path: relativePath,
      parentPath: parentPath === '.' ? '' : parentPath,
      created: stats.created,
      modified: stats.modified,
      size: stats.size,
      source: 'file-watcher'
    });
  }
}

/**
 * Handle folder added event
 */
async function handleFolderAdded(dirPath, watchedPaths, services) {
  const { logger, cache } = services;
  const space = findSpaceForPath(dirPath, watchedPaths);

  if (!space) {
    logger.warn(`No space found for folder: ${dirPath}`);
    return;
  }

  const folderName = path.basename(dirPath);
  const relativePath = getRelativePath(dirPath, space.path);
  const parentPath = path.dirname(relativePath);

  logger.info(`Folder added: ${folderName} in ${space.name} at ${relativePath}`);

  // Get folder stats
  const stats = await getFileStats(dirPath);

  // Invalidate all relevant folder and structure caches
  await invalidateFolderCaches(relativePath, space, cache, logger);

  // Emit event through centralized Event Bus
  if (global.eventBus) {
    global.eventBus.emitChange('create', 'folder', {
      spaceId: space.id,
      spaceName: space.name,
      name: folderName,
      path: relativePath,
      parentPath: parentPath === '.' ? '' : parentPath,
      created: stats.created,
      modified: stats.modified,
      source: 'file-watcher'
    });
  }
}

/**
 * Handle file changed event
 */
async function handleFileChanged(filePath, watchedPaths, services) {
  const { logger, cache } = services;
  const space = findSpaceForPath(filePath, watchedPaths);

  if (!space) return;

  const fileName = path.basename(filePath);
  const relativePath = getRelativePath(filePath, space.path);

  logger.info(`File changed: ${fileName} in ${space.name}`);

  // Get file stats
  const stats = await getFileStats(filePath);

  // Update cache for text-based files
  if (isTextFile(filePath)) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const cacheKey = generateCacheKey(space.name, relativePath);
      await cache.put(cacheKey, content, 1800);
      logger.info(`Updated cache for changed file: ${cacheKey}`);
    } catch (error) {
      logger.warn(`Failed to update cache for ${relativePath}:`, error.message);
    }
  }

  // Invalidate folder structure and search caches
  await invalidateFolderCaches(relativePath, space, cache, logger);

  // Emit event through centralized Event Bus
  if (global.eventBus) {
    global.eventBus.emitChange('update', 'file', {
      spaceId: space.id,
      spaceName: space.name,
      name: fileName,
      path: relativePath,
      modified: stats.modified,
      size: stats.size,
      source: 'file-watcher'
    });
  }
}

/**
 * Handle file deleted event
 */
async function handleFileDeleted(filePath, watchedPaths, services) {
  const { logger, cache } = services;
  const space = findSpaceForPath(filePath, watchedPaths);

  if (!space) return;

  const fileName = path.basename(filePath);
  const relativePath = getRelativePath(filePath, space.path);

  logger.info(`File deleted: ${fileName} from ${space.name}`);

  // Invalidate cache for text-based files
  if (isTextFile(filePath)) {
    try {
      const cacheKey = generateCacheKey(space.name, relativePath);
      await cache.delete(cacheKey);
      logger.info(`Invalidated cache for deleted file: ${cacheKey}`);
    } catch (error) {
      logger.warn(`Failed to invalidate cache for ${relativePath}:`, error.message);
    }
  }

  // Invalidate folder structure and search caches
  await invalidateFolderCaches(relativePath, space, cache, logger);

  // Emit event through centralized Event Bus
  if (global.eventBus) {
    global.eventBus.emitChange('delete', 'file', {
      spaceId: space.id,
      spaceName: space.name,
      name: fileName,
      path: relativePath,
      source: 'file-watcher'
    });
  }
}

/**
 * Handle folder deleted event
 */
async function handleFolderDeleted(dirPath, watchedPaths, services) {
  const { logger, cache } = services;
  const space = findSpaceForPath(dirPath, watchedPaths);

  if (!space) return;

  const folderName = path.basename(dirPath);
  const relativePath = getRelativePath(dirPath, space.path);

  logger.info(`Folder deleted: ${folderName} from ${space.name}`);

  // Invalidate folder structure and search caches
  await invalidateFolderCaches(relativePath, space, cache, logger);

  // Emit event through centralized Event Bus
  if (global.eventBus) {
    global.eventBus.emitChange('delete', 'folder', {
      spaceId: space.id,
      spaceName: space.name,
      name: folderName,
      path: relativePath,
      source: 'file-watcher'
    });
  }
}

/**
 * Find the space that contains the given path
 */
function findSpaceForPath(filePath, watchedPaths) {
  for (const [spacePath, space] of watchedPaths) {
    if (filePath.startsWith(spacePath)) {
      return space;
    }
  }
  return null;
}

/**
 * Get relative path from space root
 */
function getRelativePath(fullPath, spacePath) {
  return path.relative(spacePath, fullPath);
}

/**
 * Get file/folder stats
 */
async function getFileStats(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      size: stats.size
    };
  } catch (error) {
    return {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      size: 0
    };
  }
}

module.exports = {
  startFileWatcher
};
