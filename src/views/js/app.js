import { spacesController } from "./modules/spacescontroller.js";
import { navigationController } from "./modules/navigationcontroller.js";
import { documentController } from "./modules/documentcontroller.js";
import { searchController } from "./modules/searchcontroller.js";

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

        this.init();
    }

    init() {
        this.checkAuth();
        this.bindEvents();
        this.initMarkdown();
        this.initSidebar();
        this.initSidebarResize();
    }

    async checkAuth() {
        try {
            const response = await fetch('/applications/wiki/api/auth/check');
            const data = await response.json();
            if (data.authenticated) {
                await this.loadInitialData();
                this.showHome();
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showLogin();
        }
    }

    bindEvents() {
        // Login form
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // User profile click
        document.getElementById('userProfile')?.addEventListener('click', () => {
            this.showUserProfileModal();
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
            this.showTemplates();
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
        this.hideTemplateButton();

        // Global search with suggestions
        searchController.initSearchFunctionality();

        // Refresh recent files button
        document.getElementById('refreshRecentBtn')?.addEventListener('click', async () => {
            await this.loadRecentFiles();
        });

        // Context menu functionality
        navigationController.initContextMenu();

        // Initialize activity tracking
        this.ensureActivityData();
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
            await this.loadUserProfile();

            // Load user activity (starred and recent)
            await this.loadUserActivity();

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
    }

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
    
    async populateTemplateSelect() {
        const select = document.getElementById('fileTemplate');
        if (!select) return;
        
        // Clear existing options except blank document
        select.innerHTML = '<option value="">Blank Document</option>';
        
        try {
            // Load templates from .templates folder
            const response = await fetch(`/applications/wiki/api/spaces/${this.currentSpace.id}/templates`);
            const templates = await response.json();
            
            // Add custom templates from .templates folder
            templates.forEach(template => {
                const option = document.createElement('option');
                option.value = template.path;
                option.textContent = template.title || template.name;
                select.appendChild(option);
            });
            
        } catch (error) {
            console.error('Error loading templates for dropdown:', error);
            // Fall back to hardcoded templates if API fails
            const fallbackTemplates = [
                { value: 'basic', text: 'Basic Article' },
                { value: 'api', text: 'API Documentation' },
                { value: 'meeting', text: 'Meeting Notes' },
                { value: 'requirements', text: 'Requirements Doc' }
            ];
            
            fallbackTemplates.forEach(template => {
                const option = document.createElement('option');
                option.value = template.value;
                option.textContent = template.text;
                select.appendChild(option);
            });
        }
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

    async getTemplateContent(templatePath) {
        if (!templatePath) return '';
        
        // Check if it's a custom template from .templates folder (path starts with .templates)
        if (templatePath.startsWith('.templates/')) {
            try {
                const response = await fetch(`/applications/wiki/api/documents/content`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        spaceName: this.currentSpace.name,
                        path: templatePath
                    })
                });
                
                const templateDoc = await response.json();
                return templateDoc.content || '';
                
            } catch (error) {
                console.error('Error loading custom template content:', error);
                return '';
            }
        } else {
            // Fall back to hardcoded templates for backward compatibility
            const templates = {
                basic: '# Document Title\n\n## Overview\n\nDescription of the document.\n\n## Content\n\nYour content here.',
                api: '# API Documentation\n\n## Endpoint\n\n`GET /api/endpoint`\n\n## Parameters\n\n| Parameter | Type | Description |\n|-----------|------|-------------|\n| param1 | string | Description |\n\n## Response\n\n```json\n{\n  "status": "success"\n}\n```',
                meeting: '# Meeting Notes\n\n**Date:** \n**Attendees:** \n**Agenda:** \n\n## Discussion\n\n## Action Items\n\n- [ ] Task 1\n- [ ] Task 2',
                requirements: '# Requirements Document\n\n## Purpose\n\n## Scope\n\n## Requirements\n\n### Functional Requirements\n\n### Non-Functional Requirements\n\n## Acceptance Criteria'
            };
            return templates[templatePath] || '';
        }
    }

    // View methods
    async showHome() {
        this.setActiveView('home');
        this.setActiveShortcut('shortcutHome');
        this.currentView = 'home';
        
        // Restore full home view
        this.restoreHomeView();
        
        // Load recent files for the homepage
        await this.loadRecentFiles();
        this.loadStarredFiles();
    }

    showRecent() {
        this.setActiveView('home');
        this.setActiveShortcut('shortcutRecent');
        this.currentView = 'recent';
        
        // Update workspace title with space context
        const workspaceTitle = document.getElementById('workspaceTitle');
        const workspaceSubtitle = document.getElementById('workspaceSubtitle');
        const currentSpaceName = this.currentSpace ? this.currentSpace.name : 'All Spaces';

        if (workspaceTitle) workspaceTitle.textContent = `Recent Documents - ${currentSpaceName}`;
        if (workspaceSubtitle) {
            const subtitle = this.currentSpace
                ? `Documents you have recently accessed in ${currentSpaceName}`
                : 'Documents you have recently accessed';
            workspaceSubtitle.textContent = subtitle;
        }
        
        // Hide starred section and show only recent
        this.showRecentOnlyView();
        
        // Hide template button
        this.hideTemplateButton();
    }

    showStarred() {
        this.setActiveView('home');
        this.setActiveShortcut('shortcutStarred');
        this.currentView = 'starred';

        // Update workspace title with space context
        const workspaceTitle = document.getElementById('workspaceTitle');
        const workspaceSubtitle = document.getElementById('workspaceSubtitle');
        const currentSpaceName = this.currentSpace ? this.currentSpace.name : 'All Spaces';

        if (workspaceTitle) workspaceTitle.textContent = `Starred Documents - ${currentSpaceName}`;
        if (workspaceSubtitle) {
            const subtitle = this.currentSpace
                ? `Documents you have starred in ${currentSpaceName}`
                : 'Documents you have marked as favorites';
            workspaceSubtitle.textContent = subtitle;
        }

        // Hide recent section and show only starred
        this.showStarredOnlyView();

        // Hide template button
        this.hideTemplateButton();
    }

    showTemplates() {
        this.setActiveView('home');
        this.setActiveShortcut('shortcutTemplates');
        this.currentView = 'templates';
        
        // Update workspace title
        const workspaceTitle = document.getElementById('workspaceTitle');
        const workspaceSubtitle = document.getElementById('workspaceSubtitle');
        if (workspaceTitle) workspaceTitle.textContent = 'Document Templates';
        if (workspaceSubtitle) workspaceSubtitle.textContent = 'Reusable templates for creating new documents';
        
        // Hide other sections and show only templates
        this.showTemplatesOnlyView();
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
    
    showTemplatesOnlyView() {
        // Hide recent and starred sections, show only templates
        const recentSection = document.querySelector('.content-sections section:nth-child(1)');
        const starredSection = document.querySelector('.content-sections section:nth-child(2)');
        
        if (recentSection) recentSection.style.display = 'none';
        if (starredSection) starredSection.style.display = 'none';
        
        // Make sure templates section is visible
        const templatesSection = document.querySelector('.content-sections section:nth-child(3)');
        if (templatesSection) templatesSection.style.display = 'block';
        
        // Load templates
        this.loadTemplates();
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
        this.hideTemplateButton();
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

    // Login/Logout methods
    showLogin() {
        document.getElementById('loginPage').classList.remove('hidden');
        document.getElementById('wikiApp').classList.add('hidden');
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch('/applications/wiki/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();
            
            if (result.success) {
                document.getElementById('loginPage').classList.add('hidden');
                document.getElementById('wikiApp').classList.remove('hidden');
                await this.loadInitialData();
                this.showHome();
            } else {
                document.getElementById('loginError').textContent = result.message || 'Login failed';
                document.getElementById('loginError').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Login error:', error);
            document.getElementById('loginError').textContent = 'Login failed';
            document.getElementById('loginError').classList.remove('hidden');
        }
    }

    async handleLogout() {
        try {
            await fetch('/applications/wiki/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        }

        this.showLogin();
        this.currentView = 'login';
        this.currentSpace = null;
        this.currentDocument = null;
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
                        const fileTypeInfo = this.getFileTypeInfo(file.path);
                        const iconClass = this.getFileTypeIconClass(fileTypeInfo.category);
                        const iconColor = fileTypeInfo.color;
                        const fileName = this.getFileNameFromPath(file.path);
                        
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
                        const fileTypeInfo = this.getFileTypeInfo(file.path);
                        const iconClass = this.getFileTypeIconClass(fileTypeInfo.category);
                        const iconColor = fileTypeInfo.color;
                        const fileName = this.getFileNameFromPath(file.path);
                        
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

    async loadTemplates() {
        console.log('Loading templates...');
        
        const container = document.getElementById('templatesContent');
        if (!container) return;
        
        if (!this.currentSpace) {
            container.innerHTML = `
                <div class="no-content-message">
                    <svg width="48" height="48" class="no-content-icon">
                        <use href="#icon-clipboard"></use>
                    </svg>
                    <p>Select a space to view templates</p>
                </div>
            `;
            return;
        }
        
        try {
            // Try to load templates from backend API
            const response = await fetch(`/applications/wiki/api/spaces/${this.currentSpace.id}/templates`);
            
            if (!response.ok) {
                throw new Error(`Templates API returned ${response.status}: ${response.statusText}`);
            }
            
            const templates = await response.json();
            this.renderTemplatesContent(templates);
            
        } catch (error) {
            console.log('Templates API error:', error.message);
            // Show built-in templates fallback
            this.renderTemplatesFallback();
        }
    }
    
    showTemplateButton() {
        const templatesBtn = document.getElementById('templatesNewBtn');
        const createFileBtn = document.getElementById('createFileBtn');
        
        // Show template button
        if (templatesBtn) {
            templatesBtn.style.display = 'block';
            // Bind the click event if not already bound
            if (!templatesBtn._templatesBound) {
                templatesBtn.addEventListener('click', () => this.createNewTemplate());
                templatesBtn._templatesBound = true;
            }
        }
        
        // Hide create file button when in templates view
        if (createFileBtn) {
            createFileBtn.style.display = 'none';
        }
    }
    
    hideTemplateButton() {
        const templatesBtn = document.getElementById('templatesNewBtn');
        const createFileBtn = document.getElementById('createFileBtn');
        
        // Hide template button
        if (templatesBtn) {
            templatesBtn.style.display = 'none';
        }
        
        // Show create file button when not in templates view
        if (createFileBtn) {
            createFileBtn.style.display = 'block';
        }
    }
    
    renderTemplatesContent(templates) {
        const container = document.getElementById('templatesContent');
        if (!container) return;
        
        if (templates.length === 0) {
            container.innerHTML = `
                <div class="no-content-message">
                    <svg width="48" height="48" class="no-content-icon">
                        <use href="#icon-clipboard"></use>
                    </svg>
                    <p>No templates found</p>
                    <button id="createFirstTemplate" class="btn btn-primary">
                        <svg width="16" height="16">
                            <use href="#icon-plus"></use>
                        </svg>
                        Create First Template
                    </button>
                </div>
            `;
            
            // Bind create first template button
            document.getElementById('createFirstTemplate')?.addEventListener('click', () => {
                this.createNewTemplate();
            });
        } else {
            // Render templates with matching card style
            container.innerHTML = `
                <div class="items-grid">
                    ${templates.map(template => {
                        const fileTypeInfo = this.getFileTypeInfo(template.path || template.name);
                        const iconClass = this.getFileTypeIconClass(fileTypeInfo.category);
                        const iconColor = fileTypeInfo.color;
                        const fileName = this.getFileNameFromPath(template.path || template.name);

                        return `
                            <div class="item-card template-card" data-template-path="${template.path}">
                                <i class="fas ${iconClass} item-icon" style="color: ${iconColor}; font-size: 24px;"></i>
                                <div class="item-info">
                                    <div class="item-name">${template.title || fileName}</div>
                                    <div class="item-meta">Template • ${template.lastModified ? this.formatDate(template.lastModified) : 'Custom template'}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            // Bind template card clicks
            container.querySelectorAll('.template-card').forEach(card => {
                card.addEventListener('click', () => {
                    const templatePath = card.dataset.templatePath;
                    this.editTemplate(templatePath);
                });
            });
        }
        
        // Show the template button in the header
        this.showTemplateButton();
    }
    
    renderTemplatesFallback() {
        const container = document.getElementById('templatesContent');
        if (!container) return;

        // Show a nice fallback with built-in templates until backend is ready
        const fallbackTemplates = [
            {
                name: 'Basic Document',
                description: 'Simple document template with title and sections',
                type: 'built-in',
                key: 'basic',
                icon: 'fa-file-alt'
            },
            {
                name: 'API Documentation',
                description: 'Template for documenting REST APIs',
                type: 'built-in',
                key: 'api',
                icon: 'fa-code'
            },
            {
                name: 'Meeting Notes',
                description: 'Template for meeting minutes and action items',
                type: 'built-in',
                key: 'meeting',
                icon: 'fa-clipboard'
            },
            {
                name: 'Requirements',
                description: 'Template for requirements documentation',
                type: 'built-in',
                key: 'requirements',
                icon: 'fa-tasks'
            }
        ];

        container.innerHTML = `
            <div class="items-grid">
                ${fallbackTemplates.map(template => `
                    <div class="item-card template-card" data-template-key="${template.key}">
                        <i class="fas ${template.icon} item-icon" style="color: #666666; font-size: 24px;"></i>
                        <div class="item-info">
                            <div class="item-name">${template.name}</div>
                            <div class="item-meta">${template.description}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Bind template card clicks for preview/edit
        container.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => {
                const templateKey = card.dataset.templateKey;
                this.previewBuiltInTemplate(templateKey);
            });
        });
        
        // Show the template button in the header
        this.showTemplateButton();
    }
    
    async previewBuiltInTemplate(templateKey) {
        // Create a preview document with the built-in template content
        const content = await this.getTemplateContent(templateKey);
        const previewDoc = {
            title: `${templateKey.charAt(0).toUpperCase() + templateKey.slice(1)} Template Preview`,
            content: content,
            metadata: {
                viewer: 'markdown',
                isTemplate: true,
                isPreview: true
            }
        };
        
        this.currentDocument = previewDoc;
        documentController.showEnhancedDocumentView(previewDoc);
        this.showNotification('Previewing built-in template. Save to create a new document.', 'info');
    }
    
    createNewTemplate() {
        const templateName = prompt('Enter template name:');
        if (!templateName) return;
        
        // Create a template document object
        const templateDoc = {
            title: templateName,
            path: `.templates/${templateName}.md`,
            spaceName: this.currentSpace.name,
            content: '# ' + templateName + '\n\nYour template content goes here...',
            metadata: {
                viewer: 'markdown',
                isTemplate: true
            }
        };
        
        // Open in editor
        this.currentDocument = templateDoc;
        documentController.showEnhancedDocumentView(templateDoc);
    }
    
    async editTemplate(templatePath) {
        try {
            // Load template content
            const response = await fetch(`/applications/wiki/api/documents/content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    spaceName: this.currentSpace.name,
                    path: templatePath
                })
            });
            
            const templateDoc = await response.json();
            templateDoc.metadata = templateDoc.metadata || {};
            templateDoc.metadata.isTemplate = true;
            
            this.currentDocument = templateDoc;
            documentController.showEnhancedDocumentView(templateDoc);

        } catch (error) {
            console.error('Error loading template:', error);
            this.showNotification('Error loading template: ' + error.message, 'error');
        }
    }

    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    // Activity tracking methods
    ensureActivityData() {
        if (!this.data.recent) {
            this.data.recent = [];
        }
        if (!this.data.starred) {
            this.data.starred = [];
        }
    }

    async saveActivityToServer() {
        try {
            const response = await fetch('/applications/wiki/api/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recent: this.data.recent,
                    starred: this.data.starred
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save activity data');
            }
        } catch (error) {
            console.error('Error saving activity to server:', error);
        }
    }

    async loadActivityFromServer() {
        try {
            const response = await fetch('/applications/wiki/api/activity');
            if (response.ok) {
                const data = await response.json();
                this.data.recent = data.recent || [];
                this.data.starred = data.starred || [];
            }
        } catch (error) {
            console.error('Error loading activity from server:', error);
            this.data.recent = [];
            this.data.starred = [];
        }
    }

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
    }

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
    }

    getFileNameFromPath(filePath) {
        if (!filePath) return 'Untitled';
        return filePath.split('/').pop() || filePath;
    }

    // User Profile Management
    async loadUserProfile() {
        try {
            const response = await fetch('/applications/wiki/api/profile');
            if (response.ok) {
                this.userProfile = await response.json();
                this.updateUserProfileUI();
            } else {
                console.warn('Failed to load user profile, using defaults');
                this.userProfile = {
                    name: 'Admin User',
                    email: 'admin@example.com',
                    role: 'administrator'
                };
                this.updateUserProfileUI();
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            // Use default profile
            this.userProfile = {
                name: 'Admin User',
                email: 'admin@example.com', 
                role: 'administrator'
            };
            this.updateUserProfileUI();
        }
    }

    updateUserProfileUI() {
        if (!this.userProfile) return;

        // Update header profile
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        const userInitials = document.getElementById('userInitials');
        
        if (userName) userName.textContent = this.userProfile.name || 'Admin User';
        if (userRole) userRole.textContent = this.capitalizeFirst(this.userProfile.role || 'administrator');
        if (userInitials) {
            const initials = this.getInitials(this.userProfile.name || 'Admin User');
            userInitials.textContent = initials;
        }

        // Update modal profile
        const profileInitials = document.getElementById('profileInitials');
        if (profileInitials) {
            profileInitials.textContent = this.getInitials(this.userProfile.name || 'Admin User');
        }
    }

    getInitials(name) {
        if (!name) return 'AU';
        return name.split(' ')
                   .map(part => part.charAt(0))
                   .join('')
                   .toUpperCase()
                   .substring(0, 2);
    }

    capitalizeFirst(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    showUserProfileModal() {
        if (!this.userProfile) {
            this.showNotification('User profile not loaded', 'error');
            return;
        }

        // Populate form with current profile data
        document.getElementById('profileName').value = this.userProfile.name || '';
        document.getElementById('profileEmail').value = this.userProfile.email || '';
        document.getElementById('profileRole').value = this.userProfile.role || 'administrator';
        document.getElementById('profileBio').value = this.userProfile.bio || '';
        document.getElementById('profileLocation').value = this.userProfile.location || '';
        document.getElementById('profileTimezone').value = this.userProfile.timezone || 'UTC';
        
        // Set preferences
        document.getElementById('emailNotifications').checked = this.userProfile.preferences?.emailNotifications ?? true;
        document.getElementById('darkMode').checked = this.userProfile.preferences?.darkMode ?? false;
        document.getElementById('defaultLanguage').value = this.userProfile.preferences?.defaultLanguage || 'en';

        // Show modal
        this.showModal('userProfileModal');

        // Bind form events
        this.bindUserProfileEvents();
    }

    bindUserProfileEvents() {
        // Close modal events
        document.getElementById('closeUserProfileModal')?.addEventListener('click', () => {
            this.hideModal('userProfileModal');
        });

        document.getElementById('cancelUserProfile')?.addEventListener('click', () => {
            this.hideModal('userProfileModal');
        });

        // Form submission
        const form = document.getElementById('userProfileForm');
        if (form) {
            form.removeEventListener('submit', this.handleUserProfileSubmit);
            form.addEventListener('submit', (e) => this.handleUserProfileSubmit(e));
        }

        // Change avatar button (placeholder)
        document.getElementById('changeAvatarBtn')?.addEventListener('click', () => {
            this.showNotification('Avatar change feature coming soon!', 'info');
        });
    }

    async handleUserProfileSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const profileData = {
            name: formData.get('profileName'),
            email: formData.get('profileEmail'),
            role: formData.get('profileRole'),
            bio: formData.get('profileBio'),
            location: formData.get('profileLocation'),
            timezone: formData.get('profileTimezone'),
            preferences: {
                emailNotifications: formData.has('emailNotifications'),
                darkMode: formData.has('darkMode'),
                defaultLanguage: formData.get('defaultLanguage')
            }
        };

        try {
            const response = await fetch('/applications/wiki/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });

            const result = await response.json();

            if (result.success) {
                this.userProfile = result.profile;
                this.updateUserProfileUI();
                this.hideModal('userProfileModal');
                this.showNotification('Profile updated successfully!', 'success');
            } else {
                throw new Error(result.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showNotification('Failed to update profile: ' + error.message, 'error');
        }
    }

    // User Activity Management
    async loadUserActivity() {
        try {
            // First try to load from our new activity API
            await this.loadActivityFromServer();

            // Then load from the existing user activity API for backward compatibility
            const response = await fetch('/applications/wiki/api/user/activity');
            if (response.ok) {
                this.userActivity = await response.json();
                console.log('User activity loaded:', this.userActivity);

                // Always sync userActivity with data to keep them in sync
                if (this.userActivity.recent) {
                    this.data.recent = this.userActivity.recent;
                }

                // Always sync starred data
                if (this.userActivity.starred) {
                    this.data.starred = this.userActivity.starred;
                }
            } else {
                console.warn('Failed to load user activity, using defaults');
                this.userActivity = {
                    starred: [],
                    recent: []
                };
            }
        } catch (error) {
            console.error('Error loading user activity:', error);
            this.userActivity = {
                starred: [],
                recent: []
            };
        }
    }

}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.wikiApp = new WikiApp();
});