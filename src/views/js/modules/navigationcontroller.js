import { documentController } from "./documentcontroller.js";
import { templatesController } from "./templatescontroller.js";

export const navigationController = {
    app: null,
    fullFileTree: null,
    contextMenuTargetPath: null,
    contextMenuTargetType: null,
    contextMenuTargetSpaceName: null,
    uploadTargetPath: null,
    prefilledFolderPath: null,
    prefilledFilePath: null,
    renameItemPath: null,
    renameItemType: null,
    isReadOnlyMode: false,
    currentViewMode: 'grid', // 'grid', 'details', 'cards'

    init(app) {
        this.app = app;
    },

    /**
     * Set read-only mode for navigation
     * @param {boolean} isReadOnly - Whether navigation should be in read-only mode
     */
    setReadOnlyMode(isReadOnly) {
        this.isReadOnlyMode = isReadOnly;
    },

    // File Tree Methods
    async loadFileTree() {
        if (!this.app.currentSpace) {
            this.renderEmptyFileTree();
            return;
        }

        try {
            const response = await fetch(`/applications/wiki/api/spaces/${this.app.currentSpace.id}/folders`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: API endpoint not available`);
            }
            const tree = await response.json();
            this.renderFileTree(tree);
        } catch (error) {
            console.log('File tree API not available, showing empty tree');
            this.renderEmptyFileTree();
        }
    },

    renderFileTree(tree) {
        const fileTree = document.getElementById('fileTree');
        if (!fileTree) return;

        if (tree.length === 0) {
            this.renderEmptyFileTree();
            return;
        }

        // Store the full tree data for later use
        this.fullFileTree = tree;

        // Populate window.documents array for wiki-code access
        this.populateWindowDocuments(tree);

        // Render only root level items initially (folders collapsed)
        fileTree.innerHTML = this.renderTreeNodes(tree, 0, true);
        this.bindFileTreeEvents();
    },

    renderEmptyFileTree() {
        const fileTree = document.getElementById('fileTree');
        if (!fileTree) return;

        fileTree.innerHTML = `
            <div class="empty-tree">
                <div class="empty-message">
                    ${this.app.currentSpace ? 'No files or folders' : 'Select a space to view files'}
                </div>
            </div>
        `;
    },

    renderTreeNodes(nodes, level = 0, isRoot = false) {
        return nodes.filter(node => {
            // Hide system folders (those starting with .)
            if (node.type === 'folder' && node.name.startsWith('.')) {
                return false;
            }
            return true;
        }).map(node => {
            if (node.type === 'folder') {
                const hasChildren = node.children && node.children.length > 0;
                const folderId = `folder-${node.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
                const folderName = node.name;

                return `
                    <div class="folder-item" data-folder-path="${node.path}" data-folder-id="${folderId}" style="padding-left: ${level * 16}px" title="${folderName}">
                        <i class="bi ${hasChildren ? 'bi-chevron-right' : ''} chevron-icon"></i>
                        <i class="bi bi-folder folder-icon"></i>
                        <span class="folder-item-text">${folderName}</span>
                    </div>
                    ${hasChildren ? `
                        <div class="folder-children" data-folder-children="${folderId}">
                            ${this.renderTreeNodes(node.children, level + 1, false)}
                        </div>
                    ` : ''}
                `;
            } else if (node.type === 'document') {
                // Only show root-level documents initially
                if (isRoot || level > 0) {
                    const fileIcon = this.getFileIcon(node.path || node.name);
                    const documentPath = node.path || node.name || '';
                    const spaceName = node.spaceName || '';
                    const fileName = node.title || node.name;

                    return `
                        <div class="file-item" data-document-path="${documentPath}" data-space-name="${spaceName}" style="padding-left: ${(level * 16) + 16}px" title="${fileName}">
                            <i class="bi ${fileIcon.icon} ${fileIcon.color}"></i>
                            <span class="file-item-text">${fileName}</span>
                        </div>
                    `;
                }
            }
            return '';
        }).join('');
    },

    bindFileTreeEvents() {
        const fileTree = document.getElementById('fileTree');
        if (!fileTree) return;

        // Handle folder item clicks for toggling
        fileTree.querySelectorAll('.folder-item').forEach(folderItem => {
            folderItem.addEventListener('click', (e) => {
                e.stopPropagation();
                const folderId = folderItem.dataset.folderId;
                // Check if this folder has children
                const hasChildren = document.querySelector(`[data-folder-children="${folderId}"]`);
                if (hasChildren) {
                    this.toggleFolder(folderId);
                }
            });
        });

        // Handle folder item clicks (for content loading)
        fileTree.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking the toggle
                if (e.target.closest('.chevron-icon')) return;

                const folderPath = item.dataset.folderPath;
                this.selectFolder(folderPath);
                this.loadFolderContent(folderPath);
            });
        });

        // Handle file item clicks
        fileTree.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', () => {
                const documentPath = item.dataset.documentPath;
                const spaceName = item.dataset.spaceName;
                documentController.openDocumentByPath(documentPath, spaceName);
            });
        });

        // Add context menu functionality to folder items
        fileTree.querySelectorAll('.folder-item').forEach(folderItem => {
            folderItem.addEventListener('contextmenu', (e) => {
                const folderPath = folderItem.dataset.folderPath;
                console.log('Context menu triggered on folder item, folderPath:', folderPath);
                this.showContextMenu(e, folderPath, 'folder');
            });
        });

        // Add context menu functionality to file items
        fileTree.querySelectorAll('.file-item').forEach(fileItem => {
            fileItem.addEventListener('contextmenu', (e) => {
                e.stopPropagation(); // Prevent folder context menu from firing
                const filePath = fileItem.dataset.documentPath;
                const spaceName = fileItem.dataset.spaceName;
                // Store both path and space name for file operations
                this.contextMenuTargetSpaceName = spaceName;
                this.showContextMenu(e, filePath, 'file');
            });
        });

        // Add context menu for file tree root (empty space)
        fileTree.addEventListener('contextmenu', (e) => {
            // Only show context menu if not clicking on a folder or file item
            if (!e.target.closest('.folder-item') && !e.target.closest('.file-item')) {
                this.showContextMenu(e, null, 'folder'); // null means root directory
            }
        });

        // Drag and drop for folders
        fileTree.querySelectorAll('.folder-item').forEach(folderItem => {
            folderItem.setAttribute('draggable', 'true');

            folderItem.addEventListener('dragstart', (e) => {
                if (this.isReadOnlyMode) {
                    e.preventDefault();
                    return;
                }
                this.handleDragStart(e, folderItem.dataset.folderPath, 'folder');
            });

            folderItem.addEventListener('dragover', (e) => {
                if (this.isReadOnlyMode) return;
                this.handleDragOver(e);
            });

            folderItem.addEventListener('dragenter', (e) => {
                if (this.isReadOnlyMode) return;
                this.handleDragEnter(e, folderItem);
            });

            folderItem.addEventListener('dragleave', (e) => {
                if (this.isReadOnlyMode) return;
                this.handleDragLeave(e, folderItem);
            });

            folderItem.addEventListener('drop', (e) => {
                if (this.isReadOnlyMode) return;
                this.handleDrop(e, folderItem.dataset.folderPath, 'folder');
            });
        });

        // Drag and drop for files
        fileTree.querySelectorAll('.file-item').forEach(fileItem => {
            fileItem.setAttribute('draggable', 'true');

            fileItem.addEventListener('dragstart', (e) => {
                if (this.isReadOnlyMode) {
                    e.preventDefault();
                    return;
                }
                this.handleDragStart(e, fileItem.dataset.documentPath, 'file');
            });
        });
    },

    // Selective tree update methods
    async updateTreeNode(targetPath = '') {
        if (!this.app.currentSpace) return;

        try {
            // Fetch only the updated tree data from API
            const response = await fetch(`/applications/wiki/api/spaces/${this.app.currentSpace.id}/folders`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: API endpoint not available`);
            }
            const fullTree = await response.json();

            // Update the stored tree data
            this.fullFileTree = fullTree;

            if (targetPath === '' || targetPath === null) {
                // Update root level - replace entire tree
                this.renderFileTree(fullTree);
            } else {
                // Update specific folder node
                this.updateSpecificTreeNode(targetPath, fullTree);
            }
        } catch (error) {
            console.log('Tree update failed, falling back to full refresh:', error);
            await this.loadFileTree();
        }
    },

    updateSpecificTreeNode(targetPath, fullTree) {
        const fileTree = document.getElementById('fileTree');
        if (!fileTree) return;

        // Find the folder element to update
        const folderElement = fileTree.querySelector(`[data-folder-path="${targetPath}"]`);
        if (!folderElement) {
            // If we can't find the specific folder, refresh the whole tree
            this.renderFileTree(fullTree);
            return;
        }

        // Find the folder data in the tree
        const folderData = this.findNodeInTree(fullTree, targetPath);
        if (!folderData) {
            // If we can't find the folder data, refresh the whole tree
            this.renderFileTree(fullTree);
            return;
        }

        // Find the children container for this folder
        const folderId = folderElement.dataset.folderId;
        const childrenContainer = fileTree.querySelector(`[data-folder-children="${folderId}"]`);

        if (childrenContainer && folderData.children) {
            // Update the children content
            const level = parseInt(folderElement.dataset.level || '0') + 1;
            childrenContainer.innerHTML = this.renderTreeNodes(folderData.children, level);

            // Rebind events for new elements
            this.bindFileTreeEvents();
        }
    },

    findNodeInTree(tree, targetPath) {
        for (const node of tree) {
            if (node.path === targetPath) {
                return node;
            }
            if (node.children) {
                const found = this.findNodeInTree(node.children, targetPath);
                if (found) return found;
            }
        }
        return null;
    },

    addItemToTree(targetPath, newItem) {
        // Add a new item to the tree without full refresh
        const fileTree = document.getElementById('fileTree');
        if (!fileTree) return;

        if (targetPath === '' || targetPath === null) {
            // Adding to root - insert at the beginning
            const firstChild = fileTree.firstElementChild;
            const newElement = this.createTreeNodeElement(newItem, 0);
            if (firstChild) {
                firstChild.insertAdjacentHTML('beforebegin', newElement);
            } else {
                fileTree.innerHTML = newElement;
            }
        } else {
            // Adding to specific folder
            const folderElement = fileTree.querySelector(`[data-folder-path="${targetPath}"]`);
            if (folderElement) {
                const folderId = folderElement.dataset.folderId;
                const childrenContainer = fileTree.querySelector(`[data-folder-children="${folderId}"]`);

                if (childrenContainer) {
                    const level = parseInt(folderElement.dataset.level || '0') + 1;
                    const newElement = this.createTreeNodeElement(newItem, level);
                    childrenContainer.insertAdjacentHTML('beforeend', newElement);
                }
            }
        }

        // Rebind events for new elements
        this.bindFileTreeEvents();
    },

    createTreeNodeElement(node, level) {
        if (node.type === 'folder') {
            const hasChildren = node.children && node.children.length > 0;
            return `
                <div class="folder-item" data-folder-path="${node.path}" data-folder-id="${node.path}" data-level="${level}" style="padding-left: ${level * 20}px;">
                    <div class="folder-header">
                        <i class="bi bi-chevron-${hasChildren ? 'right' : 'right'} chevron-icon"></i>
                        <i class="bi bi-folder folder-icon"></i>
                        <span class="folder-name">${node.name}</span>
                    </div>
                    ${hasChildren ? `<div class="folder-children collapsed" data-folder-children="${node.path}"></div>` : ''}
                </div>
            `;
        } else {
            const fileIcon = this.getFileIcon(node.name);
            return `
                <div class="file-item" data-document-path="${node.path}" data-space-name="${this.app.currentSpace?.name}" style="padding-left: ${(level + 1) * 20}px;">
                    <i class="bi ${fileIcon.icon} ${fileIcon.color}"></i>
                    <span>${node.title || node.name}</span>
                </div>
            `;
        }
    },

    selectFolder(folderPath) {
        this.app.currentFolder = folderPath;
        // Update file tree selection
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.folderPath === folderPath);
        });
    },

    toggleFolder(folderId) {
        const folderItem = document.querySelector(`[data-folder-id="${folderId}"]`);
        const folderChildren = document.querySelector(`[data-folder-children="${folderId}"]`);

        if (!folderItem || !folderChildren) return;

        const isExpanded = folderItem.classList.contains('expanded');
        const chevronIcon = folderItem.querySelector('.chevron-icon');

        if (isExpanded) {
            // Collapse
            folderItem.classList.remove('expanded');
            folderChildren.classList.remove('expanded');
            if (chevronIcon) {
                chevronIcon.className = 'bi bi-chevron-right chevron-icon';
            }
        } else {
            // Expand
            folderItem.classList.add('expanded');
            folderChildren.classList.add('expanded');
            if (chevronIcon) {
                chevronIcon.className = 'bi bi-chevron-down chevron-icon';
            }
        }
    },

    // Folder View Methods
    async loadFolderContent(folderPath) {
        // Update window.currentDocuments for wiki-code access
        this.updateCurrentDocuments(folderPath);

        // Find the folder data from the full tree
        const folder = this.findFolderInTree(this.fullFileTree, folderPath);
        if (!folder) return;

        // Create a folder overview view
        const folderContent = this.createFolderOverview(folder);
        this.showFolderView(folderContent);
    },

    findFolderInTree(nodes, targetPath) {
        for (const node of nodes) {
            if (node.type === 'folder' && node.path === targetPath) {
                return node;
            }
            if (node.children) {
                const found = this.findFolderInTree(node.children, targetPath);
                if (found) return found;
            }
        }
        return null;
    },

    createFolderOverview(folder) {
        const childFiles = folder.children ? folder.children.filter(c => c.type === 'document') : [];
        const childFolders = folder.children ? folder.children.filter(c => c.type === 'folder') : [];

        // Add child count to each folder for display
        const foldersWithCounts = childFolders.map(childFolder => ({
            ...childFolder,
            childCount: childFolder.children ? childFolder.children.length : 0
        }));

        return {
            title: folder.name,
            path: folder.path,
            spaceName: this.app.currentSpace?.name || 'Unknown Space',
            stats: {
                files: childFiles.length,
                folders: childFolders.length
            },
            files: childFiles,
            folders: foldersWithCounts
        };
    },

    showFolderView(folderContent) {
        // Switch to a custom folder view
        this.app.setActiveView('folder');

        // Store the current folder path for context menu
        this.app.currentFolder = folderContent.path;

        // Update the main content to show folder overview
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) return;

        // Calculate total items for each type
        const totalFiles = folderContent.stats.files;
        const totalFolders = folderContent.stats.folders;

        // Create folder view HTML with Bootstrap styling
        const folderViewHtml = `
            <div id="folderView" class="view">
                <div class="folder-header">
                    <nav class="breadcrumb mb-3">
                        <a href="#" id="backToSpace" class="text-decoration-none">${folderContent.spaceName}</a>
                        <span class="breadcrumb-separator">/</span>
                        <span class="text-muted">${folderContent.title}</span>
                    </nav>

                    <div class="folder-title-section">
                        <i class="bi bi-folder folder-main-icon"></i>
                        <div class="folder-title-info">
                            <h1>${folderContent.title}</h1>
                            <div class="folder-stats">
                                ${totalFiles > 0 ? `<span class="stat-badge">${totalFiles} file${totalFiles !== 1 ? 's' : ''}</span>` : ''}
                                ${totalFolders > 0 ? `<span class="stat-badge">${totalFolders} folder${totalFolders !== 1 ? 's' : ''}</span>` : ''}
                            </div>
                        </div>
                        <div class="view-mode-switcher">
                            <button class="view-mode-btn ${this.currentViewMode === 'details' ? 'active' : ''}" data-view="details" title="Details View">
                                <i class="bi bi-list-ul"></i>
                            </button>
                            <button class="view-mode-btn ${this.currentViewMode === 'grid' ? 'active' : ''}" data-view="grid" title="Grid View">
                                <i class="bi bi-grid-3x3-gap"></i>
                            </button>
                            <button class="view-mode-btn ${this.currentViewMode === 'cards' ? 'active' : ''}" data-view="cards" title="Card View">
                                <i class="bi bi-card-image"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="folder-content">
                    ${folderContent.folders.length === 0 && folderContent.files.length === 0 ? `
                        <div class="empty-folder">
                            <i class="bi bi-folder empty-folder-icon"></i>
                            <p>This folder is empty</p>
                        </div>
                    ` : this.renderFolderContentByMode(folderContent)}
                </div>
            </div>
        `;

        // Remove existing folder view if any
        const existingFolderView = document.getElementById('folderView');
        if (existingFolderView) {
            existingFolderView.remove();
        }

        // Add the new folder view
        mainContent.insertAdjacentHTML('beforeend', folderViewHtml);

        // Bind events for the folder view
        this.bindFolderViewEvents();
    },

    renderFolderContentByMode(folderContent) {
        switch (this.currentViewMode) {
            case 'details':
                return this.renderDetailsView(folderContent);
            case 'cards':
                return this.renderCardsView(folderContent);
            case 'grid':
            default:
                return this.renderGridView(folderContent);
        }
    },

    renderGridView(folderContent) {
        return `
            <div class="items-grid">
                ${folderContent.folders.map(folder => {
                    const childCount = folder.childCount || 0;
                    return `
                        <div class="item-card folder-card" data-folder-path="${folder.path}" draggable="${!this.isReadOnlyMode}">
                            <i class="bi bi-folder item-icon"></i>
                            <div class="item-info">
                                <div class="item-name">${folder.name}</div>
                                <div class="item-meta">Folder • ${childCount} item${childCount !== 1 ? 's' : ''}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
                ${folderContent.files.map(file => {
                    const fileTypeInfo = this.getFileTypeInfo(file.path || file.name);
                    const iconClass = this.getFileTypeIconClass(fileTypeInfo.category);
                    const iconColor = fileTypeInfo.color;

                    return `
                    <div class="item-card file-card" data-document-path="${file.path}" data-space-name="${file.spaceName}" draggable="${!this.isReadOnlyMode}">
                        <i class="bi ${iconClass} item-icon" style="color: ${iconColor};"></i>
                        <div class="item-info">
                            <div class="item-name">${file.title || file.name}</div>
                            <div class="item-meta">File • ${this.getFileTypeFromExtension(file.path || file.name)}</div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    renderDetailsView(folderContent) {
        return `
            <div class="items-details">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th style="width: 40px;"></th>
                            <th>Name</th>
                            <th style="width: 120px;">Size</th>
                            <th style="width: 180px;">Date Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${folderContent.folders.map(folder => {
                            const childCount = folder.childCount || 0;
                            const created = folder.created || folder.createdAt || '';
                            const formattedDate = created ? new Date(created).toLocaleDateString() : 'N/A';

                            return `
                                <tr class="folder-row" data-folder-path="${folder.path}" draggable="${!this.isReadOnlyMode}">
                                    <td><i class="bi bi-folder" style="color: #6c757d; font-size: 1.2rem;"></i></td>
                                    <td><strong>${folder.name}</strong></td>
                                    <td class="text-muted">${childCount} item${childCount !== 1 ? 's' : ''}</td>
                                    <td class="text-muted">${formattedDate}</td>
                                </tr>
                            `;
                        }).join('')}
                        ${folderContent.files.map(file => {
                            const fileTypeInfo = this.getFileTypeInfo(file.path || file.name);
                            const iconClass = this.getFileTypeIconClass(fileTypeInfo.category);
                            const iconColor = fileTypeInfo.color;
                            const size = file.size || file.metadata?.size || 0;
                            const formattedSize = this.formatFileSize(size);
                            const created = file.created || file.createdAt || file.metadata?.created || '';
                            const formattedDate = created ? new Date(created).toLocaleDateString() : 'N/A';

                            return `
                                <tr class="file-row" data-document-path="${file.path}" data-space-name="${file.spaceName}" draggable="${!this.isReadOnlyMode}">
                                    <td><i class="bi ${iconClass}" style="color: ${iconColor}; font-size: 1.2rem;"></i></td>
                                    <td>${file.title || file.name}</td>
                                    <td class="text-muted">${formattedSize}</td>
                                    <td class="text-muted">${formattedDate}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderCardsView(folderContent) {
        return `
            <div class="items-cards row">
                ${folderContent.folders.map(folder => {
                    const childCount = folder.childCount || 0;
                    const created = folder.created || folder.createdAt || '';
                    const formattedDate = created ? new Date(created).toLocaleDateString() : 'N/A';

                    return `
                        <div class="col-md-4 col-lg-3 mb-4">
                            <div class="card folder-card-bootstrap" data-folder-path="${folder.path}" draggable="${!this.isReadOnlyMode}">
                                <div class="card-body text-center">
                                    <div class="card-preview card-preview-folder">
                                        <i class="bi bi-folder" style="font-size: 4rem; color: #6c757d;"></i>
                                    </div>
                                </div>
                                <div class="card-footer">
                                    <div class="card-title-text"><strong>${folder.name}</strong></div>
                                    <small class="text-muted">${childCount} item${childCount !== 1 ? 's' : ''}</small><br>
                                    <small class="text-muted">${formattedDate}</small>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
                ${folderContent.files.map(file => {
                    const fileTypeInfo = this.getFileTypeInfo(file.path || file.name);
                    const iconClass = this.getFileTypeIconClass(fileTypeInfo.category);
                    const iconColor = fileTypeInfo.color;
                    const size = file.size || file.metadata?.size || 0;
                    const formattedSize = this.formatFileSize(size);
                    const created = file.created || file.createdAt || file.metadata?.created || '';
                    const formattedDate = created ? new Date(created).toLocaleDateString() : 'N/A';
                    const fileExt = this.getFileTypeFromExtension(file.path || file.name);
                    const viewer = fileTypeInfo.category;

                    return `
                        <div class="col-md-4 col-lg-3 mb-4">
                            <div class="card file-card-bootstrap"
                                data-document-path="${file.path}"
                                data-space-name="${file.spaceName}"
                                data-viewer="${viewer}"
                                draggable="${!this.isReadOnlyMode}">
                                <div class="card-body text-center">
                                    <div class="card-preview card-preview-loading" data-file-path="${file.path}" data-space-name="${file.spaceName}">
                                        <div class="spinner-border text-secondary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="card-footer">
                                    <div class="card-title-text"><strong>${file.title || file.name}</strong></div>
                                    <small class="text-muted">${fileExt} • ${formattedSize}</small><br>
                                    <small class="text-muted">${formattedDate}</small>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    bindFolderViewEvents() {
        // Initialize file preview
        this.initFilePreview();

        // Back to space button
        document.getElementById('backToSpace')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.app.showHome();
        });

        // View mode switcher buttons
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const newMode = btn.dataset.view;
                if (newMode !== this.currentViewMode) {
                    this.currentViewMode = newMode;
                    // Reload the current folder with new view mode
                    this.loadFolderContent(this.app.currentFolder);
                }
            });
        });

        // Bind events for all view modes
        this.bindFolderItemEvents();
        this.bindFileItemEvents();

        // Load card previews if in card view mode
        if (this.currentViewMode === 'cards') {
            this.loadCardPreviews();
        }
    },

    bindFolderItemEvents() {
        // Handle both grid cards, table rows, and Bootstrap cards
        const folderItems = document.querySelectorAll(
            '#folderView .folder-card, #folderView .folder-row, #folderView .folder-card-bootstrap'
        );

        folderItems.forEach(item => {
            item.addEventListener('click', () => {
                const folderPath = item.dataset.folderPath;
                this.loadFolderContent(folderPath);
            });

            // Context menu for folders
            item.addEventListener('contextmenu', (e) => {
                e.stopPropagation();
                const folderPath = item.dataset.folderPath;
                this.showContextMenu(e, folderPath, 'folder');
            });

            // Drag and drop for folder items
            if (!this.isReadOnlyMode) {
                item.setAttribute('draggable', 'true');

                item.addEventListener('dragstart', (e) => {
                    this.handleDragStart(e, item.dataset.folderPath, 'folder');
                });

                item.addEventListener('dragover', (e) => {
                    this.handleDragOver(e);
                });

                item.addEventListener('dragenter', (e) => {
                    this.handleDragEnter(e, item);
                });

                item.addEventListener('dragleave', (e) => {
                    this.handleDragLeave(e, item);
                });

                item.addEventListener('drop', (e) => {
                    this.handleDrop(e, item.dataset.folderPath, 'folder');
                });
            }
        });
    },

    bindFileItemEvents() {
        // Handle both grid cards, table rows, and Bootstrap cards
        const fileItems = document.querySelectorAll(
            '#folderView .file-card, #folderView .file-row, #folderView .file-card-bootstrap'
        );

        fileItems.forEach(item => {
            item.addEventListener('click', () => {
                const documentPath = item.dataset.documentPath;
                const spaceName = item.dataset.spaceName;
                documentController.openDocumentByPath(documentPath, spaceName);
            });

            // Context menu for files
            item.addEventListener('contextmenu', (e) => {
                e.stopPropagation();
                const filePath = item.dataset.documentPath;
                const spaceName = item.dataset.spaceName;
                this.contextMenuTargetSpaceName = spaceName;
                this.showContextMenu(e, filePath, 'file');
            });

            // Preview on hover for file items
            item.addEventListener('mouseenter', (e) => {
                const documentPath = item.dataset.documentPath;
                const spaceName = item.dataset.spaceName;

                // Add small delay before showing preview
                this.previewTimeout = setTimeout(() => {
                    this.currentPreviewCard = item;
                    this.showFilePreview(item, documentPath, spaceName);
                }, 500); // 500ms delay
            });

            item.addEventListener('mouseleave', () => {
                // Clear timeout if mouse leaves before preview shows
                if (this.previewTimeout) {
                    clearTimeout(this.previewTimeout);
                    this.previewTimeout = null;
                }

                // Hide preview
                this.hideFilePreview();
            });

            // Drag and drop for file items
            if (!this.isReadOnlyMode) {
                item.setAttribute('draggable', 'true');

                item.addEventListener('dragstart', (e) => {
                    this.handleDragStart(e, item.dataset.documentPath, 'file');
                });
            }
        });

        // Context menu for empty folder area (right-click on empty space)
        const folderContent = document.querySelector('#folderView .folder-content');
        if (folderContent) {
            folderContent.addEventListener('contextmenu', (e) => {
                // Only show context menu if not clicking on a card
                if (!e.target.closest('.item-card')) {
                    e.preventDefault();
                    // Get the current folder path from the view
                    const currentFolderPath = this.app.currentFolder || '';
                    this.showContextMenu(e, currentFolderPath, 'folder');
                }
            });
        }
    },

    async loadCardPreviews() {
        const previewElements = document.querySelectorAll('.card-preview-loading');

        for (const previewEl of previewElements) {
            const filePath = previewEl.dataset.filePath;
            const spaceName = previewEl.dataset.spaceName;

            if (!filePath || !spaceName) continue;

            try {
                const response = await fetch(`/applications/wiki/api/documents/content?path=${encodeURIComponent(filePath)}&spaceName=${encodeURIComponent(spaceName)}&enhanced=true`);

                if (!response.ok) {
                    throw new Error('Failed to load preview');
                }

                const data = await response.json();
                const { content: fileContent, metadata } = data;
                const viewer = metadata?.viewer || 'default';

                let previewHtml = '';

                switch (viewer) {
                    case 'image':
                        const imageUrl = `/applications/wiki/api/documents/content?path=${encodeURIComponent(filePath)}&spaceName=${encodeURIComponent(spaceName)}`;
                        previewHtml = `<img src="${imageUrl}" alt="Preview" style="max-width: 100%; max-height: 150px; object-fit: contain; border-radius: 4px;" />`;
                        break;

                    case 'markdown':
                        if (typeof marked !== 'undefined') {
                            const preview = fileContent.substring(0, 200) + (fileContent.length > 200 ? '...' : '');
                            const rendered = marked.parse(preview);
                            previewHtml = `<div class="markdown-preview-card">${rendered}</div>`;
                        } else {
                            const preview = fileContent.substring(0, 150) + (fileContent.length > 150 ? '...' : '');
                            previewHtml = `<pre style="font-size: 0.7rem; text-align: left; margin: 0; padding: 0.5rem;">${this.escapeHtml(preview)}</pre>`;
                        }
                        break;

                    case 'text':
                    case 'code':
                    case 'web':
                    case 'data':
                        const preview = fileContent.substring(0, 150) + (fileContent.length > 150 ? '...' : '');
                        previewHtml = `<pre style="font-size: 0.7rem; text-align: left; margin: 0; padding: 0.5rem; white-space: pre-wrap;">${this.escapeHtml(preview)}</pre>`;
                        break;

                    case 'pdf':
                        previewHtml = `<i class="bi bi-file-pdf" style="font-size: 4rem; color: #dc3545;"></i>`;
                        break;

                    default:
                        const fileTypeInfo = this.getFileTypeInfo(filePath);
                        const iconClass = this.getFileTypeIconClass(fileTypeInfo.category);
                        const iconColor = fileTypeInfo.color;
                        previewHtml = `<i class="bi ${iconClass}" style="font-size: 4rem; color: ${iconColor};"></i>`;
                        break;
                }

                previewEl.innerHTML = previewHtml;
                previewEl.classList.remove('card-preview-loading');
            } catch (error) {
                console.error('Error loading preview for', filePath, error);
                // Show error icon
                const fileTypeInfo = this.getFileTypeInfo(filePath);
                const iconClass = this.getFileTypeIconClass(fileTypeInfo.category);
                const iconColor = fileTypeInfo.color;
                previewEl.innerHTML = `<i class="bi ${iconClass}" style="font-size: 4rem; color: ${iconColor};"></i>`;
                previewEl.classList.remove('card-preview-loading');
            }
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Context Menu Methods
    initContextMenu() {
        // Prevent browser context menu on file tree
        document.getElementById('fileTree')?.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Add right-click event listeners to file tree items (will be added dynamically when tree is built)
        this.contextMenuTargetPath = null;

        // Context menu item clicks
        document.getElementById('contextCreateFolder')?.addEventListener('click', () => {
            // Save the value before hiding the menu, as hideContextMenu() resets it
            const targetPath = this.contextMenuTargetPath;
            this.hideContextMenu();
            this.showCreateFolderModal(targetPath);
        });

        document.getElementById('contextCreateFile')?.addEventListener('click', () => {
            // Save the value before hiding the menu, as hideContextMenu() resets it
            const targetPath = this.contextMenuTargetPath;
            this.hideContextMenu();
            this.showCreateFileModal(targetPath);
        });

        document.getElementById('contextUpload')?.addEventListener('click', () => {
            // Save the value before hiding the menu, as hideContextMenu() resets it
            const targetPath = this.contextMenuTargetPath;
            this.hideContextMenu();
            this.showUploadDialog(targetPath);
        });

        document.getElementById('contextRename')?.addEventListener('click', () => {
            // Save the values before hiding the menu, as hideContextMenu() resets them
            const targetPath = this.contextMenuTargetPath;
            const targetType = this.contextMenuTargetType;
            this.hideContextMenu();
            this.showRenameModal(targetPath, targetType);
        });

        document.getElementById('contextDelete')?.addEventListener('click', () => {
            // Save the values before hiding the menu, as hideContextMenu() resets them
            const targetPath = this.contextMenuTargetPath;
            const targetType = this.contextMenuTargetType;
            this.hideContextMenu();
            this.handleDeleteItem(targetPath, targetType);
        });

        // File upload handling
        document.getElementById('fileUploadInput')?.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files, this.uploadTargetPath || this.contextMenuTargetPath);
        });

        // Hide context menu when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) {
                this.hideContextMenu();
            }
        });
    },

    showContextMenu(e, targetPath = null, targetType = 'folder') {
        e.preventDefault();
        e.stopPropagation();

        // Don't show context menu in read-only mode
        if (this.isReadOnlyMode) {
            return;
        }

        const contextMenu = document.getElementById('fileContextMenu');

        // Only use empty string for root folders, otherwise store the actual path (even if falsy)
        if (targetType === 'folder' && (targetPath === null || targetPath === undefined)) {
            this.contextMenuTargetPath = ''; // Empty string for root folder
        } else {
            this.contextMenuTargetPath = targetPath;
        }

        this.contextMenuTargetType = targetType;

        // Position the context menu using clientX/clientY for viewport positioning
        const x = e.clientX;
        const y = e.clientY;

        // Show menu first to get dimensions
        contextMenu.classList.remove('hidden');

        // Get menu dimensions
        const menuRect = contextMenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Adjust position if menu would go off screen
        let left = x;
        let top = y;

        if (x + menuRect.width > viewportWidth) {
            left = viewportWidth - menuRect.width - 10;
        }

        if (y + menuRect.height > viewportHeight) {
            top = viewportHeight - menuRect.height - 10;
        }

        contextMenu.style.left = left + 'px';
        contextMenu.style.top = top + 'px';
    },

    hideContextMenu() {
        const contextMenu = document.getElementById('fileContextMenu');
        contextMenu?.classList.add('hidden');
        this.contextMenuTargetPath = null;
    },

    // Folder Operations
    showCreateFolderModal(prefilledPath = null) {
        console.log('showCreateFolderModal called with prefilledPath:', prefilledPath);
        console.log('currentSpace:', this.app.currentSpace);

        // Auto-select first space if none is selected
        if (!this.app.currentSpace && this.app.data.spaces.length > 0) {
            spacesController.selectSpace(this.app.data.spaces[0].id);
        }

        if (!this.app.currentSpace) {
            this.app.showNotification('Please create a space first', 'warning');
            return;
        }

        // Store the parent path for form submission
        this.prefilledFolderPath = prefilledPath || '';

        // Update the location info text
        const locationInfo = document.getElementById('folderLocationInfo');
        const locationText = document.getElementById('folderLocationText');

        if (prefilledPath) {
            locationInfo.style.display = 'block';
            locationText.textContent = prefilledPath;
        } else {
            locationInfo.style.display = 'block';
            locationText.textContent = 'Root';
        }

        console.log('Creating folder in path:', this.prefilledFolderPath || 'root');

        this.app.showModal('createFolderModal');

        // Focus the folder name input
        setTimeout(() => {
            document.getElementById('folderName')?.focus();
        }, 100);
    },

    async handleCreateFolder() {
        const form = document.getElementById('createFolderForm');
        const formData = new FormData(form);

        try {
            // Validate folder name
            const folderName = formData.get('folderName').trim();
            if (!folderName) {
                this.app.showNotification('Folder name cannot be empty', 'error');
                return;
            }

            // Check for invalid characters
            const invalidChars = /[<>:"|?*\\/]/;
            if (invalidChars.test(folderName)) {
                this.app.showNotification('Folder name cannot contain: < > : " | ? * \\ /', 'error');
                return;
            }

            // Use the prefilled path that was set when modal was opened
            const parentPath = this.prefilledFolderPath || '';

            console.log('Creating folder with parentPath:', parentPath, 'prefilledFolderPath:', this.prefilledFolderPath); // Debug log

            const response = await fetch('/applications/wiki/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: folderName,
                    spaceId: this.app.currentSpace.id,
                    parentPath: parentPath
                })
            });

            const result = await response.json();

            if (result.success) {
                this.app.hideModal('createFolderModal');
                form.reset();

                // Update the tree to show the new folder
                await this.loadFileTree();

                // If we're currently viewing a folder, refresh the folder view
                if (this.app.currentView === 'folder' && this.app.currentFolder === parentPath) {
                    await this.loadFolderContent(parentPath);
                }

                this.app.showNotification('Folder created successfully!', 'success');
            } else {
                throw new Error(result.message || 'Failed to create folder');
            }
        } catch (error) {
            console.error('Error creating folder:', error);
            this.app.showNotification('Failed to create folder', 'error');
        }
    },

    // File Operations
    showCreateFileModal(prefilledPath = null) {
        // Auto-select first space if none is selected
        if (!this.app.currentSpace && this.app.data.spaces.length > 0) {
            spacesController.selectSpace(this.app.data.spaces[0].id);
        }

        if (!this.app.currentSpace) {
            this.app.showNotification('Please create a space first', 'warning');
            return;
        }

        this.app.showModal('createFileModal');

        if (prefilledPath !== null) {
            // Hide the location dropdown when pre-filled from context menu
            const fileLocationSelect = document.getElementById('fileLocation');
            const locationGroup = fileLocationSelect?.parentElement;
            if (locationGroup) {
                locationGroup.style.display = 'none';
            }
            // Store the path for form submission
            this.prefilledFilePath = prefilledPath;
            console.log('Creating file with prefilled path:', prefilledPath); // Debug log
        } else {
            // Show the location dropdown for normal creation
            const fileLocationSelect = document.getElementById('fileLocation');
            const locationGroup = fileLocationSelect?.parentElement;
            if (locationGroup) {
                locationGroup.style.display = 'block';
            }
            this.app.populateFileLocationSelect();
            this.prefilledFilePath = null;
        }

        templatesController.populateTemplateSelect();
    },

    async handleCreateFile() {
        const form = document.getElementById('createFileForm');
        const formData = new FormData(form);

        try {
            const templateContent = await templatesController.getTemplateContent(formData.get('fileTemplate'));

            // Use prefilled path if available, otherwise use form selection
            const folderPath = this.prefilledFilePath !== null ?
                this.prefilledFilePath :
                (formData.get('fileLocation') || '');

            const response = await fetch('/applications/wiki/api/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.get('fileName').replace('.md', ''),
                    spaceId: this.app.currentSpace.id,
                    folderPath: folderPath,
                    template: formData.get('fileTemplate'),
                    content: templateContent
                })
            });

            const result = await response.json();

            if (result.success) {
                this.app.hideModal('createFileModal');
                form.reset();

                // Get the parent folder path for selective update
                const folderPath = this.prefilledFilePath !== null ?
                    this.prefilledFilePath :
                    (formData.get('fileLocation') || '');

                // Update only the affected tree node
                await this.updateTreeNode(folderPath);

                // If we're currently viewing a folder, refresh the folder view
                if (this.app.currentView === 'folder' && this.app.currentFolder === folderPath) {
                    await this.loadFolderContent(folderPath);
                }

                this.app.showNotification('File created successfully!', 'success');

                // Auto-open the created file in edit mode
                const fileName = formData.get('fileName');
                const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;

                // Create a document object for the new file
                const newDocument = {
                    id: result.documentId || `${this.app.currentSpace.id}-${Date.now()}`,
                    title: formData.get('fileName').replace('.md', ''),
                    path: fullPath,
                    spaceId: this.app.currentSpace.id,
                    content: templateContent, // Reuse the template content we already loaded
                    metadata: { category: 'markdown', viewer: 'markdown' }
                };

                // Open in edit mode
                this.app.currentDocument = newDocument;
                this.app.editDocument(newDocument);
            } else {
                throw new Error(result.message || 'Failed to create file');
            }
        } catch (error) {
            console.error('Error creating file:', error);
            this.app.showNotification('Failed to create file', 'error');
        }
    },

    showUploadDialog(targetPath = null) {
        this.uploadTargetPath = targetPath || '';
        const fileInput = document.getElementById('fileUploadInput');
        fileInput?.click();
    },

    async handleFileUpload(files, targetPath = '') {
        if (!files || files.length === 0) return;

        const uploadPath = targetPath || '';

        for (const file of files) {
            try {
                // Create FormData for multipart upload
                const formData = new FormData();
                formData.append('file', file);
                formData.append('spaceId', this.app.currentSpace.id);
                formData.append('folderPath', uploadPath);

                // Upload using the proper upload endpoint
                const response = await fetch('/applications/wiki/api/documents/upload', {
                    method: 'POST',
                    body: formData
                    // Don't set Content-Type header - browser will set it with boundary
                });

                const result = await response.json();

                if (result.success) {
                    this.app.showNotification(`File "${file.name}" uploaded successfully`, 'success');
                } else {
                    throw new Error(result.error || 'Failed to upload file');
                }
            } catch (error) {
                console.error('Upload error:', error);
                this.app.showNotification(`Failed to upload "${file.name}": ${error.message}`, 'error');
            }
        }

        // Reset the file input
        const fileInput = document.getElementById('fileUploadInput');
        if (fileInput) {
            fileInput.value = '';
        }

        // Update only the affected tree node
        await this.updateTreeNode(uploadPath);

        // If we're currently viewing a folder, refresh the folder view
        if (this.app.currentView === 'folder' && this.app.currentFolder === uploadPath) {
            await this.loadFolderContent(uploadPath);
        }
    },

    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                resolve(e.target.result);
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            // Check if it's a text file or binary
            if (file.type.startsWith('text/') ||
                file.name.endsWith('.md') ||
                file.name.endsWith('.txt') ||
                file.name.endsWith('.json') ||
                file.name.endsWith('.xml') ||
                file.name.endsWith('.js') ||
                file.name.endsWith('.css') ||
                file.name.endsWith('.html')) {
                reader.readAsText(file);
            } else {
                // For binary files, read as data URL
                reader.readAsDataURL(file);
            }
        });
    },

    // Rename and Delete Operations
    showRenameModal(itemPath, itemType) {
        this.renameItemPath = itemPath;
        this.renameItemType = itemType;

        // Extract current name from path
        const currentName = itemPath ? itemPath.split('/').pop() : '';

        // Update modal title and prefill current name
        const itemTypeText = itemType === 'folder' ? 'Folder' : 'File';
        document.getElementById('renameItemType').textContent = itemTypeText;
        document.getElementById('newItemName').value = currentName;

        this.app.showModal('renameModal');

        // Focus the input
        setTimeout(() => {
            const input = document.getElementById('newItemName');
            input?.focus();
            input?.select();
        }, 100);
    },

    async handleRename() {
        const form = document.getElementById('renameForm');
        const formData = new FormData(form);

        try {
            // Validate new name
            const newName = formData.get('newItemName').trim();
            if (!newName) {
                this.app.showNotification('Name cannot be empty', 'error');
                return;
            }

            // Check for invalid characters
            const invalidChars = /[<>:"|?*\\/]/;
            if (invalidChars.test(newName)) {
                this.app.showNotification('Name cannot contain: < > : " | ? * \\ /', 'error');
                return;
            }

            const oldPath = this.renameItemPath;
            const parentPath = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/')) : '';

            if (this.renameItemType === 'folder') {
                // Rename folder via API
                const response = await fetch(`/applications/wiki/api/folders/rename`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        spaceId: this.app.currentSpace.id,
                        oldPath: oldPath,
                        newName: newName
                    })
                });

                const result = await response.json();

                if (result.success) {
                    this.app.hideModal('renameModal');
                    form.reset();
                    await this.loadFileTree();

                    // If we're currently viewing a folder, refresh the folder view
                    if (this.app.currentView === 'folder' && this.app.currentFolder === parentPath) {
                        await this.loadFolderContent(parentPath);
                    }

                    this.app.showNotification('Folder renamed successfully!', 'success');
                } else {
                    throw new Error(result.message || 'Failed to rename folder');
                }
            } else {
                // Rename file via API
                const response = await fetch(`/applications/wiki/api/documents/rename`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        spaceName: this.app.currentSpace.name,
                        oldPath: oldPath,
                        newName: newName
                    })
                });

                const result = await response.json();

                if (result.success) {
                    this.app.hideModal('renameModal');
                    form.reset();
                    await this.loadFileTree();

                    // If we're currently viewing a folder, refresh the folder view
                    if (this.app.currentView === 'folder' && this.app.currentFolder === parentPath) {
                        await this.loadFolderContent(parentPath);
                    }

                    this.app.showNotification('File renamed successfully!', 'success');
                } else {
                    throw new Error(result.message || 'Failed to rename file');
                }
            }
        } catch (error) {
            console.error('Error renaming item:', error);
            this.app.showNotification(`Failed to rename ${this.renameItemType}`, 'error');
        }
    },

    async handleDeleteItem(itemPath, itemType) {
        if (!itemPath && itemType === 'folder') {
            this.app.showNotification('Cannot delete root folder', 'error');
            return;
        }

        if (!itemPath || itemPath === '' || itemPath === 'undefined') {
            this.app.showNotification('Cannot delete: path is missing', 'error');
            return;
        }

        const itemName = itemPath ? itemPath.split('/').pop() : 'item';
        const itemTypeDisplay = itemType === 'folder' ? 'folder' : 'file';

        // Show confirmation dialog
        const confirmed = confirm(`Are you sure you want to delete the ${itemTypeDisplay} "${itemName}"?\n\nThis action cannot be undone.${itemType === 'folder' ? ' All contents will be deleted.' : ''}`);

        if (!confirmed) {
            return;
        }

        try {
            let response;

            if (itemType === 'folder') {
                // Delete folder
                response = await fetch(`/applications/wiki/api/folders/${encodeURIComponent(itemPath)}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        spaceId: this.app.currentSpace?.id,
                        path: itemPath
                    })
                });
            } else {
                // Delete file - use the stored space name or current space
                const spaceName = this.contextMenuTargetSpaceName || this.app.currentSpace?.name;

                response = await fetch(`/applications/wiki/api/documents/${encodeURIComponent(itemPath)}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        spaceId: this.app.currentSpace?.id,
                        spaceName: spaceName,
                        path: itemPath
                    })
                });
            }

            const result = await response.json();

            if (response.ok && result.success) {
                this.app.showNotification(`${itemTypeDisplay.charAt(0).toUpperCase() + itemTypeDisplay.slice(1)} "${itemName}" deleted successfully`, 'success');

                // Update only the parent tree node
                const parentPath = itemPath ? itemPath.substring(0, itemPath.lastIndexOf('/')) : '';
                await this.updateTreeNode(parentPath);

                // If we're currently viewing a folder, refresh the folder view
                if (this.app.currentView === 'folder' && this.app.currentFolder === parentPath) {
                    await this.loadFolderContent(parentPath);
                } else if (this.app.currentView === 'folder' && itemType === 'folder' && itemPath === this.app.currentFolder) {
                    // If we deleted the folder we're currently viewing, go back to parent or home
                    if (parentPath) {
                        await this.loadFolderContent(parentPath);
                    } else {
                        this.app.showHome();
                    }
                }

                // If we're currently viewing the deleted item, go back to home
                if (this.app.currentDocument && itemType === 'file' && this.app.currentDocument.path === itemPath) {
                    this.app.showHome();
                }
            } else {
                throw new Error(result.message || `Failed to delete ${itemTypeDisplay}`);
            }
        } catch (error) {
            console.error(`Error deleting ${itemTypeDisplay}:`, error);
            this.app.showNotification(`Failed to delete ${itemTypeDisplay}`, 'error');
        }
    },

    // File utility methods
    getFileIcon(filename) {
        const extension = filename.split('.').pop()?.toLowerCase();

        switch (extension) {
            case 'md':
            case 'markdown':
                return { icon: 'bi-file-text', color: '' };
            case 'txt':
                return { icon: 'bi-file-text', color: '' };
            case 'pdf':
                return { icon: 'bi-file-pdf', color: '' };
            case 'doc':
            case 'docx':
                return { icon: 'bi-file-word', color: '' };
            case 'xls':
            case 'xlsx':
                return { icon: 'bi-file-excel', color: '' };
            case 'ppt':
            case 'pptx':
                return { icon: 'bi-file-ppt', color: '' };
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'svg':
                return { icon: 'bi-file-image', color: '' };
            case 'js':
            case 'ts':
            case 'jsx':
            case 'tsx':
                return { icon: 'bi-file-code', color: '' };
            case 'html':
            case 'htm':
                return { icon: 'bi-file-code', color: '' };
            case 'css':
            case 'scss':
            case 'sass':
                return { icon: 'bi-file-code', color: '' };
            case 'json':
            case 'xml':
                return { icon: 'bi-file-code', color: '' };
            default:
                return { icon: 'bi-file', color: '' };
        }
    },

    getFileTypeFromExtension(filename) {
        const extension = filename.split('.').pop()?.toLowerCase();

        switch (extension) {
            case 'md':
            case 'markdown':
                return 'Markdown';
            case 'txt':
                return 'Text';
            case 'pdf':
                return 'PDF';
            case 'doc':
            case 'docx':
                return 'Word Document';
            case 'xls':
            case 'xlsx':
                return 'Excel';
            case 'ppt':
            case 'pptx':
                return 'PowerPoint';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'svg':
                return 'Image';
            case 'js':
            case 'ts':
                return 'JavaScript';
            case 'jsx':
            case 'tsx':
                return 'React';
            case 'html':
            case 'htm':
                return 'HTML';
            case 'css':
            case 'scss':
            case 'sass':
                return 'CSS';
            case 'json':
                return 'JSON';
            case 'xml':
                return 'XML';
            default:
                return 'File';
        }
    },

    getFileTypeInfo(filePath) {
        const ext = filePath.split('.').pop()?.toLowerCase() || '';
        const fileName = filePath.split('/').pop() || '';

        // File category mappings matching backend - all icons now use consistent gray color
        const categories = {
            pdf: {
                category: 'pdf',
                viewer: 'pdf',
                extensions: ['pdf'],
                icon: 'file-pdf',
                color: '#666666'
            },
            image: {
                category: 'image',
                viewer: 'image',
                extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'],
                icon: 'image',
                color: '#666666'
            },
            text: {
                category: 'text',
                viewer: 'text',
                extensions: ['txt', 'csv', 'dat', 'log', 'ini', 'cfg', 'conf'],
                icon: 'file-alt',
                color: '#666666'
            },
            markdown: {
                category: 'markdown',
                viewer: 'markdown',
                extensions: ['md', 'markdown'],
                icon: 'file-alt',
                color: '#666666'
            },
            code: {
                category: 'code',
                viewer: 'code',
                extensions: ['js', 'ts', 'jsx', 'tsx', 'vue', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'r', 'm', 'mm', 'pl', 'sh', 'bash', 'ps1', 'bat', 'cmd'],
                icon: 'file-code',
                color: '#666666'
            },
            web: {
                category: 'web',
                viewer: 'code',
                extensions: ['html', 'htm', 'css', 'scss', 'sass', 'less'],
                icon: 'code',
                color: '#666666'
            },
            data: {
                category: 'data',
                viewer: 'code',
                extensions: ['json', 'xml', 'yaml', 'yml', 'toml', 'properties'],
                icon: 'file-code',
                color: '#666666'
            }
        };

        // Check by extension
        for (const info of Object.values(categories)) {
            if (info.extensions.includes(ext)) {
                return {
                    category: info.category,
                    viewer: info.viewer,
                    extension: ext,
                    fileName: fileName,
                    icon: info.icon,
                    color: info.color
                };
            }
        }

        // Default fallback
        return {
            category: 'other',
            viewer: 'default',
            extension: ext,
            fileName: fileName,
            icon: 'file',
            color: '#666666'
        };
    },

    getFileTypeIconClass(category) {
        const iconMap = {
            'pdf': 'bi-file-pdf',
            'image': 'bi-file-image',
            'text': 'bi-file-text',
            'markdown': 'bi-markdown',
            'code': 'bi-file-code',
            'web': 'bi-code-slash',
            'data': 'bi-filetype-json',
            'other': 'bi-file-earmark'
        };

        return iconMap[category] || 'bi-file-earmark';
    },

    getFileNameFromPath(filePath) {
        if (!filePath) return 'Untitled';
        return filePath.split('/').pop() || filePath;
    },

    // File Preview Methods
    initFilePreview() {
        // Create preview tooltip element if it doesn't exist
        if (!document.getElementById('filePreviewTooltip')) {
            const tooltip = document.createElement('div');
            tooltip.id = 'filePreviewTooltip';
            tooltip.className = 'file-preview-tooltip';
            tooltip.innerHTML = '<div class="file-preview-content"></div>';
            document.body.appendChild(tooltip);
        }

        this.previewTimeout = null;
        this.currentPreviewCard = null;
    },

    async showFilePreview(card, documentPath, spaceName) {
        const tooltip = document.getElementById('filePreviewTooltip');
        if (!tooltip) return;

        const content = tooltip.querySelector('.file-preview-content');

        // Show loading state
        content.innerHTML = '<div class="file-preview-loading"><span class="spinner-border spinner-border-sm me-2"></span>Loading preview...</div>';

        // Position tooltip near the card
        this.positionPreviewTooltip(tooltip, card);

        // Show tooltip
        tooltip.classList.add('show');

        try {
            // Fetch file metadata and content preview
            const response = await fetch(`/applications/wiki/api/documents/content?path=${encodeURIComponent(documentPath)}&spaceName=${encodeURIComponent(spaceName)}&enhanced=true`);

            if (!response.ok) {
                throw new Error('Failed to load preview');
            }

            const data = await response.json();
            const { content: fileContent, metadata } = data;

            // Generate preview based on file type
            const viewer = metadata?.viewer || 'default';
            let previewHtml = '';

            switch (viewer) {
                case 'image':
                    const imageUrl = `/applications/wiki/api/documents/content?path=${encodeURIComponent(documentPath)}&spaceName=${encodeURIComponent(spaceName)}`;
                    previewHtml = `<img src="${imageUrl}" alt="Preview" />`;
                    break;

                case 'markdown':
                    if (typeof marked !== 'undefined') {
                        // Show first 500 characters of rendered markdown
                        const preview = fileContent.substring(0, 500) + (fileContent.length > 500 ? '...' : '');
                        previewHtml = `<div class="markdown-preview">${marked.parse(preview)}</div>`;
                    } else {
                        // Fallback to plain text
                        const preview = fileContent.substring(0, 300) + (fileContent.length > 300 ? '...' : '');
                        previewHtml = `<pre>${this.escapeHtml(preview)}</pre>`;
                    }
                    break;

                case 'text':
                case 'code':
                case 'web':
                case 'data':
                    // Show first 300 characters with line numbers
                    const lines = fileContent.split('\n').slice(0, 10);
                    const preview = lines.join('\n') + (fileContent.split('\n').length > 10 ? '\n...' : '');
                    previewHtml = `<pre>${this.escapeHtml(preview)}</pre>`;
                    break;

                case 'pdf':
                    const fileName = metadata?.fileName || documentPath.split('/').pop() || 'PDF Document';
                    const pdfPreviewUrl = `/applications/wiki/api/documents/pdf-preview?path=${encodeURIComponent(documentPath)}&spaceName=${encodeURIComponent(spaceName)}&page=1`;
                    previewHtml = `
                        <div class="pdf-preview-container">
                            <img src="${pdfPreviewUrl}" alt="PDF Preview" style="max-width: 100%; max-height: 250px; border-radius: 4px;"
                                 onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'text-center p-3\\'><i class=\\'fas fa-file-pdf\\' style=\\'font-size: 3rem; color: #dc3545;\\'></i><p class=\\'mt-2 mb-0\\'>PDF Preview Failed</p><small class=\\'text-muted\\'>${fileName}</small></div>';" />
                            <p class="mt-2 mb-0 text-center"><small class="text-muted">${fileName}</small></p>
                        </div>
                    `;
                    break;

                default:
                    const defaultFileName = metadata?.fileName || documentPath.split('/').pop() || 'Unknown';
                    previewHtml = `
                        <div class="text-center p-3">
                            <i class="fas fa-file" style="font-size: 3rem; color: #6c757d;"></i>
                            <p class="mt-2 mb-0">${defaultFileName}</p>
                            <small class="text-muted">No preview available</small>
                        </div>
                    `;
                    break;
            }

            content.innerHTML = previewHtml;

        } catch (error) {
            console.error('Error loading preview:', error);
            content.innerHTML = '<div class="preview-error">Failed to load preview</div>';
        }
    },

    positionPreviewTooltip(tooltip, card) {
        const cardRect = card.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        // Position to the right of the card by default
        let left = cardRect.right + 10;
        let top = cardRect.top;

        // If tooltip would go off screen to the right, show on left
        if (left + tooltipRect.width > window.innerWidth) {
            left = cardRect.left - tooltipRect.width - 10;
        }

        // If tooltip would go off screen at bottom, adjust top position
        if (top + tooltipRect.height > window.innerHeight) {
            top = window.innerHeight - tooltipRect.height - 10;
        }

        // Ensure tooltip doesn't go off top of screen
        if (top < 10) {
            top = 10;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    },

    hideFilePreview() {
        const tooltip = document.getElementById('filePreviewTooltip');
        if (tooltip) {
            tooltip.classList.remove('show');
        }

        if (this.previewTimeout) {
            clearTimeout(this.previewTimeout);
            this.previewTimeout = null;
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Drag and Drop Methods
    handleDragStart(e, itemPath, itemType) {
        e.stopPropagation();

        // Store drag data
        e.dataTransfer.setData('text/plain', JSON.stringify({
            sourcePath: itemPath,
            itemType: itemType,
            spaceId: this.app.currentSpace.id
        }));

        e.dataTransfer.effectAllowed = 'move';

        // Add visual feedback - make the dragged element semi-transparent
        e.target.style.opacity = '0.5';
        e.target.classList.add('dragging');
    },

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
    },

    handleDragEnter(e, targetElement) {
        e.preventDefault();
        e.stopPropagation();

        // Add visual feedback to drop target
        targetElement.classList.add('drag-over');
    },

    handleDragLeave(e, targetElement) {
        e.stopPropagation();

        // Remove visual feedback only if actually leaving the element
        const rect = targetElement.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
            targetElement.classList.remove('drag-over');
        }
    },

    async handleDrop(e, targetPath, targetType) {
        e.preventDefault();
        e.stopPropagation();

        // Get drag data
        const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
        const { sourcePath, itemType, spaceId } = dragData;

        // Remove visual feedback from all elements
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        document.querySelectorAll('.dragging').forEach(el => {
            el.style.opacity = '';
            el.classList.remove('dragging');
        });

        // Validate drop target
        if (targetType !== 'folder') {
            console.log('Can only drop into folders');
            return;
        }

        // Prevent dropping into the same location
        const sourceParent = sourcePath.includes('/') ? sourcePath.substring(0, sourcePath.lastIndexOf('/')) : '';
        if (sourceParent === targetPath) {
            console.log('Already in this folder');
            return;
        }

        // Prevent dropping folder into itself or its children
        if (itemType === 'folder' && (targetPath === sourcePath || targetPath.startsWith(sourcePath + '/'))) {
            this.app.showNotification('Cannot move a folder into itself', 'error');
            return;
        }

        try {
            // Call the move API
            const response = await fetch('/applications/wiki/api/move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sourcePath: sourcePath,
                    targetPath: targetPath,
                    spaceId: spaceId,
                    itemType: itemType
                })
            });

            const result = await response.json();

            if (result.success) {
                this.app.showNotification(`${itemType === 'folder' ? 'Folder' : 'File'} moved successfully`, 'success');

                // Refresh the file tree
                await this.loadFileTree();

                // Reload the current folder view if we're in it
                if (this.currentFolderPath !== undefined) {
                    await this.loadFolderContent(this.currentFolderPath);
                }
            } else {
                this.app.showNotification(result.message || 'Failed to move item', 'error');
            }
        } catch (error) {
            console.error('Error moving item:', error);
            this.app.showNotification('Failed to move item', 'error');
        }
    },

    /**
     * Populate window.documents array for wiki-code access
     * Converts the file tree into a structured format accessible from wiki-code blocks
     */
    populateWindowDocuments(tree) {
        const convertNodeToDocument = (node) => {
            const doc = {
                name: node.name || node.title,
                type: node.type,
                created: node.created || node.createdAt || new Date().toISOString(),
                path: node.path,
                space: this.app.currentSpace?.id?.toString() || '1',
                icon: this.getFileIcon(node.path || node.name)
            };

            if (node.type === 'folder') {
                doc.icon = 'bg-1 folder';
                doc.children = (node.children || []).map(child => convertNodeToDocument(child));
            } else {
                doc.icon = 'bg-1 file';
                doc.children = [];
            }

            return doc;
        };

        // Populate window.documents with the full tree structure
        window.documents = tree.map(node => convertNodeToDocument(node));

        // Initialize window.currentDocuments as empty array (will be populated by loadFolderContent)
        if (!window.currentDocuments) {
            window.currentDocuments = [];
        }

        console.log('window.documents populated:', window.documents);
    },

    /**
     * Update window.currentDocuments when a folder is loaded
     */
    updateCurrentDocuments(folderPath) {
        if (!this.fullFileTree) {
            window.currentDocuments = [];
            return;
        }

        // Find the folder in the tree
        const findFolder = (nodes, path) => {
            for (const node of nodes) {
                if (node.type === 'folder' && node.path === path) {
                    return node;
                }
                if (node.type === 'folder' && node.children) {
                    const found = findFolder(node.children, path);
                    if (found) return found;
                }
            }
            return null;
        };

        // If folderPath is null or empty, use root level
        if (!folderPath) {
            window.currentDocuments = this.fullFileTree.map(node => ({
                name: node.name || node.title,
                type: node.type,
                created: node.created || node.createdAt || new Date().toISOString(),
                path: node.path,
                space: this.app.currentSpace?.id?.toString() || '1',
                icon: node.type === 'folder' ? 'bg-1 folder' : 'bg-1 file'
            }));
        } else {
            const folder = findFolder(this.fullFileTree, folderPath);
            if (folder && folder.children) {
                window.currentDocuments = folder.children.map(node => ({
                    name: node.name || node.title,
                    type: node.type,
                    created: node.created || node.createdAt || new Date().toISOString(),
                    path: node.path,
                    space: this.app.currentSpace?.id?.toString() || '1',
                    icon: node.type === 'folder' ? 'bg-1 folder' : 'bg-1 file'
                }));
            } else {
                window.currentDocuments = [];
            }
        }

        console.log('window.currentDocuments updated for path:', folderPath, window.currentDocuments);
    }
};
