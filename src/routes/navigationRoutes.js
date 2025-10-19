/**
 * @fileoverview Navigation API routes for Wiki application
 * Handles folder management, file operations, and document navigation
 *
 * @author NooblyJS Core Team
 * @version 1.0.14
 * @since 1.0.0
 */

'use strict';
const path = require('path');

/**
 * Configures and registers navigation routes with the Express application.
 *
 * @param {Object} options - Configuration options object
 * @param {Object} eventEmitter - Event emitter for logging and notifications
 * @param {Object} services - NooblyJS Core services (dataManager, filing, cache, logger, queue, search)
 * @return {void}
 */
module.exports = (options, eventEmitter, services) => {

  const app = options.app;
  const { dataManager, filing, cache, logger, queue, search, searchIndexer } = services;

  // Move document to folder
  app.put('/applications/wiki/api/documents/:id/move', async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const { folderPath } = req.body;

      logger.info(`Moving document ${documentId} to folder: ${folderPath || 'root'}`);

      const updatedDoc = await dataManager.updateDocumentFolder(documentId, folderPath);

      if (!updatedDoc) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }

      // Clear relevant caches
      await cache.delete(`wiki:document:${documentId}:full`);
      await cache.delete('wiki:documents:list');

      logger.info(`Moved document ${documentId} to folder: ${folderPath || 'root'}`);

      res.json({ success: true, document: updatedDoc });
    } catch (error) {
      logger.error('Error moving document:', error);
      res.status(500).json({ success: false, message: 'Failed to move document' });
    }
  });

  // Enhanced folder creation to support system folders like .templates
  app.post('/applications/wiki/api/folders', async (req, res) => {
    try {
      const { name, spaceId, parentPath } = req.body;

      if (!name || !spaceId) {
        return res.status(400).json({
          success: false,
          message: 'Folder name and space ID are required'
        });
      }

      logger.info(`Creating folder: ${name} in space ${spaceId}, parent: ${parentPath || 'root'}`);
      logger.info(`Raw parentPath value: "${parentPath}", type: ${typeof parentPath}`);

      // Find the space
      const spaces = await dataManager.read('spaces');
      const space = spaces.find(s => s.id === parseInt(spaceId));

      if (!space) {
        return res.status(404).json({ success: false, message: 'Space not found' });
      }

      // Create the physical folder
      const fs = require('fs').promises;

      // Use space's configured path if available, otherwise fall back to documents/spaceName
      let spaceBaseDir;
      if (space.path) {
        spaceBaseDir = space.path;
      } else {
        const documentsDir = path.resolve(__dirname, '../../../documents');
        spaceBaseDir = path.resolve(documentsDir, space.name);
      }

      const folderPath = parentPath ? `${parentPath}/${name}` : name;
      const absolutePath = path.resolve(spaceBaseDir, folderPath);

      logger.info(`Space base dir: "${spaceBaseDir}"`);
      logger.info(`Computed folderPath: "${folderPath}"`);
      logger.info(`Final absolutePath: "${absolutePath}"`);

      // Security check - ensure the path is within the space's base directory
      if (!absolutePath.startsWith(spaceBaseDir)) {
        logger.warn(`Blocked attempt to create folder outside space directory: ${folderPath}`);
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      try {
        await fs.mkdir(absolutePath, { recursive: true });

        const folder = {
          id: Date.now(), // Simple ID generation
          name: name,
          path: folderPath,
          spaceId: parseInt(spaceId),
          spaceName: space.name,
          parentPath: parentPath || null,
          createdAt: new Date().toISOString(),
          type: 'folder'
        };

        logger.info(`Created folder: ${name} at ${folderPath}`);

        res.json({ success: true, folder });
      } catch (fileError) {
        logger.error(`Failed to create folder ${folderPath}:`, fileError);
        res.status(500).json({
          success: false,
          message: 'Failed to create folder: ' + fileError.message
        });
      }
    } catch (error) {
      logger.error('Error creating folder:', error);
      res.status(500).json({ success: false, message: 'Failed to create folder' });
    }
  });

  // Rename folder endpoint
  app.put('/applications/wiki/api/folders/rename', async (req, res) => {
    try {
      const { spaceId, oldPath, newName } = req.body;

      if (!spaceId || !oldPath || !newName) {
        return res.status(400).json({
          success: false,
          message: 'Space ID, old path, and new name are required'
        });
      }

      logger.info(`Renaming folder: ${oldPath} to ${newName} in space ${spaceId}`);

      // Find the space
      const spaces = await dataManager.read('spaces');
      const space = spaces.find(s => s.id === parseInt(spaceId));

      if (!space) {
        return res.status(404).json({ success: false, message: 'Space not found' });
      }

      // Calculate new path
      const parentPath = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/')) : '';
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;

      // Create the physical folder paths
      const fs = require('fs').promises;

      // Use space's configured path if available
      let spaceBaseDir;
      if (space.path) {
        spaceBaseDir = space.path;
      } else {
        const documentsDir = path.resolve(__dirname, '../../../documents');
        spaceBaseDir = path.resolve(documentsDir, space.name);
      }

      const oldAbsolutePath = path.resolve(spaceBaseDir, oldPath);
      const newAbsolutePath = path.resolve(spaceBaseDir, newPath);

      // Security check
      if (!oldAbsolutePath.startsWith(spaceBaseDir) || !newAbsolutePath.startsWith(spaceBaseDir)) {
        logger.warn(`Blocked attempt to rename folder outside space directory`);
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      try {
        // Check if old folder exists
        await fs.access(oldAbsolutePath);

        // Check if new name already exists
        try {
          await fs.access(newAbsolutePath);
          return res.status(409).json({
            success: false,
            message: 'A folder with that name already exists'
          });
        } catch (existsError) {
          // Good, new name doesn't exist
        }

        // Rename the folder
        await fs.rename(oldAbsolutePath, newAbsolutePath);

        logger.info(`Successfully renamed folder from ${oldPath} to ${newPath}`);

        res.json({
          success: true,
          message: 'Folder renamed successfully',
          newPath: newPath
        });
      } catch (fileError) {
        logger.error(`Failed to rename folder ${oldPath}:`, fileError);
        if (fileError.code === 'ENOENT') {
          res.status(404).json({
            success: false,
            message: 'Folder not found'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to rename folder: ' + fileError.message
          });
        }
      }
    } catch (error) {
      logger.error('Error renaming folder:', error);
      res.status(500).json({ success: false, message: 'Failed to rename folder' });
    }
  });

  // Rename document/file endpoint
  app.put('/applications/wiki/api/documents/rename', async (req, res) => {
    try {
      const { spaceName, oldPath, newName } = req.body;

      if (!spaceName || !oldPath || !newName) {
        return res.status(400).json({
          success: false,
          message: 'Space name, old path, and new name are required'
        });
      }

      logger.info(`Renaming file: ${oldPath} to ${newName} in space ${spaceName}`);

      // Find the space
      const spaces = await dataManager.read('spaces');
      const space = spaces.find(s => s.name === spaceName);

      if (!space) {
        return res.status(404).json({ success: false, message: 'Space not found' });
      }

      // Calculate new path
      const parentPath = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/')) : '';
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;

      // Create the physical file paths
      const fs = require('fs').promises;

      // Use space's configured path if available
      let spaceBaseDir;
      if (space.path) {
        spaceBaseDir = space.path;
      } else {
        const documentsDir = path.resolve(__dirname, '../../../documents');
        spaceBaseDir = path.resolve(documentsDir, space.name);
      }

      const oldAbsolutePath = path.resolve(spaceBaseDir, oldPath);
      const newAbsolutePath = path.resolve(spaceBaseDir, newPath);

      // Security check
      if (!oldAbsolutePath.startsWith(spaceBaseDir) || !newAbsolutePath.startsWith(spaceBaseDir)) {
        logger.warn(`Blocked attempt to rename file outside space directory`);
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      try {
        // Check if old file exists
        await fs.access(oldAbsolutePath);

        // Check if new name already exists
        try {
          await fs.access(newAbsolutePath);
          return res.status(409).json({
            success: false,
            message: 'A file with that name already exists'
          });
        } catch (existsError) {
          // Good, new name doesn't exist
        }

        // Rename the file
        await fs.rename(oldAbsolutePath, newAbsolutePath);

        // Update search index: remove old path and add new path
        if (searchIndexer) {
          searchIndexer.removeFileFromIndex(oldPath);
          await searchIndexer.updateFile(newAbsolutePath, spaceName);
          logger.info(`Updated search index: renamed ${oldPath} to ${newPath}`);
        }

        logger.info(`Successfully renamed file from ${oldPath} to ${newPath}`);

        res.json({
          success: true,
          message: 'File renamed successfully',
          newPath: newPath
        });
      } catch (fileError) {
        logger.error(`Failed to rename file ${oldPath}:`, fileError);
        if (fileError.code === 'ENOENT') {
          res.status(404).json({
            success: false,
            message: 'File not found'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to rename file: ' + fileError.message
          });
        }
      }
    } catch (error) {
      logger.error('Error renaming file:', error);
      res.status(500).json({ success: false, message: 'Failed to rename file' });
    }
  });

  // Delete folder endpoint
  app.delete('/applications/wiki/api/folders/:path(*)', async (req, res) => {
    try {
      const folderPath = decodeURIComponent(req.params.path);
      const { spaceId } = req.body || {};

      logger.info(`Deleting folder: ${folderPath} in space ${spaceId}`);

      if (!folderPath) {
        return res.status(400).json({ success: false, message: 'Folder path is required' });
      }

      if (!spaceId) {
        return res.status(400).json({ success: false, message: 'Space ID is required' });
      }

      // Find the space
      const spaces = await dataManager.read('spaces');
      const space = spaces.find(s => s.id === parseInt(spaceId));

      if (!space) {
        return res.status(404).json({ success: false, message: 'Space not found' });
      }

      // Build the full path for the folder
      const fs = require('fs').promises;

      // Use space's configured path if available
      let spaceBaseDir;
      if (space.path) {
        spaceBaseDir = space.path;
      } else {
        const documentsDir = path.resolve(__dirname, '../../../documents');
        spaceBaseDir = path.resolve(documentsDir, space.name);
      }

      const fullFolderPath = path.resolve(spaceBaseDir, folderPath);

      // Security check
      if (!fullFolderPath.startsWith(spaceBaseDir)) {
        logger.warn(`Blocked attempt to delete folder outside space directory: ${folderPath}`);
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      try {
        // Check if folder exists
        await fs.access(fullFolderPath);

        // Delete the folder and all its contents recursively
        await fs.rm(fullFolderPath, { recursive: true, force: true });

        logger.info(`Successfully deleted folder: ${folderPath}`);
        res.json({ success: true, message: 'Folder deleted successfully' });

      } catch (deleteError) {
        logger.error(`Error deleting folder ${folderPath}:`, deleteError);
        if (deleteError.code === 'ENOENT') {
          res.status(404).json({ success: false, message: 'Folder not found' });
        } else {
          res.status(500).json({ success: false, message: 'Failed to delete folder: ' + deleteError.message });
        }
      }

    } catch (error) {
      logger.error('Error in delete folder endpoint:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // Delete document endpoint
  app.delete('/applications/wiki/api/documents/:path(*)', async (req, res) => {
    try {
      const filePath = decodeURIComponent(req.params.path);
      const { spaceId, spaceName } = req.body || {};

      logger.info(`Deleting document: ${filePath} in space ${spaceId}`);

      if (!filePath) {
        return res.status(400).json({ success: false, message: 'File path is required' });
      }

      // Find the space
      const spaces = await dataManager.read('spaces');
      let space;

      if (spaceId) {
        space = spaces.find(s => s.id === parseInt(spaceId));
      } else if (spaceName) {
        space = spaces.find(s => s.name === spaceName);
      }

      if (!space) {
        return res.status(404).json({ success: false, message: 'Space not found' });
      }

      // Build the full path for the file
      const fs = require('fs').promises;

      // Use space's configured path if available
      let spaceBaseDir;
      if (space.path) {
        spaceBaseDir = space.path;
      } else {
        const documentsDir = path.resolve(__dirname, '../../../documents');
        spaceBaseDir = path.resolve(documentsDir, space.name);
      }

      const fullFilePath = path.resolve(spaceBaseDir, filePath);

      // Security check
      if (!fullFilePath.startsWith(spaceBaseDir)) {
        logger.warn(`Blocked attempt to delete file outside space directory: ${filePath}`);
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      try {
        // Check if file exists
        await fs.access(fullFilePath);

        // Delete the file
        await fs.unlink(fullFilePath);

        // Remove from search index
        if (searchIndexer) {
          searchIndexer.removeFileFromIndex(filePath);
          logger.info(`Removed document from search index: ${filePath}`);
        }

        logger.info(`Successfully deleted document: ${filePath}`);
        res.json({ success: true, message: 'Document deleted successfully' });

      } catch (deleteError) {
        logger.error(`Error deleting document ${filePath}:`, deleteError);
        if (deleteError.code === 'ENOENT') {
          res.status(404).json({ success: false, message: 'Document not found' });
        } else {
          res.status(500).json({ success: false, message: 'Failed to delete document: ' + deleteError.message });
        }
      }

    } catch (error) {
      logger.error('Error in delete document endpoint:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // Move file or folder endpoint (for drag and drop)
  app.post('/applications/wiki/api/move', async (req, res) => {
    try {
      const { sourcePath, targetPath, spaceId, itemType } = req.body;

      // Validation
      if (!sourcePath || !spaceId || !itemType) {
        return res.status(400).json({
          success: false,
          message: 'Source path, space ID, and item type are required'
        });
      }

      if (!['file', 'folder'].includes(itemType)) {
        return res.status(400).json({
          success: false,
          message: 'Item type must be either "file" or "folder"'
        });
      }

      logger.info(`Moving ${itemType}: ${sourcePath} to ${targetPath || 'root'} in space ${spaceId}`);

      // Find the space
      const spaces = await dataManager.read('spaces');
      const space = spaces.find(s => s.id === parseInt(spaceId));

      if (!space) {
        return res.status(404).json({ success: false, message: 'Space not found' });
      }

      // Determine space base directory
      const fs = require('fs').promises;
      let spaceBaseDir;
      if (space.path) {
        spaceBaseDir = space.path;
      } else {
        const documentsDir = path.resolve(__dirname, '../../../documents');
        spaceBaseDir = path.resolve(documentsDir, space.name);
      }

      // Build absolute paths
      const sourceAbsolutePath = path.resolve(spaceBaseDir, sourcePath);

      // Calculate destination path
      let destinationAbsolutePath;
      if (!targetPath || targetPath === '' || targetPath === '/') {
        // Moving to root
        const itemName = path.basename(sourcePath);
        destinationAbsolutePath = path.resolve(spaceBaseDir, itemName);
      } else {
        // Moving to a folder
        const itemName = path.basename(sourcePath);
        destinationAbsolutePath = path.resolve(spaceBaseDir, targetPath, itemName);
      }

      // Security checks
      if (!sourceAbsolutePath.startsWith(spaceBaseDir)) {
        logger.warn(`Blocked attempt to move from outside space directory: ${sourcePath}`);
        return res.status(403).json({ success: false, message: 'Access denied: Invalid source path' });
      }

      if (!destinationAbsolutePath.startsWith(spaceBaseDir)) {
        logger.warn(`Blocked attempt to move to outside space directory: ${targetPath}`);
        return res.status(403).json({ success: false, message: 'Access denied: Invalid destination path' });
      }

      // Prevent moving to same location
      if (sourceAbsolutePath === destinationAbsolutePath) {
        return res.status(400).json({
          success: false,
          message: 'Source and destination are the same'
        });
      }

      // For folders: prevent moving into itself or its subdirectories
      if (itemType === 'folder') {
        if (destinationAbsolutePath.startsWith(sourceAbsolutePath + path.sep) ||
            destinationAbsolutePath === sourceAbsolutePath) {
          return res.status(400).json({
            success: false,
            message: 'Cannot move a folder into itself or its subdirectories'
          });
        }
      }

      try {
        // Check if source exists
        await fs.access(sourceAbsolutePath);

        // Check if destination already exists
        try {
          await fs.access(destinationAbsolutePath);
          return res.status(409).json({
            success: false,
            message: `A ${itemType} with that name already exists at the destination`
          });
        } catch (existsError) {
          // Good, destination doesn't exist
        }

        // Ensure destination directory exists
        const destinationDir = path.dirname(destinationAbsolutePath);
        await fs.mkdir(destinationDir, { recursive: true });

        // Perform the move
        await fs.rename(sourceAbsolutePath, destinationAbsolutePath);

        // Calculate the new relative path for response (normalize to forward slashes)
        const newRelativePath = path.relative(spaceBaseDir, destinationAbsolutePath).replace(/\\/g, '/');

        // Update search index for moved files
        if (searchIndexer) {
          if (itemType === 'file') {
            // For single file: remove old path and add new path
            searchIndexer.removeFileFromIndex(sourcePath);
            await searchIndexer.updateFile(destinationAbsolutePath, space.name);
            logger.info(`Updated search index: moved file ${sourcePath} to ${newRelativePath}`);
          } else if (itemType === 'folder') {
            // For folder: need to update all files within it
            // Remove old paths and re-index from new location
            const updateSearchIndexForFolder = async (folderPath, relativeBase) => {
              try {
                const items = await fs.readdir(folderPath, { withFileTypes: true });
                for (const item of items) {
                  const itemAbsPath = path.join(folderPath, item.name);
                  const oldRelativePath = path.join(relativeBase, item.name).replace(/\\/g, '/');

                  if (item.isFile()) {
                    searchIndexer.removeFileFromIndex(oldRelativePath);
                    await searchIndexer.updateFile(itemAbsPath, space.name);
                  } else if (item.isDirectory()) {
                    await updateSearchIndexForFolder(itemAbsPath, oldRelativePath);
                  }
                }
              } catch (err) {
                logger.warn(`Error updating search index for folder contents: ${err.message}`);
              }
            };

            await updateSearchIndexForFolder(destinationAbsolutePath, newRelativePath);
            logger.info(`Updated search index: moved folder ${sourcePath} to ${newRelativePath}`);
          }
        }

        // Update documents.json if this is a file or if it's a folder with documents inside
        if (itemType === 'file' || itemType === 'folder') {
          try {
            const documents = await dataManager.read('documents');
            let updated = false;

            for (const doc of documents) {
              // Check if this document's path needs updating
              if (doc.spaceId === parseInt(spaceId)) {
                const docFilePath = doc.filePath || doc.path;

                // Normalize paths for comparison (ensure forward slashes)
                const normalizedDocPath = docFilePath ? docFilePath.replace(/\\/g, '/') : '';
                const normalizedSourcePath = sourcePath.replace(/\\/g, '/');

                if (itemType === 'file' && normalizedDocPath === normalizedSourcePath) {
                  // Update single file
                  doc.filePath = newRelativePath;
                  doc.path = newRelativePath;
                  updated = true;
                  logger.info(`Updated document metadata: ${sourcePath} -> ${newRelativePath}`);
                } else if (itemType === 'folder' && normalizedDocPath && normalizedDocPath.startsWith(normalizedSourcePath + '/')) {
                  // Update files within moved folder
                  const relativePart = normalizedDocPath.substring(normalizedSourcePath.length + 1);
                  const newDocPath = path.join(newRelativePath, relativePart).replace(/\\/g, '/');
                  doc.filePath = newDocPath;
                  doc.path = newDocPath;
                  updated = true;
                  logger.info(`Updated document metadata: ${docFilePath} -> ${newDocPath}`);
                }
              }
            }

            if (updated) {
              await dataManager.write('documents', documents);
              logger.info(`Updated documents.json after moving ${itemType}`);
            }
          } catch (docError) {
            logger.warn(`Failed to update documents.json: ${docError.message}`);
            // Don't fail the whole operation if metadata update fails
          }
        }

        logger.info(`Successfully moved ${itemType} from ${sourcePath} to ${newRelativePath}`);

        res.json({
          success: true,
          message: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} moved successfully`,
          newPath: newRelativePath
        });

      } catch (fileError) {
        logger.error(`Failed to move ${itemType} ${sourcePath}:`, fileError);
        if (fileError.code === 'ENOENT') {
          res.status(404).json({
            success: false,
            message: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} not found`
          });
        } else {
          res.status(500).json({
            success: false,
            message: `Failed to move ${itemType}: ` + fileError.message
          });
        }
      }

    } catch (error) {
      logger.error('Error in move endpoint:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
};
