document.addEventListener('DOMContentLoaded', async () => {
    const apiClient = new ApiClient();

    const initialView = document.getElementById('initial-view');
    const mainView = document.getElementById('main-view');
    const loginView = document.getElementById('login-view');
    const settingsPrompt = document.getElementById('settings-prompt');
    const searchInput = document.getElementById('search-input');
    const browseTab = document.getElementById('browse-tab');
    const recentTab = document.getElementById('recent-tab');
    const starredTab = document.getElementById('starred-tab');

    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = searchInput.value.trim();
            if (query.length > 1) {
                performSearch(query);
            }
        }, 300);
    });

    browseTab.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveTab(browseTab);
        loadFolderTree(spacesDropdown.value);
    });

    recentTab.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveTab(recentTab);
        loadActivityView('recent');
    });

    starredTab.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveTab(starredTab);
        loadActivityView('starred');
    });

    function setActiveTab(tab) {
        [browseTab, recentTab, starredTab].forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
    }

    async function performSearch(query) {
        const spaceName = spacesDropdown.options[spacesDropdown.selectedIndex].text;
        if (!spaceName) return;
        try {
            const results = await apiClient.search(spaceName, query);
            renderSearchResults(results);
            setActiveTab(browseTab); // Or a new search tab
        } catch (error) {
            console.error('Search failed:', error);
            folderView.innerHTML = '<p class="text-danger">Search failed.</p>';
        }
    }

    function renderSearchResults(results) {
        folderView.innerHTML = '';
        if (results.length === 0) {
            folderView.innerHTML = '<p class="text-muted">No results found.</p>';
            return;
        }
        results.forEach(item => {
            const a = document.createElement('a');
            a.href = '#';
            a.classList.add('list-group-item', 'list-group-item-action');
            const icon = document.createElement('i');
            icon.classList.add('bi', 'bi-file-earmark', 'me-2');
            a.appendChild(icon);
            a.appendChild(document.createTextNode(item.title));
            a.addEventListener('click', (e) => {
                e.preventDefault();
                loadDocument(item.spaceName, item.path);
            });
            folderView.appendChild(a);
        });
    }

    async function loadActivityView(type) {
        try {
            const activity = await apiClient.getActivity();
            const items = activity[type] || [];
            folderView.innerHTML = '';
            if (items.length === 0) {
                folderView.innerHTML = `<p class="text-muted">No ${type} items.</p>`;
                return;
            }
            items.forEach(item => {
                const a = document.createElement('a');
                a.href = '#';
                a.classList.add('list-group-item', 'list-group-item-action');
                const icon = document.createElement('i');
                icon.classList.add('bi', 'bi-file-earmark', 'me-2');
                a.appendChild(icon);
                a.appendChild(document.createTextNode(item.title));
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    loadDocument(item.spaceName, item.path);
                });
                folderView.appendChild(a);
            });
        } catch (error) {
            console.error(`Failed to load ${type} items:`, error);
            folderView.innerHTML = `<p class="text-danger">Could not load ${type} items.</p>`;
        }
    }


    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const spacesDropdown = document.getElementById('spaces-dropdown');
    const folderView = document.getElementById('folder-view');
    const documentView = document.getElementById('document-view');
    const breadcrumb = document.getElementById('breadcrumb');

    const urlPrompt = document.getElementById('url-prompt');
    const urlForm = document.getElementById('url-form');
    const apiUrlInput = document.getElementById('api-url-input');

    urlForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const apiUrl = apiUrlInput.value.trim();
        if (apiUrl) {
            await new Promise(resolve => chrome.storage.sync.set({ apiUrl }, resolve));
            await apiClient.init();
            showLoginView();
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await chrome.storage.local.remove('authToken');
        showLoginView();
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const result = await apiClient.login(email, password);
            if (result.success) {
                await chrome.storage.local.set({ authToken: result.token }); // Assuming a token is returned
                showMainView();
                loadSpaces();
            } else {
                loginError.textContent = result.message || 'Login failed';
                loginError.classList.remove('d-none');
            }
        } catch (error) {
            loginError.textContent = 'An error occurred during login.';
            loginError.classList.remove('d-none');
        }
    });

    let currentSpaceTree = null;

    spacesDropdown.addEventListener('change', async () => {
        const spaceId = spacesDropdown.value;
        if (spaceId) {
            try {
                currentSpaceTree = await apiClient.getFolderTree(spaceId);
                loadFolderTree(spaceId);
            } catch (error) {
                console.error('Failed to load space tree:', error);
                folderView.innerHTML = '<p class="text-danger">Could not load space.</p>';
            }
        }
    });

    function findNodeByPath(tree, path) {
        if (!path) return tree;
        const parts = path.split('/');
        let currentNode = { children: tree };
        for (const part of parts) {
            if (!currentNode || !currentNode.children) return null;
            currentNode = currentNode.children.find(item => item.name === part && item.type === 'folder');
        }
        return currentNode ? currentNode.children : [];
    }

    function loadFolderTree(spaceId, path = '') {
        if (!currentSpaceTree) return;
        const items = findNodeByPath(currentSpaceTree, path);
        renderFolderView(items, spaceId, path);
        updateBreadcrumb(spaceId, path);
        folderView.classList.remove('d-none');
        documentView.classList.add('d-none');
    }

    function renderFolderView(items, spaceId, currentPath) {
        folderView.innerHTML = '';
        if (!items) {
            folderView.innerHTML = '<p class="text-muted">Folder is empty.</p>';
            return;
        }
        items.forEach(item => {
            const a = document.createElement('a');
            a.href = '#';
            a.classList.add('list-group-item', 'list-group-item-action');
            const icon = document.createElement('i');
            icon.classList.add('bi', item.type === 'folder' ? 'bi-folder' : 'bi-file-earmark', 'me-2');
            a.appendChild(icon);
            a.appendChild(document.createTextNode(item.name));
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const newPath = currentPath ? `${currentPath}/${item.name}` : item.name;
                if (item.type === 'folder') {
                    loadFolderTree(spaceId, newPath);
                } else {
                    const spaceName = spacesDropdown.options[spacesDropdown.selectedIndex].text;
                    loadDocument(spaceName, item.path);
                }
            });
            folderView.appendChild(a);
        });
    }

    function showLoginView() {
        initialView.classList.remove('d-none');
        mainView.classList.add('d-none');
        loginView.classList.remove('d-none');
        settingsPrompt.classList.add('d-none');
    }

    function showMainView() {
        initialView.classList.add('d-none');
        mainView.classList.remove('d-none');
    }

    function showUrlPrompt() {
        initialView.classList.remove('d-none');
        mainView.classList.add('d-none');
        loginView.classList.add('d-none');
        urlPrompt.classList.remove('d-none');
    }

    // Initial load
    const apiUrl = await apiClient.init();
    if (!apiUrl) {
        showUrlPrompt();
    } else {
        const { authToken } = await chrome.storage.local.get('authToken');
        if (authToken) {
            showMainView();
            loadSpaces();
        } else {
            showLoginView();
        }
    }

    async function loadSpaces() {
        try {
            const spaces = await apiClient.getSpaces();
            spacesDropdown.innerHTML = '<option value="">Select a space</option>';
            spaces.forEach(space => {
                const option = document.createElement('option');
                option.value = space.id;
                option.textContent = space.name;
                spacesDropdown.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load spaces:', error);
        }
    }

    async function loadFolderTree(spaceId, path = '') {
        try {
            const space = await apiClient.getFolderTree(spaceId);
            renderFolderView(space, spaceId);
            updateBreadcrumb(spaceId, path);
        } catch (error) {
            console.error('Failed to load folder tree:', error);
        }
    }

    function renderFolderView(tree, spaceId) {
        folderView.innerHTML = '';
        tree.forEach(item => {
            const a = document.createElement('a');
            a.href = '#';
            a.classList.add('list-group-item', 'list-group-item-action');
            const icon = document.createElement('i');
            icon.classList.add('bi', item.type === 'folder' ? 'bi-folder' : 'bi-file-earmark', 'me-2');
            a.appendChild(icon);
            a.appendChild(document.createTextNode(item.name));
            a.addEventListener('click', (e) => {
                e.preventDefault();
                if (item.type === 'folder') {
                    loadFolderTree(spaceId, item.path);
                } else {
                    const spaceName = spacesDropdown.options[spacesDropdown.selectedIndex].text;
                    loadDocument(spaceName, item.path);
                }
            });
            folderView.appendChild(a);
        });
    }

    function updateBreadcrumb(spaceId, path) {
        const breadcrumbNav = document.getElementById('breadcrumb');
        breadcrumbNav.innerHTML = '';
        const ol = document.createElement('ol');
        ol.classList.add('breadcrumb');

        const home = document.createElement('li');
        home.classList.add('breadcrumb-item');
        const homeLink = document.createElement('a');
        homeLink.href = '#';
        homeLink.textContent = 'Home';
        homeLink.addEventListener('click', (e) => {
            e.preventDefault();
            loadFolderTree(spaceId);
        });
        home.appendChild(homeLink);
        ol.appendChild(home);

        if (path) {
            const parts = path.split('/');
            let currentPath = '';
            parts.forEach((part, index) => {
                currentPath += (currentPath ? '/' : '') + part;
                const li = document.createElement('li');
                li.classList.add('breadcrumb-item');
                if (index === parts.length - 1) {
                    li.classList.add('active');
                    li.textContent = part;
                } else {
                    const a = document.createElement('a');
                    a.href = '#';
                    a.textContent = part;
                    const capturedPath = currentPath;
                    a.addEventListener('click', (e) => {
                        e.preventDefault();
                        loadFolderTree(spaceId, capturedPath);
                    });
                    li.appendChild(a);
                }
                ol.appendChild(li);
            });
        }
        breadcrumbNav.appendChild(ol);
    }

    async function loadDocument(spaceName, path) {
        try {
            const content = await apiClient.getDocumentContent(spaceName, path);
            documentView.innerHTML = marked.parse(content);

            folderView.classList.add('d-none');
            documentView.classList.remove('d-none');
            
            const downloadButton = document.createElement('a');
            downloadButton.href = apiClient.getDownloadUrl(spaceName, path);
            downloadButton.innerHTML = '<i class="bi bi-download"></i> Download';
            downloadButton.classList.add('btn', 'btn-sm', 'btn-success', 'mb-2');
            downloadButton.download = path.split('/').pop();
            documentView.prepend(downloadButton);

            const backButton = document.createElement('button');
            backButton.innerHTML = '<i class="bi bi-arrow-left"></i> Back';
            backButton.classList.add('btn', 'btn-sm', 'btn-outline-secondary', 'mb-2');
            backButton.addEventListener('click', () => {
                folderView.classList.remove('d-none');
                documentView.classList.add('d-none');
            });
            documentView.prepend(backButton);

            updateBreadcrumb(spacesDropdown.value, path);
        } catch (error) {
            console.error('Failed to load document:', error);
            documentView.innerHTML = '<p class="text-danger">Failed to load document.</p>';
        }
    }

    // Initial load
    const apiUrl = await apiClient.init();
    if (!apiUrl) {
        showSettingsPrompt();
    } else {
        const { authToken } = await chrome.storage.local.get('authToken');
        if (authToken) {
            showMainView();
            loadSpaces();
        } else {
            showLoginView();
        }
    }
});
