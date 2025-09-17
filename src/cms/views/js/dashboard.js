/**
 * CMS Dashboard JavaScript
 * Handles dashboard interactions, API calls, and real-time updates
 */

class CMSDashboard {
    constructor() {
        this.apiBase = '/applications/cms/api';
        this.init();
    }

    init() {
        this.bindEvents();
        this.startPeriodicUpdates();
    }

    bindEvents() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }

        // Mobile menu toggle
        const menuToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        // Search functionality
        const searchInput = document.getElementById('dashboard-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    async refreshDashboard() {
        try {
            await this.loadDashboardData();
            this.showNotification('Dashboard refreshed successfully', 'success');
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            this.showNotification('Failed to refresh dashboard', 'error');
        }
    }

    async loadDashboardData() {
        const promises = [
            this.loadStats(),
            this.loadRecentSites(),
            this.loadRecentActivity(),
            this.loadSystemStatus()
        ];

        const results = await Promise.allSettled(promises);

        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`Dashboard data load failed for promise ${index}:`, result.reason);
            }
        });
    }

    async loadStats() {
        try {
            const response = await this.apiCall('/dashboard/stats');
            this.updateStats(response);
        } catch (error) {
            console.error('Error loading stats:', error);
            this.showStatsError();
        }
    }

    async loadRecentSites() {
        try {
            const response = await this.apiCall('/sites?limit=5&sort=updatedAt&order=desc');
            this.updateRecentSites(response);
        } catch (error) {
            console.error('Error loading recent sites:', error);
            this.showRecentSitesError();
        }
    }

    async loadRecentActivity() {
        try {
            // In a real implementation, you'd have an activity log endpoint
            const mockActivity = [
                {
                    id: 1,
                    type: 'site_created',
                    message: 'New site "Portfolio" created',
                    timestamp: new Date().toISOString(),
                    icon: 'fas fa-plus-circle'
                },
                {
                    id: 2,
                    type: 'site_published',
                    message: 'Site "Business Site" published',
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    icon: 'fas fa-globe'
                }
            ];
            this.updateRecentActivity(mockActivity);
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    async loadSystemStatus() {
        try {
            const response = await this.apiCall('/status');
            this.updateSystemStatus(response);
        } catch (error) {
            console.error('Error loading system status:', error);
            this.showSystemStatusError();
        }
    }

    updateStats(stats) {
        const elements = {
            'total-sites': stats.totalSites || 0,
            'published-sites': stats.publishedSites || 0,
            'total-pages': stats.totalPages || 0,
            'total-assets': stats.totalAssets || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                this.animateCounter(element, parseInt(element.textContent) || 0, value);
            }
        });

        // Update storage usage
        const storageElement = document.getElementById('storage-usage');
        if (storageElement && stats.storageUsed !== undefined) {
            const storageUsage = Math.round((stats.storageUsed || 0) / 1024 / 1024);
            storageElement.textContent = `${storageUsage} MB`;
        }
    }

    updateRecentSites(sites) {
        const container = document.getElementById('recent-sites');
        if (!container) return;

        if (!sites || sites.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <p>No sites yet. <a href="/applications/cms/sites/new" class="create-site-link">Create your first site</a></p>
                </div>
            `;
            return;
        }

        container.innerHTML = sites.map(site => this.createSiteCard(site)).join('');
    }

    createSiteCard(site) {
        const statusClass = this.getStatusClass(site.status);
        const lastUpdated = this.formatRelativeTime(site.updatedAt);

        return `
            <div class="site-item" data-site-id="${site.id}">
                <div class="site-info">
                    <h4>${this.escapeHtml(site.name)}</h4>
                    <p>${this.escapeHtml(site.settings?.description || 'No description')}</p>
                    <div class="site-meta">
                        <span class="site-status status-${site.status}">${site.status}</span>
                        <span class="site-updated">Updated ${lastUpdated}</span>
                    </div>
                </div>
                <div class="site-actions">
                    <a href="/applications/cms/sites/${site.id}/edit" class="btn btn-sm">
                        <i class="fas fa-edit"></i> Edit
                    </a>
                    ${this.createSiteActionButton(site)}
                </div>
            </div>
        `;
    }

    createSiteActionButton(site) {
        if (site.status === 'published') {
            return `
                <a href="${site.url || '#'}" class="btn btn-sm btn-outline" target="_blank">
                    <i class="fas fa-external-link-alt"></i> View
                </a>
            `;
        } else {
            return `
                <button class="btn btn-sm btn-outline" onclick="dashboard.publishSite('${site.id}')">
                    <i class="fas fa-rocket"></i> Publish
                </button>
            `;
        }
    }

    updateRecentActivity(activities) {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        if (!activities || activities.length === 0) {
            container.innerHTML = `
                <div class="activity-item">
                    <i class="fas fa-info-circle activity-icon"></i>
                    <div class="activity-content">
                        <p><strong>Welcome!</strong> Your CMS is ready to use.</p>
                        <span class="activity-time">Just now</span>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => this.createActivityItem(activity)).join('');
    }

    createActivityItem(activity) {
        const timeAgo = this.formatRelativeTime(activity.timestamp);

        return `
            <div class="activity-item">
                <i class="${activity.icon || 'fas fa-info-circle'} activity-icon"></i>
                <div class="activity-content">
                    <p>${this.escapeHtml(activity.message)}</p>
                    <span class="activity-time">${timeAgo}</span>
                </div>
            </div>
        `;
    }

    updateSystemStatus(status) {
        const statusElements = {
            'cms-service': status.status === 'running' ? 'online' : 'offline',
            'site-builder': status.features?.siteBuilder ? 'online' : 'offline',
            'asset-manager': status.features?.assetManager ? 'online' : 'offline'
        };

        Object.entries(statusElements).forEach(([id, status]) => {
            const element = document.getElementById(id);
            if (element) {
                element.className = `status-indicator status-${status}`;
                element.innerHTML = `<i class="fas fa-circle"></i> ${status === 'online' ? 'Online' : 'Offline'}`;
            }
        });
    }

    async publishSite(siteId) {
        try {
            this.showNotification('Publishing site...', 'info');

            const response = await this.apiCall(`/sites/${siteId}/publish`, {
                method: 'POST'
            });

            if (response.success) {
                this.showNotification('Site published successfully!', 'success');
                await this.loadRecentSites(); // Refresh the sites list
            } else {
                throw new Error(response.error || 'Failed to publish site');
            }
        } catch (error) {
            console.error('Error publishing site:', error);
            this.showNotification(error.message || 'Failed to publish site', 'error');
        }
    }

    async handleSearch(query) {
        if (!query || query.length < 2) {
            this.hideSearchResults();
            return;
        }

        try {
            const response = await this.apiCall(`/search?q=${encodeURIComponent(query)}&limit=10`);
            this.showSearchResults(response);
        } catch (error) {
            console.error('Search error:', error);
            this.hideSearchResults();
        }
    }

    showSearchResults(results) {
        // Implementation for search results display
        console.log('Search results:', results);
    }

    hideSearchResults() {
        // Implementation for hiding search results
    }

    handleKeyboardShortcuts(e) {
        // Cmd/Ctrl + K for search
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('dashboard-search');
            if (searchInput) {
                searchInput.focus();
            }
        }

        // Cmd/Ctrl + N for new site
        if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
            e.preventDefault();
            window.location.href = '/applications/cms/sites/new';
        }

        // Escape to close search
        if (e.key === 'Escape') {
            const searchInput = document.getElementById('dashboard-search');
            if (searchInput && document.activeElement === searchInput) {
                searchInput.blur();
                this.hideSearchResults();
            }
        }
    }

    animateCounter(element, start, end, duration = 1000) {
        const range = end - start;
        const increment = end > start ? 1 : -1;
        const stepTime = Math.abs(Math.floor(duration / range));
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            element.textContent = current;

            if (current === end) {
                clearInterval(timer);
            }
        }, stepTime);
    }

    formatRelativeTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);

        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;

        return time.toLocaleDateString();
    }

    getStatusClass(status) {
        const statusClasses = {
            'published': 'status-published',
            'draft': 'status-draft',
            'error': 'status-error',
            'generating': 'status-generating'
        };
        return statusClasses[status] || 'status-unknown';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${this.escapeHtml(message)}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    showStatsError() {
        const statCards = document.querySelectorAll('.stat-card h3');
        statCards.forEach(card => {
            card.textContent = '--';
            card.style.color = '#ef4444';
        });
    }

    showRecentSitesError() {
        const container = document.getElementById('recent-sites');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <p>Failed to load recent sites</p>
                    <button onclick="dashboard.loadRecentSites()" class="btn btn-sm">Retry</button>
                </div>
            `;
        }
    }

    showSystemStatusError() {
        const statusElements = document.querySelectorAll('.status-indicator');
        statusElements.forEach(element => {
            element.className = 'status-indicator status-error';
            element.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
        });
    }

    async apiCall(endpoint, options = {}) {
        const url = `${this.apiBase}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const response = await fetch(url, { ...defaultOptions, ...options });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Network error' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    startPeriodicUpdates() {
        // Refresh dashboard data every 5 minutes
        setInterval(() => {
            this.loadDashboardData();
        }, 5 * 60 * 1000);

        // Update relative times every minute
        setInterval(() => {
            this.updateRelativeTimes();
        }, 60 * 1000);
    }

    updateRelativeTimes() {
        const timeElements = document.querySelectorAll('[data-timestamp]');
        timeElements.forEach(element => {
            const timestamp = element.getAttribute('data-timestamp');
            if (timestamp) {
                element.textContent = this.formatRelativeTime(timestamp);
            }
        });
    }
}

// Initialize dashboard when DOM is loaded
let dashboard;
document.addEventListener('DOMContentLoaded', function() {
    dashboard = new CMSDashboard();
});

// Global functions for onclick handlers
window.dashboard = {
    publishSite: (siteId) => dashboard.publishSite(siteId),
    refreshDashboard: () => dashboard.refreshDashboard()
};