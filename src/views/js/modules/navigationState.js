/**
 * @fileoverview Navigation State Manager
 * Manages the state of the navigation tree including expanded folders
 * and provides methods to dynamically update the tree without full refresh
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-10-31
 */

'use strict';

class NavigationState {
  constructor() {
    // Track which folders are expanded by folder ID
    this.expandedFolders = new Set();
    this.currentSpace = null;
    this.currentFolder = null;
  }

  /**
   * Get the folder ID for a given path
   * Converts path to safe ID format (docs/test -> folder-docs-test)
   * @param {string} folderPath - The folder path
   * @return {string} The folder ID
   */
  getFolderId(folderPath) {
    return `folder-${folderPath.replace(/[^a-zA-Z0-9]/g, '-')}`;
  }

  /**
   * Check if a folder is expanded
   * @param {string} folderPath - The folder path
   * @return {boolean} Whether the folder is expanded
   */
  isFolderExpanded(folderPath) {
    const folderId = this.getFolderId(folderPath);
    return this.expandedFolders.has(folderId);
  }

  /**
   * Mark a folder as expanded and update DOM
   * @param {string} folderPath - The folder path
   * @return {void}
   */
  markFolderExpanded(folderPath) {
    const folderId = this.getFolderId(folderPath);
    this.expandedFolders.add(folderId);

    // Also update DOM state if folder exists
    const folderItem = document.querySelector(`[data-folder-id="${folderId}"]`);
    const folderChildren = document.querySelector(`[data-folder-children="${folderId}"]`);

    if (folderItem && folderChildren) {
      folderItem.classList.add('expanded');
      folderChildren.classList.add('expanded');
      const chevronIcon = folderItem.querySelector('.chevron-icon');
      if (chevronIcon) {
        chevronIcon.className = 'bi bi-chevron-down chevron-icon';
      }
    }

    console.log(`[NavigationState] Folder marked as expanded: ${folderPath}`);
  }

  /**
   * Mark a folder as collapsed and update DOM
   * @param {string} folderPath - The folder path
   * @return {void}
   */
  markFolderCollapsed(folderPath) {
    const folderId = this.getFolderId(folderPath);
    this.expandedFolders.delete(folderId);

    // Also update DOM state if folder exists
    const folderItem = document.querySelector(`[data-folder-id="${folderId}"]`);
    const folderChildren = document.querySelector(`[data-folder-children="${folderId}"]`);

    if (folderItem && folderChildren) {
      folderItem.classList.remove('expanded');
      folderChildren.classList.remove('expanded');
      const chevronIcon = folderItem.querySelector('.chevron-icon');
      if (chevronIcon) {
        chevronIcon.className = 'bi bi-chevron-right chevron-icon';
      }
    }

    console.log(`[NavigationState] Folder marked as collapsed: ${folderPath}`);
  }

  /**
   * Scan the DOM to detect which folders are currently expanded
   * Call this after initial tree render to sync state
   * @return {void}
   */
  scanExpandedFolders() {
    const fileTree = document.getElementById('fileTree');
    if (!fileTree) return;

    this.expandedFolders.clear();

    fileTree.querySelectorAll('[data-folder-id][data-folder-path]').forEach(folderItem => {
      if (folderItem.classList.contains('expanded')) {
        const folderId = folderItem.dataset.folderId;
        this.expandedFolders.add(folderId);
      }
    });

    console.log(`[NavigationState] Scanned DOM: ${this.expandedFolders.size} expanded folders found`);
  }

  /**
   * Get all currently expanded folder paths
   * @return {Array<string>} Array of expanded folder paths
   */
  getExpandedFolderPaths() {
    const paths = [];
    const fileTree = document.getElementById('fileTree');
    if (!fileTree) return paths;

    this.expandedFolders.forEach(folderId => {
      const folderItem = document.querySelector(`[data-folder-id="${folderId}"]`);
      if (folderItem && folderItem.dataset.folderPath) {
        paths.push(folderItem.dataset.folderPath);
      }
    });

    return paths;
  }

  /**
   * Find the parent folder element for a given file/folder path
   * @param {string} itemPath - The full path to the item (e.g., "docs/subfolder/file.md")
   * @return {HTMLElement|null} The parent folder-children element or null
   */
  findParentFolderElement(itemPath) {
    // Get parent path (everything before the last /)
    const lastSlash = itemPath.lastIndexOf('/');

    if (lastSlash === -1) {
      // Root level item
      return document.getElementById('fileTree');
    }

    const parentPath = itemPath.substring(0, lastSlash);
    const parentFolderId = this.getFolderId(parentPath);
    const parentFolderChildren = document.querySelector(`[data-folder-children="${parentFolderId}"]`);

    return parentFolderChildren;
  }

  /**
   * Create a file item element
   * @param {string} fileName - The file name
   * @param {string} filePath - The relative file path
   * @param {string} spaceName - The space name
   * @param {number} level - The nesting level for indentation
   * @return {HTMLElement} The file item element
   */
  createFileElement(fileName, filePath, spaceName, level) {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.setAttribute('data-document-path', filePath);
    div.setAttribute('data-space-name', spaceName);
    div.style.paddingLeft = `${(level * 16) + 16}px`;
    div.title = fileName;

    // Get file icon (you'll need to import this or access it from navigationController)
    const iconClass = this.getFileIcon(filePath);

    div.innerHTML = `
      <i class="bi ${iconClass.icon} ${iconClass.color}"></i>
      <span class="file-item-text">${fileName}</span>
    `;

    return div;
  }

  /**
   * Create a folder item element
   * @param {string} folderName - The folder name
   * @param {string} folderPath - The relative folder path
   * @param {number} level - The nesting level for indentation
   * @param {boolean} hasChildren - Whether the folder has children
   * @return {Object} Object with { folderItem, childrenContainer }
   */
  createFolderElement(folderName, folderPath, level, hasChildren = false) {
    const folderId = this.getFolderId(folderPath);

    const folderItem = document.createElement('div');
    folderItem.className = 'folder-item';
    folderItem.setAttribute('data-folder-path', folderPath);
    folderItem.setAttribute('data-folder-id', folderId);
    folderItem.style.paddingLeft = `${level * 16}px`;
    folderItem.title = folderName;

    folderItem.innerHTML = `
      <i class="bi ${hasChildren ? 'bi-chevron-right' : ''} chevron-icon"></i>
      <i class="bi bi-folder folder-icon"></i>
      <span class="folder-item-text">${folderName}</span>
    `;

    let childrenContainer = null;
    if (hasChildren) {
      childrenContainer = document.createElement('div');
      childrenContainer.className = 'folder-children';
      childrenContainer.setAttribute('data-folder-children', folderId);
    }

    return { folderItem, childrenContainer };
  }

  /**
   * Add a file to the tree at the correct location
   * @param {string} fileName - The file name
   * @param {string} filePath - The relative file path
   * @param {string} spaceName - The space name
   * @return {HTMLElement|null} The created file element or null if not added
   */
  addFileToTree(fileName, filePath, spaceName) {
    const parentElement = this.findParentFolderElement(filePath);
    if (!parentElement) {
      console.warn(`[NavigationState] Could not find parent element for file: ${filePath}`);
      return null;
    }

    // Check if file already exists
    const existingFile = parentElement.querySelector(`[data-document-path="${filePath}"]`);
    if (existingFile) {
      console.log(`[NavigationState] File already exists in tree: ${filePath}`);
      return null;
    }

    // Calculate indentation level based on path depth
    const level = filePath.split('/').length - 1;

    // Create and insert file element
    const fileElement = this.createFileElement(fileName, filePath, spaceName, level);
    parentElement.appendChild(fileElement);

    console.log(`[NavigationState] Added file to tree: ${filePath}`);
    return fileElement;
  }

  /**
   * Remove a file from the tree
   * @param {string} filePath - The relative file path
   * @return {boolean} Whether the file was removed successfully
   */
  removeFileFromTree(filePath) {
    const fileElement = document.querySelector(`[data-document-path="${filePath}"]`);
    if (!fileElement) {
      console.warn(`[NavigationState] File not found in tree: ${filePath}`);
      return false;
    }

    fileElement.remove();
    console.log(`[NavigationState] Removed file from tree: ${filePath}`);
    return true;
  }

  /**
   * Add a folder to the tree at the correct location
   * @param {string} folderName - The folder name
   * @param {string} folderPath - The relative folder path
   * @return {HTMLElement|null} The created folder item element or null if not added
   */
  addFolderToTree(folderName, folderPath) {
    const parentElement = this.findParentFolderElement(folderPath);
    if (!parentElement) {
      console.warn(`[NavigationState] Could not find parent element for folder: ${folderPath}`);
      return null;
    }

    // Check if folder already exists
    const folderId = this.getFolderId(folderPath);
    const existingFolder = parentElement.querySelector(`[data-folder-id="${folderId}"]`);
    if (existingFolder) {
      console.log(`[NavigationState] Folder already exists in tree: ${folderPath}`);
      return null;
    }

    // Calculate indentation level
    const level = folderPath.split('/').length - 1;

    // Create folder elements
    const { folderItem, childrenContainer } = this.createFolderElement(folderName, folderPath, level, false);

    // Insert folder and children container
    parentElement.appendChild(folderItem);
    if (childrenContainer) {
      parentElement.appendChild(childrenContainer);
    }

    console.log(`[NavigationState] Added folder to tree: ${folderPath}`);
    return folderItem;
  }

  /**
   * Remove a folder from the tree
   * @param {string} folderPath - The relative folder path
   * @return {boolean} Whether the folder was removed successfully
   */
  removeFolderFromTree(folderPath) {
    const folderId = this.getFolderId(folderPath);
    const folderItem = document.querySelector(`[data-folder-id="${folderId}"]`);
    const childrenContainer = document.querySelector(`[data-folder-children="${folderId}"]`);

    if (!folderItem) {
      console.warn(`[NavigationState] Folder not found in tree: ${folderPath}`);
      return false;
    }

    folderItem.remove();
    if (childrenContainer) {
      childrenContainer.remove();
    }

    // Remove from expanded folders set
    this.expandedFolders.delete(folderId);

    console.log(`[NavigationState] Removed folder from tree: ${folderPath}`);
    return true;
  }

  /**
   * Get file icon for a given file path
   * Basic implementation - can be extended
   * @param {string} filePath - The file path
   * @return {Object} Object with { icon, color }
   */
  getFileIcon(filePath) {
    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();

    const iconMap = {
      '.md': { icon: 'bi-file-text-fill', color: 'text-info' },
      '.txt': { icon: 'bi-file-text', color: 'text-muted' },
      '.pdf': { icon: 'bi-file-pdf', color: 'text-danger' },
      '.jpg': { icon: 'bi-file-image', color: 'text-warning' },
      '.png': { icon: 'bi-file-image', color: 'text-warning' },
      '.gif': { icon: 'bi-file-image', color: 'text-warning' },
      '.js': { icon: 'bi-file-code', color: 'text-warning' },
      '.json': { icon: 'bi-file-code', color: 'text-warning' },
      '.html': { icon: 'bi-file-code', color: 'text-danger' },
      '.css': { icon: 'bi-file-code', color: 'text-primary' }
    };

    return iconMap[ext] || { icon: 'bi-file', color: 'text-secondary' };
  }
}

// Export singleton instance
const navigationState = new NavigationState();
export default navigationState;
