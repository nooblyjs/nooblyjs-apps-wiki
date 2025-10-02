const vscode = require('vscode');
const axios = require('axios');

const API_TOKEN_KEY = 'nooblyWiki.apiToken';

class ApiClient {
    constructor(context) {
        this.context = context;
        this.api = axios.create();
        this.initialize();
    }

    async initialize() {
        const apiUrl = vscode.workspace.getConfiguration('nooblyWiki').get('apiUrl');
        this.api.defaults.baseURL = apiUrl;
        const token = await this.context.secrets.get(API_TOKEN_KEY);
        if (token) {
            this.setAuthHeader(token);
        }
    }

    setAuthHeader(token) {
        this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    clearAuthHeader() {
        delete this.api.defaults.headers.common['Authorization'];
    }

    async login(email, password) {
        const response = await this.api.post('/api/auth/login', { email, password });
        return response.data;
    }

    async getSpaces() {
        const response = await this.api.get('/applications/wiki/api/spaces');
        return response.data;
    }

    async getFolderTree(spaceId) {
        const response = await this.api.get(`/applications/wiki/api/spaces/${spaceId}/folders`);
        return response.data;
    }

    async getDocumentContent(spaceName, path) {
        const response = await this.api.get(`/applications/wiki/api/documents/content?spaceName=${encodeURIComponent(spaceName)}&path=${encodeURIComponent(path)}`);
        return response.data;
    }
}

class WikiTreeDataProvider {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    async getChildren(element) {
        if (!this.apiClient.api.defaults.baseURL) {
            vscode.window.showInformationMessage('Set Noobly Wiki API URL in settings.');
            return Promise.resolve([]);
        }

        if (element) {
            if (element.contextValue === 'space') {
                const tree = await this.apiClient.getFolderTree(element.spaceId);
                return tree.map(item => new WikiTreeItem(item.name, item.type === 'folder' ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None, {
                    command: item.type === 'document' ? 'nooblyWiki.openDocument' : undefined,
                    title: 'Open Document',
                    arguments: [item]
                }, item));
            }
            if (element.contextValue === 'folder') {
                return element.original.children.map(item => new WikiTreeItem(item.name, item.type === 'folder' ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None, {
                    command: item.type === 'document' ? 'nooblyWiki.openDocument' : undefined,
                    title: 'Open Document',
                    arguments: [item]
                }, item));
            }
            return Promise.resolve([]);
        } else {
            try {
                const spaces = await this.apiClient.getSpaces();
                return spaces.map(space => new WikiTreeItem(space.name, vscode.TreeItemCollapsibleState.Collapsed, null, { ...space, contextValue: 'space' }));
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    vscode.window.showInformationMessage('Please log in to Noobly Wiki.');
                } else {
                    console.error(error);
                    vscode.window.showErrorMessage('Failed to fetch spaces. Check API URL and connection.');
                }
                return Promise.resolve([]);
            }
        }
    }
}

class WikiTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, command, original) {
        super(label, collapsibleState);
        this.command = command;
        this.original = original;
        this.contextValue = original.contextValue || original.type;
        this.spaceId = original.id;
        this.iconPath = this.getIcon(original);
    }

    getIcon(item) {
        if (item.type === 'folder') {
            return new vscode.ThemeIcon('folder');
        }
        if (item.type === 'document') {
            return new vscode.ThemeIcon('file-text');
        }
        if (item.contextValue === 'space') {
            return new vscode.ThemeIcon('repo');
        }
        return vscode.ThemeIcon.File;
    }
}

function activate(context) {
    const apiClient = new ApiClient(context);

    const treeDataProvider = new WikiTreeDataProvider(apiClient);
    vscode.window.createTreeView('nooblyWikiView', { treeDataProvider });

    context.subscriptions.push(vscode.commands.registerCommand('nooblyWiki.refresh', () => {
        treeDataProvider.refresh();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('nooblyWiki.login', async () => {
        const email = await vscode.window.showInputBox({ prompt: 'Enter your email' });
        const password = await vscode.window.showInputBox({ prompt: 'Enter your password', password: true });

        if (email && password) {
            try {
                const data = await apiClient.login(email, password);
                if (data.token) {
                    await context.secrets.store(API_TOKEN_KEY, data.token);
                    apiClient.setAuthHeader(data.token);
                    treeDataProvider.refresh();
                    vscode.window.showInformationMessage('Login successful!');
                } else {
                    vscode.window.showErrorMessage('Login failed: No token received.');
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Login failed: ${error.message}`);
            }
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('nooblyWiki.logout', async () => {
        await context.secrets.delete(API_TOKEN_KEY);
        apiClient.clearAuthHeader();
        treeDataProvider.refresh();
        vscode.window.showInformationMessage('Logged out successfully.');
    }));

    context.subscriptions.push(vscode.commands.registerCommand('nooblyWiki.openDocument', async (item) => {
        try {
            const content = await apiClient.getDocumentContent(item.spaceName, item.path);
            const document = await vscode.workspace.openTextDocument({ content, language: 'markdown' });
            await vscode.window.showTextDocument(document, { preview: true });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open document: ${error.message}`);
        }
    }));

    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('nooblyWiki.apiUrl')) {
            apiClient.initialize();
            treeDataProvider.refresh();
        }
    });
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
