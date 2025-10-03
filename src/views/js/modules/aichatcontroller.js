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
    }
};
