import { spacesController } from "./modules/spacescontroller.js";
import { navigationController } from "./modules/navigationcontroller.js";
import { documentController } from "./modules/documentcontroller.js";
import { searchController } from "./modules/searchcontroller.js";
import { userController } from "./modules/usercontroller.js";
import { templatesController } from "./modules/templatescontroller.js";

/**
 * @fileoverview Updated Wiki Application with new layout
 * Handles the new collapsible sidebar design with folders and files
 * 
 * @author NooblyJS Team
 * @version 2.0.0
 * @since 2025-08-26
 */
class WikiApp {

    constructor() {
        this.currentView = 'login';
        this.currentSpace = null;
        this.currentDocument = null;
        this.currentFolder = null;
        this.isEditing = false;
        this.data = {
            spaces: [],
            documents: [],
            folders: [],
            templates: [],
            recent: [],
            starred: []
        };
        this.sidebarState = {
            shortcuts: true,
            spaces: true
        };

        // Initialize controllers
        spacesController.init(this);
        navigationController.init(this);
        documentController.init(this);
        searchController.init(this);
        userController.init(this);
        templatesController.init(this);

        this.init();
    }

    init() {
        userController.checkAuth();
        this.bindEvents();
        this.initMarkdown();
        this.initSidebar();
        this.initSidebarResize();
    }

    bindEvents() {
        // Login form
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            userController.handleLogin();
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            userController.handleLogout();
        });

        // User profile click
        document.getElementById('userProfile')?.addEventListener('click', () => {
            userController.showUserProfileModal();
        });

        // Sidebar collapsible sections
        document.getElementById('shortcutsHeader')?.addEventListener('click', () => {
            this.toggleSidebarSection('shortcuts');
        });

        document.getElementById('spacesHeader')?.addEventListener('click', () => {
            this.toggleSidebarSection('spaces');
        });

        // Shortcuts navigation
        document.getElementById('shortcutHome')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showHome();
        });

        document.getElementById('shortcutRecent')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRecent();
        });

        document.getElementById('shortcutStarred')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showStarred();
        });

        document.getElementById('shortcutTemplates')?.addEventListener('click', (e) => {
            e.preventDefault();
            templatesController.showTemplates();
        });

        // File actions
        document.getElementById('uploadBtn')?.addEventListener('click', () => {
            navigationController.showUploadDialog(null); // null = root directory
        });

        document.getElementById('createFolderBtn')?.addEventListener('click', () => {
            navigationController.showCreateFolderModal(null); // null = root directory
        });

        document.getElementById('createFileBtn')?.addEventListener('click', () => {
            navigationController.showCreateFileModal(null); // null = root directory
        });

        document.getElementById('publishBtn')?.addEventListener('click', () => {
            this.handlePublish();
        });

        document.getElementById('createNewMarkdownBtn')?.addEventListener('click', () => {
            navigationController.showCreateFileModal();
        });

        // Space actions
        document.getElementById('createSpaceBtn')?.addEventListener('click', () => {
            spacesController.showCreateSpaceModal();
        });

        // Modal events
        this.bindModalEvents();

        // Initialize template button state (hidden by default)
        templatesController.hideTemplateButton();

        // Global search with suggestions
        searchController.initSearchFunctionality();

        // Refresh recent files button
        document.getElementById('refreshRecentBtn')?.addEventListener('click', async () => {
            await this.loadRecentFiles();
        });

        // Context menu functionality
        navigationController.initContextMenu();

        // Initialize activity tracking
        userController.ensureActivityData();
    }

    bindModalEvents() {
        // Create space modal
        document.getElementById('createSpaceForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            spacesController.handleCreateSpace();
        });

        document.getElementById('closeCreateSpaceModal')?.addEventListener('click', () => {
            this.hideModal('createSpaceModal');
        });

        document.getElementById('cancelCreateSpace')?.addEventListener('click', () => {
            this.hideModal('createSpaceModal');
        });

        // Create folder modal
        document.getElementById('createFolderForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            navigationController.handleCreateFolder();
        });

        document.getElementById('closeCreateFolderModal')?.addEventListener('click', () => {
            this.hideModal('createFolderModal');
        });

        document.getElementById('cancelCreateFolder')?.addEventListener('click', () => {
            this.hideModal('createFolderModal');
        });

        // Create file modal
        document.getElementById('createFileForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            navigationController.handleCreateFile();
        });

        document.getElementById('closeCreateFileModal')?.addEventListener('click', () => {
            this.hideModal('createFileModal');
        });

        document.getElementById('cancelCreateFile')?.addEventListener('click', () => {
            this.hideModal('createFileModal');
        });

        // Rename modal
        document.getElementById('renameForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            navigationController.handleRename();
        });

        document.getElementById('closeRenameModal')?.addEventListener('click', () => {
            this.hideModal('renameModal');
        });

        document.getElementById('cancelRename')?.addEventListener('click', () => {
            this.hideModal('renameModal');
        });

        // Overlay click to close modals
        document.getElementById('overlay')?.addEventListener('click', () => {
            this.hideAllModals();
        });
    }

    initSidebar() {
        // Set initial collapsed states
        this.updateSidebarSection('shortcuts', this.sidebarState.shortcuts);
        this.updateSidebarSection('spaces', this.sidebarState.spaces);
    }

    initSidebarResize() {
        const sidebar = document.getElementById('leftSidebar');
        const resizeHandle = document.getElementById('sidebarResizeHandle');

        if (!sidebar || !resizeHandle) return;

        // Load saved width from localStorage
        const savedWidth = localStorage.getItem('sidebarWidth');
        if (savedWidth) {
            sidebar.style.width = savedWidth + 'px';
        }

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        const startResize = (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = parseInt(getComputedStyle(sidebar).width, 10);
            resizeHandle.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        };

        const resize = (e) => {
            if (!isResizing) return;

            const width = startWidth + (e.clientX - startX);
            const minWidth = 200;
            const maxWidth = 600;

            if (width >= minWidth && width <= maxWidth) {
                sidebar.style.width = width + 'px';
            }
        };

        const stopResize = () => {
            if (!isResizing) return;

            isResizing = false;
            resizeHandle.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            // Save to localStorage
            const currentWidth = parseInt(getComputedStyle(sidebar).width, 10);
            localStorage.setItem('sidebarWidth', currentWidth);
        };

        resizeHandle.addEventListener('mousedown', startResize);
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
    }

    initMarkdown() {
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                highlight: function(code, lang) {
                    if (typeof Prism !== 'undefined' && lang && Prism.languages[lang]) {
                        return Prism.highlight(code, Prism.languages[lang], lang);
                    }
                    return code;
                },
                breaks: true,
                gfm: true
            });
        }
    }

    toggleSidebarSection(section) {
        this.sidebarState[section] = !this.sidebarState[section];
        this.updateSidebarSection(section, this.sidebarState[section]);
    }

    updateSidebarSection(section, isExpanded) {
        const header = document.getElementById(`${section}Header`);
        const content = document.getElementById(`${section}Content`);
        
        if (!header || !content) return;

        if (isExpanded) {
            header.classList.remove('collapsed');
            content.classList.remove('collapsed');
            content.style.maxHeight = 'none'; // Allow natural height when expanded
        } else {
            header.classList.add('collapsed');
            content.classList.add('collapsed');
            content.style.maxHeight = '0px';
        }
    }

    async loadInitialData() {
        try {
            // Load user profile first
            await userController.loadUserProfile();

            // Load user activity (starred and recent)
            await userController.loadUserActivity();

            // Load spaces
            const spacesResponse = await fetch('/applications/wiki/api/spaces');
            this.data.spaces = await spacesResponse.json();

            // Load documents
            const documentsResponse = await fetch('/applications/wiki/api/documents');
            this.data.documents = await documentsResponse.json();

            spacesController.renderSpacesList();
            navigationController.loadFileTree();

        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }


    // Modal methods

    populateFolderLocationSelect() {
        const select = document.getElementById('folderLocation');
        if (!select) return;

        // Clear existing options except root
        select.innerHTML = '<option value="">Root</option>';
        
        // Add existing folders as options
        // This would be populated from the current folder tree
    }

    populateFileLocationSelect() {
        const select = document.getElementById('fileLocation');
        if (!select) return;

        // Clear existing options except root
        select.innerHTML = '<option value="">Root</option>';
        
        // Add existing folders as options
        // This would be populated from the current folder tree
    }
    

    async handlePublish() {
        if (!this.currentSpace) {
            this.showNotification('Please select a space first', 'warning');
            return;
        }

        try {
            const response = await fetch('/applications/wiki/api/publish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    spaceId: this.currentSpace.id
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Content published successfully!', 'success');
            } else {
                throw new Error(result.message || 'Failed to publish content');
            }
        } catch (error) {
            console.error('Publish error:', error);
            this.showNotification(error.message || 'Failed to publish content', 'error');
        }
    }


    // View methods
    async showHome() {
        this.setActiveView('home');
        this.setActiveShortcut('shortcutHome');
        this.currentView = 'home';

        // Restore full home view
        this.restoreHomeView();

        // Load home.md content if it exists
        await this.loadHomeContent();

        // Load recent files for the homepage
        await this.loadRecentFiles();
        this.loadStarredFiles();
        templatesController.loadTemplates();
    }

    showRecent() {
        this.setActiveView('search');
        this.setActiveShortcut('shortcutRecent');
        this.currentView = 'recent';

        // Update search query display
        const queryElement = document.getElementById('searchQuery');
        const currentSpaceName = this.currentSpace ? this.currentSpace.name : null;

        if (queryElement) {
            const spaceContext = currentSpaceName ? ` - ${currentSpaceName}` : '';
            queryElement.textContent = `Recent Documents${spaceContext}`;
        }

        // Get recent files filtered by current space, sorted by visitedAt descending
        const allRecentFiles = this.data.recent || [];
        const recentFiles = currentSpaceName
            ? allRecentFiles.filter(file => file.spaceName === currentSpaceName)
            : allRecentFiles;

        const sortedRecentFiles = recentFiles.sort((a, b) => {
            const dateA = new Date(a.visitedAt || 0);
            const dateB = new Date(b.visitedAt || 0);
            return dateB - dateA; // Descending order (most recent first)
        });

        const container = document.getElementById('searchResults');
        if (!container) return;

        if (sortedRecentFiles.length === 0) {
            const noFilesMessage = currentSpaceName
                ? `No recent documents in ${currentSpaceName}`
                : 'No recent documents found';
            const helpText = currentSpaceName
                ? `Documents you access in ${currentSpaceName} will appear here`
                : 'Documents you access will appear here';

            container.innerHTML = `
                <div class="no-content-message">
                    <svg width="48" height="48" class="no-content-icon">
                        <use href="#icon-history"></use>
                    </svg>
                    <p>${noFilesMessage}</p>
                    <p class="text-muted">${helpText}</p>
                </div>
            `;
            return;
        }

        // Render in search results style
        const resultsHtml = sortedRecentFiles.map(file => {
            const icon = 'icon-file';
            const title = navigationController.getFileNameFromPath(file.path);
            const excerpt = file.excerpt || 'Recently viewed document';
            const path = file.path || '';
            const spaceName = file.spaceName || 'Unknown Space';
            const visitedDate = file.visitedAt ? new Date(file.visitedAt).toLocaleString() : '';

            const escapedPath = path.replace(/"/g, '&quot;');
            const escapedSpaceName = spaceName.replace(/"/g, '&quot;');
            const escapedTitle = title.replace(/"/g, '&quot;');

            return `
                <div class="search-result-item"
                     data-path="${escapedPath}"
                     data-space-name="${escapedSpaceName}"
                     data-title="${escapedTitle}">
                    <div class="search-result-icon">
                        <svg width="20" height="20">
                            <use href="#${icon}"></use>
                        </svg>
                    </div>
                    <div class="search-result-content">
                        <h3 class="search-result-title">${title}</h3>
                        <p class="search-result-excerpt">${excerpt}</p>
                        <div class="search-result-meta">
                            <span class="search-result-space">${spaceName}</span>
                            ${visitedDate ? `<span class="search-result-date">Visited ${visitedDate}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="search-results-header">
                <h2>Found ${sortedRecentFiles.length} recent document${sortedRecentFiles.length === 1 ? '' : 's'}</h2>
            </div>
            <div class="search-results-list">
                ${resultsHtml}
            </div>
        `;

        // Add click handlers to results
        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const { path, spaceName } = item.dataset;
                documentController.exitEditorMode();
                documentController.openDocumentByPath(path, spaceName);
            });
        });

        // Hide template button
        templatesController.hideTemplateButton();
    }

    showStarred() {
        this.setActiveView('search');
        this.setActiveShortcut('shortcutStarred');
        this.currentView = 'starred';

        // Update search query display
        const queryElement = document.getElementById('searchQuery');
        const currentSpaceName = this.currentSpace ? this.currentSpace.name : null;

        if (queryElement) {
            const spaceContext = currentSpaceName ? ` - ${currentSpaceName}` : '';
            queryElement.textContent = `Starred Documents${spaceContext}`;
        }

        // Get starred files filtered by current space, sorted by starredAt descending
        const allStarredFiles = this.data.starred || [];
        const starredFiles = currentSpaceName
            ? allStarredFiles.filter(file => file.spaceName === currentSpaceName)
            : allStarredFiles;

        const sortedStarredFiles = starredFiles.sort((a, b) => {
            const dateA = new Date(a.starredAt || 0);
            const dateB = new Date(b.starredAt || 0);
            return dateB - dateA; // Descending order (most recently starred first)
        });

        const container = document.getElementById('searchResults');
        if (!container) return;

        if (sortedStarredFiles.length === 0) {
            const noFilesMessage = currentSpaceName
                ? `No starred documents in ${currentSpaceName}`
                : 'No starred documents found';
            const helpText = currentSpaceName
                ? `Documents you star in ${currentSpaceName} will appear here`
                : 'Star documents to see them here';

            container.innerHTML = `
                <div class="no-content-message">
                    <svg width="48" height="48" class="no-content-icon">
                        <use href="#icon-star"></use>
                    </svg>
                    <p>${noFilesMessage}</p>
                    <p class="text-muted">${helpText}</p>
                </div>
            `;
            return;
        }

        // Render in search results style
        const resultsHtml = sortedStarredFiles.map(file => {
            const icon = 'icon-star';
            const title = navigationController.getFileNameFromPath(file.path);
            const excerpt = file.excerpt || 'Starred document';
            const path = file.path || '';
            const spaceName = file.spaceName || 'Unknown Space';
            const starredDate = file.starredAt ? new Date(file.starredAt).toLocaleString() : '';

            const escapedPath = path.replace(/"/g, '&quot;');
            const escapedSpaceName = spaceName.replace(/"/g, '&quot;');
            const escapedTitle = title.replace(/"/g, '&quot;');

            return `
                <div class="search-result-item"
                     data-path="${escapedPath}"
                     data-space-name="${escapedSpaceName}"
                     data-title="${escapedTitle}">
                    <div class="search-result-icon">
                        <svg width="20" height="20">
                            <use href="#${icon}"></use>
                        </svg>
                    </div>
                    <div class="search-result-content">
                        <h3 class="search-result-title">${title}</h3>
                        <p class="search-result-excerpt">${excerpt}</p>
                        <div class="search-result-meta">
                            <span class="search-result-space">${spaceName}</span>
                            ${starredDate ? `<span class="search-result-date">Starred ${starredDate}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="search-results-header">
                <h2>Found ${sortedStarredFiles.length} starred document${sortedStarredFiles.length === 1 ? '' : 's'}</h2>
            </div>
            <div class="search-results-list">
                ${resultsHtml}
            </div>
        `;

        // Add click handlers to results
        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const { path, spaceName } = item.dataset;
                documentController.exitEditorMode();
                documentController.openDocumentByPath(path, spaceName);
            });
        });

        // Hide template button
        templatesController.hideTemplateButton();
    }

    showRecentOnlyView() {
        // Hide starred and templates sections, show only recent
        const starredSection = document.querySelector('.content-sections section:nth-child(2)');
        const templatesSection = document.querySelector('.content-sections section:nth-child(3)');
        
        if (starredSection) starredSection.style.display = 'none';
        if (templatesSection) templatesSection.style.display = 'none';
        
        // Load recent files
        this.loadRecentFiles();
    }
    
    showStarredOnlyView() {
        // Hide recent and templates sections, show only starred
        const recentSection = document.querySelector('.content-sections section:nth-child(1)');
        const templatesSection = document.querySelector('.content-sections section:nth-child(3)');
        
        if (recentSection) recentSection.style.display = 'none';
        if (templatesSection) templatesSection.style.display = 'none';
        
        // Load starred files
        this.loadStarredFiles();
    }
    
    restoreHomeView() {
        // Show all sections
        const sections = document.querySelectorAll('.content-sections section');
        sections.forEach(section => section.style.display = 'block');
        
        // Restore original titles
        const workspaceTitle = document.getElementById('workspaceTitle');
        const workspaceSubtitle = document.getElementById('workspaceSubtitle');
        if (workspaceTitle) workspaceTitle.textContent = 'Welcome to the wiki';
        if (workspaceSubtitle) workspaceSubtitle.textContent = 'Your documentation workspace dashboard';
        
        // Hide template button
        templatesController.hideTemplateButton();
    }

    setActiveView(viewName) {
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });
        
        const targetView = document.getElementById(`${viewName}View`);
        if (targetView) {
            targetView.classList.remove('hidden');
        }
    }

    setActiveShortcut(shortcutId) {
        document.querySelectorAll('.shortcut-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeShortcut = document.getElementById(shortcutId);
        if (activeShortcut) {
            activeShortcut.classList.add('active');
        }
    }

    // Utility methods
    showModal(modalId) {
        console.log('showModal called with modalId:', modalId);
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('overlay');

        console.log('modal element:', modal);
        console.log('overlay element:', overlay);

        if (modal && overlay) {
            console.log('Removing hidden class from modal and overlay');
            modal.classList.remove('hidden');
            overlay.classList.remove('hidden');
            console.log('Modal classes after removal:', modal.className);
            console.log('Overlay classes after removal:', overlay.className);
        } else {
            console.error('Modal or overlay element not found!');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('overlay');
        
        if (modal && overlay) {
            modal.classList.add('hidden');
            overlay.classList.add('hidden');
            
            // Clean up context menu prefilled paths and show location dropdowns again
            if (modalId === 'createFolderModal') {
                this.prefilledFolderPath = null;
                const folderLocationSelect = document.getElementById('folderLocation');
                const locationGroup = folderLocationSelect?.parentElement;
                if (locationGroup) {
                    locationGroup.style.display = 'block';
                }
            } else if (modalId === 'createFileModal') {
                this.prefilledFilePath = null;
                const fileLocationSelect = document.getElementById('fileLocation');
                const locationGroup = fileLocationSelect?.parentElement;
                if (locationGroup) {
                    locationGroup.style.display = 'block';
                }
            }
        }
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        document.getElementById('overlay')?.classList.add('hidden');
    }

    showNotification(message, type = 'info') {
        // Create a simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Load home.md content if it exists in the current space
    async loadHomeContent() {
        const homeContentArea = document.getElementById('homeContentArea');
        const homeContentBody = document.getElementById('homeContentBody');

        if (!homeContentArea || !homeContentBody) return;

        // Hide by default
        homeContentArea.classList.add('hidden');

        // Only try to load if we have a current space
        if (!this.currentSpace) return;

        try {
            // Try to load home.md from the root of the current space
            const response = await fetch('/applications/wiki/api/documents/content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    spaceName: this.currentSpace.name,
                    path: 'home.md'
                })
            });

            if (!response.ok) {
                // File doesn't exist, which is fine
                return;
            }

            const data = await response.json();

            if (data.content) {
                // Render markdown content
                homeContentBody.innerHTML = marked.parse(data.content);
                homeContentArea.classList.remove('hidden');
            }

        } catch (error) {
            // Silently fail if home.md doesn't exist
            console.log('No home.md found in space root (this is optional)');
        }
    }

    // Placeholder methods for not-yet-implemented features
    async loadRecentFiles() {
        const container = document.getElementById('recentFilesContent');
        if (!container) return;

        try {
            // Use activity data for recent files, filtered by current space
            const allRecentFiles = this.data.recent || [];
            const currentSpaceName = this.currentSpace ? this.currentSpace.name : null;

            // Filter recent files to only show files from the current space
            const recentFiles = currentSpaceName
                ? allRecentFiles.filter(file => file.spaceName === currentSpaceName)
                : allRecentFiles;

            if (recentFiles.length === 0) {
                const noFilesMessage = currentSpaceName
                    ? `No recent files in ${currentSpaceName}`
                    : 'No recent files found';
                const helpText = currentSpaceName
                    ? `Files you access in ${currentSpaceName} will appear here`
                    : 'Files you access will appear here';

                container.innerHTML = `
                    <div class="no-content-message">
                        <svg width="48" height="48" class="no-content-icon">
                            <use href="#icon-history"></use>
                        </svg>
                        <p>${noFilesMessage}</p>
                        <small>${helpText}</small>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <div class="items-grid">
                    ${recentFiles.map(file => {
                        const fileTypeInfo = navigationController.getFileTypeInfo(file.path);
                        const iconClass = navigationController.getFileTypeIconClass(fileTypeInfo.category);
                        const iconColor = fileTypeInfo.color;
                        const fileName = navigationController.getFileNameFromPath(file.path);
                        
                        return `
                            <div class="item-card file-card" data-document-path="${file.path}" data-space-name="${file.spaceName}">
                                <i class="fas ${iconClass} item-icon" style="color: ${iconColor}; font-size: 24px;"></i>
                                <div class="item-info">
                                    <div class="item-name">${fileName}</div>
                                    <div class="item-meta">File • ${fileTypeInfo.category} • Visited ${this.formatDate(file.visitedAt)}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
            // Bind click events
            container.querySelectorAll('.file-card').forEach(card => {
                card.addEventListener('click', () => {
                    const documentPath = card.dataset.documentPath;
                    const spaceName = card.dataset.spaceName;
                    documentController.openDocumentByPath(documentPath, spaceName);
                });
            });
            
        } catch (error) {
            console.error('Error loading recent files:', error);
            container.innerHTML = `
                <div class="error-message">
                    <p>Error loading recent files</p>
                </div>
            `;
        }
    }

    loadStarredFiles() {
        const container = document.getElementById('starredFilesContent');
        if (!container) {
            console.log('starredFilesContent container not found');
            return;
        }

        try {
            // Use activity data for starred files, filtered by current space
            const allStarredFiles = this.data.starred || [];
            const currentSpaceName = this.currentSpace ? this.currentSpace.name : null;

            console.log('Loading starred files:', {
                allStarredFiles,
                currentSpaceName,
                dataStarred: this.data.starred,
                userActivityStarred: this.userActivity?.starred
            });

            // Filter starred files to only show files from the current space
            const starredFiles = currentSpaceName
                ? allStarredFiles.filter(file => file.spaceName === currentSpaceName)
                : allStarredFiles;

            if (starredFiles.length === 0) {
                const noFilesMessage = currentSpaceName
                    ? `No starred files in ${currentSpaceName}`
                    : 'No starred files found';
                const helpText = currentSpaceName
                    ? `Files you star in ${currentSpaceName} will appear here`
                    : 'Star files to see them here';

                container.innerHTML = `
                    <div class="no-content-message">
                        <svg width="48" height="48" class="no-content-icon">
                            <use href="#icon-star"></use>
                        </svg>
                        <p>${noFilesMessage}</p>
                        <small>${helpText}</small>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <div class="items-grid">
                    ${starredFiles.map(file => {
                        const fileTypeInfo = navigationController.getFileTypeInfo(file.path);
                        const iconClass = navigationController.getFileTypeIconClass(fileTypeInfo.category);
                        const iconColor = fileTypeInfo.color;
                        const fileName = navigationController.getFileNameFromPath(file.path);
                        
                        return `
                            <div class="item-card file-card" data-document-path="${file.path}" data-space-name="${file.spaceName}">
                                <i class="fas ${iconClass} item-icon" style="color: ${iconColor}; font-size: 24px;"></i>
                                <div class="item-info">
                                    <div class="item-name">${fileName}</div>
                                    <div class="item-meta">File • ${fileTypeInfo.category} • Starred ${this.formatDate(file.starredAt)}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
            // Bind click events
            container.querySelectorAll('.file-card').forEach(card => {
                card.addEventListener('click', () => {
                    const documentPath = card.dataset.documentPath;
                    const spaceName = card.dataset.spaceName;
                    documentController.openDocumentByPath(documentPath, spaceName);
                });
            });
            
        } catch (error) {
            console.error('Error loading starred files:', error);
            container.innerHTML = `
                <div class="error-message">
                    <p>Error loading starred files</p>
                </div>
            `;
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.wikiApp = new WikiApp();
});