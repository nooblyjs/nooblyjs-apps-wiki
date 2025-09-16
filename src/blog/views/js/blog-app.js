/**
 * @fileoverview Blog Application Frontend
 * Handles the public blog interface with Medium.com-style functionality
 * including post loading, search, categories, and user interactions.
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-09-16
 */

class BlogApp {
    constructor() {
        this.currentPage = 1;
        this.postsPerPage = 10;
        this.currentFilter = 'for-you';
        this.isLoading = false;
        this.hasMorePosts = true;
        this.posts = [];
        this.categories = [];
        this.isAuthenticated = false;
        this.currentView = 'feed'; // 'feed' or 'post'
        this.currentPost = null;

        this.init();
    }

    async init() {
        try {
            await this.checkAuthentication();
            await this.loadInitialData();
            this.bindEvents();

            // Handle initial URL routing
            const path = window.location.pathname;
            if (path.startsWith('/applications/blog/posts/')) {
                const slug = path.split('/').pop();
                await this.openPost(slug);
            } else {
                await this.loadPosts();
            }

            // Set up popstate handling for browser navigation
            window.addEventListener('popstate', (e) => {
                this.handlePopState();
            });

        } catch (error) {
            console.error('Error initializing blog app:', error);
            this.showError('Failed to load blog. Please refresh the page.');
        }
    }

    async checkAuthentication() {
        try {
            const response = await fetch('/applications/blog/api/auth/check');
            const data = await response.json();
            this.isAuthenticated = data.authenticated;
            this.updateAuthUI();
        } catch (error) {
            console.error('Error checking authentication:', error);
        }
    }

    updateAuthUI() {
        const userDropdown = document.getElementById('userDropdown');
        if (this.isAuthenticated) {
            userDropdown.innerHTML = `
                <a href="/applications/blog/admin/stories" class="dropdown-item">
                    <i class="fas fa-file-alt"></i>
                    Stories
                </a>
                <a href="/applications/blog/admin/stats" class="dropdown-item">
                    <i class="fas fa-chart-line"></i>
                    Stats
                </a>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    Sign out
                </a>
            `;
        }
    }

    async loadInitialData() {
        try {
            // Load categories for navigation
            const response = await fetch('/applications/blog/api/categories');
            this.categories = await response.json();
            this.renderNavTags();
            this.renderSidebarTopics();
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    renderNavTags() {
        const navTags = document.getElementById('navTags');
        if (!navTags) return;

        const topCategories = this.categories.slice(0, 8);
        navTags.innerHTML = topCategories.map(category =>
            `<a href="#" class="nav-tag" data-category="${category.slug}">${category.name}</a>`
        ).join('');
    }

    renderSidebarTopics() {
        const recommendedTopics = document.getElementById('recommendedTopics');
        if (!recommendedTopics) return;

        recommendedTopics.innerHTML = this.categories.map(category =>
            `<a href="#" class="topic-tag" data-category="${category.slug}">${category.name}</a>`
        ).join('');
    }

    bindEvents() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();

                if (query.length > 2) {
                    searchTimeout = setTimeout(() => {
                        this.performSearch(query);
                    }, 300);
                } else if (query.length === 0) {
                    this.closeSearchModal();
                }
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeSearchModal();
                    searchInput.blur();
                }
            });
        }

        // Navigation tabs
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-tab')) {
                e.preventDefault();
                this.handleTabClick(e.target);
            }

            if (e.target.classList.contains('nav-tag') || e.target.classList.contains('topic-tag')) {
                e.preventDefault();
                const category = e.target.dataset.category;
                if (category) {
                    this.filterByCategory(category);
                }
            }

            if (e.target.classList.contains('article-card') || e.target.closest('.article-card')) {
                const card = e.target.closest('.article-card');
                if (card && card.dataset.slug) {
                    this.openPost(card.dataset.slug);
                }
            }
        });

        // Infinite scroll
        window.addEventListener('scroll', () => {
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
                if (!this.isLoading && this.hasMorePosts) {
                    this.loadMorePosts();
                }
            }
        });
    }

    async loadPosts(reset = false) {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading(reset);

        try {
            let url = `/applications/blog/api/posts?page=${this.currentPage}&limit=${this.postsPerPage}`;

            if (this.currentFilter === 'featured') {
                url += '&featured=true';
            }

            const response = await fetch(url);
            const data = await response.json();

            if (reset) {
                this.posts = data.posts;
            } else {
                this.posts.push(...data.posts);
            }

            this.hasMorePosts = data.pagination.hasNext;
            this.renderPosts(reset);

            // Load staff picks and recent activity for sidebar
            if (reset) {
                await this.loadSidebarContent();
            }

        } catch (error) {
            console.error('Error loading posts:', error);
            this.showError('Failed to load posts.');
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    async loadSidebarContent() {
        try {
            // Load featured posts for staff picks
            const response = await fetch('/applications/blog/api/posts?featured=true&limit=3');
            const data = await response.json();
            this.renderStaffPicks(data.posts);

            // Recent activity could be recent posts or comments
            const recentResponse = await fetch('/applications/blog/api/posts?limit=3');
            const recentData = await recentResponse.json();
            this.renderRecentActivity(recentData.posts);
        } catch (error) {
            console.error('Error loading sidebar content:', error);
        }
    }

    renderStaffPicks(posts) {
        const staffPicks = document.getElementById('staffPicks');
        if (!staffPicks) return;

        staffPicks.innerHTML = posts.map(post => `
            <article class="sidebar-article" data-slug="${post.slug}">
                <div class="sidebar-author">
                    <img src="${post.author?.avatar || 'https://via.placeholder.com/16'}"
                         alt="${post.author?.displayName || 'Author'}"
                         class="sidebar-author-avatar">
                    <span class="sidebar-author-name">${post.author?.displayName || 'Unknown Author'}</span>
                </div>
                <h4 class="sidebar-article-title">${post.title}</h4>
                <span class="sidebar-article-date">${this.formatDate(post.publishedAt)}</span>
            </article>
        `).join('');
    }

    renderRecentActivity(posts) {
        const recentActivity = document.getElementById('recentActivity');
        if (!recentActivity) return;

        recentActivity.innerHTML = posts.map(post => `
            <article class="sidebar-article" data-slug="${post.slug}">
                <div class="sidebar-author">
                    <img src="${post.author?.avatar || 'https://via.placeholder.com/16'}"
                         alt="${post.author?.displayName || 'Author'}"
                         class="sidebar-author-avatar">
                    <span class="sidebar-author-name">${post.author?.displayName || 'Unknown Author'}</span>
                </div>
                <h4 class="sidebar-article-title">${post.title}</h4>
                <span class="sidebar-article-date">${this.formatDate(post.publishedAt)}</span>
            </article>
        `).join('');
    }

    renderPosts(reset = false) {
        const postsContainer = document.getElementById('postsContainer');
        const loadMoreContainer = document.getElementById('loadMoreContainer');

        if (!postsContainer) return;

        if (reset) {
            postsContainer.innerHTML = '';
        }

        if (this.posts.length === 0 && reset) {
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No stories found</h3>
                    <p>Be the first to share your story!</p>
                </div>
            `;
            loadMoreContainer.style.display = 'none';
            return;
        }

        const newPosts = reset ? this.posts : this.posts.slice(-this.postsPerPage);

        newPosts.forEach(post => {
            const postElement = this.createPostElement(post);
            postsContainer.appendChild(postElement);
        });

        // Show/hide load more button
        if (loadMoreContainer) {
            loadMoreContainer.style.display = this.hasMorePosts ? 'block' : 'none';
        }
    }

    createPostElement(post) {
        const article = document.createElement('article');
        article.className = 'article-card';
        article.dataset.slug = post.slug;

        const featuredImage = post.featuredImage || 'https://via.placeholder.com/112x112';
        const authorAvatar = post.author?.avatar || 'https://via.placeholder.com/20';
        const authorName = post.author?.displayName || 'Unknown Author';
        const categoryName = post.category?.name || '';

        article.innerHTML = `
            <div class="article-content">
                <div class="article-header">
                    <div class="author-info">
                        <img src="${authorAvatar}" alt="${authorName}" class="author-avatar">
                        <span class="author-name">${authorName}</span>
                        ${categoryName ? `<span class="author-handle">in ${categoryName}</span>` : ''}
                    </div>
                </div>
                <h2 class="article-title">${post.title}</h2>
                <p class="article-excerpt">${post.excerpt}</p>
                <div class="article-meta">
                    <span class="article-date">${this.formatDate(post.publishedAt)}</span>
                    <span class="article-stats">
                        <i class="fas fa-eye"></i> ${post.viewCount || 0}
                    </span>
                    <span class="article-stats">
                        <i class="fas fa-comment"></i> ${post.commentCount || 0}
                    </span>
                    <span class="article-stats">
                        <i class="fas fa-clock"></i> ${post.readingTime || 1} min read
                    </span>
                    <div class="article-actions">
                        <button class="btn-ghost btn-sm" onclick="event.stopPropagation(); toggleBookmark('${post.id}')">
                            <i class="fas fa-bookmark"></i>
                        </button>
                        <button class="btn-ghost btn-sm" onclick="event.stopPropagation(); sharePost('${post.slug}')">
                            <i class="fas fa-share"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="article-image">
                <img src="${featuredImage}" alt="${post.title}">
            </div>
        `;

        return article;
    }

    handleTabClick(tab) {
        // Remove active class from all tabs
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

        // Add active class to clicked tab
        tab.classList.add('active');

        // Update current filter
        this.currentFilter = tab.dataset.tab || 'for-you';

        // Reset and reload posts
        this.currentPage = 1;
        this.loadPosts(true);
    }

    async filterByCategory(categorySlug) {
        this.isLoading = true;
        this.showLoading(true);

        try {
            const response = await fetch(`/applications/blog/api/posts?category=${categorySlug}&limit=${this.postsPerPage}`);
            const data = await response.json();

            this.posts = data.posts;
            this.hasMorePosts = data.pagination.hasNext;
            this.currentPage = 1;
            this.renderPosts(true);
        } catch (error) {
            console.error('Error filtering by category:', error);
            this.showError('Failed to load category posts.');
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    async performSearch(query) {
        try {
            const response = await fetch(`/applications/blog/api/search?q=${encodeURIComponent(query)}&limit=10`);
            const results = await response.json();
            this.showSearchResults(query, results);
        } catch (error) {
            console.error('Error performing search:', error);
        }
    }

    showSearchResults(query, results) {
        const searchModal = document.getElementById('searchModal');
        const searchResults = document.getElementById('searchResults');

        if (!searchModal || !searchResults) return;

        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="empty-state">
                    <h3>No results found</h3>
                    <p>Try different keywords or browse our categories.</p>
                </div>
            `;
        } else {
            searchResults.innerHTML = results.map(post => `
                <div class="search-result" onclick="openPost('${post.slug}')">
                    <h3 class="search-result-title">${post.title}</h3>
                    <p class="search-result-excerpt">${post.excerpt || ''}</p>
                </div>
            `).join('');
        }

        searchModal.classList.remove('hidden');
    }

    closeSearchModal() {
        const searchModal = document.getElementById('searchModal');
        if (searchModal) {
            searchModal.classList.add('hidden');
        }
    }

    async openPost(slug) {
        try {
            // Show loading state
            this.showLoading(true);

            // Load the post
            const response = await fetch(`/applications/blog/api/posts/${slug}`);
            if (!response.ok) {
                throw new Error('Post not found');
            }

            const post = await response.json();
            this.currentPost = post;

            // Switch to post view
            this.switchToPostView();

            // Render the post
            this.renderSinglePost(post);

            // Initialize comment system
            this.initializeCommentSystem(post.id);

            // Update URL without page reload
            history.pushState({ view: 'post', slug }, post.title, `/applications/blog/posts/${slug}`);

        } catch (error) {
            console.error('Error loading post:', error);
            this.showError('Failed to load post');
        } finally {
            this.hideLoading();
        }
    }

    switchToPostView() {
        this.currentView = 'post';

        // Hide feed elements
        document.getElementById('postsContainer').classList.add('hidden');
        document.getElementById('loadMoreContainer').style.display = 'none';

        // Show post view
        document.getElementById('singlePostView').classList.remove('hidden');

        // Update navigation active state
        this.updateNavigationForPost();

        // Scroll to top
        window.scrollTo(0, 0);
    }

    switchToFeedView() {
        this.currentView = 'feed';
        this.currentPost = null;

        // Show feed elements
        document.getElementById('postsContainer').classList.remove('hidden');

        // Hide post view
        document.getElementById('singlePostView').classList.add('hidden');

        // Update navigation
        this.updateNavigationForFeed();

        // Update URL
        history.pushState({ view: 'feed' }, 'Medium', '/applications/blog');
    }

    renderSinglePost(post) {
        const postArticle = document.getElementById('postArticle');

        // Convert markdown to HTML (basic conversion)
        const contentHtml = this.markdownToHtml(post.content || post.excerpt || '');

        postArticle.innerHTML = `
            <div class="post-header">
                <a href="#" onclick="blogApp.switchToFeedView(); return false;" class="back-to-blog">
                    <i class="fas fa-arrow-left"></i>
                    Back to stories
                </a>

                <h1 class="post-title">${post.title}</h1>

                ${post.subtitle ? `<h2 class="post-subtitle">${post.subtitle}</h2>` : ''}

                <div class="post-meta">
                    <div class="post-author-info">
                        <div class="post-author-avatar">
                            ${post.author?.avatar ?
                                `<img src="${post.author.avatar}" alt="${post.author.displayName}">` :
                                `<div style="background: #1a8917; color: white; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: 600;">${(post.author?.displayName || 'A').charAt(0)}</div>`
                            }
                        </div>
                        <div class="post-author-details">
                            <div class="post-author-name">${post.author?.displayName || 'Anonymous'}</div>
                            <div class="post-publish-date">${this.formatDate(post.publishedAt || post.createdAt)}</div>
                        </div>
                    </div>

                    <div class="post-reading-time">${post.readingTime || 5} min read</div>

                    <div class="post-actions">
                        <button class="post-action-btn" title="Bookmark">
                            <i class="fas fa-bookmark"></i>
                        </button>
                        <button class="post-action-btn" title="Share">
                            <i class="fas fa-share"></i>
                        </button>
                        <button class="post-action-btn" title="More">
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div class="post-content">
                ${contentHtml}
            </div>

            <div class="post-footer">
                ${post.tags && post.tags.length > 0 ? `
                    <div class="post-tags">
                        ${post.tags.map(tag => `<a href="#" class="post-tag" onclick="blogApp.filterByTag('${tag}'); return false;">${tag}</a>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    initializeCommentSystem(postId) {
        const commentsContainer = document.getElementById('postComments');

        // Initialize the comment system
        commentSystem = new CommentSystem(postId, commentsContainer);
    }

    markdownToHtml(markdown) {
        // Basic markdown to HTML conversion
        return markdown
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^(.+)$/gim, '<p>$1</p>')
            .replace(/<p><\/p>/g, '')
            .replace(/<p>(<h[1-6]>.*<\/h[1-6]>)<\/p>/g, '$1')
            .replace(/<p>(<blockquote>.*<\/blockquote>)<\/p>/g, '$1');
    }

    updateNavigationForPost() {
        // Remove active states from nav items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
    }

    updateNavigationForFeed() {
        // Restore feed navigation state
        const forYouNav = document.querySelector('.nav-item[data-filter="for-you"]');
        if (forYouNav) {
            forYouNav.classList.add('active');
        }
    }

    filterByTag(tag) {
        // Switch back to feed view and filter by tag
        this.switchToFeedView();
        // Implement tag filtering logic here
        console.log('Filter by tag:', tag);
    }

    handlePopState() {
        // Handle browser back/forward navigation
        const path = window.location.pathname;

        if (path.startsWith('/applications/blog/posts/')) {
            // Extract slug from path
            const slug = path.split('/').pop();
            this.openPost(slug);
        } else {
            // Show feed view
            this.switchToFeedView();
        }
    }

    async loadMorePosts() {
        this.currentPage++;
        await this.loadPosts(false);
    }

    showLoading(reset = false) {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.style.display = reset ? 'flex' : 'none';
        }
    }

    hideLoading() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.style.display = 'none';
        }
    }

    showError(message) {
        // Create or update error message
        let errorElement = document.getElementById('errorMessage');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'errorMessage';
            errorElement.className = 'error-message';
            errorElement.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: #dc3545;
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            `;
            document.body.appendChild(errorElement);
        }

        errorElement.textContent = message;
        errorElement.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }, 5000);
    }

    formatDate(dateString) {
        if (!dateString) return '';

        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return '1d ago';
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks}w ago`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months}mo ago`;
        } else {
            const years = Math.floor(diffDays / 365);
            return `${years}y ago`;
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

function closeSearchModal() {
    if (window.blogApp) {
        window.blogApp.closeSearchModal();
    }
}

function openPost(slug) {
    if (window.blogApp) {
        window.blogApp.openPost(slug);
    }
}

function loadMorePosts() {
    if (window.blogApp) {
        window.blogApp.loadMorePosts();
    }
}

function toggleBookmark(postId) {
    console.log('Bookmark toggled for post:', postId);
    // Implement bookmark functionality
}

function sharePost(slug) {
    const url = `${window.location.origin}/applications/blog/posts/${slug}`;
    if (navigator.share) {
        navigator.share({
            title: 'Check out this story',
            url: url
        });
    } else {
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        });
    }
}

function login() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.classList.remove('hidden');
    }
}

function closeLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.classList.add('hidden');
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const credentials = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    try {
        const response = await fetch('/applications/blog/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });

        const data = await response.json();

        if (data.success) {
            closeLoginModal();
            window.location.reload();
        } else {
            alert('Invalid credentials');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

async function logout() {
    try {
        const response = await fetch('/applications/blog/logout', {
            method: 'POST'
        });

        if (response.ok) {
            window.location.reload();
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

// Initialize the blog application
document.addEventListener('DOMContentLoaded', () => {
    window.blogApp = new BlogApp();
});