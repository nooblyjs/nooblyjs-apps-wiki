import { documentController } from "./documentcontroller.js";

export const navigationController = {
    app: null,
    fullFileTree: null,
    contextMenuTargetPath: null,
    contextMenuTargetType: null,
    uploadTargetPath: null,
    prefilledFolderPath: null,
    prefilledFilePath: null,
    renameItemPath: null,
    renameItemType: null,

    init(app) {
        this.app = app;
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

                return `
                    <div class="folder-item" data-folder-path="${node.path}" data-folder-id="${folderId}" style="padding-left: ${level * 16}px">
                        <i class="bi ${hasChildren ? 'bi-chevron-right' : ''} chevron-icon"></i>
                        <i class="bi bi-folder folder-icon"></i>
                        <span>${node.name}</span>
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

                    return `
                        <div class="file-item" data-document-path="${node.path}" data-space-name="${node.spaceName}" style="padding-left: ${(level * 16) + 16}px">
                            <i class="bi ${fileIcon.icon} ${fileIcon.color}"></i>
                            <span>${node.title || node.name}</span>
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
                console.log('Context menu triggered on file item, filePath:', filePath);
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
                    </div>
                </div>

                <div class="folder-content">
                    ${folderContent.folders.length === 0 && folderContent.files.length === 0 ? `
                        <div class="empty-folder">
                            <i class="bi bi-folder empty-folder-icon"></i>
                            <p>This folder is empty</p>
                        </div>
                    ` : `
                        <div class="items-grid">
                            ${folderContent.folders.map(folder => {
                                const childCount = folder.childCount || 0;
                                return `
                                    <div class="item-card folder-card" data-folder-path="${folder.path}">
                                        <i class="bi bi-folder item-icon"></i>
                                        <div class="item-info">
                                            <div class="item-name">${folder.name}</div>
                                            <div class="item-meta">Folder • ${childCount} item${childCount !== 1 ? 's' : ''}</div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                            ${folderContent.files.map(file => {
                                const fileIcon = this.getFileIcon(file.path || file.name);

                                return `
                                <div class="item-card file-card" data-document-path="${file.path}" data-space-name="${file.spaceName}">
                                    <i class="bi ${fileIcon.icon} item-icon"></i>
                                    <div class="item-info">
                                        <div class="item-name">${file.title || file.name}</div>
                                        <div class="item-meta">File • ${this.getFileTypeFromExtension(file.path || file.name)}</div>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    `}
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

    bindFolderViewEvents() {
        // Back to space button
        document.getElementById('backToSpace')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.app.showHome();
        });

        // Folder cards click events
        document.querySelectorAll('#folderView .folder-card').forEach(card => {
            card.addEventListener('click', () => {
                const folderPath = card.dataset.folderPath;
                this.loadFolderContent(folderPath);
            });
        });

        // File cards click events
        document.querySelectorAll('#folderView .file-card').forEach(card => {
            card.addEventListener('click', () => {
                const documentPath = card.dataset.documentPath;
                const spaceName = card.dataset.spaceName;
                documentController.openDocumentByPath(documentPath, spaceName);
            });
        });
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
            console.log('Context menu Create Folder clicked, contextMenuTargetPath:', this.contextMenuTargetPath);
            this.hideContextMenu();
            this.showCreateFolderModal(this.contextMenuTargetPath);
        });

        document.getElementById('contextCreateFile')?.addEventListener('click', () => {
            this.hideContextMenu();
            this.showCreateFileModal(this.contextMenuTargetPath);
        });

        document.getElementById('contextUpload')?.addEventListener('click', () => {
            this.hideContextMenu();
            this.showUploadDialog(this.contextMenuTargetPath);
        });

        document.getElementById('contextRename')?.addEventListener('click', () => {
            console.log('Context menu Rename clicked, contextMenuTargetPath:', this.contextMenuTargetPath, 'contextMenuTargetType:', this.contextMenuTargetType);
            this.hideContextMenu();
            this.showRenameModal(this.contextMenuTargetPath, this.contextMenuTargetType);
        });

        document.getElementById('contextDelete')?.addEventListener('click', () => {
            console.log('Context menu Delete clicked, contextMenuTargetPath:', this.contextMenuTargetPath, 'contextMenuTargetType:', this.contextMenuTargetType);
            this.hideContextMenu();
            this.handleDeleteItem(this.contextMenuTargetPath, this.contextMenuTargetType);
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

        const contextMenu = document.getElementById('fileContextMenu');
        this.contextMenuTargetPath = targetPath || ''; // Empty string for root
        this.contextMenuTargetType = targetType;

        console.log('Context menu opened for path:', targetPath, 'type:', targetType); // Debug log

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
                    content: await this.app.getTemplateContent(formData.get('fileTemplate')),
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
                // Read file content
                const content = await this.readFileContent(file);

                // Generate document path
                const fileName = file.name;
                const documentPath = uploadPath ? `${uploadPath}/${fileName}` : fileName;

                // Create document using the existing API
                const response = await fetch('/applications/wiki/api/documents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: fileName.replace(/\.[^/.]+$/, ''), // Remove extension for title
                        content: content,
                        spaceId: this.app.currentSpace.id,
                        path: documentPath,
                        folderPath: uploadPath
                    })
                });

                const result = await response.json();

                if (result.success) {
                    this.app.showNotification(`File "${fileName}" uploaded successfully`, 'success');
                } else {
                    throw new Error(result.message || 'Failed to upload file');
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
                // Delete file
                response = await fetch(`/applications/wiki/api/documents/${encodeURIComponent(itemPath)}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        spaceId: this.app.currentSpace?.id,
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
            'pdf': 'fa-file-pdf',
            'image': 'fa-image',
            'text': 'fa-file-alt',
            'markdown': 'fa-file-alt',
            'code': 'fa-file-code',
            'web': 'fa-code',
            'data': 'fa-file-code',
            'other': 'fa-file'
        };

        return iconMap[category] || 'fa-file';
    },

    getFileNameFromPath(filePath) {
        if (!filePath) return 'Untitled';
        return filePath.split('/').pop() || filePath;
    }
};
