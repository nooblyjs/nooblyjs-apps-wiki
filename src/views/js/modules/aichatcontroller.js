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
     * Get current context for AI
     */
    getCurrentContext() {
        const context = {};

        // Add current document if viewing one
        if (this.app.currentDocument) {
            context.documentTitle = this.app.currentDocument.title;
            context.includeDocumentContext = true;
        }

        // Add current space
        if (this.app.currentSpace) {
            context.spaceName = this.app.currentSpace.name;
            context.includeSpaceContext = true;
        }

        return context;
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
        document.getElementById('aiContextViewToggleBtn').classList.remove('active');
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
        document.getElementById('aiContextViewToggleBtn').classList.add('active');

        await this.loadContextFiles();
    },

    /**
     * Load context files for current space
     */
    async loadContextFiles() {
        const spaceName = this.app.currentSpace?.name;

        if (!spaceName) {
            this.showContextError('No space selected');
            return;
        }

        try {
            const response = await fetch(`/applications/wiki/api/ai/context/list?spaceName=${encodeURIComponent(spaceName)}`);

            if (!response.ok) {
                throw new Error('Failed to load context files');
            }

            const data = await response.json();
            this.contextFiles = data.contextFiles || [];
            this.renderContextFiles();
        } catch (error) {
            console.error('Error loading context files:', error);
            this.showContextError('Failed to load context files');
        }
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
                ${this.contextFiles.map(ctx => `
                    <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                         data-context-path="${ctx.contextFile}"
                         data-folder="${ctx.folder}">
                        <div>
                            <i class="bi bi-folder me-2"></i>
                            <strong>${ctx.folder || '/'}</strong>
                            <div class="small text-muted">${ctx.contextFile}</div>
                        </div>
                        <div>
                            ${ctx.exists ? '<span class="badge bg-success">Exists</span>' : '<span class="badge bg-secondary">New</span>'}
                        </div>
                    </div>
                `).join('')}
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
        const spaceName = this.app.currentSpace?.name;

        if (!spaceName) {
            alert('Please select a space first');
            return;
        }

        const folderPath = prompt('Enter folder path (leave empty for root):', '');

        if (folderPath === null) return; // User cancelled

        this.currentContextFolder = folderPath;
        this.currentContextPath = null;

        this.openContextEditor(null, folderPath);
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
            // Load existing context
            try {
                const spaceName = this.app.currentSpace?.name;
                const response = await fetch(`/applications/wiki/api/ai/context/content?spaceName=${encodeURIComponent(spaceName)}&contextPath=${encodeURIComponent(contextPath)}`);

                if (response.ok) {
                    const data = await response.json();
                    textarea.value = data.content || '';
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
        const spaceName = this.app.currentSpace?.name;

        if (!spaceName) {
            alert('No space selected');
            return;
        }

        const content = document.getElementById('contextEditorTextarea').value;

        try {
            const response = await fetch('/applications/wiki/api/ai/context/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    spaceName: spaceName,
                    folderPath: this.currentContextFolder,
                    content: content
                })
            });

            if (response.ok) {
                this.app.showNotification('Context saved successfully', 'success');
                this.showContextView();
            } else {
                throw new Error('Failed to save context');
            }
        } catch (error) {
            console.error('Error saving context:', error);
            this.app.showNotification('Failed to save context', 'error');
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
