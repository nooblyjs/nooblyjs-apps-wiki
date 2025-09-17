/**
 * @fileoverview Comment System for Blog Posts
 * Handles comment display, submission, threading, and real-time updates
 * with Medium.com-style interface and functionality.
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-09-16
 */

class CommentSystem {
    constructor(postId, container) {
        this.postId = postId;
        this.container = container;
        this.comments = [];
        this.isLoading = false;
        this.currentPage = 1;
        this.commentsPerPage = 20;
        this.hasMoreComments = true;

        this.init();
    }

    async init() {
        try {
            this.render();
            await this.loadComments();
            this.bindEvents();
        } catch (error) {
            console.error('Error initializing comment system:', error);
            this.showError('Failed to load comments');
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="comment-section">
                <div class="comment-header">
                    <h3 class="comment-title">
                        <i class="fas fa-comments"></i>
                        <span id="commentCount">0</span> Comments
                    </h3>
                    <div class="comment-sort">
                        <select id="commentSort" class="comment-sort-select">
                            <option value="asc">Oldest first</option>
                            <option value="desc">Newest first</option>
                        </select>
                    </div>
                </div>

                <div class="comment-form-section">
                    <form id="commentForm" class="comment-form">
                        <div class="comment-form-header">
                            <h4>Join the conversation</h4>
                        </div>

                        <div class="comment-fields">
                            <div class="comment-field-row">
                                <div class="comment-field">
                                    <input
                                        type="text"
                                        id="commentAuthor"
                                        name="author"
                                        placeholder="Your name *"
                                        required
                                        class="comment-input"
                                    >
                                </div>
                                <div class="comment-field">
                                    <input
                                        type="email"
                                        id="commentEmail"
                                        name="email"
                                        placeholder="Your email *"
                                        required
                                        class="comment-input"
                                    >
                                </div>
                            </div>

                            <div class="comment-field">
                                <input
                                    type="url"
                                    id="commentWebsite"
                                    name="website"
                                    placeholder="Website (optional)"
                                    class="comment-input"
                                >
                            </div>

                            <div class="comment-field">
                                <textarea
                                    id="commentContent"
                                    name="content"
                                    placeholder="Share your thoughts..."
                                    required
                                    class="comment-textarea"
                                    rows="4"
                                    maxlength="1000"
                                ></textarea>
                                <div class="comment-char-count">
                                    <span id="charCount">0</span>/1000
                                </div>
                            </div>
                        </div>

                        <div class="comment-form-footer">
                            <div class="comment-guidelines">
                                <small>
                                    <i class="fas fa-info-circle"></i>
                                    Be respectful and constructive. Comments are moderated.
                                </small>
                            </div>
                            <button type="submit" class="comment-submit-btn" id="submitComment">
                                <span class="btn-text">Post Comment</span>
                                <div class="btn-spinner hidden">
                                    <i class="fas fa-spinner fa-spin"></i>
                                </div>
                            </button>
                        </div>
                    </form>
                </div>

                <div class="comments-loading hidden" id="commentsLoading">
                    <div class="loading-spinner"></div>
                    <p>Loading comments...</p>
                </div>

                <div class="comments-list" id="commentsList">
                    <!-- Comments will be loaded here -->
                </div>

                <div class="comments-empty hidden" id="commentsEmpty">
                    <div class="empty-comments">
                        <i class="fas fa-comment-alt"></i>
                        <h4>No comments yet</h4>
                        <p>Be the first to share your thoughts!</p>
                    </div>
                </div>

                <div class="comments-load-more hidden" id="loadMoreComments">
                    <button class="load-more-btn" onclick="commentSystem.loadMoreComments()">
                        Load more comments
                    </button>
                </div>

                <div class="comments-error hidden" id="commentsError">
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span id="errorText">Failed to load comments</span>
                        <button onclick="commentSystem.loadComments()" class="retry-btn">Retry</button>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Comment form submission
        const commentForm = document.getElementById('commentForm');
        commentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitComment();
        });

        // Character counter
        const contentTextarea = document.getElementById('commentContent');
        const charCount = document.getElementById('charCount');
        contentTextarea.addEventListener('input', () => {
            const count = contentTextarea.value.length;
            charCount.textContent = count;
            charCount.parentElement.classList.toggle('over-limit', count > 1000);
        });

        // Comment sorting
        const sortSelect = document.getElementById('commentSort');
        sortSelect.addEventListener('change', () => {
            this.currentPage = 1;
            this.hasMoreComments = true;
            this.loadComments();
        });

        // Store form data in localStorage
        ['commentAuthor', 'commentEmail', 'commentWebsite'].forEach(id => {
            const input = document.getElementById(id);
            const storageKey = `blog_comment_${id}`;

            // Load saved data
            const savedValue = localStorage.getItem(storageKey);
            if (savedValue) {
                input.value = savedValue;
            }

            // Save on change
            input.addEventListener('change', () => {
                localStorage.setItem(storageKey, input.value);
            });
        });
    }

    async loadComments(append = false) {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading(!append);

        try {
            const sortOrder = document.getElementById('commentSort').value;
            const offset = append ? (this.currentPage - 1) * this.commentsPerPage : 0;

            const response = await fetch(
                `/applications/blog/api/posts/${this.postId}/comments?` +
                `limit=${this.commentsPerPage}&offset=${offset}&sort=${sortOrder}`
            );

            if (!response.ok) {
                throw new Error('Failed to load comments');
            }

            const data = await response.json();

            if (append) {
                this.comments.push(...data.comments);
            } else {
                this.comments = data.comments;
            }

            this.renderComments();
            this.updateCommentCount();

            // Check if there are more comments
            this.hasMoreComments = data.comments.length === this.commentsPerPage;
            this.toggleLoadMore();

        } catch (error) {
            console.error('Error loading comments:', error);
            this.showError('Failed to load comments');
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    async loadMoreComments() {
        if (!this.hasMoreComments || this.isLoading) return;

        this.currentPage++;
        await this.loadComments(true);
    }

    renderComments() {
        const commentsList = document.getElementById('commentsList');

        if (this.comments.length === 0) {
            this.showEmpty();
            return;
        }

        const commentsHtml = this.comments.map(comment =>
            this.renderComment(comment, 0)
        ).join('');

        commentsList.innerHTML = commentsHtml;
        this.hideEmpty();
    }

    renderComment(comment, depth = 0) {
        const marginLeft = depth * 40;
        const isReply = depth > 0;

        const repliesHtml = comment.replies && comment.replies.length > 0
            ? comment.replies.map(reply => this.renderComment(reply, depth + 1)).join('')
            : '';

        return `
            <div class="comment ${isReply ? 'comment-reply' : ''}"
                 data-comment-id="${comment.id}"
                 style="margin-left: ${marginLeft}px">
                <div class="comment-content">
                    <div class="comment-header">
                        <div class="comment-author">
                            <div class="author-avatar">
                                ${this.getAvatarHtml(comment.author, comment.email)}
                            </div>
                            <div class="author-info">
                                <span class="author-name">
                                    ${comment.website
                                        ? `<a href="${this.sanitizeUrl(comment.website)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(comment.author)}</a>`
                                        : this.escapeHtml(comment.author)
                                    }
                                </span>
                                <span class="comment-date" title="${new Date(comment.createdAt).toLocaleString()}">
                                    ${this.formatDate(comment.createdAt)}
                                </span>
                            </div>
                        </div>
                        <div class="comment-actions">
                            <button class="comment-action-btn" onclick="commentSystem.replyToComment('${comment.id}')">
                                <i class="fas fa-reply"></i>
                                Reply
                            </button>
                            <button class="comment-action-btn" onclick="commentSystem.reportComment('${comment.id}')">
                                <i class="fas fa-flag"></i>
                                Report
                            </button>
                        </div>
                    </div>
                    <div class="comment-body">
                        <p>${this.formatCommentContent(comment.content)}</p>
                    </div>
                    <div class="comment-footer">
                        <div class="comment-votes">
                            <button class="vote-btn vote-up" onclick="commentSystem.voteComment('${comment.id}', 'up')">
                                <i class="fas fa-thumbs-up"></i>
                                ${comment.votes?.up || 0}
                            </button>
                            <button class="vote-btn vote-down" onclick="commentSystem.voteComment('${comment.id}', 'down')">
                                <i class="fas fa-thumbs-down"></i>
                                ${comment.votes?.down || 0}
                            </button>
                        </div>
                    </div>
                </div>
                ${repliesHtml}
            </div>
        `;
    }

    async submitComment(parentId = null) {
        const form = document.getElementById('commentForm');
        const submitBtn = document.getElementById('submitComment');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');

        // Get form data
        const formData = new FormData(form);
        const commentData = {
            author: formData.get('author').trim(),
            email: formData.get('email').trim(),
            website: formData.get('website').trim(),
            content: formData.get('content').trim(),
            parentId
        };

        // Validation
        if (!commentData.author || !commentData.email || !commentData.content) {
            this.showFormError('Please fill in all required fields');
            return;
        }

        if (!this.isValidEmail(commentData.email)) {
            this.showFormError('Please enter a valid email address');
            return;
        }

        if (commentData.content.length > 1000) {
            this.showFormError('Comment is too long (maximum 1000 characters)');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        btnText.style.opacity = '0';
        btnSpinner.classList.remove('hidden');

        try {
            const response = await fetch(`/applications/blog/api/posts/${this.postId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(commentData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to submit comment');
            }

            // Show success message
            this.showFormSuccess(result.message);

            // Reset form
            form.reset();
            document.getElementById('charCount').textContent = '0';

            // Reload comments to show the new one
            setTimeout(() => {
                this.currentPage = 1;
                this.loadComments();
            }, 1000);

        } catch (error) {
            console.error('Error submitting comment:', error);
            this.showFormError(error.message || 'Failed to submit comment');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            btnText.style.opacity = '1';
            btnSpinner.classList.add('hidden');
        }
    }

    replyToComment(commentId) {
        // Scroll to comment form
        const commentForm = document.getElementById('commentForm');
        commentForm.scrollIntoView({ behavior: 'smooth' });

        // Focus on content textarea
        const contentTextarea = document.getElementById('commentContent');
        contentTextarea.focus();

        // Add visual indicator that this is a reply
        const formHeader = commentForm.querySelector('.comment-form-header h4');
        const originalText = formHeader.textContent;
        formHeader.innerHTML = `
            <i class="fas fa-reply"></i>
            Replying to comment
            <button type="button" class="cancel-reply" onclick="commentSystem.cancelReply()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Store the parent comment ID
        commentForm.dataset.parentId = commentId;
    }

    cancelReply() {
        const commentForm = document.getElementById('commentForm');
        const formHeader = commentForm.querySelector('.comment-form-header h4');
        formHeader.innerHTML = 'Join the conversation';
        delete commentForm.dataset.parentId;
    }

    async voteComment(commentId, direction) {
        // For now, just show a message that voting is not implemented
        // In a full implementation, this would send a request to vote on a comment
        console.log(`Vote ${direction} on comment ${commentId}`);
        this.showFormError('Voting feature coming soon!');
    }

    reportComment(commentId) {
        if (confirm('Report this comment as inappropriate?')) {
            // In a full implementation, this would send a report
            console.log(`Reported comment ${commentId}`);
            this.showFormSuccess('Comment reported. Thank you for helping keep our community safe.');
        }
    }

    // Utility methods

    updateCommentCount() {
        const countElement = document.getElementById('commentCount');
        countElement.textContent = this.comments.length;
    }

    showLoading(show = true) {
        const loading = document.getElementById('commentsLoading');
        loading.classList.toggle('hidden', !show);
    }

    hideLoading() {
        this.showLoading(false);
    }

    showEmpty() {
        document.getElementById('commentsEmpty').classList.remove('hidden');
    }

    hideEmpty() {
        document.getElementById('commentsEmpty').classList.add('hidden');
    }

    showError(message) {
        const errorElement = document.getElementById('commentsError');
        const errorText = document.getElementById('errorText');
        errorText.textContent = message;
        errorElement.classList.remove('hidden');
    }

    hideError() {
        document.getElementById('commentsError').classList.add('hidden');
    }

    toggleLoadMore() {
        const loadMoreBtn = document.getElementById('loadMoreComments');
        loadMoreBtn.classList.toggle('hidden', !this.hasMoreComments);
    }

    showFormError(message) {
        // Remove any existing alerts
        this.clearFormAlerts();

        const alert = document.createElement('div');
        alert.className = 'form-alert form-alert-error';
        alert.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        `;

        const form = document.getElementById('commentForm');
        form.insertBefore(alert, form.firstChild);

        setTimeout(() => {
            alert.remove();
        }, 5000);
    }

    showFormSuccess(message) {
        this.clearFormAlerts();

        const alert = document.createElement('div');
        alert.className = 'form-alert form-alert-success';
        alert.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;

        const form = document.getElementById('commentForm');
        form.insertBefore(alert, form.firstChild);

        setTimeout(() => {
            alert.remove();
        }, 5000);
    }

    clearFormAlerts() {
        const alerts = document.querySelectorAll('.form-alert');
        alerts.forEach(alert => alert.remove());
    }

    getAvatarHtml(name, email) {
        // Generate a simple avatar based on first letter of name
        const initial = name.charAt(0).toUpperCase();
        const colors = ['#1a8917', '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'];
        const colorIndex = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        const color = colors[colorIndex];

        return `
            <div class="avatar-circle" style="background-color: ${color}">
                ${initial}
            </div>
        `;
    }

    formatDate(dateString) {
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

    formatCommentContent(content) {
        // Basic formatting: line breaks and link detection
        return this.escapeHtml(content)
            .replace(/\n/g, '<br>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    sanitizeUrl(url) {
        try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol) ? url : '#';
        } catch {
            return '#';
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// Global instance for use in onclick handlers
let commentSystem;