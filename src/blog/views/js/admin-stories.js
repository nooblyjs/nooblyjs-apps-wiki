/**
 * @fileoverview Admin Stories Interface
 * Handles the Medium.com-style admin interface for managing blog posts,
 * including drafts, published posts, and comment moderation.
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-09-16
 */

class AdminStoriesApp {
    constructor() {
        this.currentTab = 'drafts';
        this.posts = [];
        this.comments = [];
        this.selectedStory = null;
        this.isLoading = false;
        this.isAuthenticated = false;

        this.init();
    }

    async init() {
        try {
            await this.checkAuthentication();
            if (!this.isAuthenticated) {
                window.location.href = '/applications/blog';
                return;
            }

            this.bindEvents();
            await this.loadPosts();
            await this.loadComments();
        } catch (error) {
            console.error('Error initializing admin app:', error);
            this.showError('Failed to load admin interface. Please refresh the page.');
        }
    }

    async checkAuthentication() {
        try {
            const response = await fetch('/applications/blog/api/auth/check');
            const data = await response.json();
            this.isAuthenticated = data.authenticated;
        } catch (error) {
            console.error('Error checking authentication:', error);
            this.isAuthenticated = false;
        }
    }

    bindEvents() {
        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn') || e.target.closest('.tab-btn')) {
                const tabBtn = e.target.classList.contains('tab-btn') ? e.target : e.target.closest('.tab-btn');
                const tab = tabBtn.dataset.tab;
                if (tab && tab !== this.currentTab) {
                    this.switchTab(tab);
                }
            }

            // Story actions
            if (e.target.classList.contains('story-action-btn')) {
                e.stopPropagation();
                const storyId = e.target.closest('.story-item').dataset.storyId;
                const action = e.target.dataset.action;
                this.handleStoryAction(storyId, action);
            }
        });

        // Import button
        const importBtn = document.querySelector('.import-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.showImportModal();
            });
        }

        // Mobile menu toggle
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }
    }

    switchTab(tab) {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeTab = document.querySelector(`[data-tab="${tab}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        this.currentTab = tab;
        this.filterAndRenderPosts();
    }

    async loadPosts() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();

        try {
            const response = await fetch('/applications/blog/api/admin/posts');
            if (!response.ok) {
                throw new Error('Failed to fetch posts');
            }

            this.posts = await response.json();
            this.updateTabCounts();
            this.filterAndRenderPosts();
        } catch (error) {
            console.error('Error loading posts:', error);
            this.showError('Failed to load posts.');
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    async loadComments() {
        try {
            const response = await fetch('/applications/blog/api/admin/comments?status=all');
            if (response.ok) {
                const data = await response.json();
                this.comments = data.comments || [];
                this.commentStats = data.stats || {};
                this.updateCommentCounts();
            }
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    updateTabCounts() {
        const draftsCount = this.posts.filter(post => post.status === 'draft').length;
        const publishedCount = this.posts.filter(post => post.status === 'published').length;
        const unlistedCount = this.posts.filter(post => post.visibility === 'private').length;

        const draftsCountEl = document.getElementById('draftsCount');
        const publishedCountEl = document.getElementById('publishedCount');
        const unlistedCountEl = document.getElementById('unlistedCount');

        if (draftsCountEl) draftsCountEl.textContent = draftsCount;
        if (publishedCountEl) publishedCountEl.textContent = publishedCount;
        if (unlistedCountEl) unlistedCountEl.textContent = unlistedCount;
    }

    updateCommentCounts() {
        const pendingCount = this.comments.filter(comment => comment.status === 'pending').length;
        const approvedCount = this.comments.filter(comment => comment.status === 'approved').length;

        const pendingCountEl = document.getElementById('pendingCommentsCount');
        const approvedCountEl = document.getElementById('approvedCommentsCount');

        if (pendingCountEl) pendingCountEl.textContent = pendingCount;
        if (approvedCountEl) approvedCountEl.textContent = approvedCount;
    }

    filterAndRenderPosts() {
        let filteredPosts = [];

        switch (this.currentTab) {
            case 'drafts':
                filteredPosts = this.posts.filter(post => post.status === 'draft');
                break;
            case 'published':
                filteredPosts = this.posts.filter(post => post.status === 'published');
                break;
            case 'unlisted':
                filteredPosts = this.posts.filter(post => post.visibility === 'private');
                break;
            case 'submissions':
                // For now, submissions are empty
                filteredPosts = [];
                break;
            default:
                filteredPosts = this.posts;
        }

        this.renderPosts(filteredPosts);
    }

    renderPosts(posts) {
        const storiesList = document.getElementById('storiesList');
        const emptyState = document.getElementById('emptyState');

        if (!storiesList || !emptyState) return;

        if (posts.length === 0) {
            storiesList.classList.add('hidden');
            emptyState.classList.remove('hidden');
            this.updateEmptyStateMessage();
        } else {
            emptyState.classList.add('hidden');
            storiesList.classList.remove('hidden');
            storiesList.innerHTML = posts.map(post => this.createStoryElement(post)).join('');
        }
    }

    updateEmptyStateMessage() {
        const emptyState = document.getElementById('emptyState');
        if (!emptyState) return;

        let message = '';
        switch (this.currentTab) {
            case 'drafts':
                message = `
                    <h2>You have no stories in draft.</h2>
                    <p>Why not <a href="/applications/blog/admin/write" class="start-writing-link">start writing one?</a></p>
                `;
                break;
            case 'published':
                message = `
                    <h2>You have no published stories.</h2>
                    <p>Write your first story and share it with the world!</p>
                `;
                break;
            case 'unlisted':
                message = `
                    <h2>You have no unlisted stories.</h2>
                    <p>Unlisted stories are not shown on your profile but can be shared via direct link.</p>
                `;
                break;
            case 'submissions':
                message = `
                    <h2>No submissions yet.</h2>
                    <p>Submissions from publications will appear here.</p>
                `;
                break;
        }

        emptyState.innerHTML = `<div class="empty-state-content">${message}</div>`;
    }

    createStoryElement(post) {
        const excerpt = post.excerpt || '';
        const thumbnail = post.featuredImage || '';
        const lastModified = this.formatDate(post.updatedAt);
        const statusIcon = this.getStatusIcon(post.status);
        const statusClass = `status-${post.status}`;

        return `
            <div class="story-item" data-story-id="${post.id}">
                <div class="story-content">
                    <a href="/applications/blog/admin/write?id=${post.id}" class="story-title">
                        ${post.title}
                    </a>
                    ${excerpt ? `<div class="story-excerpt">${excerpt}</div>` : ''}
                    <div class="story-meta">
                        <div class="story-status ${statusClass}">
                            <i class="${statusIcon}"></i>
                            <span>${post.status.charAt(0).toUpperCase() + post.status.slice(1)}</span>
                        </div>
                        <span>Last edited ${lastModified}</span>
                        ${post.viewCount ? `<span>${post.viewCount} views</span>` : ''}
                        ${post.commentCount ? `<span>${post.commentCount} responses</span>` : ''}
                    </div>
                </div>
                <div class="story-actions">
                    <button class="story-action-btn" data-action="edit" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="story-action-btn" data-action="more" title="More options">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                </div>
                ${thumbnail ? `
                    <div class="story-thumbnail">
                        <img src="${thumbnail}" alt="${post.title}">
                    </div>
                ` : `
                    <div class="story-thumbnail no-image">
                        <i class="fas fa-image"></i>
                    </div>
                `}
            </div>
        `;
    }

    getStatusIcon(status) {
        switch (status) {
            case 'draft':
                return 'fas fa-edit';
            case 'published':
                return 'fas fa-globe';
            case 'scheduled':
                return 'fas fa-clock';
            case 'archived':
                return 'fas fa-archive';
            default:
                return 'fas fa-file';
        }
    }

    handleStoryAction(storyId, action) {
        this.selectedStory = this.posts.find(post => post.id == storyId);
        if (!this.selectedStory) return;

        switch (action) {
            case 'edit':
                this.editStory();
                break;
            case 'more':
                this.showStoryActionModal();
                break;
        }
    }

    showStoryActionModal() {
        const modal = document.getElementById('storyActionModal');
        const modalTitle = document.getElementById('modalTitle');

        if (modal && modalTitle && this.selectedStory) {
            modalTitle.textContent = this.selectedStory.title;
            modal.classList.remove('hidden');
        }
    }

    closeStoryActionModal() {
        const modal = document.getElementById('storyActionModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.selectedStory = null;
    }

    editStory() {
        if (this.selectedStory) {
            window.location.href = `/applications/blog/admin/write?id=${this.selectedStory.id}`;
        }
    }

    previewStory() {
        if (this.selectedStory) {
            window.open(`/applications/blog/posts/${this.selectedStory.slug}`, '_blank');
        }
    }

    async publishStory() {
        if (!this.selectedStory) return;

        try {
            const response = await fetch(`/applications/blog/api/admin/posts/${this.selectedStory.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'published',
                    publishedAt: new Date().toISOString()
                })
            });

            if (response.ok) {
                this.closeStoryActionModal();
                await this.loadPosts();
                this.showSuccess('Story published successfully!');
            } else {
                throw new Error('Failed to publish story');
            }
        } catch (error) {
            console.error('Error publishing story:', error);
            this.showError('Failed to publish story.');
        }
    }

    async duplicateStory() {
        if (!this.selectedStory) return;

        try {
            const duplicatedPost = {
                ...this.selectedStory,
                title: `Copy of ${this.selectedStory.title}`,
                slug: `copy-of-${this.selectedStory.slug}`,
                status: 'draft',
                publishedAt: null
            };

            delete duplicatedPost.id;
            delete duplicatedPost.createdAt;
            delete duplicatedPost.viewCount;
            delete duplicatedPost.likeCount;
            delete duplicatedPost.commentCount;

            const response = await fetch('/applications/blog/api/admin/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(duplicatedPost)
            });

            if (response.ok) {
                this.closeStoryActionModal();
                await this.loadPosts();
                this.showSuccess('Story duplicated successfully!');
            } else {
                throw new Error('Failed to duplicate story');
            }
        } catch (error) {
            console.error('Error duplicating story:', error);
            this.showError('Failed to duplicate story.');
        }
    }

    async deleteStory() {
        if (!this.selectedStory) return;

        if (confirm(`Are you sure you want to delete "${this.selectedStory.title}"? This action cannot be undone.`)) {
            try {
                const response = await fetch(`/applications/blog/api/admin/posts/${this.selectedStory.id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    this.closeStoryActionModal();
                    await this.loadPosts();
                    this.showSuccess('Story deleted successfully!');
                } else {
                    throw new Error('Failed to delete story');
                }
            } catch (error) {
                console.error('Error deleting story:', error);
                this.showError('Failed to delete story.');
            }
        }
    }

    showImportModal() {
        const modal = document.getElementById('importModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    closeImportModal() {
        const modal = document.getElementById('importModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    importFromUrl() {
        const url = prompt('Enter the URL to import from:');
        if (url) {
            // Placeholder for URL import functionality
            alert('URL import feature coming soon!');
        }
        this.closeImportModal();
    }

    uploadFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md,.txt,.html';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                // Placeholder for file upload functionality
                alert('File upload feature coming soon!');
            }
        };
        input.click();
        this.closeImportModal();
    }

    showCommentsModal() {
        const modal = document.getElementById('commentsModal');
        if (modal) {
            modal.classList.remove('hidden');
            this.renderComments('pending');
        }
    }

    closeCommentsModal() {
        const modal = document.getElementById('commentsModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    renderComments(tab) {
        const commentsList = document.getElementById('commentsList');
        if (!commentsList) return;

        const filteredComments = this.comments.filter(comment => comment.status === tab);

        if (filteredComments.length === 0) {
            commentsList.innerHTML = `
                <div class="empty-state">
                    <h3>No ${tab} comments</h3>
                    <p>${tab === 'pending' ? 'All comments have been moderated.' : 'No approved comments yet.'}</p>
                </div>
            `;
            return;
        }

        commentsList.innerHTML = filteredComments.map(comment => `
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <span class="comment-author">${comment.authorName}</span>
                    <span class="comment-date">${this.formatDate(comment.createdAt)}</span>
                </div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-post-title">On: ${comment.postTitle}</div>
                ${comment.status === 'pending' ? `
                    <div class="comment-actions">
                        <button class="comment-action-btn approve-btn" onclick="approveComment(${comment.id})">
                            Approve
                        </button>
                        <button class="comment-action-btn reject-btn" onclick="rejectComment(${comment.id})">
                            Reject
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    async approveComment(commentId) {
        try {
            const response = await fetch(`/applications/blog/api/admin/comments/${commentId}/moderate`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'approve' })
            });

            if (response.ok) {
                await this.loadComments();
                this.renderComments('pending');
                this.showSuccess('Comment approved!');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to approve comment');
            }
        } catch (error) {
            console.error('Error approving comment:', error);
            this.showError(error.message || 'Failed to approve comment.');
        }
    }

    async rejectComment(commentId) {
        try {
            const response = await fetch(`/applications/blog/api/admin/comments/${commentId}/moderate`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'reject' })
            });

            if (response.ok) {
                await this.loadComments();
                this.renderComments('pending');
                this.showSuccess('Comment rejected!');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to reject comment');
            }
        } catch (error) {
            console.error('Error rejecting comment:', error);
            this.showError(error.message || 'Failed to reject comment.');
        }
    }

    async markCommentAsSpam(commentId) {
        try {
            const response = await fetch(`/applications/blog/api/admin/comments/${commentId}/moderate`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'spam' })
            });

            if (response.ok) {
                await this.loadComments();
                this.renderComments('pending');
                this.showSuccess('Comment marked as spam!');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to mark comment as spam');
            }
        } catch (error) {
            console.error('Error marking comment as spam:', error);
            this.showError(error.message || 'Failed to mark comment as spam.');
        }
    }

    async deleteComment(commentId) {
        if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/applications/blog/api/admin/comments/${commentId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadComments();
                this.renderComments('pending');
                this.showSuccess('Comment deleted!');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete comment');
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            this.showError(error.message || 'Failed to delete comment.');
        }
    }

    toggleMobileMenu() {
        const sidebar = document.querySelector('.admin-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    }

    showLoading() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.classList.add('hidden');
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Create or update notification element
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 6px;
                z-index: 2000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                color: white;
                font-size: 14px;
                font-weight: 500;
                max-width: 300px;
            `;
            document.body.appendChild(notification);
        }

        // Set color based on type
        switch (type) {
            case 'error':
                notification.style.backgroundColor = '#dc3545';
                break;
            case 'success':
                notification.style.backgroundColor = '#28a745';
                break;
            default:
                notification.style.backgroundColor = '#17a2b8';
        }

        notification.textContent = message;
        notification.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (notification) {
                notification.style.display = 'none';
            }
        }, 5000);
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';

        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return 'yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} month${months > 1 ? 's' : ''} ago`;
        } else {
            const years = Math.floor(diffDays / 365);
            return `${years} year${years > 1 ? 's' : ''} ago`;
        }
    }
}

// Global functions for UI interactions
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function closeStoryActionModal() {
    if (window.adminApp) {
        window.adminApp.closeStoryActionModal();
    }
}

function editStory() {
    if (window.adminApp) {
        window.adminApp.editStory();
    }
}

function previewStory() {
    if (window.adminApp) {
        window.adminApp.previewStory();
    }
}

function publishStory() {
    if (window.adminApp) {
        window.adminApp.publishStory();
    }
}

function duplicateStory() {
    if (window.adminApp) {
        window.adminApp.duplicateStory();
    }
}

function deleteStory() {
    if (window.adminApp) {
        window.adminApp.deleteStory();
    }
}

function closeImportModal() {
    if (window.adminApp) {
        window.adminApp.closeImportModal();
    }
}

function importFromUrl() {
    if (window.adminApp) {
        window.adminApp.importFromUrl();
    }
}

function uploadFile() {
    if (window.adminApp) {
        window.adminApp.uploadFile();
    }
}

function closeCommentsModal() {
    if (window.adminApp) {
        window.adminApp.closeCommentsModal();
    }
}

function approveComment(commentId) {
    if (window.adminApp) {
        window.adminApp.approveComment(commentId);
    }
}

function rejectComment(commentId) {
    if (window.adminApp) {
        window.adminApp.rejectComment(commentId);
    }
}

async function logout() {
    try {
        const response = await fetch('/applications/blog/logout', {
            method: 'POST'
        });

        if (response.ok) {
            window.location.href = '/applications/blog';
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
});

// Initialize the admin application
document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminStoriesApp();
});