/**
 * API Client for NooblyJS Wiki Chrome Extension
 * Handles all communication with the wiki backend
 */

class WikiAPI {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || 'http://localhost:3002';
    this.apiBase = `${this.baseUrl}/applications/wiki/api`;
    this.sessionId = null;
  }

  /**
   * Set the session ID for authenticated requests
   */
  setSession(sessionId) {
    this.sessionId = sessionId;
  }

  /**
   * Make an authenticated request
   */
  async request(endpoint, options = {}) {
    const url = `${this.apiBase}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'  // This will automatically send cookies
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Save session to chrome storage
   */
  async saveSession() {
    await chrome.storage.local.set({
      serverUrl: this.baseUrl,
      isAuthenticated: true,
      lastLogin: new Date().toISOString()
    });
  }

  /**
   * Load session from chrome storage
   */
  async loadSession() {
    const result = await chrome.storage.local.get(['serverUrl', 'isAuthenticated']);
    if (result.serverUrl) {
      this.baseUrl = result.serverUrl;
      this.apiBase = `${this.baseUrl}/applications/wiki/api`;
    }
    return !!result.isAuthenticated;
  }

  /**
   * Clear session
   */
  async clearSession() {
    await chrome.storage.local.remove(['isAuthenticated', 'serverUrl', 'currentSpace', 'currentPath', 'lastLogin']);
  }

  /**
   * Login with username and password
   */
  async login(email, password) {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'  // Browser will store the session cookie automatically
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login failed');
      }

      // Save authentication state (cookies are handled by browser)
      await this.saveSession();

      return data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Check authentication status
   */
  async checkAuth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/check`, {
        credentials: 'include'
      });
      return await response.json();
    } catch (error) {
      return { authenticated: false };
    }
  }

  /**
   * Get all spaces
   */
  async getSpaces() {
    return await this.request('/spaces');
  }

  /**
   * Get folders for a space
   */
  async getFolders(spaceId, path = '') {
    const endpoint = path
      ? `/spaces/${spaceId}/folders?path=${encodeURIComponent(path)}`
      : `/spaces/${spaceId}/folders`;
    return await this.request(endpoint);
  }

  /**
   * Get document content
   */
  async getDocumentContent(path, spaceName, enhanced = true) {
    const endpoint = `/documents/content?path=${encodeURIComponent(path)}&spaceName=${encodeURIComponent(spaceName)}${enhanced ? '&enhanced=true' : ''}`;
    return await this.request(endpoint);
  }

  /**
   * Search documents
   */
  async search(query, spaceName = null) {
    let endpoint = `/search?q=${encodeURIComponent(query)}&includeContent=false`;
    if (spaceName) {
      endpoint += `&spaceName=${encodeURIComponent(spaceName)}`;
    }
    return await this.request(endpoint);
  }

  /**
   * Get user activity (recent files)
   */
  async getUserActivity() {
    return await this.request('/user/activity');
  }

  /**
   * Toggle star on a document
   */
  async toggleStar(path, spaceName, title, action = 'star') {
    return await this.request('/user/star', {
      method: 'POST',
      body: JSON.stringify({ path, spaceName, title, action })
    });
  }

  /**
   * Record document visit
   */
  async recordVisit(path, spaceName, title) {
    return await this.request('/user/visit', {
      method: 'POST',
      body: JSON.stringify({ path, spaceName, title, action: 'viewed' })
    });
  }
}

// Export for use in popup.js
window.WikiAPI = WikiAPI;
