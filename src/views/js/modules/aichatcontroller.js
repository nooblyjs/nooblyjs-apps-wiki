/**
 * AI Chat Controller
 * Handles AI chat panel interactions, resizing, and message display
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-10-03
 */

export const aiChatController = {
    app: null,
    isOpen: false,
    panelWidth: 400,
    chatHistory: [],
    isResizing: false,
    startX: 0,
    startWidth: 0,
    isConfigured: false,
    currentView: 'chat', // 'chat', 'context', or 'editor'
    contextFiles: [],
    currentContextPath: null,
    currentContextFolder: null,

    init(app) {
        this.app = app;
        // Expose controller on app for cross-controller communication
        this.app.aiChatController = this;
        this.loadSavedState();
        this.bindEventListeners();
        this.checkAIStatus();
        this.loadChatHistory();
    },

    /**
     * Load saved state from localStorage
     */
    loadSavedState() {
        const savedWidth = localStorage.getItem('aiChatPanelWidth');
        const savedCollapsed = localStorage.getItem('aiChatPanelCollapsed');

        if (savedWidth) {
            this.panelWidth = parseInt(savedWidth);
            const panel = document.getElementById('aiChatPanel');
            if (panel) {
                panel.style.width = `${this.panelWidth}px`;
            }
        }

        if (savedCollapsed === 'false') {
            this.openPanel();
        }
    },

    /**
     * Bind all event listeners
     */
    bindEventListeners() {
        // Toggle button
        document.getElementById('aiChatToggleBtn')?.addEventListener('click', () => {
            this.togglePanel();
        });

        // Collapse button inside panel
        document.getElementById('aiChatCollapseBtn')?.addEventListener('click', () => {
            this.closePanel();
        });

        // Clear chat history button
        document.getElementById('aiChatClearBtn')?.addEventListener('click', () => {
            this.clearChatHistory();
        });

        // Chat form submit
        document.getElementById('aiChatForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Auto-resize textarea
        const textarea = document.getElementById('aiChatInput');
        if (textarea) {
            textarea.addEventListener('input', () => {
                this.autoResizeTextarea(textarea);
            });

            // Enter to send, Shift+Enter for new line
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Resize handle
        const resizeHandle = document.getElementById('aiChatResizeHandle');
        if (resizeHandle) {
            resizeHandle.addEventListener('mousedown', (e) => {
                this.startResize(e);
            });
        }

        // Document-level mouse events for resizing
        document.addEventListener('mousemove', (e) => {
            if (this.isResizing) {
                this.doResize(e);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isResizing) {
                this.stopResize();
            }
        });

        // Context view toggle
        document.getElementById('aiContextViewToggleBtn')?.addEventListener('click', () => {
            this.toggleContextView();
        });

        // Create context button
        document.getElementById('createContextBtn')?.addEventListener('click', () => {
            this.showCreateContextDialog();
        });

        // Context editor back button
        document.getElementById('contextEditorBackBtn')?.addEventListener('click', () => {
            this.showContextView();
        });

        // Save context button
        document.getElementById('saveContextBtn')?.addEventListener('click', () => {
            this.saveContext();
        });

        // Listen for navigation events to update context view
        window.addEventListener('spaceChanged', (e) => {
            // If context view is open, reload context files for new space
            if (this.currentView === 'context') {
                this.loadContextFiles();
            }
        });

        window.addEventListener('folderChanged', (e) => {
            // If context view is open, reload context files for new folder
            if (this.currentView === 'context') {
                this.loadContextFiles();
            }
        });
    },

    /**
     * Check if AI is configured
     */
    async checkAIStatus() {
        try {
            const response = await fetch('/applications/wiki/api/ai/chat/status');
            if (response.ok) {
                const data = await response.json();
                this.isConfigured = data.configured && data.enabled;
                this.updateWelcomeMessage();
            }
        } catch (error) {
            console.error('Error checking AI status:', error);
            this.isConfigured = false;
        }
    },

    /**
     * Update welcome message based on configuration status
     */
    updateWelcomeMessage() {
        const welcomeDiv = document.querySelector('.ai-chat-welcome');
        if (!welcomeDiv) return;

        if (!this.isConfigured) {
            welcomeDiv.innerHTML = `
                <i class="bi bi-robot" style="font-size: 3rem;"></i>
                <p class="mt-3 mb-1"><strong>AI Assistant Not Configured</strong></p>
                <p class="small">Please configure your AI settings to start chatting</p>
                <div class="mt-3">
                    <button class="btn btn-primary btn-sm" onclick="window.wikiApp.settingsController.showSettings(); setTimeout(() => document.getElementById('ai-tab').click(), 100);">
                        <i class="bi bi-gear me-1"></i>
                        Configure AI
                    </button>
                </div>
            `;
        } else {
            // Show ready message
            welcomeDiv.innerHTML = `
                <i class="bi bi-robot text-success" style="font-size: 3rem;"></i>
                <p class="mt-3 mb-1"><strong>AI Assistant Ready</strong></p>
                <p class="small">Ask me anything about your wiki documents!</p>
            `;
        }
    },

    /**
     * Load chat history from server
     */
    async loadChatHistory() {
        try {
            const response = await fetch('/applications/wiki/api/ai/chat/history');
            if (response.ok) {
                const data = await response.json();
                this.chatHistory = data.history || [];
                this.renderChatHistory();
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    },

    /**
     * Render chat history
     */
    renderChatHistory() {
        const messagesContainer = document.getElementById('aiChatMessages');
        if (!messagesContainer) return;

        // Clear existing messages except welcome
        const welcome = messagesContainer.querySelector('.ai-chat-welcome');
        messagesContainer.innerHTML = '';

        if (this.chatHistory.length === 0) {
            if (welcome) {
                messagesContainer.appendChild(welcome);
            }
            return;
        }

        // Render all messages
        this.chatHistory.forEach(entry => {
            this.appendMessage(entry.userMessage, 'user', false);
            this.appendMessage(entry.aiResponse, 'ai', false);
        });

        // Scroll to bottom
        this.scrollToBottom();
    },

    /**
     * Toggle panel open/close
     */
    togglePanel() {
        if (this.isOpen) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    },

    /**
     * Open AI chat panel
     */
    openPanel() {
        const panel = document.getElementById('aiChatPanel');
        const toggleBtn = document.getElementById('aiChatToggleBtn');

        if (panel) {
            panel.classList.remove('hidden');
            this.isOpen = true;
            localStorage.setItem('aiChatPanelCollapsed', 'false');
        }

        if (toggleBtn) {
            toggleBtn.classList.add('active');
        }
    },

    /**
     * Close AI chat panel
     */
    closePanel() {
        const panel = document.getElementById('aiChatPanel');
        const toggleBtn = document.getElementById('aiChatToggleBtn');

        if (panel) {
            panel.classList.add('hidden');
            this.isOpen = false;
            localStorage.setItem('aiChatPanelCollapsed', 'true');
        }

        if (toggleBtn) {
            toggleBtn.classList.remove('active');
        }
    },

    /**
     * Start resizing panel
     */
    startResize(e) {
        this.isResizing = true;
        this.startX = e.clientX;
        this.startWidth = this.panelWidth;

        const resizeHandle = document.getElementById('aiChatResizeHandle');
        if (resizeHandle) {
            resizeHandle.classList.add('resizing');
        }

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    },

    /**
     * Perform resize
     */
    doResize(e) {
        const delta = this.startX - e.clientX;
        const newWidth = this.startWidth + delta;

        const minWidth = 300;
        const maxWidth = 800;

        if (newWidth >= minWidth && newWidth <= maxWidth) {
            this.panelWidth = newWidth;
            const panel = document.getElementById('aiChatPanel');
            if (panel) {
                panel.style.width = `${newWidth}px`;
            }
        }
    },

    /**
     * Stop resizing panel
     */
    stopResize() {
        this.isResizing = false;

        const resizeHandle = document.getElementById('aiChatResizeHandle');
        if (resizeHandle) {
            resizeHandle.classList.remove('resizing');
        }

        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // Save to localStorage
        localStorage.setItem('aiChatPanelWidth', this.panelWidth);
    },

    /**
     * Auto-resize textarea based on content
     */
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    },

    /**
     * Send message to AI
     */
    async sendMessage() {
        const textarea = document.getElementById('aiChatInput');
        const message = textarea.value.trim();

        if (!message) return;

        // Check if configured
        if (!this.isConfigured) {
            this.showError('Please configure AI settings first');
            return;
        }

        // Clear input
        textarea.value = '';
        textarea.style.height = 'auto';

        // Add user message to UI
        this.appendMessage(message, 'user');

        // Show typing indicator
        this.showTypingIndicator();

        // Set status
        this.setStatus('Sending message...');

        try {
            const response = await fetch('/applications/wiki/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    context: this.getCurrentContext()
                })
            });

            const data = await response.json();

            // Hide typing indicator
            this.hideTypingIndicator();

            if (response.ok) {
                // Add AI response to UI
                this.appendMessage(data.response, 'ai');

                // Update local history
                this.chatHistory.push({
                    userMessage: message,
                    aiResponse: data.response,
                    timestamp: data.timestamp,
                    usage: data.usage
                });

                // Update status
                this.setStatus(`Response received (${data.usage?.totalTokens || 0} tokens used)`, 'success');

                // Clear status after 3 seconds
                setTimeout(() => {
                    this.clearStatus();
                }, 3000);
            } else {
                throw new Error(data.error || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTypingIndicator();
            this.showError(error.message || 'Failed to send message');
        }
    },

    /**
     * Get current context for AI - includes folder and file context
     */
    async getCurrentContext() {
        const context = {};

        // Add current space
        if (this.app.currentSpace) {
            context.spaceName = this.app.currentSpace.name;
            context.includeSpaceContext = true;
        }

        // Determine current folder
        let currentFolderPath = '';
        if (this.app.currentFolder) {
            currentFolderPath = this.app.currentFolder;
        } else if (this.app.currentDocument && this.app.currentDocument.path) {
            const docPath = this.app.currentDocument.path;
            const lastSlash = docPath.lastIndexOf('/');
            if (lastSlash > 0) {
                currentFolderPath = docPath.substring(0, lastSlash);
            }
        }

        // Load folder context if available
        if (currentFolderPath || currentFolderPath === '') {
            const folderContextContent = await this.loadFolderContextContent(currentFolderPath);
            if (folderContextContent) {
                context.folderContext = folderContextContent;
                context.folderPath = currentFolderPath || '/';
            }
        }

        // Add current document context if viewing one
        if (this.app.currentDocument) {
            context.documentTitle = this.app.currentDocument.title;
            context.documentPath = this.app.currentDocument.path;

            // Load file-specific context if available
            const fileContextContent = await this.loadFileContextContent(this.app.currentDocument.path);
            if (fileContextContent) {
                context.fileContext = fileContextContent;
            }

            // Add document content (for preview or editing)
            if (this.app.currentDocument.content) {
                context.documentContent = this.truncateToTokenLimit(this.app.currentDocument.content, 2000);
            }
        }

        return context;
    },

    /**
     * Load folder context content from folder-context.md
     */
    async loadFolderContextContent(folderPath) {
        if (!this.app.currentSpace) return null;

        try {
            const aiContextFolder = folderPath ? `${folderPath}/.aicontext` : '.aicontext';
            const contextFilePath = `${aiContextFolder}/folder-context.md`;
            const spaceName = this.app.currentSpace.name;

            const response = await fetch(`/applications/wiki/api/documents/content?path=${encodeURIComponent(contextFilePath)}&spaceName=${encodeURIComponent(spaceName)}`);

            if (response.ok) {
                const content = await response.text();
                return content.trim() || null;
            }
        } catch (error) {
            // Context file doesn't exist or error loading it
            console.log('No folder context found for', folderPath);
        }

        return null;
    },

    /**
     * Load file-specific context content from {filename}-context.md
     */
    async loadFileContextContent(filePath) {
        if (!this.app.currentSpace || !filePath) return null;

        try {
            // Extract filename without extension
            const fileName = filePath.split('/').pop();
            const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

            // Extract folder path from file path
            const lastSlash = filePath.lastIndexOf('/');
            const folderPath = lastSlash > 0 ? filePath.substring(0, lastSlash) : '';

            // Build path to file-specific context file
            const aiContextFolder = folderPath ? `${folderPath}/.aicontext` : '.aicontext';
            const contextFilePath = `${aiContextFolder}/${fileNameWithoutExt}-context.md`;
            const spaceName = this.app.currentSpace.name;

            const response = await fetch(`/applications/wiki/api/documents/content?path=${encodeURIComponent(contextFilePath)}&spaceName=${encodeURIComponent(spaceName)}`);

            if (response.ok) {
                const content = await response.text();
                return content.trim() || null;
            }
        } catch (error) {
            // Context file doesn't exist or error loading it
            console.log('No file context found for', filePath);
        }

        return null;
    },

    /**
     * Truncate text to approximate token limit
     * Rough approximation: 1 token ≈ 4 characters
     */
    truncateToTokenLimit(text, maxTokens) {
        if (!text) return '';

        const maxChars = maxTokens * 4; // Rough approximation
        if (text.length <= maxChars) {
            return text;
        }

        // Truncate and add ellipsis
        return text.substring(0, maxChars) + '\n\n[... content truncated due to length ...]';
    },

    /**
     * Append message to chat
     */
    appendMessage(content, type, scroll = true) {
        const messagesContainer = document.getElementById('aiChatMessages');
        if (!messagesContainer) return;

        // Remove welcome message if it exists
        const welcome = messagesContainer.querySelector('.ai-chat-welcome');
        if (welcome) {
            welcome.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = type === 'user' ? 'user-message' : 'ai-message';

        if (type === 'ai') {
            // Render markdown for AI messages
            messageDiv.innerHTML = this.renderMarkdown(content);
        } else {
            messageDiv.textContent = content;
        }

        messagesContainer.appendChild(messageDiv);

        if (scroll) {
            this.scrollToBottom();
        }
    },

    /**
     * Render markdown content
     */
    renderMarkdown(content) {
        if (typeof marked !== 'undefined') {
            return marked.parse(content);
        }
        // Fallback to plain text if marked is not available
        return content.replace(/\n/g, '<br>');
    },

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        const messagesContainer = document.getElementById('aiChatMessages');
        if (!messagesContainer) return;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-typing-indicator';
        typingDiv.id = 'aiTypingIndicator';
        typingDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;

        messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    },

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        const typingIndicator = document.getElementById('aiTypingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        this.setStatus(message, 'error');

        // Also show in chat
        const messagesContainer = document.getElementById('aiChatMessages');
        if (!messagesContainer) return;

        const errorDiv = document.createElement('div');
        errorDiv.className = 'ai-error-message';
        errorDiv.innerHTML = `
            <i class="bi bi-exclamation-triangle me-2"></i>
            ${message}
        `;

        messagesContainer.appendChild(errorDiv);
        this.scrollToBottom();

        // Clear status after 5 seconds
        setTimeout(() => {
            this.clearStatus();
        }, 5000);
    },

    /**
     * Set status text
     */
    setStatus(text, type = '') {
        const statusEl = document.getElementById('aiChatStatus');
        const statusText = document.getElementById('aiChatStatusText');

        if (statusEl && statusText) {
            statusEl.className = 'ai-chat-status text-muted small px-2 py-1';
            if (type) {
                statusEl.classList.add(type);
            }
            statusText.textContent = text;
        }
    },

    /**
     * Clear status
     */
    clearStatus() {
        const statusText = document.getElementById('aiChatStatusText');
        const statusEl = document.getElementById('aiChatStatus');

        if (statusText) {
            statusText.textContent = '';
        }
        if (statusEl) {
            statusEl.className = 'ai-chat-status text-muted small px-2 py-1';
        }
    },

    /**
     * Clear chat history
     */
    async clearChatHistory() {
        if (!confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch('/applications/wiki/api/ai/chat/clear', {
                method: 'POST'
            });

            if (response.ok) {
                this.chatHistory = [];
                const messagesContainer = document.getElementById('aiChatMessages');
                if (messagesContainer) {
                    messagesContainer.innerHTML = `
                        <div class="ai-chat-welcome text-center text-muted p-4">
                            <i class="bi bi-robot" style="font-size: 3rem;"></i>
                            <p class="mt-3 mb-1"><strong>Chat history cleared</strong></p>
                            <p class="small">Start a new conversation!</p>
                        </div>
                    `;
                }

                this.app.showNotification('Chat history cleared', 'success');
            } else {
                throw new Error('Failed to clear chat history');
            }
        } catch (error) {
            console.error('Error clearing chat history:', error);
            this.app.showNotification('Failed to clear chat history', 'error');
        }
    },

    /**
     * Scroll to bottom of messages
     */
    scrollToBottom() {
        const messagesContainer = document.getElementById('aiChatMessages');
        if (messagesContainer) {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
    },

    /**
     * Toggle between chat and context view
     */
    toggleContextView() {
        if (this.currentView === 'chat') {
            this.showContextView();
        } else {
            this.showChatView();
        }
    },

    /**
     * Show chat view
     */
    showChatView() {
        this.currentView = 'chat';

        document.getElementById('aiChatMessages').classList.remove('hidden');
        document.getElementById('aiContextView').classList.add('hidden');
        document.getElementById('aiContextEditor').classList.add('hidden');
        document.getElementById('aiChatForm').parentElement.classList.remove('hidden');

        document.getElementById('aiChatHeaderTitle').textContent = 'AI Assistant';

        const toggleBtn = document.getElementById('aiContextViewToggleBtn');
        toggleBtn.classList.remove('active');
        // Change icon to folder when in chat view
        toggleBtn.querySelector('i').className = 'bi bi-folder-symlink';
    },

    /**
     * Show context view and load context files
     */
    async showContextView() {
        this.currentView = 'context';

        document.getElementById('aiChatMessages').classList.add('hidden');
        document.getElementById('aiContextView').classList.remove('hidden');
        document.getElementById('aiContextEditor').classList.add('hidden');
        document.getElementById('aiChatForm').parentElement.classList.add('hidden');

        document.getElementById('aiChatHeaderTitle').textContent = 'AI Context Manager';

        const toggleBtn = document.getElementById('aiContextViewToggleBtn');
        toggleBtn.classList.add('active');
        // Change icon to robot when in context view
        toggleBtn.querySelector('i').className = 'bi bi-robot';

        await this.loadContextFiles();
    },

    /**
     * Load context files for current space filtered by current folder
     */
    async loadContextFiles() {
        const space = this.app.currentSpace;

        if (!space) {
            this.showContextError('No space selected');
            return;
        }

        try {
            // Determine the current folder context
            // Priority: 1) currentFolder from navigation, 2) currentDocument's folder, 3) root
            let currentFolderPath = '';

            if (this.app.currentFolder) {
                // User is viewing a folder in navigation
                currentFolderPath = this.app.currentFolder;
            } else if (this.app.currentDocument && this.app.currentDocument.path) {
                // User is viewing a document - extract folder from document path
                const docPath = this.app.currentDocument.path;
                const lastSlash = docPath.lastIndexOf('/');
                if (lastSlash > 0) {
                    currentFolderPath = docPath.substring(0, lastSlash);
                }
            }
            // If neither is set, currentFolderPath remains '' (root)

            // Use the existing folder tree API
            const response = await fetch(`/applications/wiki/api/spaces/${space.id}/folders`);

            if (!response.ok) {
                throw new Error('Failed to load folder tree');
            }

            const tree = await response.json();

            // Recursively find all .aicontext folders, filtered by current folder
            this.contextFiles = this.findAiContextFolders(tree, '', currentFolderPath);
            this.renderContextFiles();
        } catch (error) {
            console.error('Error loading context files:', error);
            this.showContextError('Failed to load context files');
        }
    },

    /**
     * Recursively find all .aicontext folders in the tree, filtered by current folder
     */
    findAiContextFolders(tree, parentPath, currentFolderPath) {
        const contextFiles = [];

        for (const item of tree) {
            const currentPath = parentPath ? `${parentPath}/${item.name}` : item.name;

            if (item.type === 'folder') {
                if (item.name === '.aicontext') {
                    // Found an .aicontext folder
                    // Only add if this .aicontext folder is in the current folder
                    if (parentPath === currentFolderPath) {
                        // Check if it has a folder-context.md file
                        const hasContextMd = item.children?.some(child =>
                            child.type === 'document' && child.name === 'folder-context.md'
                        );

                        // Add folder context
                        contextFiles.push({
                            folder: parentPath || '/',
                            contextPath: currentPath,
                            contextFile: `${currentPath}/folder-context.md`,
                            exists: hasContextMd,
                            type: 'folder'
                        });

                        // Also find all file-specific context files (ending with -context.md but not folder-context.md)
                        if (item.children) {
                            for (const child of item.children) {
                                if (child.type === 'document' &&
                                    child.name.endsWith('-context.md') &&
                                    child.name !== 'folder-context.md') {
                                    // Extract the base filename without -context.md
                                    const baseName = child.name.replace(/-context\.md$/, '');
                                    contextFiles.push({
                                        folder: parentPath || '/',
                                        contextPath: currentPath,
                                        contextFile: `${currentPath}/${child.name}`,
                                        exists: true,
                                        type: 'file',
                                        fileName: baseName
                                    });
                                }
                            }
                        }
                    }
                } else if (item.children && item.children.length > 0) {
                    // Recursively search in subdirectories
                    const subContexts = this.findAiContextFolders(item.children, currentPath, currentFolderPath);
                    contextFiles.push(...subContexts);
                }
            }
        }

        return contextFiles;
    },

    /**
     * Render context files list
     */
    renderContextFiles() {
        const listContainer = document.getElementById('aiContextList');

        if (this.contextFiles.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center text-muted p-4">
                    <i class="bi bi-folder-symlink" style="font-size: 3rem;"></i>
                    <p class="mt-3 mb-1"><strong>No context files found</strong></p>
                    <p class="small">Create context for folders to help AI understand your documents</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = `
            <div class="list-group list-group-flush">
                ${this.contextFiles.map(ctx => {
                    const icon = ctx.type === 'file' ? 'bi-file-text' : 'bi-folder';
                    const label = ctx.type === 'file' ? `${ctx.fileName} (file)` : ctx.folder || '/';
                    const subLabel = ctx.type === 'file' ? `${ctx.folder || '/'}` : ctx.contextFile;

                    return `
                        <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                             data-context-path="${ctx.contextFile}"
                             data-folder="${ctx.folder}">
                            <div>
                                <i class="bi ${icon} me-2"></i>
                                <strong>${label}</strong>
                                <div class="small text-muted">${subLabel}</div>
                            </div>
                            <div>
                                ${ctx.exists ? '<span class="badge bg-success">Exists</span>' : '<span class="badge bg-secondary">New</span>'}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        // Add click handlers
        listContainer.querySelectorAll('.list-group-item').forEach(item => {
            item.addEventListener('click', () => {
                const contextPath = item.dataset.contextPath;
                const folder = item.dataset.folder;
                this.openContextEditor(contextPath, folder);
            });
        });
    },

    /**
     * Show create context dialog
     */
    async showCreateContextDialog() {
        const space = this.app.currentSpace;

        if (!space) {
            alert('Please select a space first');
            return;
        }

        // Automatically detect current folder from app state
        // Priority: 1) currentFolder from navigation, 2) currentDocument's folder, 3) root
        let folderPath = '';

        if (this.app.currentFolder) {
            // User is viewing a folder in navigation
            folderPath = this.app.currentFolder;
        } else if (this.app.currentDocument && this.app.currentDocument.path) {
            // User is viewing a document - extract folder from document path
            const docPath = this.app.currentDocument.path;
            const lastSlash = docPath.lastIndexOf('/');
            if (lastSlash > 0) {
                folderPath = docPath.substring(0, lastSlash);
            }
        }
        // If neither is set, folderPath remains '' (root)

        // Show confirmation with detected folder
        const displayPath = folderPath || '/ (root)';
        const confirmed = confirm(`Create AI context for folder:\n${displayPath}\n\nClick OK to continue or Cancel to abort.`);

        if (!confirmed) return;

        this.currentContextFolder = folderPath;
        this.currentContextPath = null;

        this.openContextEditor(null, folderPath);
    },

    /**
     * Open file-specific context editor
     * Called when user clicks "Add Context" on a file
     */
    async openFileContext(filePath) {
        if (!filePath) {
            console.error('No file path provided');
            return;
        }

        // Show AI panel if not already shown
        if (!this.isOpen) {
            this.openPanel();
        }

        // Switch to context view
        await this.showContextView();

        // Extract filename without extension
        const fileName = filePath.split('/').pop();
        const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

        // Extract folder path from file path
        const lastSlash = filePath.lastIndexOf('/');
        const folderPath = lastSlash > 0 ? filePath.substring(0, lastSlash) : '';

        // Build path to file-specific context file
        const aiContextFolder = folderPath ? `${folderPath}/.aicontext` : '.aicontext';
        const contextFilePath = `${aiContextFolder}/${fileNameWithoutExt}-context.md`;

        // Open the context editor with the file-specific context path
        this.currentContextFolder = folderPath;
        this.currentContextPath = contextFilePath;

        // Switch to editor view
        await this.openContextEditor(contextFilePath, folderPath);
    },

    /**
     * Open context editor
     */
    async openContextEditor(contextPath, folder) {
        this.currentView = 'editor';
        this.currentContextPath = contextPath;
        this.currentContextFolder = folder;

        document.getElementById('aiContextView').classList.add('hidden');
        document.getElementById('aiContextEditor').classList.remove('hidden');

        document.getElementById('contextEditorPath').textContent = folder || '/';

        const textarea = document.getElementById('contextEditorTextarea');

        if (contextPath) {
            // Load existing context using document content API
            try {
                const spaceName = this.app.currentSpace?.name;
                const response = await fetch(`/applications/wiki/api/documents/content?path=${encodeURIComponent(contextPath)}&spaceName=${encodeURIComponent(spaceName)}`);

                if (response.ok) {
                    const content = await response.text();
                    textarea.value = content || '';
                } else {
                    textarea.value = '';
                }
            } catch (error) {
                console.error('Error loading context:', error);
                textarea.value = '';
            }
        } else {
            textarea.value = '';
        }
    },

    /**
     * Save context file
     */
    async saveContext() {
        const space = this.app.currentSpace;

        if (!space) {
            alert('No space selected');
            return;
        }

        const content = document.getElementById('contextEditorTextarea').value;

        try {
            // Use currentContextPath if set (for file-specific contexts), otherwise build folder context path
            let contextFilePath;
            if (this.currentContextPath) {
                contextFilePath = this.currentContextPath;
            } else {
                // Build the path to the folder-context.md file
                const folderPath = this.currentContextFolder || '';
                const aiContextFolderPath = folderPath ? `${folderPath}/.aicontext` : '.aicontext';
                contextFilePath = `${aiContextFolderPath}/folder-context.md`;
            }

            // First, ensure .aicontext folder exists
            const folderPath = this.currentContextFolder || '';
            try {
                await fetch('/applications/wiki/api/folders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: '.aicontext',
                        spaceId: space.id,
                        parentPath: folderPath
                    })
                });
                // Folder created or already exists, continue
            } catch (folderError) {
                // Folder might already exist, that's OK
                console.log('Folder creation response (may already exist):', folderError);
            }

            // Now save the context file using document save API
            const response = await fetch('/applications/wiki/api/documents/content', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    spaceName: space.name,
                    path: contextFilePath,
                    content: content
                })
            });

            if (response.ok) {
                this.app.showNotification('Context saved successfully', 'success');
                this.showContextView();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save context');
            }
        } catch (error) {
            console.error('Error saving context:', error);
            this.app.showNotification('Failed to save context: ' + error.message, 'error');
        }
    },

    /**
     * Show context error
     */
    showContextError(message) {
        const listContainer = document.getElementById('aiContextList');
        listContainer.innerHTML = `
            <div class="text-center text-danger p-4">
                <i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i>
                <p class="mt-3 mb-1"><strong>Error</strong></p>
                <p class="small">${message}</p>
            </div>
        `;
    }
};
