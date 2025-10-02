class ApiClient {
    constructor() {
        this.apiUrl = '';
    }

    async init() {
        const settings = await chrome.storage.sync.get('apiUrl');
        this.apiUrl = settings.apiUrl;
        return this.apiUrl;
    }

    async login(email, password) {
        const response = await fetch(`${this.apiUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return response.json();
    }

    async getSpaces() {
        const response = await fetch(`${this.apiUrl}/applications/wiki/api/spaces`);
        return response.json();
    }

    async getFolderTree(spaceId) {
        const response = await fetch(`${this.apiUrl}/applications/wiki/api/spaces/${spaceId}/folders`);
        return response.json();
    }

    async getDocumentContent(spaceName, path) {
        const response = await fetch(`${this.apiUrl}/applications/wiki/api/documents/content?spaceName=${encodeURIComponent(spaceName)}&path=${encodeURIComponent(path)}`);
        return response.text(); // Assuming markdown content
    }
    
    async search(spaceName, query) {
        const response = await fetch(`${this.apiUrl}/applications/wiki/api/search?spaceName=${encodeURIComponent(spaceName)}&q=${encodeURIComponent(query)}`);
        return response.json();
    }

    async getActivity() {
        const response = await fetch(`${this.apiUrl}/applications/wiki/api/user/activity`);
        return response.json();
    }

    getDownloadUrl(spaceName, path) {
        return `${this.apiUrl}/applications/wiki/api/documents/content?spaceName=${encodeURIComponent(spaceName)}&path=${encodeURIComponent(path)}&download=true`;
    }
}
