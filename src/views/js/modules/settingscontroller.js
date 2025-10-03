export const settingsController = {

    init(app) {
        this.app = app;
    },

    showSettings() {
        if (!this.app.userProfile) {
            this.app.showNotification('User profile not loaded', 'error');
            return;
        }

        // Show settings view
        this.app.setActiveView('settings');

        // Load all settings data
        this.loadSpacesManagement();
        this.loadActivityData();
        this.loadAISettings();

        // Bind all event listeners
        this.bindEventListeners();
    },

    async loadSpacesManagement() {
        try {
            const response = await fetch('/applications/wiki/api/spaces');
            if (response.ok) {
                const spaces = await response.json();
                this.renderSpacesList(spaces);
                // Re-bind event listeners after rendering
                this.bindSpaceEventListeners();
            }
        } catch (error) {
            console.error('Error loading spaces:', error);
        }
    },

    bindSpaceEventListeners() {
        // Create Space Button
        const createSpaceBtn = document.getElementById('settingsCreateSpaceBtn');
        if (createSpaceBtn) {
            createSpaceBtn.replaceWith(createSpaceBtn.cloneNode(true));
            document.getElementById('settingsCreateSpaceBtn').addEventListener('click', () => {
                this.showCreateSpaceForm();
            });
        }

        // Create Space Form - Cancel Button
        const cancelCreateSpaceBtn = document.getElementById('cancelCreateSpaceBtn');
        if (cancelCreateSpaceBtn) {
            cancelCreateSpaceBtn.replaceWith(cancelCreateSpaceBtn.cloneNode(true));
            document.getElementById('cancelCreateSpaceBtn').addEventListener('click', () => {
                this.hideCreateSpaceForm();
            });
        }

        // Create Space Form - Submit
        const createSpaceForm = document.getElementById('inlineCreateSpaceForm');
        if (createSpaceForm) {
            createSpaceForm.replaceWith(createSpaceForm.cloneNode(true));
            document.getElementById('inlineCreateSpaceForm').addEventListener('submit', (e) => {
                this.handleCreateSpace(e);
            });
        }

        // Edit Space Form - Cancel Button
        const cancelEditSpaceBtn = document.getElementById('cancelEditSpaceBtn');
        if (cancelEditSpaceBtn) {
            cancelEditSpaceBtn.replaceWith(cancelEditSpaceBtn.cloneNode(true));
            document.getElementById('cancelEditSpaceBtn').addEventListener('click', () => {
                this.hideEditSpaceForm();
            });
        }

        // Edit Space Form - Submit
        const editSpaceForm = document.getElementById('inlineEditSpaceForm');
        if (editSpaceForm) {
            editSpaceForm.replaceWith(editSpaceForm.cloneNode(true));
            document.getElementById('inlineEditSpaceForm').addEventListener('submit', (e) => {
                this.handleEditSpace(e);
            });
        }
    },

    renderSpacesList(spaces) {
        const list = document.getElementById('spacesManagementList');
        if (!list) return;

        if (spaces.length === 0) {
            list.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No spaces found</td></tr>';
            return;
        }

        list.innerHTML = spaces.map(space => `
            <tr>
                <td>
                    <i class="bi ${this.getSpaceIcon(space.type)} me-2"></i>
                    <strong>${space.name}</strong>
                    <br>
                    <small class="text-muted">${space.description || 'No description'}</small>
                </td>
                <td><span class="badge bg-secondary">${space.type || 'personal'}</span></td>
                <td>${space.documentCount || 0}</td>
                <td><small>${new Date(space.createdAt).toLocaleDateString()}</small></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary space-edit-btn" data-space-id="${space.id}" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger space-delete-btn" data-space-id="${space.id}" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Bind event listeners for edit and delete buttons
        this.bindSpaceActionButtons();
    },

    bindSpaceActionButtons() {
        // Edit buttons
        const editButtons = document.querySelectorAll('.space-edit-btn');
        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const spaceId = parseInt(e.currentTarget.getAttribute('data-space-id'));
                this.editSpace(spaceId);
            });
        });

        // Delete buttons
        const deleteButtons = document.querySelectorAll('.space-delete-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const spaceId = parseInt(e.currentTarget.getAttribute('data-space-id'));
                this.deleteSpace(spaceId);
            });
        });
    },

    getSpaceIcon(type) {
        const icons = {
            'personal': 'bi-person-circle',
            'shared': 'bi-people-fill',
            'readonly': 'bi-lock-fill'
        };
        return icons[type] || 'bi-folder';
    },

    async loadActivityData() {
        try {
            // Load recent activity
            const recentList = document.getElementById('recentActivityList');
            if (recentList && this.app.data.recent) {
                this.renderActivityList(this.app.data.recent, recentList, 'recent');
            }

            // Load starred documents
            const starredList = document.getElementById('starredActivityList');
            if (starredList && this.app.data.starred) {
                this.renderActivityList(this.app.data.starred, starredList, 'starred');
            }
        } catch (error) {
            console.error('Error loading activity data:', error);
        }
    },

    renderActivityList(items, container, type) {
        if (items.length === 0) {
            container.innerHTML = `<div class="text-center text-muted p-3">No ${type} items</div>`;
            return;
        }

        container.innerHTML = items.map((item, index) => `
            <div class="list-group-item d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <div class="fw-bold">${item.title}</div>
                    <small class="text-muted">
                        <i class="bi bi-folder me-1"></i>${item.spaceName}
                        ${type === 'recent' && item.action ? `<i class="bi bi-dot"></i>${item.action}` : ''}
                        ${item.visitedAt ? `<i class="bi bi-dot"></i>${this.formatDate(item.visitedAt)}` : ''}
                        ${item.starredAt ? `<i class="bi bi-dot"></i>${this.formatDate(item.starredAt)}` : ''}
                    </small>
                </div>
                <button class="btn btn-sm btn-outline-danger activity-remove-btn" data-activity-type="${type}" data-activity-index="${index}">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `).join('');

        // Bind event listeners to remove buttons
        this.bindActivityRemoveButtons();
    },

    bindActivityRemoveButtons() {
        const removeButtons = document.querySelectorAll('.activity-remove-btn');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.getAttribute('data-activity-type');
                const index = parseInt(e.currentTarget.getAttribute('data-activity-index'));
                this.removeActivityItem(type, index);
            });
        });
    },

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    },

    async loadAISettings() {
        try {
            const response = await fetch('/applications/wiki/api/settings/ai');
            if (response.ok) {
                const settings = await response.json();
                this.populateAISettings(settings);
            }
        } catch (error) {
            console.error('Error loading AI settings:', error);
        }
    },

    populateAISettings(settings) {
        if (!settings) return;

        document.getElementById('llmProvider').value = settings.provider || '';
        document.getElementById('aiApiKey').value = settings.apiKey || '';
        document.getElementById('llmModel').value = settings.model || '';
        document.getElementById('llmTemperature').value = settings.temperature || 0.7;
        document.getElementById('llmMaxTokens').value = settings.maxTokens || 4096;
        document.getElementById('llmEndpoint').value = settings.endpoint || '';
        document.getElementById('enableAI').checked = settings.enabled || false;
    },

    bindEventListeners() {
        // Activity Management
        const clearRecentBtn = document.getElementById('clearRecentBtn');
        if (clearRecentBtn) {
            clearRecentBtn.replaceWith(clearRecentBtn.cloneNode(true));
            document.getElementById('clearRecentBtn').addEventListener('click', () => this.clearActivity('recent'));
        }

        const clearStarredBtn = document.getElementById('clearStarredBtn');
        if (clearStarredBtn) {
            clearStarredBtn.replaceWith(clearStarredBtn.cloneNode(true));
            document.getElementById('clearStarredBtn').addEventListener('click', () => this.clearActivity('starred'));
        }

        // AI Settings Form
        const aiForm = document.getElementById('aiSettingsForm');
        if (aiForm) {
            aiForm.replaceWith(aiForm.cloneNode(true));
            document.getElementById('aiSettingsForm').addEventListener('submit', (e) => this.handleAISettingsSave(e));
        }

        // Toggle API Key Visibility
        const toggleApiKeyBtn = document.getElementById('toggleApiKeyBtn');
        if (toggleApiKeyBtn) {
            toggleApiKeyBtn.replaceWith(toggleApiKeyBtn.cloneNode(true));
            document.getElementById('toggleApiKeyBtn').addEventListener('click', () => this.toggleApiKeyVisibility());
        }

        // Test AI Connection
        const testAIBtn = document.getElementById('testAIConnectionBtn');
        if (testAIBtn) {
            testAIBtn.replaceWith(testAIBtn.cloneNode(true));
            document.getElementById('testAIConnectionBtn').addEventListener('click', () => this.testAIConnection());
        }
    },

    showCreateSpaceForm() {
        const formContainer = document.getElementById('createSpaceFormContainer');
        const spacesListCard = document.getElementById('spacesListCard');

        if (formContainer) {
            formContainer.classList.remove('hidden');
            // Scroll to form
            formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Hide the spaces list
        if (spacesListCard) {
            spacesListCard.classList.add('hidden');
        }
    },

    hideCreateSpaceForm() {
        const formContainer = document.getElementById('createSpaceFormContainer');
        const spacesListCard = document.getElementById('spacesListCard');

        if (formContainer) {
            formContainer.classList.add('hidden');
        }

        // Show the spaces list
        if (spacesListCard) {
            spacesListCard.classList.remove('hidden');
        }

        // Reset form
        const form = document.getElementById('inlineCreateSpaceForm');
        if (form) form.reset();
    },

    async handleCreateSpace(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const spaceData = {
            name: formData.get('spaceName'),
            type: formData.get('spaceType'),
            description: formData.get('spaceDescription'),
            path: formData.get('spacePath'),
            visibility: formData.get('spaceVisibility')
        };

        try {
            const response = await fetch('/applications/wiki/api/spaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(spaceData)
            });

            const result = await response.json();

            if (response.ok) {
                this.app.showNotification('Space created successfully!', 'success');
                this.hideCreateSpaceForm();
                this.loadSpacesManagement();

                // Refresh the spaces navigator in the left sidebar
                if (this.app.loadSpaces) {
                    await this.app.loadSpaces();
                }
            } else {
                throw new Error(result.error || 'Failed to create space');
            }
        } catch (error) {
            console.error('Error creating space:', error);
            this.app.showNotification('Failed to create space: ' + error.message, 'error');
        }
    },

    async editSpace(spaceId) {
        try {
            // Load space data
            const response = await fetch(`/applications/wiki/api/spaces/${spaceId}`);
            if (response.ok) {
                const space = await response.json();
                this.showEditSpaceForm(space);
            } else {
                throw new Error('Failed to load space data');
            }
        } catch (error) {
            console.error('Error loading space for edit:', error);
            this.app.showNotification('Failed to load space data', 'error');
        }
    },

    showEditSpaceForm(space) {
        const formContainer = document.getElementById('editSpaceFormContainer');
        const spacesListCard = document.getElementById('spacesListCard');
        const createFormContainer = document.getElementById('createSpaceFormContainer');

        // Hide create form if it's visible
        if (createFormContainer) {
            createFormContainer.classList.add('hidden');
        }

        // Show edit form
        if (formContainer) {
            formContainer.classList.remove('hidden');
            formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Hide the spaces list
        if (spacesListCard) {
            spacesListCard.classList.add('hidden');
        }

        // Populate form with space data
        document.getElementById('editSpaceId').value = space.id;
        document.getElementById('editSpaceName').value = space.name;
        document.getElementById('editSpaceType').value = space.type;
        document.getElementById('editSpaceDescription').value = space.description || '';

        // Extract just the folder name from the full path
        const pathParts = space.path.split('/');
        const folderName = pathParts[pathParts.length - 1];
        document.getElementById('editSpacePath').value = folderName;

        document.getElementById('editSpaceVisibility').value = space.visibility;

        // Bind form submit event listener first (before cloning cancel button)
        const editForm = document.getElementById('inlineEditSpaceForm');
        if (editForm) {
            // Remove old listener by cloning the form
            const newForm = editForm.cloneNode(true);
            editForm.parentNode.replaceChild(newForm, editForm);

            // Add submit listener
            document.getElementById('inlineEditSpaceForm').addEventListener('submit', (e) => {
                this.handleEditSpace(e);
            });

            // Add cancel button listener after form is cloned
            const cancelBtn = document.getElementById('cancelEditSpaceBtn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.hideEditSpaceForm();
                });
            }
        }
    },

    hideEditSpaceForm() {
        const formContainer = document.getElementById('editSpaceFormContainer');
        const spacesListCard = document.getElementById('spacesListCard');

        if (formContainer) {
            formContainer.classList.add('hidden');
        }

        // Show the spaces list
        if (spacesListCard) {
            spacesListCard.classList.remove('hidden');
        }

        // Reset form
        const form = document.getElementById('inlineEditSpaceForm');
        if (form) form.reset();
    },

    async handleEditSpace(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const spaceId = formData.get('spaceId');
        const spaceData = {
            name: formData.get('spaceName'),
            type: formData.get('spaceType'),
            description: formData.get('spaceDescription'),
            path: formData.get('spacePath'),
            visibility: formData.get('spaceVisibility')
        };

        try {
            const response = await fetch(`/applications/wiki/api/spaces/${spaceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(spaceData)
            });

            const result = await response.json();

            if (response.ok) {
                this.app.showNotification('Space updated successfully!', 'success');
                this.hideEditSpaceForm();
                this.loadSpacesManagement();

                // Refresh the spaces navigator in the left sidebar
                if (this.app.loadSpaces) {
                    await this.app.loadSpaces();
                }
            } else {
                throw new Error(result.error || 'Failed to update space');
            }
        } catch (error) {
            console.error('Error updating space:', error);
            this.app.showNotification('Failed to update space: ' + error.message, 'error');
        }
    },

    async deleteSpace(spaceId) {
        if (!confirm('Are you sure you want to delete this space entry? The space content will be preserved.')) {
            return;
        }

        try {
            const response = await fetch(`/applications/wiki/api/spaces/${spaceId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.app.showNotification('Space deleted successfully', 'success');
                this.loadSpacesManagement();

                // Refresh the spaces navigator in the left sidebar
                if (this.app.loadSpaces) {
                    await this.app.loadSpaces();
                }
            } else {
                throw new Error('Failed to delete space');
            }
        } catch (error) {
            console.error('Error deleting space:', error);
            this.app.showNotification('Failed to delete space: ' + error.message, 'error');
        }
    },

    async clearActivity(type) {
        const confirmMsg = `Are you sure you want to clear all ${type} items?`;
        if (!confirm(confirmMsg)) {
            return;
        }

        this.app.data[type] = [];

        try {
            await fetch('/applications/wiki/api/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recent: this.app.data.recent,
                    starred: this.app.data.starred
                })
            });

            this.app.showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} items cleared`, 'success');
            this.loadActivityData();
        } catch (error) {
            console.error('Error clearing activity:', error);
            this.app.showNotification('Failed to clear activity', 'error');
        }
    },

    async removeActivityItem(type, index) {
        this.app.data[type].splice(index, 1);

        try {
            await fetch('/applications/wiki/api/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recent: this.app.data.recent,
                    starred: this.app.data.starred
                })
            });

            this.loadActivityData();
        } catch (error) {
            console.error('Error removing activity item:', error);
        }
    },

    async handleAISettingsSave(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const aiSettings = {
            provider: formData.get('llmProvider'),
            apiKey: formData.get('aiApiKey'),
            model: formData.get('llmModel'),
            temperature: parseFloat(formData.get('llmTemperature')),
            maxTokens: parseInt(formData.get('llmMaxTokens')),
            endpoint: formData.get('llmEndpoint'),
            enabled: formData.has('enableAI')
        };

        try {
            const response = await fetch('/applications/wiki/api/settings/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(aiSettings)
            });

            const result = await response.json();

            if (result.success) {
                this.app.showNotification('AI settings saved successfully!', 'success');
            } else {
                throw new Error(result.error || 'Failed to save AI settings');
            }
        } catch (error) {
            console.error('Error saving AI settings:', error);
            this.app.showNotification('Failed to save AI settings: ' + error.message, 'error');
        }
    },

    toggleApiKeyVisibility() {
        const input = document.getElementById('aiApiKey');
        const icon = document.querySelector('#toggleApiKeyBtn i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('bi-eye');
            icon.classList.add('bi-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('bi-eye-slash');
            icon.classList.add('bi-eye');
        }
    },

    async testAIConnection() {
        const provider = document.getElementById('llmProvider').value;
        const apiKey = document.getElementById('aiApiKey').value;

        if (!provider || !apiKey) {
            this.app.showNotification('Please select a provider and enter an API key', 'error');
            return;
        }

        this.app.showNotification('Testing connection...', 'info');

        try {
            const response = await fetch('/applications/wiki/api/settings/ai/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    provider,
                    apiKey,
                    model: document.getElementById('llmModel').value
                })
            });

            const result = await response.json();

            if (result.success) {
                this.app.showNotification('Connection successful!', 'success');
            } else {
                throw new Error(result.error || 'Connection test failed');
            }
        } catch (error) {
            console.error('Error testing AI connection:', error);
            this.app.showNotification('Connection test failed: ' + error.message, 'error');
        }
    },

    getInitials(name) {
        if (!name) return 'U';
        return name.split(' ')
                   .map(part => part.charAt(0))
                   .join('')
                   .toUpperCase()
                   .substring(0, 2);
    }
};
