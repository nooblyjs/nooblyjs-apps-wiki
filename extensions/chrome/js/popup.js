/**
 * NooblyJS Wiki Chrome Extension - Main Popup Script
 */

// Global state
let api = new WikiAPI();
let currentSpace = null;
let currentPath = '';
let breadcrumbPath = [];
let userActivity = { recent: [], starred: [] };

// Initialize the extension
document.addEventListener('DOMContentLoaded', async () => {
  await init();
});

async function init() {
  // Try to load existing session
  const hasSession = await api.loadSession();

  if (hasSession) {
    try {
      // Check if session is still valid by checking auth
      const authStatus = await api.checkAuth();
      if (authStatus.authenticated) {
        // Load saved state
        const result = await chrome.storage.local.get(['currentSpace']);
        if (result.currentSpace) {
          currentSpace = result.currentSpace;
          showMainView();
          await loadUserActivity();
          await loadFiles(currentPath);
        } else {
          await showSpaceSelection();
        }
      } else {
        // Session expired, clear and show login
        await api.clearSession();
        showLogin();
      }
    } catch (error) {
      console.error('Session check failed:', error);
      // On error, clear session and show login
      await api.clearSession();
      showLogin();
    }
  } else {
    showLogin();
  }

  setupEventListeners();
}

function setupEventListeners() {
  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Back to spaces
  const backToSpaces = document.getElementById('backToSpaces');
  if (backToSpaces) {
    backToSpaces.addEventListener('click', showSpaceSelection);
  }

  // Back to files
  const backToFiles = document.getElementById('backToFiles');
  if (backToFiles) {
    backToFiles.addEventListener('click', () => {
      showMainView();
    });
  }

  // Star document button
  const starDocBtn = document.getElementById('starDocBtn');
  if (starDocBtn) {
    starDocBtn.addEventListener('click', handleStarDocument);
  }

  // Tab switching
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });

  // Search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        handleSearch(e.target.value);
      }, 300);
    });
  }
}

// View Management
function showView(viewId) {
  const views = document.querySelectorAll('.view');
  views.forEach(view => view.classList.add('hidden'));

  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.remove('hidden');
  }
}

function showLogin() {
  showView('loginView');
}

async function showSpaceSelection() {
  showView('spaceView');
  await loadSpaces();
}

function showMainView() {
  showView('mainView');
  updateBreadcrumb();
  switchTab('files');
}

function showDocumentViewer() {
  showView('viewerView');
}

// Login Handler
async function handleLogin(e) {
  e.preventDefault();

  const serverUrl = document.getElementById('serverUrl').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const loginBtn = document.getElementById('loginBtn');
  const btnText = loginBtn.querySelector('.btn-text');
  const spinner = loginBtn.querySelector('.spinner');
  const errorDiv = document.getElementById('loginError');

  // Show loading state
  loginBtn.disabled = true;
  btnText.textContent = 'Signing in...';
  spinner.classList.remove('hidden');
  errorDiv.classList.add('hidden');

  try {
    api = new WikiAPI(serverUrl);
    await api.login(email, password);

    // Login successful, show space selection
    await showSpaceSelection();
  } catch (error) {
    errorDiv.textContent = error.message || 'Login failed. Please check your credentials.';
    errorDiv.classList.remove('hidden');
  } finally {
    loginBtn.disabled = false;
    btnText.textContent = 'Sign In';
    spinner.classList.add('hidden');
  }
}

// Logout Handler
async function handleLogout() {
  await api.clearSession();
  currentSpace = null;
  currentPath = '';
  breadcrumbPath = [];
  showLogin();
}

// Load Spaces
async function loadSpaces() {
  const spacesList = document.getElementById('spacesList');

  try {
    const spaces = await api.getSpaces();

    if (!spaces || spaces.length === 0) {
      spacesList.innerHTML = '<div class="empty-state">No spaces available</div>';
      return;
    }

    spacesList.innerHTML = spaces.map(space => `
      <div class="space-item" data-space-id="${space.id}">
        <div class="space-icon">${getSpaceIcon(space)}</div>
        <div class="space-info">
          <div class="space-name">${escapeHtml(space.name)}</div>
          <div class="space-description">${escapeHtml(space.description || '')}</div>
        </div>
      </div>
    `).join('');

    // Add click handlers
    spacesList.querySelectorAll('.space-item').forEach(item => {
      item.addEventListener('click', () => {
        const spaceId = parseInt(item.dataset.spaceId);
        selectSpace(spaces.find(s => s.id === spaceId));
      });
    });
  } catch (error) {
    console.error('Failed to load spaces:', error);
    spacesList.innerHTML = '<div class="empty-state">Failed to load spaces</div>';
  }
}

// Select Space
async function selectSpace(space) {
  currentSpace = space;
  currentPath = '';
  breadcrumbPath = [];

  // Save selected space
  await chrome.storage.local.set({ currentSpace: space });

  // Update space name in header
  document.getElementById('spaceName').textContent = space.name;

  showMainView();
  await loadUserActivity();
  await loadFiles(currentPath);
}

// Load Files
async function loadFiles(path = '') {
  const filesList = document.getElementById('filesList');

  try {
    filesList.innerHTML = '<div class="loading">Loading...</div>';

    // Get the full tree from API
    const tree = await api.getFolders(currentSpace.id);

    console.log('API returned tree:', tree);
    console.log('Current path:', path);

    if (!tree || tree.length === 0) {
      filesList.innerHTML = '<div class="empty-state">No files or folders</div>';
      return;
    }

    // Navigate to the current folder in the tree
    let items = tree;
    if (path && path !== '') {
      const pathParts = path.split('/');
      let current = tree;

      for (const part of pathParts) {
        const folder = current.find(item => item.type === 'folder' && item.name === part);
        if (folder && folder.children) {
          current = folder.children;
        } else {
          // Path not found
          filesList.innerHTML = '<div class="empty-state">Folder not found</div>';
          return;
        }
      }

      items = current;
    }

    console.log('Current level items:', items);

    // Separate folders and files
    const folderItems = items.filter(item => item.type === 'folder');
    const fileItems = items.filter(item => item.type === 'document');

    if (folderItems.length === 0 && fileItems.length === 0) {
      filesList.innerHTML = '<div class="empty-state">Empty folder</div>';
      return;
    }

    filesList.innerHTML = [
      ...folderItems.map(folder => createFolderElement(folder)),
      ...fileItems.map(file => createFileElement(file))
    ].join('');

    // Add click handlers
    filesList.querySelectorAll('.folder-item').forEach(item => {
      item.addEventListener('click', () => {
        const folderName = item.dataset.name;
        // Append folder name to current path
        const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        navigateToFolder(newPath);
      });
    });

    filesList.querySelectorAll('.file-item').forEach(item => {
      item.addEventListener('click', () => {
        const filePath = item.dataset.path;
        openDocument(filePath);
      });
    });
  } catch (error) {
    console.error('Failed to load files:', error);
    filesList.innerHTML = '<div class="empty-state">Failed to load files</div>';
  }
}

// Navigate to Folder
function navigateToFolder(folderPath) {
  currentPath = folderPath;
  breadcrumbPath = folderPath ? folderPath.split('/') : [];
  updateBreadcrumb();
  loadFiles(currentPath);
}

// Update Breadcrumb
function updateBreadcrumb() {
  const breadcrumb = document.getElementById('breadcrumb');
  const spaceName = document.getElementById('spaceName');

  spaceName.textContent = currentSpace.name;

  // Clear existing breadcrumb items except space name
  while (breadcrumb.children.length > 1) {
    breadcrumb.removeChild(breadcrumb.lastChild);
  }

  // Add breadcrumb items
  breadcrumbPath.forEach((part, index) => {
    const item = document.createElement('button');
    item.className = 'breadcrumb-item';
    item.textContent = part;
    item.addEventListener('click', () => {
      const newPath = breadcrumbPath.slice(0, index + 1).join('/');
      navigateToFolder(newPath);
    });
    breadcrumb.appendChild(item);
  });

  // Space name click handler
  spaceName.addEventListener('click', () => {
    navigateToFolder('');
  });
}

// Open Document
async function openDocument(path) {
  try {
    const data = await api.getDocumentContent(path, currentSpace.name, true);

    const docTitle = document.getElementById('docTitle');
    const docContent = document.getElementById('docContent');

    docTitle.textContent = path.split('/').pop();
    docContent.dataset.path = path;

    // Render content based on type
    const viewer = data.metadata?.viewer || 'default';

    switch (viewer) {
      case 'markdown':
        renderMarkdown(data.content, docContent);
        break;
      case 'code':
        renderCode(data.content, data.metadata, docContent);
        break;
      case 'text':
        renderText(data.content, docContent);
        break;
      case 'image':
        renderImage(path, docContent);
        break;
      case 'pdf':
        renderPdf(path, docContent);
        break;
      default:
        renderDefault(data.metadata, docContent);
        break;
    }

    // Update star button
    updateStarButton(path);

    // Record visit
    await api.recordVisit(path, currentSpace.name, path.split('/').pop());

    showDocumentViewer();
  } catch (error) {
    console.error('Failed to open document:', error);
    alert('Failed to open document');
  }
}

// Render Markdown
function renderMarkdown(content, container) {
  if (typeof marked !== 'undefined') {
    container.innerHTML = marked.parse(content);
  } else {
    container.innerHTML = `<pre>${escapeHtml(content)}</pre>`;
  }
}

// Render Code
function renderCode(content, metadata, container) {
  const language = metadata.extension?.replace('.', '') || 'text';
  container.innerHTML = `<pre><code class="language-${language}">${escapeHtml(content)}</code></pre>`;
}

// Render Text
function renderText(content, container) {
  container.innerHTML = `<pre>${escapeHtml(content)}</pre>`;
}

// Render Image
function renderImage(path, container) {
  const imageUrl = `${api.apiBase}/documents/content?path=${encodeURIComponent(path)}&spaceName=${encodeURIComponent(currentSpace.name)}`;
  container.innerHTML = `<img src="${imageUrl}" alt="${escapeHtml(path.split('/').pop())}" style="max-width: 100%; height: auto;">`;
}

// Render PDF
function renderPdf(path, container) {
  const pdfUrl = `${api.apiBase}/documents/content?path=${encodeURIComponent(path)}&spaceName=${encodeURIComponent(currentSpace.name)}`;
  container.innerHTML = `<iframe src="${pdfUrl}" width="100%" height="500px" style="border: none;"></iframe>`;
}

// Render Default
function renderDefault(metadata, container) {
  container.innerHTML = `
    <div class="empty-state">
      <p><strong>${escapeHtml(metadata.fileName)}</strong></p>
      <p>This file type cannot be previewed.</p>
      <p>Size: ${formatFileSize(metadata.size)}</p>
    </div>
  `;
}

// Star Document
async function handleStarDocument() {
  const docContent = document.getElementById('docContent');
  const path = docContent.dataset.path;

  if (!path) return;

  try {
    const isStarred = isDocumentStarred(path);
    const action = isStarred ? 'unstar' : 'star';
    const title = path.split('/').pop();

    await api.toggleStar(path, currentSpace.name, title, action);

    // Update local state
    await loadUserActivity();
    updateStarButton(path);
  } catch (error) {
    console.error('Failed to toggle star:', error);
  }
}

// Check if document is starred
function isDocumentStarred(path) {
  return userActivity.starred.some(item =>
    item.path === path && item.spaceName === currentSpace.name
  );
}

// Update star button
function updateStarButton(path) {
  const starBtn = document.getElementById('starDocBtn');
  if (isDocumentStarred(path)) {
    starBtn.classList.add('starred');
  } else {
    starBtn.classList.remove('starred');
  }
}

// Load User Activity
async function loadUserActivity() {
  try {
    const activity = await api.getUserActivity();
    userActivity = activity;

    // Update recent and starred tabs if they're visible
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) {
      const tabName = activeTab.dataset.tab;
      if (tabName === 'recent') loadRecent();
      if (tabName === 'starred') loadStarred();
    }
  } catch (error) {
    console.error('Failed to load user activity:', error);
  }
}

// Load Recent Files
function loadRecent() {
  const recentList = document.getElementById('recentList');

  if (!userActivity.recent || userActivity.recent.length === 0) {
    recentList.innerHTML = '<div class="empty-state">No recent files</div>';
    return;
  }

  // Filter by current space
  const spaceRecent = userActivity.recent.filter(item =>
    item.spaceName === currentSpace.name || item.space === currentSpace.name
  );

  if (spaceRecent.length === 0) {
    recentList.innerHTML = '<div class="empty-state">No recent files in this space</div>';
    return;
  }

  recentList.innerHTML = spaceRecent.map(item => {
    const path = item.path;
    const title = item.title || path.split('/').pop();
    const fileType = getFileTypeInfo(path);

    return `
      <div class="file-item" data-path="${escapeHtml(path)}">
        <div class="file-icon" style="color: ${fileType.color};">
          ${fileType.icon}
        </div>
        <div class="file-info">
          <div class="file-name">${escapeHtml(title)}</div>
          <div class="file-meta">${formatDate(item.lastVisited)}</div>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers
  recentList.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', () => {
      openDocument(item.dataset.path);
    });
  });
}

// Load Starred Files
function loadStarred() {
  const starredList = document.getElementById('starredList');

  if (!userActivity.starred || userActivity.starred.length === 0) {
    starredList.innerHTML = '<div class="empty-state">No starred files</div>';
    return;
  }

  // Filter by current space
  const spaceStarred = userActivity.starred.filter(item =>
    item.spaceName === currentSpace.name
  );

  if (spaceStarred.length === 0) {
    starredList.innerHTML = '<div class="empty-state">No starred files in this space</div>';
    return;
  }

  starredList.innerHTML = spaceStarred.map(item => {
    const fileType = getFileTypeInfo(item.path);

    return `
      <div class="file-item" data-path="${escapeHtml(item.path)}">
        <div class="file-icon" style="color: ${fileType.color};">
          ${fileType.icon}
        </div>
        <div class="file-info">
          <div class="file-name">${escapeHtml(item.title)}</div>
          <div class="file-meta">Starred ${formatDate(item.starredAt)}</div>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers
  starredList.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', () => {
      openDocument(item.dataset.path);
    });
  });
}

// Handle Search
async function handleSearch(query) {
  const searchResults = document.getElementById('searchResults');

  if (!query || query.trim().length < 2) {
    searchResults.innerHTML = '<div class="empty-state">Type to search...</div>';
    return;
  }

  try {
    searchResults.innerHTML = '<div class="loading">Searching...</div>';

    const results = await api.search(query, currentSpace.name);

    if (!results || results.length === 0) {
      searchResults.innerHTML = '<div class="empty-state">No results found</div>';
      return;
    }

    searchResults.innerHTML = results.map(result => {
      const fileType = getFileTypeInfo(result.path);

      return `
        <div class="file-item" data-path="${escapeHtml(result.path)}">
          <div class="file-icon" style="color: ${fileType.color};">
            ${fileType.icon}
          </div>
          <div class="file-info">
            <div class="file-name">${escapeHtml(result.title || result.name)}</div>
            <div class="file-meta">${escapeHtml(result.excerpt || '')}</div>
          </div>
        </div>
      `;
    }).join('');

    // Add click handlers
    searchResults.querySelectorAll('.file-item').forEach(item => {
      item.addEventListener('click', () => {
        openDocument(item.dataset.path);
      });
    });
  } catch (error) {
    console.error('Search failed:', error);
    searchResults.innerHTML = '<div class="empty-state">Search failed</div>';
  }
}

// Tab Switching
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Update tab panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.add('hidden');
  });

  const activePane = document.getElementById(`${tabName}Tab`);
  if (activePane) {
    activePane.classList.remove('hidden');
  }

  // Load content for the selected tab
  switch (tabName) {
    case 'files':
      loadFiles(currentPath);
      break;
    case 'recent':
      loadRecent();
      break;
    case 'starred':
      loadStarred();
      break;
    case 'search':
      // Search is handled by input event
      break;
  }
}

// Helper Functions

function createFolderElement(folder) {
  const name = folder.name;
  const childCount = folder.children ? folder.children.length : 0;
  return `
    <div class="folder-item" data-name="${escapeHtml(name)}">
      <div class="folder-icon">
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31zM2.19 4a1 1 0 0 0-.996 1.09l.637 7a1 1 0 0 0 .995.91h10.348a1 1 0 0 0 .995-.91l.637-7A1 1 0 0 0 13.81 4H2.19z"/>
        </svg>
      </div>
      <div class="file-info">
        <div class="file-name">${escapeHtml(name)}</div>
        <div class="file-meta">${childCount} item${childCount !== 1 ? 's' : ''}</div>
      </div>
    </div>
  `;
}

function createFileElement(file) {
  const name = file.title || file.name || file.path.split('/').pop();
  const fileType = getFileTypeInfo(file.path);

  return `
    <div class="file-item" data-path="${escapeHtml(file.path)}">
      <div class="file-icon" style="color: ${fileType.color};">
        ${fileType.icon}
      </div>
      <div class="file-info">
        <div class="file-name">${escapeHtml(name)}</div>
        <div class="file-meta">${fileType.category}</div>
      </div>
    </div>
  `;
}

function getFileTypeInfo(path) {
  const ext = path.split('.').pop().toLowerCase();

  const typeMap = {
    // Documents
    md: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/><path d="M11.85 8.72h-.99l-1.52 2.27-1.52-2.27h-.99v4.02h.71v-2.75l1.52 2.28h.06l1.52-2.28v2.75h.71V8.72z"/></svg>',
      color: '#0052cc',
      category: 'Markdown'
    },
    txt: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M5 4a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm-.5 2.5A.5.5 0 0 1 5 6h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zM5 8a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm0 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1H5z"/><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm10-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z"/></svg>',
      color: '#6c757d',
      category: 'Text'
    },
    pdf: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/><path d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.697 19.697 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.712 5.712 0 0 1-.911-.95 11.651 11.651 0 0 0-1.997.406 11.307 11.307 0 0 1-1.02 1.51c-.292.35-.609.656-.927.787a.793.793 0 0 1-.58.029zm1.379-1.901c-.166.076-.32.156-.459.238-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361.01.022.02.036.026.044a.266.266 0 0 0 .035-.012c.137-.056.355-.235.635-.572a8.18 8.18 0 0 0 .45-.606zm1.64-1.33a12.71 12.71 0 0 1 1.01-.193 11.744 11.744 0 0 1-.51-.858 20.801 20.801 0 0 1-.5 1.05zm2.446.45c.15.163.296.3.435.41.24.19.407.253.498.256a.107.107 0 0 0 .07-.015.307.307 0 0 0 .094-.125.436.436 0 0 0 .059-.2.095.095 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a3.876 3.876 0 0 0-.612-.053zM8.078 7.8a6.7 6.7 0 0 0 .2-.828c.031-.188.043-.343.038-.465a.613.613 0 0 0-.032-.198.517.517 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.046.822.024.111.054.227.09.346z"/></svg>',
      color: '#dc3545',
      category: 'PDF'
    },

    // Code
    js: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 8a5.5 5.5 0 0 1 8.25-4.764.5.5 0 0 0 .5-.866A6.5 6.5 0 1 0 14.5 8a.5.5 0 0 0-1 0 5.5 5.5 0 1 1-11 0z"/><path d="M15.354 3.354a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l7-7z"/></svg>',
      color: '#f0db4f',
      category: 'JavaScript'
    },
    ts: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 8a5.5 5.5 0 0 1 8.25-4.764.5.5 0 0 0 .5-.866A6.5 6.5 0 1 0 14.5 8a.5.5 0 0 0-1 0 5.5 5.5 0 1 1-11 0z"/><path d="M15.354 3.354a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l7-7z"/></svg>',
      color: '#3178c6',
      category: 'TypeScript'
    },
    jsx: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 8a5.5 5.5 0 0 1 8.25-4.764.5.5 0 0 0 .5-.866A6.5 6.5 0 1 0 14.5 8a.5.5 0 0 0-1 0 5.5 5.5 0 1 1-11 0z"/><path d="M15.354 3.354a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l7-7z"/></svg>',
      color: '#61dafb',
      category: 'React'
    },
    tsx: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 8a5.5 5.5 0 0 1 8.25-4.764.5.5 0 0 0 .5-.866A6.5 6.5 0 1 0 14.5 8a.5.5 0 0 0-1 0 5.5 5.5 0 1 1-11 0z"/><path d="M15.354 3.354a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l7-7z"/></svg>',
      color: '#61dafb',
      category: 'React'
    },
    py: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>',
      color: '#3776ab',
      category: 'Python'
    },
    java: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>',
      color: '#007396',
      category: 'Java'
    },
    c: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/></svg>',
      color: '#a8b9cc',
      category: 'C'
    },
    cpp: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/></svg>',
      color: '#00599c',
      category: 'C++'
    },
    css: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2h-1v-1h1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5L14 4.5zM3.517 14.841a1.13 1.13 0 0 0 .401.823c.13.108.289.192.478.252.19.061.411.091.665.091.338 0 .624-.053.859-.158.236-.105.416-.252.539-.44.125-.189.187-.408.187-.656 0-.224-.045-.41-.134-.56a1.001 1.001 0 0 0-.375-.357 2.027 2.027 0 0 0-.566-.21l-.621-.144a.97.97 0 0 1-.404-.176.37.37 0 0 1-.144-.299c0-.156.062-.284.185-.384.125-.101.296-.152.512-.152.143 0 .266.023.37.068a.624.624 0 0 1 .246.181.56.56 0 0 1 .12.258h.75a1.092 1.092 0 0 0-.2-.566 1.21 1.21 0 0 0-.5-.41 1.813 1.813 0 0 0-.78-.152c-.293 0-.551.05-.776.15-.225.099-.4.24-.527.421-.127.182-.19.395-.19.639 0 .201.04.376.122.524.082.149.2.27.352.367.152.095.332.167.539.213l.618.144c.207.049.361.113.463.193a.387.387 0 0 1 .152.326.505.505 0 0 1-.085.29.559.559 0 0 1-.255.193c-.111.047-.249.07-.413.07-.117 0-.223-.013-.32-.04a.838.838 0 0 1-.248-.115.578.578 0 0 1-.255-.384h-.765ZM.806 13.693c0-.248.034-.46.102-.633a.868.868 0 0 1 .302-.399.814.814 0 0 1 .475-.137c.15 0 .283.032.398.097a.7.7 0 0 1 .272.26.85.85 0 0 1 .12.381h.765v-.072a1.33 1.33 0 0 0-.466-.964 1.441 1.441 0 0 0-.489-.272 1.838 1.838 0 0 0-.606-.097c-.356 0-.66.074-.911.223-.25.148-.44.359-.572.632-.13.274-.196.6-.196.979v.498c0 .379.064.704.193.976.131.271.322.48.572.626.25.145.554.217.914.217.293 0 .554-.055.785-.164.23-.11.414-.26.55-.454a1.27 1.27 0 0 0 .226-.674v-.076h-.764a.799.799 0 0 1-.118.363.7.7 0 0 1-.272.25.874.874 0 0 1-.401.087.845.845 0 0 1-.478-.132.833.833 0 0 1-.299-.392 1.699 1.699 0 0 1-.102-.627v-.495Zm8.239 2.238h-.953l-1.338-3.999h.917l.896 3.138h.038l.888-3.138h.879l-1.327 3.999Z"/></svg>',
      color: '#264de4',
      category: 'CSS'
    },
    html: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M14 4.5V11h-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-9.736 7.35v3.999h-.791v-1.714H1.79v1.714H1V11.85h.791v1.626h1.682V11.85h.79zm2.251.662v3.337h-.794v-3.337H4.588v-.662h3.064v.662H6.515zm2.176 3.337v-2.66h.038l.952 2.159h.516l.946-2.16h.038v2.661h.715V11.85h-.8l-1.14 2.596H9.93L8.79 11.85h-.805v3.999h.706zm4.71-.674h1.696v.674H12.61V11.85h.79v3.325z"/></svg>',
      color: '#e34c26',
      category: 'HTML'
    },
    json: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8.5 7v1.5h.5A1.5 1.5 0 0 0 10.5 7V1.5A1.5 1.5 0 0 0 9 0H1.5A1.5 1.5 0 0 0 0 1.5V7a1.5 1.5 0 0 0 1.5 1.5h.5v7.5A1.5 1.5 0 0 0 3.5 17h9a1.5 1.5 0 0 0 1.5-1.5V8.5A1.5 1.5 0 0 0 12.5 7h-.5zm-2-6v8.5a.5.5 0 0 1-.5.5H3v-7h2V1zm6 0v8.5a.5.5 0 0 0 .5.5h3v-7h-2V1z"/><path d="M14 14.5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v9z"/></svg>',
      color: '#000000',
      category: 'JSON'
    },
    xml: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/><path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/></svg>',
      color: '#e34c26',
      category: 'XML'
    },

    // Images
    png: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/></svg>',
      color: '#17a2b8',
      category: 'Image'
    },
    jpg: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/></svg>',
      color: '#17a2b8',
      category: 'Image'
    },
    jpeg: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/></svg>',
      color: '#17a2b8',
      category: 'Image'
    },
    gif: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/></svg>',
      color: '#17a2b8',
      category: 'Image'
    },
    svg: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/></svg>',
      color: '#ff9900',
      category: 'Image'
    },

    // Default
    default: {
      icon: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/></svg>',
      color: '#6c757d',
      category: 'File'
    }
  };

  return typeMap[ext] || typeMap.default;
}

function getSpaceIcon(space) {
  const typeMap = {
    personal: '<svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/></svg>',
    shared: '<svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path fill-rule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/><path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>',
    readonly: '<svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/></svg>',
    team: '<svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path fill-rule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/><path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>',
    public: '<svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5H3.82zm6.853 3.472A7.024 7.024 0 0 0 13.745 12H11.91a9.27 9.27 0 0 1-.64 1.539 6.688 6.688 0 0 1-.597.933zM8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855.173-.324.33-.682.468-1.068H8.5zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.65 13.65 0 0 1-.312 2.5zm2.802-3.5a6.959 6.959 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5h2.49zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7.024 7.024 0 0 0-3.072-2.472c.218.284.418.598.597.933zM10.855 4a7.966 7.966 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4h2.355z"/></svg>'
  };

  return typeMap[space.type] || '<svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31zM2.19 4a1 1 0 0 0-.996 1.09l.637 7a1 1 0 0 0 .995.91h10.348a1 1 0 0 0 .995-.91l.637-7A1 1 0 0 0 13.81 4H2.19z"/></svg>';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
