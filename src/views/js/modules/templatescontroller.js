import { documentController } from "./documentcontroller.js";
import { navigationController } from "./navigationcontroller.js";

export const templatesController = {

    init(app) {
        this.app = app;
    },

    async populateTemplateSelect() {
        const select = document.getElementById('fileTemplate');
        if (!select) return;

        // Clear existing options except blank document
        select.innerHTML = '<option value="">Blank Document</option>';

        try {
            // Load templates from .templates folder
            const response = await fetch(`/applications/wiki/api/spaces/${this.app.currentSpace.id}/templates`);
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
    },

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
                        spaceName: this.app.currentSpace.name,
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
    },

    async showTemplates() {
        this.app.setActiveView('search');
        this.app.setActiveShortcut('shortcutTemplates');
        this.app.currentView = 'templates';

        // Update search query display
        const queryElement = document.getElementById('searchQuery');
        const currentSpaceName = this.app.currentSpace ? this.app.currentSpace.name : null;

        if (queryElement) {
            const spaceContext = currentSpaceName ? ` - ${currentSpaceName}` : '';
            queryElement.textContent = `Templates${spaceContext}`;
        }

        // Show loading placeholder immediately
        this.app.showSearchLoadingPlaceholder();

        // Load and display templates in search results style
        await this.loadTemplatesSearchStyle();
    },

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
    },

    async loadTemplates() {
        const container = document.getElementById('templatesContent');
        if (!container) return;

        if (!this.app.currentSpace) {
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
            const response = await fetch(`/applications/wiki/api/spaces/${this.app.currentSpace.id}/templates`);

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
    },

    async loadTemplatesSearchStyle() {
        const container = document.getElementById('searchResults');
        if (!container) return;

        const currentSpaceName = this.app.currentSpace ? this.app.currentSpace.name : null;

        if (!this.app.currentSpace) {
            container.innerHTML = `
                <div class="no-content-message">
                    <svg width="48" height="48" class="no-content-icon">
                        <use href="#icon-clipboard"></use>
                    </svg>
                    <p>Select a space to view templates</p>
                    <p class="text-muted">Templates are organized by space</p>
                </div>
            `;
            return;
        }

        try {
            // Try to load templates from backend API
            const response = await fetch(`/applications/wiki/api/spaces/${this.app.currentSpace.id}/templates`);

            if (!response.ok) {
                throw new Error(`Templates API returned ${response.status}: ${response.statusText}`);
            }

            let templates = await response.json();

            // Sort templates by lastModified descending (most recently used first)
            templates = templates.sort((a, b) => {
                const dateA = new Date(a.lastModified || 0);
                const dateB = new Date(b.lastModified || 0);
                return dateB - dateA;
            });

            if (templates.length === 0) {
                container.innerHTML = `
                    <div class="no-content-message">
                        <svg width="48" height="48" class="no-content-icon">
                            <use href="#icon-clipboard"></use>
                        </svg>
                        <p>No templates found in ${currentSpaceName}</p>
                        <p class="text-muted">Create templates to see them here</p>
                    </div>
                `;
                return;
            }

            // Render in search results style
            const resultsHtml = templates.map(template => {
                const icon = 'icon-file';
                const fileName = navigationController.getFileNameFromPath(template.path || template.name);
                const title = template.title || fileName;
                const excerpt = template.description || 'Document template';
                const path = template.path || '';
                const modifiedDate = template.lastModified ? new Date(template.lastModified).toLocaleString() : '';

                const escapedPath = path.replace(/"/g, '&quot;');
                const escapedTitle = title.replace(/"/g, '&quot;');

                // Get file type info for icon
                const fileTypeInfo = navigationController.getFileTypeInfo(path);
                const iconClass = navigationController.getFileTypeIconClass(fileTypeInfo.category);
                const iconColor = fileTypeInfo.color;

                return `
                    <div class="search-result-item template-item"
                         data-template-path="${escapedPath}"
                         data-title="${escapedTitle}">
                        <div class="search-result-icon">
                            <i class="bi ${iconClass}" style="color: ${iconColor}; font-size: 20px;"></i>
                        </div>
                        <div class="search-result-content">
                            <h3 class="search-result-title">${title}</h3>
                            <p class="search-result-excerpt">${excerpt}</p>
                            <div class="search-result-meta">
                                <span class="search-result-space">Template • ${currentSpaceName}</span>
                                ${modifiedDate ? `<span class="search-result-date">Modified ${modifiedDate}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = `
                <div class="search-results-header">
                    <h2>Found ${templates.length} template${templates.length === 1 ? '' : 's'}</h2>
                </div>
                <div class="search-results-list">
                    ${resultsHtml}
                </div>
            `;

            // Add click handlers and preview to templates
            this.bindTemplateSearchResultEvents(container.querySelectorAll('.template-item'));

        } catch (error) {
            console.log('Templates API error:', error.message);
            // Show built-in templates fallback in search results style
            this.renderBuiltInTemplatesSearchStyle();
        }
    },

    renderBuiltInTemplatesSearchStyle() {
        const container = document.getElementById('searchResults');
        if (!container) return;

        const currentSpaceName = this.app.currentSpace ? this.app.currentSpace.name : 'All Spaces';

        const fallbackTemplates = [
            { key: 'basic', name: 'Basic Document', description: 'Simple document template with title and sections' },
            { key: 'api', name: 'API Documentation', description: 'Template for documenting REST APIs' },
            { key: 'meeting', name: 'Meeting Notes', description: 'Template for meeting minutes and action items' },
            { key: 'requirements', name: 'Requirements', description: 'Template for requirements documentation' }
        ];

        const resultsHtml = fallbackTemplates.map(template => {
            return `
                <div class="search-result-item template-item"
                     data-template-key="${template.key}"
                     data-title="${template.name}">
                    <div class="search-result-icon">
                        <svg width="20" height="20">
                            <use href="#icon-file"></use>
                        </svg>
                    </div>
                    <div class="search-result-content">
                        <h3 class="search-result-title">${template.name}</h3>
                        <p class="search-result-excerpt">${template.description}</p>
                        <div class="search-result-meta">
                            <span class="search-result-space">Built-in Template • ${currentSpaceName}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="search-results-header">
                <h2>Found ${fallbackTemplates.length} built-in templates</h2>
            </div>
            <div class="search-results-list">
                ${resultsHtml}
            </div>
        `;

        // Add click handlers for built-in templates
        container.querySelectorAll('.template-item').forEach(item => {
            item.addEventListener('click', () => {
                const templateKey = item.dataset.templateKey;
                this.previewBuiltInTemplate(templateKey);
            });
        });
    },

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
    },

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
    },

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
                        const fileTypeInfo = navigationController.getFileTypeInfo(template.path || template.name);
                        const iconClass = navigationController.getFileTypeIconClass(fileTypeInfo.category);
                        const iconColor = fileTypeInfo.color;
                        const fileName = navigationController.getFileNameFromPath(template.path || template.name);

                        return `
                            <div class="item-card template-card" data-template-path="${template.path}">
                                <i class="fas ${iconClass} item-icon" style="color: ${iconColor}; font-size: 24px;"></i>
                                <div class="item-info">
                                    <div class="item-name">${template.title || fileName}</div>
                                    <div class="item-meta">Template • ${template.lastModified ? this.app.formatDate(template.lastModified) : 'Custom template'}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            // Bind template card clicks and preview
            container.querySelectorAll('.template-card').forEach(card => {
                const templatePath = card.dataset.templatePath;
                const spaceName = this.app.currentSpace?.name;

                // Click event
                card.addEventListener('click', () => {
                    this.editTemplate(templatePath);
                });

                // Preview on hover
                if (spaceName) {
                    navigationController.initFilePreview();

                    card.addEventListener('mouseenter', () => {
                        navigationController.previewTimeout = setTimeout(() => {
                            navigationController.currentPreviewCard = card;
                            navigationController.showFilePreview(card, templatePath, spaceName);
                        }, 500);
                    });

                    card.addEventListener('mouseleave', () => {
                        if (navigationController.previewTimeout) {
                            clearTimeout(navigationController.previewTimeout);
                            navigationController.previewTimeout = null;
                        }
                        navigationController.hideFilePreview();
                    });
                }
            });
        }

        // Show the template button in the header
        this.showTemplateButton();
    },

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
    },

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

        this.app.currentDocument = previewDoc;
        documentController.showEnhancedDocumentView(previewDoc);
        this.app.showNotification('Previewing built-in template. Save to create a new document.', 'info');
    },

    createNewTemplate() {
        const templateName = prompt('Enter template name:');
        if (!templateName) return;

        // Create a template document object
        const templateDoc = {
            title: templateName,
            path: `.templates/${templateName}.md`,
            spaceName: this.app.currentSpace.name,
            content: '# ' + templateName + '\n\nYour template content goes here...',
            metadata: {
                viewer: 'markdown',
                isTemplate: true
            }
        };

        // Open in editor
        this.app.currentDocument = templateDoc;
        documentController.showEnhancedDocumentView(templateDoc);
    },

    async editTemplate(templatePath) {
        try {
            // Load template content
            const response = await fetch(`/applications/wiki/api/documents/content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    spaceName: this.app.currentSpace.name,
                    path: templatePath
                })
            });

            const templateDoc = await response.json();
            templateDoc.metadata = templateDoc.metadata || {};
            templateDoc.metadata.isTemplate = true;

            this.app.currentDocument = templateDoc;
            documentController.showEnhancedDocumentView(templateDoc);

        } catch (error) {
            console.error('Error loading template:', error);
            this.app.showNotification('Error loading template: ' + error.message, 'error');
        }
    },

    /**
     * Bind click and preview events to template search result items
     */
    bindTemplateSearchResultEvents(templateItems) {
        // Initialize preview tooltip if not already done
        navigationController.initFilePreview();

        templateItems.forEach(item => {
            const templatePath = item.dataset.templatePath;
            const spaceName = this.app.currentSpace?.name;

            // Click event
            item.addEventListener('click', () => {
                this.editTemplate(templatePath);
            });

            // Preview on hover
            if (spaceName) {
                item.addEventListener('mouseenter', () => {
                    navigationController.previewTimeout = setTimeout(() => {
                        navigationController.currentPreviewCard = item;
                        navigationController.showFilePreview(item, templatePath, spaceName);
                    }, 500);
                });

                item.addEventListener('mouseleave', () => {
                    if (navigationController.previewTimeout) {
                        clearTimeout(navigationController.previewTimeout);
                        navigationController.previewTimeout = null;
                    }
                    navigationController.hideFilePreview();
                });
            }
        });
    }
}