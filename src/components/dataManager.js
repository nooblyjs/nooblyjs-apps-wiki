/**
 * @fileoverview Data Manager Service for Wiki Application
 * Handles JSON file persistence for wiki data (documents, spaces, users, etc.)
 * Uses NooblyJS Core filer service for file operations
 *
 * @author NooblyJS Core Team
 * @version 1.0.0
 * @since 2025-08-24
 */

'use strict';

const path = require('path');

/**
 * Data Manager Class
 * Manages all JSON file persistence operations for wiki application data
 */
class DataManager {
  constructor(dataDir = './application/', filerService = null) {
    this.dataDir = dataDir;
    this.filer = filerService;
  }

  getFilePath(type) {
    return path.join(this.dataDir, `${type}.json`);
  }

  async read(type) {
    try {
      const filePath = this.getFilePath(type);
      const data = await this.filer.read(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid
      // Return null for non-array data types (settings, user data, etc)
      // Return empty array for known array types
      const arrayTypes = ['spaces', 'documents', 'folders', 'users'];
      if (arrayTypes.includes(type) || type.startsWith('chatHistory_')) {
        return [];
      }
      return null;
    }
  }

  async write(type, data) {
    try {
      const filePath = this.getFilePath(type);
      await this.filer.create(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      return false;
    }
  }

  async add(type, item) {
    const data = await this.read(type);
    
    // Generate ID if not provided
    if (!item.id) {
      const maxId = data.length > 0 ? Math.max(...data.map(d => d.id || 0)) : 0;
      item.id = maxId + 1;
    }
    
    data.push(item);
    await this.write(type, data);
    return item.id;
  }

  async update(type, id, updates) {
    const data = await this.read(type);
    const index = data.findIndex(item => item.id === id);
    
    if (index !== -1) {
      data[index] = { ...data[index], ...updates };
      await this.write(type, data);
      return data[index];
    }
    return null;
  }

  async remove(type, id) {
    const data = await this.read(type);
    const filtered = data.filter(item => item.id !== id);
    
    if (filtered.length !== data.length) {
      await this.write(type, filtered);
      return true;
    }
    return false;
  }

  async find(type, filter = {}) {
    const data = await this.read(type);
    
    if (Object.keys(filter).length === 0) {
      return data;
    }
    
    return data.filter(item => {
      return Object.entries(filter).every(([key, value]) => {
        return item[key] === value;
      });
    });
  }

  // Folder-specific methods
  async createFolder(spaceId, folderName, parentPath = '') {
    const folders = await this.read('folders');
    const folder = {
      id: folders.length > 0 ? Math.max(...folders.map(f => f.id || 0)) + 1 : 1,
      name: folderName,
      spaceId: spaceId,
      parentPath: parentPath,
      path: parentPath ? `${parentPath}/${folderName}` : folderName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    folders.push(folder);
    await this.write('folders', folders);
    return folder;
  }

  async getFolderTree(spaceId) {
    // Get space name from spaces data
    const spaces = await this.read('spaces');
    const space = spaces.find(s => s.id === spaceId);
    if (!space) {
      return [];
    }

    // Read from physical file system
    return this.getFolderTreeFromFileSystem(space.name);
  }

  async getFolderTreeFromFileSystem(spaceName) {
    try {
      // Get space configuration to find actual path
      const spaces = await this.read('spaces');
      const space = spaces.find(s => s.name === spaceName);

      let spaceDir;
      if (space && space.path) {
        // Use absolute path from space configuration
        spaceDir = space.path;
      } else {
        // Fallback to old behavior
        const documentsDir = path.join(process.cwd(), 'documents');
        spaceDir = path.join(documentsDir, spaceName);
      }

      // Check if space directory exists using filer
      try {
        await this.filer.list(spaceDir);
      } catch (error) {
        // Directory doesn't exist, return empty tree
        return [];
      }

      return await this.buildFileSystemTree(spaceDir, spaceName);
    } catch (error) {
      return [];
    }
  }

  async buildFileSystemTree(dirPath, spaceName, relativePath = '') {
    const tree = [];

    try {
      const entries = await this.filer.list(dirPath);

      for (const entryName of entries) {
        const fullPath = path.join(dirPath, entryName);
        const relativeEntryPath = relativePath ? `${relativePath}/${entryName}` : entryName;

        try {
          // Try to list the entry to see if it's a directory
          await this.filer.list(fullPath);

          // It's a folder
          const children = await this.buildFileSystemTree(fullPath, spaceName, relativeEntryPath);
          tree.push({
            type: 'folder',
            name: entryName,
            path: relativeEntryPath,
            children: children
          });
        } catch (listError) {
          // It's a file (list failed)
          tree.push({
            type: 'document',
            name: entryName,
            title: entryName,
            path: relativeEntryPath,
            fileName: entryName,
            spaceName: spaceName
          });
        }
      }

      // Sort: folders first, then files, both alphabetically
      tree.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

    } catch (error) {
      // Error reading directory - return current tree state
    }

    return tree;
  }

  buildFolderTree(folders, documents) {
    const tree = [];
    const folderMap = new Map();
    
    // Create folder nodes
    folders.forEach(folder => {
      folderMap.set(folder.path, {
        ...folder,
        type: 'folder',
        children: [],
        documents: []
      });
    });
    
    // Add documents to appropriate folders or root
    documents.forEach(doc => {
      const folderPath = doc.folderPath || '';
      if (folderPath && folderMap.has(folderPath)) {
        folderMap.get(folderPath).documents.push({
          ...doc,
          type: 'document'
        });
      } else {
        tree.push({
          ...doc,
          type: 'document'
        });
      }
    });
    
    // Build tree structure
    folders.forEach(folder => {
      if (!folder.parentPath) {
        // Root level folder
        tree.push(folderMap.get(folder.path));
      } else {
        // Child folder
        const parent = folderMap.get(folder.parentPath);
        if (parent) {
          parent.children.push(folderMap.get(folder.path));
        }
      }
    });
    
    return tree;
  }

  async updateDocumentFolder(documentId, newFolderPath) {
    const documents = await this.read('documents');
    const docIndex = documents.findIndex(doc => doc.id === documentId);
    
    if (docIndex !== -1) {
      documents[docIndex].folderPath = newFolderPath;
      documents[docIndex].updatedAt = new Date().toISOString();
      await this.write('documents', documents);
      return documents[docIndex];
    }
    return null;
  }
}

module.exports = DataManager;