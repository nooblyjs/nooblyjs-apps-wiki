/**
 * @fileoverview Folder Viewer State Manager
 * Manages the state of the currently displayed folder and provides methods
 * to dynamically update the folder contents without full refresh
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-10-31
 */

'use strict';

class FolderViewerState {
  constructor() {
    this.currentFolderPath = null;
    this.currentViewMode = 'grid'; // 'grid', 'details', or 'cards'
    this.itemCount = {
      files: 0,
      folders: 0
    };
  }

  /**
   * Set the currently viewed folder
   * @param {string} folderPath - The folder path being viewed
   * @param {string} viewMode - The current view mode ('grid', 'details', 'cards')
   * @return {void}
   */
  setCurrentFolder(folderPath, viewMode = 'grid') {
    this.currentFolderPath = folderPath;
    this.currentViewMode = viewMode;
    console.log(`[FolderViewerState] Now viewing: ${folderPath || 'root'} (${viewMode} view)`);
  }

  /**
   * Check if a given path is in the currently viewed folder
   * @param {string} itemPath - The full path of the item
   * @return {boolean} Whether the item is in the current folder
   */
  isItemInCurrentFolder(itemPath) {
    if (!this.currentFolderPath && !itemPath) {
      // Both root
      return true;
    }

    if (!itemPath || !this.currentFolderPath) {
      return false;
    }

    // Get parent path of item (everything before last /)
    const lastSlash = itemPath.lastIndexOf('/');
    const itemParentPath = lastSlash === -1 ? null : itemPath.substring(0, lastSlash);

    return itemParentPath === this.currentFolderPath;
  }

  /**
   * Update the item count display in the folder header
   * @param {number} delta - The change in count (positive or negative)
   * @param {string} type - 'file' or 'folder'
   * @return {void}
   */
  updateItemCount(delta, type) {
    if (type === 'file') {
      this.itemCount.files += delta;
    } else if (type === 'folder') {
      this.itemCount.folders += delta;
    }

    // Update the display in the DOM
    this.updateStatsDisplay();
    console.log(`[FolderViewerState] Updated counts - Files: ${this.itemCount.files}, Folders: ${this.itemCount.folders}`);
  }

  /**
   * Update the stats display in the folder header
   * @private
   */
  updateStatsDisplay() {
    const folderStats = document.querySelector('.folder-stats');
    if (!folderStats) return;

    let statsHtml = '';

    if (this.itemCount.files > 0) {
      statsHtml += `<span class="stat-badge">${this.itemCount.files} file${this.itemCount.files !== 1 ? 's' : ''}</span>`;
    }

    if (this.itemCount.folders > 0) {
      statsHtml += `<span class="stat-badge">${this.itemCount.folders} folder${this.itemCount.folders !== 1 ? 's' : ''}</span>`;
    }

    folderStats.innerHTML = statsHtml;
  }

  /**
   * Get the container element for folder contents
   * @return {HTMLElement|null} The folder-content div
   */
  getFolderContentContainer() {
    const folderView = document.getElementById('folderView');
    if (!folderView) return null;

    return folderView.querySelector('.folder-content');
  }

  /**
   * Check if the folder is empty
   * @return {boolean} Whether folder has no items
   */
  isFolderEmpty() {
    return this.itemCount.files === 0 && this.itemCount.folders === 0;
  }

  /**
   * Hide the empty folder message
   * @private
   */
  hideEmptyMessage() {
    const folderContent = this.getFolderContentContainer();
    if (!folderContent) return;

    const emptyFolder = folderContent.querySelector('.empty-folder');
    if (emptyFolder) {
      emptyFolder.remove();
    }
  }

  /**
   * Add a file to the current folder view
   * @param {string} fileName - The file name
   * @param {string} filePath - The full file path
   * @param {string} spaceName - The space name
   * @return {HTMLElement|null} The created file element or null
   */
  addFileToFolderView(fileName, filePath, spaceName) {
    // Check if this file is in the current folder
    if (!this.isItemInCurrentFolder(filePath)) {
      console.log(`[FolderViewerState] File not in current folder: ${filePath}`);
      return null;
    }

    const folderContent = this.getFolderContentContainer();
    if (!folderContent) {
      console.warn('[FolderViewerState] Folder view container not found');
      return null;
    }

    // Hide empty message if showing
    this.hideEmptyMessage();

    // Add file based on current view mode
    switch (this.currentViewMode) {
      case 'grid':
        return this.addFileToGridView(fileName, filePath, spaceName, folderContent);
      case 'details':
        return this.addFileToDetailsView(fileName, filePath, spaceName, folderContent);
      case 'cards':
        return this.addFileToCardsView(fileName, filePath, spaceName, folderContent);
      default:
        return null;
    }
  }

  /**
   * Add file to grid view
   * @private
   */
  addFileToGridView(fileName, filePath, spaceName, folderContent) {
    // Create file element
    const fileCard = document.createElement('div');
    fileCard.className = 'item-card file-card';
    fileCard.setAttribute('data-document-path', filePath);
    fileCard.setAttribute('data-space-name', spaceName);

    // Get file type info (simplified - you can enhance this)
    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    const fileTypeMap = {
      '.md': { icon: 'bi-file-text-fill', color: '#0dcaf0' },
      '.txt': { icon: 'bi-file-text', color: '#6c757d' },
      '.pdf': { icon: 'bi-file-pdf', color: '#dc3545' },
      '.jpg': { icon: 'bi-file-image', color: '#ffc107' },
      '.png': { icon: 'bi-file-image', color: '#ffc107' },
      '.js': { icon: 'bi-file-code', color: '#ffc107' }
    };

    const fileType = fileTypeMap[ext] || { icon: 'bi-file', color: '#6c757d' };
    const fileTypeStr = ext ? ext.substring(1).toUpperCase() : 'File';

    fileCard.innerHTML = `
      <i class="bi ${fileType.icon} item-icon" style="color: ${fileType.color};"></i>
      <div class="item-info">
        <div class="item-name">${fileName}</div>
        <div class="item-meta">File • ${fileTypeStr}</div>
      </div>
    `;

    // Find items-grid and append
    const itemsGrid = folderContent.querySelector('.items-grid');
    if (itemsGrid) {
      itemsGrid.appendChild(fileCard);
    }

    // Update counts
    this.updateItemCount(1, 'file');
    console.log(`✓ Added file to grid view: ${fileName}`);
    return fileCard;
  }

  /**
   * Add file to details view
   * @private
   */
  addFileToDetailsView(fileName, filePath, spaceName, folderContent) {
    const itemsDetails = folderContent.querySelector('.items-details');
    if (!itemsDetails) return null;

    const tbody = itemsDetails.querySelector('tbody');
    if (!tbody) return null;

    // Create table row
    const row = document.createElement('tr');
    row.className = 'file-row';
    row.setAttribute('data-document-path', filePath);
    row.setAttribute('data-space-name', spaceName);

    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    const fileTypeStr = ext ? ext.substring(1).toUpperCase() : 'File';
    const createdDate = new Date().toLocaleDateString();

    row.innerHTML = `
      <td><i class="bi bi-file-text" style="color: #0dcaf0; font-size: 1.2rem;"></i></td>
      <td><strong>${fileName}</strong></td>
      <td class="text-muted">${fileTypeStr}</td>
      <td class="text-muted">${createdDate}</td>
    `;

    tbody.appendChild(row);

    // Update counts
    this.updateItemCount(1, 'file');
    console.log(`✓ Added file to details view: ${fileName}`);
    return row;
  }

  /**
   * Add file to cards view
   * @private
   */
  addFileToCardsView(fileName, filePath, spaceName, folderContent) {
    // Similar to grid view but with different styling
    // For now, use the same as grid (returns the element)
    return this.addFileToGridView(fileName, filePath, spaceName, folderContent);
  }

  /**
   * Remove a file from the folder view
   * @param {string} filePath - The full file path
   * @return {boolean} Whether the file was removed
   */
  removeFileFromFolderView(filePath) {
    // Check if this file is in the current folder
    if (!this.isItemInCurrentFolder(filePath)) {
      console.log(`[FolderViewerState] File not in current folder: ${filePath}`);
      return false;
    }

    const fileElement = document.querySelector(`[data-document-path="${filePath}"]`);
    if (!fileElement) {
      console.warn(`[FolderViewerState] File element not found in view: ${filePath}`);
      return false;
    }

    fileElement.remove();

    // Update counts
    this.updateItemCount(-1, 'file');

    // Check if folder is now empty
    if (this.isFolderEmpty()) {
      this.showEmptyMessage();
    }

    console.log(`✓ Removed file from folder view: ${filePath}`);
    return true;
  }

  /**
   * Add a folder to the current folder view
   * @param {string} folderName - The folder name
   * @param {string} folderPath - The full folder path
   * @return {HTMLElement|null} The created folder element or null
   */
  addFolderToFolderView(folderName, folderPath) {
    // Check if this folder is in the current folder
    if (!this.isItemInCurrentFolder(folderPath)) {
      console.log(`[FolderViewerState] Folder not in current folder: ${folderPath}`);
      return null;
    }

    const folderContent = this.getFolderContentContainer();
    if (!folderContent) {
      console.warn('[FolderViewerState] Folder view container not found');
      return null;
    }

    // Hide empty message if showing
    this.hideEmptyMessage();

    // Add folder based on current view mode
    switch (this.currentViewMode) {
      case 'grid':
        return this.addFolderToGridView(folderName, folderPath, folderContent);
      case 'details':
        return this.addFolderToDetailsView(folderName, folderPath, folderContent);
      case 'cards':
        return this.addFolderToCardsView(folderName, folderPath, folderContent);
      default:
        return null;
    }
  }

  /**
   * Add folder to grid view
   * @private
   */
  addFolderToGridView(folderName, folderPath, folderContent) {
    const folderCard = document.createElement('div');
    folderCard.className = 'item-card folder-card';
    folderCard.setAttribute('data-folder-path', folderPath);

    folderCard.innerHTML = `
      <i class="bi bi-folder item-icon"></i>
      <div class="item-info">
        <div class="item-name">${folderName}</div>
        <div class="item-meta">Folder • 0 items</div>
      </div>
    `;

    // Find items-grid and prepend folders before files
    const itemsGrid = folderContent.querySelector('.items-grid');
    if (itemsGrid) {
      // Insert before first file-card
      const firstFile = itemsGrid.querySelector('.file-card');
      if (firstFile) {
        firstFile.parentNode.insertBefore(folderCard, firstFile);
      } else {
        itemsGrid.appendChild(folderCard);
      }
    }

    // Update counts
    this.updateItemCount(1, 'folder');
    console.log(`✓ Added folder to grid view: ${folderName}`);
    return folderCard;
  }

  /**
   * Add folder to details view
   * @private
   */
  addFolderToDetailsView(folderName, folderPath, folderContent) {
    const itemsDetails = folderContent.querySelector('.items-details');
    if (!itemsDetails) return null;

    const tbody = itemsDetails.querySelector('tbody');
    if (!tbody) return null;

    // Create table row for folder
    const row = document.createElement('tr');
    row.className = 'folder-row';
    row.setAttribute('data-folder-path', folderPath);

    const createdDate = new Date().toLocaleDateString();

    row.innerHTML = `
      <td><i class="bi bi-folder" style="color: #6c757d; font-size: 1.2rem;"></i></td>
      <td><strong>${folderName}</strong></td>
      <td class="text-muted">0 items</td>
      <td class="text-muted">${createdDate}</td>
    `;

    // Insert before first file row
    const firstFileRow = tbody.querySelector('.file-row');
    if (firstFileRow) {
      firstFileRow.parentNode.insertBefore(row, firstFileRow);
    } else {
      tbody.appendChild(row);
    }

    // Update counts
    this.updateItemCount(1, 'folder');
    console.log(`✓ Added folder to details view: ${folderName}`);
    return row;
  }

  /**
   * Add folder to cards view
   * @private
   */
  addFolderToCardsView(folderName, folderPath, folderContent) {
    // Similar to grid view but with different styling
    return this.addFolderToGridView(folderName, folderPath, folderContent);
  }

  /**
   * Remove a folder from the folder view
   * @param {string} folderPath - The full folder path
   * @return {boolean} Whether the folder was removed
   */
  removeFolderFromFolderView(folderPath) {
    // Check if this folder is in the current folder
    if (!this.isItemInCurrentFolder(folderPath)) {
      console.log(`[FolderViewerState] Folder not in current folder: ${folderPath}`);
      return false;
    }

    const folderElement = document.querySelector(`[data-folder-path="${folderPath}"]`);
    if (!folderElement) {
      console.warn(`[FolderViewerState] Folder element not found in view: ${folderPath}`);
      return false;
    }

    folderElement.remove();

    // Update counts
    this.updateItemCount(-1, 'folder');

    // Check if folder is now empty
    if (this.isFolderEmpty()) {
      this.showEmptyMessage();
    }

    console.log(`✓ Removed folder from folder view: ${folderPath}`);
    return true;
  }

  /**
   * Show the empty folder message
   * @private
   */
  showEmptyMessage() {
    const folderContent = this.getFolderContentContainer();
    if (!folderContent) return;

    // Check if empty message already exists
    if (folderContent.querySelector('.empty-folder')) return;

    const emptyHtml = `
      <div class="empty-folder">
        <i class="bi bi-folder empty-folder-icon"></i>
        <p>This folder is empty</p>
      </div>
    `;

    // Remove items grid/details/cards if empty
    const itemsContainer = folderContent.querySelector('.items-grid, .items-details, .items-cards');
    if (itemsContainer) {
      itemsContainer.remove();
    }

    folderContent.innerHTML = emptyHtml;
  }

  /**
   * Clear the current folder state
   * @return {void}
   */
  clearCurrentFolder() {
    this.currentFolderPath = null;
    this.currentViewMode = 'grid';
    this.itemCount = { files: 0, folders: 0 };
    console.log('[FolderViewerState] Cleared current folder');
  }
}

// Export singleton instance
const folderViewerState = new FolderViewerState();
export default folderViewerState;
