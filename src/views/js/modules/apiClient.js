/**
 * API Client Module
 * Centralized API communication layer for the Wiki application
 */

const BASE_URL = '/applications/wiki/api';

export const WikiAPI = {
    /**
     * Authentication APIs
     */
    auth: {
        async check() {
            const response = await fetch(`${BASE_URL}/auth/check`);
            return response.json();
        }
    },

    /**
     * Space APIs
     */
    spaces: {
        async getAll() {
            const response = await fetch(`${BASE_URL}/spaces`);
            return response.json();
        },

        async create(data) {
            const response = await fetch(`${BASE_URL}/spaces`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.json();
        },

        async getFolders(spaceId) {
            const response = await fetch(`${BASE_URL}/spaces/${spaceId}/folders`);
            return response.json();
        },

        async getTemplates(spaceId) {
            const response = await fetch(`${BASE_URL}/spaces/${spaceId}/templates`);
            return response.json();
        }
    },

    /**
     * Folder APIs
     */
    folders: {
        async create(data) {
            const response = await fetch(`${BASE_URL}/folders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.json();
        },

        async rename(data) {
            const response = await fetch(`${BASE_URL}/folders/rename`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.json();
        },

        async delete(path, spaceId) {
            const response = await fetch(`${BASE_URL}/folders/${encodeURIComponent(path)}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ spaceId })
            });
            return response.json();
        }
    },

    /**
     * Document APIs
     */
    documents: {
        async getAll() {
            const response = await fetch(`${BASE_URL}/documents`);
            return response.json();
        },

        async create(data) {
            const response = await fetch(`${BASE_URL}/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.json();
        },

        async getContent(path, spaceName, enhanced = false) {
            const url = `${BASE_URL}/documents/content?path=${encodeURIComponent(path)}&spaceName=${encodeURIComponent(spaceName)}${enhanced ? '&enhanced=true' : ''}`;
            const response = await fetch(url);
            return response.json();
        },

        async saveContent(path, spaceName, content) {
            const response = await fetch(`${BASE_URL}/documents/content`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, spaceName, content })
            });
            return response.json();
        },

        async rename(data) {
            const response = await fetch(`${BASE_URL}/documents/rename`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.json();
        },

        async delete(path, spaceId) {
            const response = await fetch(`${BASE_URL}/documents/${encodeURIComponent(path)}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ spaceId })
            });
            return response.json();
        }
    },

    /**
     * File Upload API
     */
    async uploadFile(formData, targetPath, spaceName) {
        const response = await fetch(`${BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        return response.json();
    },

    /**
     * Publish API
     */
    async publish(data) {
        const response = await fetch(`${BASE_URL}/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },

    /**
     * Activity APIs
     */
    activity: {
        async get() {
            const response = await fetch(`${BASE_URL}/activity`);
            return response.json();
        },

        async update(data) {
            const response = await fetch(`${BASE_URL}/activity`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.json();
        },

        async getUserActivity() {
            const response = await fetch(`${BASE_URL}/user/activity`);
            return response.json();
        },

        async recordVisit(data) {
            const response = await fetch(`${BASE_URL}/user/visit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.json();
        },

        async toggleStar(data) {
            const response = await fetch(`${BASE_URL}/user/star`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.json();
        }
    },

    /**
     * User Profile APIs
     */
    profile: {
        async get() {
            const response = await fetch(`${BASE_URL}/profile`);
            return response.json();
        },

        async update(data) {
            const response = await fetch(`${BASE_URL}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.json();
        }
    }
};
