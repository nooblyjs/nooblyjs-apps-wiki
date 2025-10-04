/**
 * @fileoverview The document controller
 * Handles all document viewing, editing, and management functionality
 *
 * @author NooblyJS Team
 * @version 2.0.0
 * @since 2025-10-01
 */

import { navigationController } from "./navigationcontroller.js";
import { userController } from "./usercontroller.js";

export const documentController = {
    isReadOnlyMode: false,

    init(app) {
        this.app = app;
    },

    /**
     * Set read-only mode for documents
     * @param {boolean} isReadOnly - Whether documents should be in read-only mode
     */
    setReadOnlyMode(isReadOnly) {
        this.isReadOnlyMode = isReadOnly;
        this.updateEditButtonVisibility();
    },

    /**
     * Update edit button visibility based on read-only mode
     */
    updateEditButtonVisibility() {
        const editBtn = document.getElementById('editBtn');
        if (editBtn) {
            editBtn.style.display = this.isReadOnlyMode ? 'none' : 'inline-block';
        }
    },

    /**
     * Open a document by path and render it
     */
    async openDocumentByPath(documentPath, spaceName) {
        // Show loading placeholder immediately
        this.showLoadingPlaceholder(documentPath, spaceName);

        try {
            // Use enhanced API to get file content with metadata
            const response = await fetch(`/applications/wiki/api/documents/content?path=${encodeURIComponent(documentPath)}&spaceName=${encodeURIComponent(spaceName)}&enhanced=true`);

            if (!response.ok) {
                throw new Error(`Failed to load document: ${response.statusText}`);
            }

            const data = await response.json();
            const { content, metadata } = data;

            const document = {
                title: documentPath.split('/').pop(),
                path: documentPath,
                spaceName: spaceName,
                content: content,
                metadata: metadata
            };

            this.app.currentDocument = document;
            this.showEnhancedDocumentView(document);

            // Track document view for recent files
            await this.trackDocumentView(documentPath, spaceName);
        } catch (error) {
            console.error('Error loading document by path:', error);

            // Fallback: create a basic document structure
            const document = {
                title: documentPath.split('/').pop(),
                path: documentPath,
                spaceName: spaceName,
                content: `# ${documentPath.split('/').pop()}\n\nFailed to load content from ${documentPath}`,
                metadata: { category: 'markdown', viewer: 'markdown' }
            };

            this.app.currentDocument = document;
            this.showEnhancedDocumentView(document);
            this.app.showNotification('Failed to load document content', 'error');

            // Track document view for recent files (even if failed to load)
            await this.trackDocumentView(documentPath, spaceName);
        }
    },

    /**
     * Show loading placeholder while document is being fetched
     */
    showLoadingPlaceholder(documentPath, spaceName) {
        this.app.setActiveView('document');
        this.app.currentView = 'document';

        // Update header with placeholder
        const docTitle = document.getElementById('currentDocTitle');
        if (docTitle) {
            docTitle.textContent = documentPath.split('/').pop();
        }

        const backToSpace = document.getElementById('docBackToSpace');
        if (backToSpace) {
            backToSpace.textContent = spaceName || 'Space';
        }

        const contentElement = document.querySelector('#documentView .document-container');
        if (!contentElement) return;

        // Remove any existing content
        const existingContent = contentElement.querySelector('.document-content-wrapper');
        if (existingContent) existingContent.remove();

        // Create Bootstrap placeholder skeleton
        const placeholderWrapper = document.createElement('div');
        placeholderWrapper.className = 'document-content-wrapper loading-placeholder';
        placeholderWrapper.innerHTML = `
            <div class="placeholder-glow" style="padding: 20px;">
                <div class="placeholder col-12" style="height: 400px; border-radius: 8px;"></div>
            </div>
        `;

        contentElement.appendChild(placeholderWrapper);
    },

    /**
     * Enhanced document viewer that routes to appropriate viewer based on file type
     */
    showEnhancedDocumentView(document) {
        const viewer = document.metadata?.viewer || 'default';

        switch (viewer) {
            case 'pdf':
                this.showPdfViewer(document);
                break;
            case 'image':
                this.showImageViewer(document);
                break;
            case 'text':
                this.showTextViewer(document);
                break;
            case 'code':
                this.showCodeViewer(document);
                break;
            case 'markdown':
                this.showMarkdownViewer(document);
                break;
            default:
                this.showDefaultViewer(document);
                break;
        }

        // Update edit button visibility after showing document
        this.updateEditButtonVisibility();
    },

    /**
     * PDF Viewer Implementation
     */
    showPdfViewer(doc) {
        this.app.setActiveView('document');
        this.app.currentView = 'document';

        this.updateDocumentHeader(doc);

        const contentElement = document.querySelector('#documentView .document-container');
        if (!contentElement) return;

        const pdfUrl = `/applications/wiki/api/documents/content?path=${encodeURIComponent(doc.path)}&spaceName=${encodeURIComponent(doc.spaceName)}`;
        const downloadUrl = pdfUrl + '&download=true';

        // Remove any existing content after header and add PDF viewer
        const existingContent = contentElement.querySelector('.document-content-wrapper');
        if (existingContent) existingContent.remove();

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'document-content-wrapper pdf-viewer';
        contentWrapper.innerHTML = `
            <div class="pdf-container">
                <iframe src="${pdfUrl}" width="100%" height="1000px" style="border: none; border-radius: 8px;"></iframe>
            </div>
        `;

        contentElement.appendChild(contentWrapper);

        // Setup download button functionality
        this.setupDownloadButton(downloadUrl, doc.metadata.fileName);

        // Setup convert button functionality
        this.setupConvertButton(doc);

        // Setup star button functionality
        this.setupStarButton(doc);

        // Track document visit
        this.trackDocumentVisit(doc, 'viewed');

        this.bindDocumentViewEvents();
    },

    /**
     * Image Viewer Implementation
     */
    showImageViewer(doc) {
        this.app.setActiveView('document');
        this.app.currentView = 'document';

        this.updateDocumentHeader(doc);

        const contentElement = document.querySelector('#documentView .document-container');
        if (!contentElement) return;

        const imageUrl = `/applications/wiki/api/documents/content?path=${encodeURIComponent(doc.path)}&spaceName=${encodeURIComponent(doc.spaceName)}`;
        const downloadUrl = imageUrl + '&download=true';

        // Remove any existing content after header and add image viewer
        const existingContent = contentElement.querySelector('.document-content-wrapper');
        if (existingContent) existingContent.remove();

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'document-content-wrapper image-viewer';
        contentWrapper.innerHTML = `
            <div class="image-info-bar">
                <div class="file-info">
                    <i class="fas fa-image" style="color: #17a2b8;"></i>
                    <span class="file-name">${doc.metadata.fileName}</span>
                    <span class="file-size">${this.formatFileSize(doc.metadata.size)}</span>
                </div>
            </div>
            <div class="image-container">
                <img src="${imageUrl}" alt="${doc.metadata.fileName}" class="image-content" />
            </div>
        `;

        contentElement.appendChild(contentWrapper);

        // Setup download button functionality
        this.setupDownloadButton(downloadUrl, doc.metadata.fileName);

        // Setup convert button functionality
        this.setupConvertButton(doc);

        // Setup star button functionality
        this.setupStarButton(doc);

        // Track document visit
        this.trackDocumentVisit(doc, 'viewed');

        this.bindDocumentViewEvents();
    },

    /**
     * Text File Viewer Implementation
     */
    showTextViewer(doc) {
        this.app.setActiveView('document');
        this.app.currentView = 'document';

        this.updateDocumentHeader(doc);

        const contentElement = document.querySelector('#documentView .document-container');
        if (!contentElement) return;

        const lines = doc.content.split('\n');
        const numberedLines = lines.map((line, index) => `${(index + 1).toString().padStart(4, ' ')}: ${this.escapeHtml(line)}`).join('\n');

        // Remove any existing content after header and add text viewer
        const existingContent = contentElement.querySelector('.document-content-wrapper');
        if (existingContent) existingContent.remove();

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'document-content-wrapper text-viewer';
        contentWrapper.innerHTML = `
            <div class="text-info-bar">
                <div class="file-info">
                    <i class="fas fa-file-text" style="color: #6c757d;"></i>
                    <span class="file-name">${doc.metadata.fileName}</span>
                    <span class="file-size">${this.formatFileSize(doc.metadata.size)}</span>
                    <span class="line-count">${lines.length} lines</span>
                </div>
                <div class="text-controls">
                    <label class="control-label">
                        <input type="checkbox" id="showLineNumbers" checked> Line Numbers
                    </label>
                    <label class="control-label">
                        <input type="checkbox" id="wrapText"> Line Wrap
                    </label>
                </div>
            </div>
            <div class="text-container">
                <pre id="textContent" class="text-content with-numbers">${numberedLines}</pre>
            </div>
        `;

        contentElement.appendChild(contentWrapper);

        // Setup download button functionality
        const downloadUrl = `/applications/wiki/api/documents/content?path=${encodeURIComponent(doc.path)}&spaceName=${encodeURIComponent(doc.spaceName)}&download=true`;
        this.setupDownloadButton(downloadUrl, doc.metadata.fileName);

        // Setup convert button functionality
        this.setupConvertButton(doc);

        // Setup star button functionality
        this.setupStarButton(doc);

        // Track document visit
        this.trackDocumentVisit(doc, 'viewed');

        // Bind text viewer controls
        const showLineNumbersCheckbox = document.getElementById('showLineNumbers');
        const wrapTextCheckbox = document.getElementById('wrapText');
        const textContent = document.getElementById('textContent');

        showLineNumbersCheckbox?.addEventListener('change', (e) => {
            if (e.target.checked) {
                textContent.textContent = numberedLines;
                textContent.className = 'text-content with-numbers';
            } else {
                textContent.textContent = doc.content;
                textContent.className = 'text-content';
            }
        });

        wrapTextCheckbox?.addEventListener('change', (e) => {
            if (e.target.checked) {
                textContent.style.whiteSpace = 'pre-wrap';
            } else {
                textContent.style.whiteSpace = 'pre';
            }
        });

        this.bindDocumentViewEvents();
    },

    /**
     * Code Viewer Implementation
     */
    showCodeViewer(doc) {
        this.app.setActiveView('document');
        this.app.currentView = 'document';

        this.updateDocumentHeader(doc);

        const contentElement = document.querySelector('#documentView .document-container');
        if (!contentElement) return;

        const language = this.getLanguageFromExtension(doc.metadata.extension);
        const lines = doc.content.split('\n').length;

        // Remove any existing content after header and add code viewer
        const existingContent = contentElement.querySelector('.document-content-wrapper');
        if (existingContent) existingContent.remove();

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'document-content-wrapper code-viewer';
        contentWrapper.innerHTML = `
            <div class="code-info-bar">
                <div class="file-info">
                    <i class="fas fa-file-code" style="color: #28a745;"></i>
                    <span class="file-name">${doc.metadata.fileName}</span>
                    <span class="file-size">${this.formatFileSize(doc.metadata.size)}</span>
                    <span class="line-count">${lines} lines</span>
                    <span class="language-badge">${language}</span>
                </div>
            </div>
            <div class="code-container">
                <pre class="line-numbers"><code class="language-${language}" id="codeContent">${this.escapeHtml(doc.content)}</code></pre>
            </div>
        `;

        contentElement.appendChild(contentWrapper);

        // Setup download button functionality
        const downloadUrl = `/applications/wiki/api/documents/content?path=${encodeURIComponent(doc.path)}&spaceName=${encodeURIComponent(doc.spaceName)}&download=true`;
        this.setupDownloadButton(downloadUrl, doc.metadata.fileName);

        // Setup convert button functionality
        this.setupConvertButton(doc);

        // Setup star button functionality
        this.setupStarButton(doc);

        // Track document visit
        this.trackDocumentVisit(doc, 'viewed');

        // Apply syntax highlighting
        if (typeof Prism !== 'undefined') {
            setTimeout(() => {
                Prism.highlightAllUnder(contentWrapper);
            }, 100);
        }

        this.bindDocumentViewEvents();
    },

    /**
     * Markdown Viewer Implementation
     */
    showMarkdownViewer(doc) {
        this.app.setActiveView('document');
        this.app.currentView = 'document';

        this.updateDocumentHeader(doc);

        const contentElement = document.querySelector('#documentView .document-container');
        if (!contentElement) return;

        // Remove any existing content after header and add markdown viewer
        const existingContent = contentElement.querySelector('.document-content-wrapper');
        if (existingContent) existingContent.remove();

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'document-content-wrapper markdown-viewer';

        if (typeof marked !== 'undefined') {
            // Process wiki-code blocks before rendering
            const processedContent = this.processWikiCodeBlocks(doc.content);
            const renderedContent = marked.parse(processedContent);
            contentWrapper.innerHTML = `
                <div class="markdown-content">
                    ${renderedContent}
                </div>
            `;

            // Apply syntax highlighting to code blocks
            if (typeof Prism !== 'undefined') {
                setTimeout(() => Prism.highlightAllUnder(contentWrapper), 100);
            }
        } else {
            contentWrapper.innerHTML = `<pre class="markdown-fallback">${this.escapeHtml(doc.content)}</pre>`;
        }

        contentElement.appendChild(contentWrapper);

        // Setup download button functionality
        const downloadUrl = `/applications/wiki/api/documents/content?path=${encodeURIComponent(doc.path)}&spaceName=${encodeURIComponent(doc.spaceName)}&download=true`;
        this.setupDownloadButton(downloadUrl, doc.metadata.fileName);

        // Setup convert button functionality
        this.setupConvertButton(doc);

        // Setup star button functionality
        this.setupStarButton(doc);

        // Track document visit
        this.trackDocumentVisit(doc, 'viewed');

        this.bindDocumentViewEvents();
    },

    /**
     * Default/Fallback Viewer Implementation
     */
    showDefaultViewer(doc) {
        this.app.setActiveView('document');
        this.app.currentView = 'document';

        this.updateDocumentHeader(doc);

        const contentElement = document.querySelector('#documentView .document-container');
        if (!contentElement) return;

        const downloadUrl = `/applications/wiki/api/documents/content?path=${encodeURIComponent(doc.path)}&spaceName=${encodeURIComponent(doc.spaceName)}&download=true`;

        // Remove any existing content after header and add default viewer
        const existingContent = contentElement.querySelector('.document-content-wrapper');
        if (existingContent) existingContent.remove();

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'document-content-wrapper default-viewer';
        contentWrapper.innerHTML = `
            <div class="default-content">
                <div class="file-icon-large">
                    <i class="fas fa-file" style="font-size: 4rem; color: #6c757d;"></i>
                </div>
                <div class="file-details">
                    <h3>${doc.metadata.fileName}</h3>
                    <p class="file-meta">
                        <span>Size: ${this.formatFileSize(doc.metadata.size)}</span><br>
                        <span>Modified: ${this.app.formatDate(doc.metadata.modified)}</span><br>
                        <span>Type: ${doc.metadata.extension || 'Unknown'}</span>
                    </p>
                    <p class="file-description">
                        This file type is not supported for inline viewing. You can download it to view with an appropriate application.
                    </p>
                </div>
            </div>
        `;

        contentElement.appendChild(contentWrapper);

        // Setup download button functionality
        this.setupDownloadButton(downloadUrl, doc.metadata.fileName);

        // Setup convert button functionality
        this.setupConvertButton(doc);

        // Setup star button functionality
        this.setupStarButton(doc);

        // Track document visit
        this.trackDocumentVisit(doc, 'viewed');

        this.bindDocumentViewEvents();
    },

    /**
     * Helper method to update document header
     */
    updateDocumentHeader(doc) {
        const docTitle = document.getElementById('currentDocTitle');
        if (docTitle) {
            docTitle.textContent = doc.title;
        }

        const backToSpace = document.getElementById('docBackToSpace');
        if (backToSpace) {
            backToSpace.textContent = doc.spaceName || 'Space';
        }

        // Show/hide edit button based on file type
        this.updateEditButton(doc);
    },

    /**
     * Helper method to setup download button functionality
     */
    setupDownloadButton(downloadUrl, fileName) {
        const downloadBtn = document.getElementById('downloadDocBtn');
        if (downloadBtn) {
            downloadBtn.onclick = (e) => {
                e.preventDefault();
                // Create temporary link for download
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };
        }
    },

    /**
     * Helper method to setup convert to markdown button functionality
     */
    setupConvertButton(documentData) {
        const convertBtn = document.getElementById('convertToMarkdownBtn');
        if (!convertBtn) return;

        // Check if file is convertible (docx, pptx, xlsx)
        const ext = documentData.metadata?.extension?.toLowerCase();
        const isConvertible = ['.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls'].includes(ext);

        if (isConvertible) {
            convertBtn.style.display = 'inline-block';
            convertBtn.onclick = async (e) => {
                e.preventDefault();
                await this.convertToMarkdown(documentData);
            };
        } else {
            convertBtn.style.display = 'none';
        }
    },

    /**
     * Convert document to markdown
     */
    async convertToMarkdown(documentData) {
        try {
            this.app.showNotification('Converting to markdown...', 'info');

            const response = await fetch('/applications/wiki/api/documents/convert-to-markdown', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: documentData.path,
                    spaceName: documentData.spaceName
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.app.showNotification('Document converted successfully!', 'success');

                // Reload the file tree to show the new markdown file
                if (navigationController && navigationController.loadFileTree) {
                    await navigationController.loadFileTree();
                }

                // Open the newly created markdown file
                this.openDocumentByPath(result.markdownPath, documentData.spaceName);
            } else {
                throw new Error(result.error || 'Conversion failed');
            }
        } catch (error) {
            console.error('Error converting to markdown:', error);
            this.app.showNotification('Failed to convert document: ' + error.message, 'error');
        }
    },

    /**
     * Helper method to setup star button functionality
     */
    setupStarButton(documentData) {
        const starBtn = document.getElementById('starDocBtn');
        if (starBtn) {
            // Remove existing event listener
            starBtn.onclick = null;

            // Update UI based on current star status
            this.updateStarButtonUI(documentData);

            // Add click handler
            starBtn.onclick = (e) => {
                e.preventDefault();
                this.toggleDocumentStar(documentData);
            };
        }
    },

    /**
     * Helper method to update edit button visibility
     */
    updateEditButton(doc) {
        const editBtn = document.getElementById('editDocBtn');
        if (!editBtn) return;

        // Check if file type is editable
        const viewer = doc.metadata?.viewer || 'default';
        const isEditable = ['markdown', 'text', 'code', 'web', 'data'].includes(viewer);

        if (isEditable) {
            editBtn.style.display = 'flex';
        } else {
            editBtn.style.display = 'none';
        }
    },

    /**
     * Bind document view events
     */
    bindDocumentViewEvents() {
        // Edit document button
        const editBtn = document.getElementById('editDocBtn');
        if (editBtn) {
            editBtn.onclick = () => {
                this.editCurrentDocument();
            };
        }

        // Back to space button
        const backBtn = document.getElementById('docBackToSpace');
        if (backBtn) {
            backBtn.onclick = (e) => {
                e.preventDefault();
                this.app.showHome();
            };
        }
    },

    /**
     * Edit current document
     */
    editCurrentDocument() {
        if (this.app.currentDocument) {
            // Switch to editor view with current document loaded
            this.showEditorView(this.app.currentDocument);
        }
    },

    /**
     * Show editor view based on document type
     */
    showEditorView(doc) {
        const viewer = doc.metadata?.viewer || 'default';

        switch (viewer) {
            case 'markdown':
                this.showMarkdownEditor(doc);
                break;
            case 'text':
            case 'code':
            case 'web':
            case 'data':
                this.showTextCodeEditor(doc);
                break;
            default:
                this.app.showNotification('This file type cannot be edited', 'warning');
                return;
        }
    },

    /**
     * Markdown Editor Implementation
     */
    showMarkdownEditor(doc) {
        this.app.setActiveView('editor');
        this.app.currentView = 'editor';
        this.app.isEditing = true;

        // Update editor breadcrumb
        const spaceLink = document.getElementById('editorBackToSpace');
        const titleElement = document.getElementById('editorDocTitle');

        if (spaceLink) {
            spaceLink.textContent = doc.spaceName || 'Space';
            spaceLink.onclick = (e) => {
                e.preventDefault();
                this.app.showHome();
            };
        }

        if (titleElement) {
            titleElement.textContent = doc.title || doc.metadata?.fileName || 'Untitled';
        }

        const textarea = document.getElementById('editorTextarea');
        if (textarea) {
            textarea.value = doc.content || '';
            // Auto-resize textarea
            this.autoResizeTextarea(textarea);
        }

        // Show markdown editor pane, hide preview initially
        document.getElementById('markdownEditor')?.classList.remove('hidden');
        document.getElementById('previewPane')?.classList.add('hidden');

        // Bind editor events
        this.bindEditorEvents(doc);
    },

    /**
     * Text/Code Editor Implementation
     */
    showTextCodeEditor(doc) {
        this.app.setActiveView('editor');
        this.app.currentView = 'editor';
        this.app.isEditing = true;

        // Update editor breadcrumb
        const spaceLink = document.getElementById('editorBackToSpace');
        const titleElement = document.getElementById('editorDocTitle');

        if (spaceLink) {
            spaceLink.textContent = doc.spaceName || 'Space';
            spaceLink.onclick = (e) => {
                e.preventDefault();
                this.app.showHome();
            };
        }

        if (titleElement) {
            titleElement.textContent = doc.title || doc.metadata?.fileName || 'Untitled';
        }

        const textarea = document.getElementById('editorTextarea');
        if (textarea) {
            textarea.value = doc.content || '';
            // Set appropriate styling for code
            textarea.style.fontFamily = 'Monaco, Consolas, "Courier New", monospace';
            textarea.style.fontSize = '14px';
            textarea.style.lineHeight = '1.5';
            // Auto-resize textarea
            this.autoResizeTextarea(textarea);
        }

        // Show editor pane, hide preview for non-markdown files
        document.getElementById('markdownEditor')?.classList.remove('hidden');
        document.getElementById('previewPane')?.classList.add('hidden');

        // Hide preview button for non-markdown files
        const previewBtn = document.getElementById('previewDoc');
        if (previewBtn) {
            previewBtn.style.display = doc.metadata?.viewer === 'markdown' ? 'block' : 'none';
        }

        // Bind editor events
        this.bindEditorEvents(doc);
    },

    /**
     * Auto-resize textarea to fit content
     */
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, window.innerHeight * 0.7) + 'px';

        // Add input listener for dynamic resizing
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, window.innerHeight * 0.7) + 'px';
        });
    },

    /**
     * Bind editor events
     */
    bindEditorEvents(doc) {
        // Save button
        const saveBtn = document.getElementById('saveDoc');
        if (saveBtn) {
            saveBtn.onclick = () => this.saveDocument(doc);
        }

        // Preview button (for markdown)
        const previewBtn = document.getElementById('previewDoc');
        if (previewBtn) {
            previewBtn.onclick = () => this.togglePreview(doc);
        }

        // Close button
        const closeBtn = document.getElementById('closeEditor');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeEditor(doc);
        }

        // Auto-save on Ctrl+S
        document.addEventListener('keydown', (e) => {
            if (this.app.isEditing && (e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveDocument(doc);
            }
        });

        // Bind toolbar buttons for markdown
        if (doc.metadata?.viewer === 'markdown') {
            this.bindMarkdownToolbar();
        }

        // Track changes for unsaved indicator
        this.trackContentChanges();
    },

    /**
     * Bind markdown toolbar functionality
     */
    bindMarkdownToolbar() {
        const textarea = document.getElementById('editorTextarea');
        if (!textarea) return;

        // Bold button
        document.getElementById('boldBtn')?.addEventListener('click', () => {
            this.wrapSelection('**', '**', 'bold text');
        });

        // Italic button
        document.getElementById('italicBtn')?.addEventListener('click', () => {
            this.wrapSelection('*', '*', 'italic text');
        });

        // Code button
        document.getElementById('codeBtn')?.addEventListener('click', () => {
            this.wrapSelection('`', '`', 'code');
        });

        // Heading buttons
        document.getElementById('h1Btn')?.addEventListener('click', () => {
            this.insertHeading(1);
        });

        document.getElementById('h2Btn')?.addEventListener('click', () => {
            this.insertHeading(2);
        });

        document.getElementById('h3Btn')?.addEventListener('click', () => {
            this.insertHeading(3);
        });

        // List buttons
        document.getElementById('listBtn')?.addEventListener('click', () => {
            this.insertList('- ');
        });

        document.getElementById('numberedListBtn')?.addEventListener('click', () => {
            this.insertList('1. ');
        });

        // Link button
        document.getElementById('linkBtn')?.addEventListener('click', () => {
            this.insertLink();
        });
    },

    /**
     * Helper method to wrap selected text
     */
    wrapSelection(before, after, placeholder) {
        const textarea = document.getElementById('editorTextarea');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        const replacement = selectedText || placeholder;

        const newText = textarea.value.substring(0, start) +
                        before + replacement + after +
                        textarea.value.substring(end);

        textarea.value = newText;

        // Set cursor position
        const newCursorPos = start + before.length + replacement.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
    },

    /**
     * Insert heading
     */
    insertHeading(level) {
        const textarea = document.getElementById('editorTextarea');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end) || 'Heading';

        const hashmarks = '#'.repeat(level);
        const replacement = `${hashmarks} ${selectedText}`;

        // If we're not at the start of a line, add a newline before
        const beforeCursor = textarea.value.substring(0, start);
        const needsNewlineBefore = beforeCursor.length > 0 && !beforeCursor.endsWith('\n');

        const newText = textarea.value.substring(0, start) +
                        (needsNewlineBefore ? '\n' : '') +
                        replacement +
                        textarea.value.substring(end);

        textarea.value = newText;

        // Set cursor at end of heading
        const newCursorPos = start + (needsNewlineBefore ? 1 : 0) + replacement.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
    },

    /**
     * Insert list
     */
    insertList(prefix) {
        const textarea = document.getElementById('editorTextarea');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const selectedText = textarea.value.substring(start, textarea.selectionEnd) || 'List item';

        const lines = selectedText.split('\n');
        const listItems = lines.map(line => prefix + (line.trim() || 'List item')).join('\n');

        // If we're not at the start of a line, add a newline before
        const beforeCursor = textarea.value.substring(0, start);
        const needsNewlineBefore = beforeCursor.length > 0 && !beforeCursor.endsWith('\n');

        const newText = textarea.value.substring(0, start) +
                        (needsNewlineBefore ? '\n' : '') +
                        listItems +
                        textarea.value.substring(textarea.selectionEnd);

        textarea.value = newText;

        // Set cursor at end of list
        const newCursorPos = start + (needsNewlineBefore ? 1 : 0) + listItems.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
    },

    /**
     * Insert link
     */
    insertLink() {
        const textarea = document.getElementById('editorTextarea');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end) || 'link text';

        const linkText = `[${selectedText}](url)`;

        const newText = textarea.value.substring(0, start) +
                        linkText +
                        textarea.value.substring(end);

        textarea.value = newText;

        // Select the URL part for easy editing
        const urlStart = start + selectedText.length + 3; // position after ](
        const urlEnd = urlStart + 3; // length of 'url'
        textarea.setSelectionRange(urlStart, urlEnd);
        textarea.focus();
    },

    /**
     * Track content changes
     */
    trackContentChanges() {
        const textarea = document.getElementById('editorTextarea');
        const titleInput = document.getElementById('docTitle');
        const statusElement = document.getElementById('editingStatus');

        if (!textarea || !titleInput || !statusElement) return;

        let hasUnsavedChanges = false;

        const updateStatus = () => {
            if (hasUnsavedChanges) {
                statusElement.textContent = 'Unsaved changes';
                statusElement.style.display = 'block';
            } else {
                statusElement.style.display = 'none';
            }
        };

        const markAsChanged = () => {
            hasUnsavedChanges = true;
            updateStatus();
        };

        this.app.markAsSaved = () => {
            hasUnsavedChanges = false;
            updateStatus();
        };

        textarea.addEventListener('input', markAsChanged);
        titleInput.addEventListener('input', markAsChanged);

        updateStatus();
    },

    /**
     * Save document
     */
    async saveDocument(doc) {
        const textarea = document.getElementById('editorTextarea');

        if (!textarea) {
            console.error('Editor textarea not found');
            return;
        }

        const content = textarea.value;

        try {
            const response = await fetch('/applications/wiki/api/documents/content', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: doc.path,
                    spaceName: doc.spaceName,
                    content: content
                })
            });

            const result = await response.json();

            if (result.success) {
                // Update current document
                this.app.currentDocument = {
                    ...doc,
                    content: content
                };

                this.app.showNotification('Document saved successfully!', 'success');

                // Mark as saved to hide unsaved changes indicator
                if (this.app.markAsSaved) {
                    this.app.markAsSaved();
                }

                // Update file tree and other views
                await navigationController.loadFileTree();
            } else {
                throw new Error(result.message || 'Failed to save document');
            }
        } catch (error) {
            console.error('Error saving document:', error);
            this.app.showNotification('Failed to save document: ' + error.message, 'error');
        }
    },

    /**
     * Toggle preview for markdown
     */
    togglePreview(doc) {
        const editorPane = document.getElementById('markdownEditor');
        const previewPane = document.getElementById('previewPane');
        const previewContent = document.getElementById('previewContent');
        const textarea = document.getElementById('editorTextarea');
        const previewBtn = document.getElementById('previewDoc');

        if (!editorPane || !previewPane || !previewContent || !textarea || !previewBtn) return;

        if (previewPane.classList.contains('hidden')) {
            // Show preview
            if (typeof marked !== 'undefined') {
                // Process wiki-code blocks before rendering
                const processedContent = this.processWikiCodeBlocks(textarea.value || '');
                const renderedContent = marked.parse(processedContent);
                previewContent.innerHTML = renderedContent;

                // Apply syntax highlighting
                if (typeof Prism !== 'undefined') {
                    Prism.highlightAllUnder(previewContent);
                }
            } else {
                previewContent.innerHTML = '<p>Markdown preview not available</p>';
            }

            previewPane.classList.remove('hidden');
            previewBtn.textContent = 'Edit';
        } else {
            // Hide preview
            previewPane.classList.add('hidden');
            previewBtn.textContent = 'Preview';
        }
    },

    /**
     * Exit editor mode without returning to previous document
     */
    exitEditorMode() {
        if (this.app.isEditing) {
            this.app.isEditing = false;

            // Remove event listeners
            document.removeEventListener('keydown', this.app.handleKeyDown);

            // Clear editor content
            const titleInput = document.getElementById('docTitle');
            const textarea = document.getElementById('editorTextarea');

            if (titleInput) titleInput.value = '';
            if (textarea) textarea.value = '';

            // Clear current document reference
            this.app.currentDocument = null;
        }
    },

    /**
     * Close editor
     */
    closeEditor() {
        this.app.isEditing = false;

        // Remove event listeners
        document.removeEventListener('keydown', this.app.handleKeyDown);

        // Return to document view
        this.showEnhancedDocumentView(this.app.currentDocument);
    },

    /**
     * Track document view for recent files
     */
    async trackDocumentView(documentPath, spaceName) {
        try {
            // Ensure we have activity data
            userController.ensureActivityData();

            // Remove existing entry if it exists (to move it to the top)
            this.app.data.recent = this.app.data.recent.filter(item =>
                !(item.path === documentPath && item.space === spaceName)
            );

            // Add new entry at the beginning
            const activity = {
                path: documentPath,
                space: spaceName,
                lastVisited: new Date().toISOString(),
                title: documentPath.split('/').pop()
            };

            this.app.data.recent.unshift(activity);

            // Keep only last 10 items
            this.app.data.recent = this.app.data.recent.slice(0, 10);

            // Save to server
            await userController.saveActivityToServer();

        } catch (error) {
            console.error('Error tracking document view:', error);
        }
    },

    /**
     * Track document visit
     */
    async trackDocumentVisit(document, action = 'viewed') {
        try {
            const response = await fetch('/applications/wiki/api/user/visit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: document.path,
                    spaceName: document.spaceName,
                    title: document.title,
                    action: action
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.app.userActivity.recent = result.recent;
            }
        } catch (error) {
            console.error('Error tracking document visit:', error);
        }
    },

    /**
     * Toggle document star status
     */
    async toggleDocumentStar(documentData) {
        if (!documentData) return;

        const isStarred = this.isDocumentStarred(documentData);
        const action = isStarred ? 'unstar' : 'star';

        try {
            const response = await fetch('/applications/wiki/api/user/star', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: documentData.path,
                    spaceName: documentData.spaceName,
                    title: documentData.title,
                    action: action
                })
            });

            if (response.status === 401) {
                this.app.showNotification('Please log in to star documents', 'error');
                return;
            }

            const result = await response.json();

            if (result.success) {
                this.app.userActivity.starred = result.starred;
                this.app.data.starred = result.starred; // Sync with data.starred
                this.updateStarButtonUI(documentData);
                this.app.showNotification(
                    isStarred ? 'Document unstarred' : 'Document starred',
                    'success'
                );

                // Reload starred files if on starred view
                if (this.app.currentView === 'starred' || this.app.currentView === 'home') {
                    this.app.loadStarredFiles();
                }
            } else {
                throw new Error(result.error || 'Failed to update star status');
            }
        } catch (error) {
            console.error('Error toggling star:', error);
            this.app.showNotification('Failed to update star status: ' + error.message, 'error');
        }
    },

    /**
     * Check if document is starred
     */
    isDocumentStarred(documentData) {
        if (!this.app.userActivity || !this.app.userActivity.starred) return false;
        return this.app.userActivity.starred.some(item =>
            item.path === documentData.path && item.spaceName === documentData.spaceName
        );
    },

    /**
     * Update star button UI
     */
    updateStarButtonUI(documentData) {
        const starBtn = document.getElementById('starDocBtn');
        const starText = starBtn?.querySelector('.star-text');

        if (!starBtn || !starText) return;

        const isStarred = this.isDocumentStarred(documentData);

        if (isStarred) {
            starBtn.classList.add('starred');
            starText.textContent = 'Starred';
        } else {
            starBtn.classList.remove('starred');
            starText.textContent = 'Star';
        }
    },

    /**
     * Utility Methods
     */

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    getLanguageFromExtension(extension) {
        const languageMap = {
            'js': 'javascript',
            'jsx': 'jsx',
            'ts': 'typescript',
            'tsx': 'tsx',
            'py': 'python',
            'rb': 'ruby',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cs': 'csharp',
            'php': 'php',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift',
            'kt': 'kotlin',
            'sh': 'bash',
            'yml': 'yaml',
            'yaml': 'yaml',
            'json': 'json',
            'xml': 'xml',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'sql': 'sql',
            'md': 'markdown',
            'markdown': 'markdown'
        };
        return languageMap[extension.replace('.', '')] || extension.replace('.', '');
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Process wiki-code blocks in markdown content
     * Executes javascript code blocks with 'wiki-code' language tag and replaces them with the returned HTML
     */
    processWikiCodeBlocks(content) {
        // Match code blocks with wiki-code language tag
        const wikiCodeRegex = /```wiki-code\s*\n([\s\S]*?)```/g;

        return content.replace(wikiCodeRegex, (match, code) => {
            try {
                // Create a function from the code and execute it
                // Wrap the code in a return statement if it's just an expression
                const trimmedCode = code.trim();

                // Create and execute the function
                const func = new Function('return ' + trimmedCode);
                const result = func()();

                // Return the result (should be a string)
                return result || '';
            } catch (error) {
                console.error('Error executing wiki-code block:', error);
                return `<div class="alert alert-danger">
                    <strong>Wiki-code execution error:</strong> ${this.escapeHtml(error.message)}
                </div>`;
            }
        });
    }
};
