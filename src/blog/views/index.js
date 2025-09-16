

/**
 * @fileoverview Blog service views module for noobly-applications framework.
 * This module provides Express.js view registration and static file serving
 * capabilities for the Blog service. It registers static routes to serve
 * Blog-related view files and templates through the Express application.
 *
 * @author NooblyJS Core Team
 * @version 1.0.0
 * @since 2025-09-16
 */

'use strict';

const path = require('path');
const express = require('express');

/**
 * Blog service views module for noobly-applications framework.
 * This module provides Express.js view registration and static file serving
 * capabilities for the Blog service. It registers static routes to serve
 * Blog-related view files and templates through the Express application.
 *
 * @function
 * @param {Object} options - Configuration options for the views setup
 * @param {express.Application} options.express-app - The Express application instance
 * @param {Object} eventEmitter - Event emitter instance for inter-service communication
 * @param {Object} services - NooblyJS Core services
 * @returns {void}
 */
module.exports = (options, eventEmitter, services) => {
  const app = options;
  const { logger } = services;

  try {
    // Serve static blog assets
    const blogAssetsPath = path.join(__dirname, '../../../assets');
    app.use('/applications/blog/assets', express.static(blogAssetsPath));

    // Main blog application route
    app.get('/applications/blog', (req, res) => {
      res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog Platform - NooblyJS</title>
    <link rel="icon" type="image/x-icon" href="/applications/blog/assets/favicon.ico">
    <meta name="description" content="A modern blog platform built with NooblyJS framework">
    <meta name="keywords" content="blog, NooblyJS, content management, publishing">
    <meta name="author" content="NooblyJS Team">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        :root {
          --primary-color: #3B82F6;
          --secondary-color: #10B981;
          --accent-color: #F59E0B;
          --text-color: #1F2937;
          --bg-color: #FFFFFF;
          --border-color: #E5E7EB;
        }
    </style>

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="/applications/blog/">
    <meta property="og:title" content="Blog Platform - NooblyJS">
    <meta property="og:description" content="A modern blog platform built with NooblyJS framework">
    <meta property="og:image" content="/applications/blog/assets/images/blog-og.png">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="/applications/blog/">
    <meta property="twitter:title" content="Blog Platform - NooblyJS">
    <meta property="twitter:description" content="A modern blog platform built with NooblyJS framework">
    <meta property="twitter:image" content="/applications/blog/assets/images/blog-twitter.png">

    <style>
        :root {
            --primary-color: #3B82F6;
            --secondary-color: #10B981;
            --accent-color: #F59E0B;
            --text-color: #1F2937;
            --bg-color: #FFFFFF;
            --border-color: #E5E7EB;
            --gray-50: #F9FAFB;
            --gray-100: #F3F4F6;
            --gray-600: #4B5563;
            --gray-800: #1F2937;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background: var(--bg-color);
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }

        .medium-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 1rem;
            border-bottom: 1px solid var(--border-color);
            position: sticky;
            top: 0;
            background: white;
            z-index: 100;
        }
        .medium-header .logo {
            font-size: 1.5rem;
            font-weight: bold;
        }
        .medium-header .search-bar {
            flex-grow: 1;
            margin: 0 2rem;
        }
        .medium-header .search-bar input {
            width: 100%;
            padding: 0.5rem;
            border-radius: 20px;
            border: 1px solid var(--border-color);
            background-color: var(--gray-50);
        }
        .medium-header .right-nav {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .medium-layout {
            display: grid;
            grid-template-columns: 240px 1fr 300px;
            gap: 2rem;
            padding-top: 2rem;
        }
        .left-sidebar {
            position: sticky;
            top: 70px; /* height of header */
            height: calc(100vh - 70px);
            overflow-y: auto;
        }
        .left-sidebar ul {
            list-style: none;
            padding: 0;
        }
        .left-sidebar li {
            margin-bottom: 1rem;
        }
        .left-sidebar a {
            text-decoration: none;
            color: var(--text-color);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .right-sidebar {
            position: sticky;
            top: 70px; /* height of header */
            height: calc(100vh - 70px);
            overflow-y: auto;
        }
        .post-card {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2rem;
        }
        .post-card .post-content {
            flex-grow: 1;
        }
        .post-card .post-image {
            width: 150px;
            height: 100px;
            object-fit: cover;
        }
        .author-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
        }
        .author-avatar {
            width: 24px;
            height: 24px;
            border-radius: 50%;
        }
    </style>
</head>
<body>
    <!-- Login Link -->
    <a href="#" id="loginLink" class="login-link" onclick="showLoginModal()">Admin</a>

    <!-- Admin Panel -->
    <div class="admin-panel" id="adminPanel">
        <div style="margin-bottom: 1rem;">
            <strong>Admin Panel</strong>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <a href="/applications/blog/admin" class="btn btn-primary" style="text-align: center; text-decoration: none;">Dashboard</a>
            <button onclick="showCreatePostModal()" class="btn btn-secondary">New Post</button>
            <button onclick="logout()" class="btn btn-secondary">Logout</button>
        </div>
    </div>

    <!-- Login Modal -->
    <div id="loginModal" class="login-modal">
        <div class="login-modal-content">
            <h2 style="margin-bottom: 1.5rem; text-align: center;">Admin Login</h2>
            <div class="login-form">
                <input type="text" id="username" class="login-input" placeholder="Username" required>
                <input type="password" id="password" class="login-input" placeholder="Password" required>
                <button onclick="login()" class="btn btn-primary" style="width: 100%;">Login</button>
                <button onclick="closeLoginModal()" class="btn btn-secondary" style="width: 100%;">Cancel</button>
            </div>
        </div>
    </div>

    <!-- Create Post Modal -->
    <div id="createPostModal" class="login-modal">
        <div class="login-modal-content" style="max-width: 600px;">
            <h2 style="margin-bottom: 1.5rem; text-align: center;">Quick Post Creation</h2>
            <form id="quickPostForm" class="login-form">
                <input type="text" id="quickPostTitle" class="login-input" placeholder="Post Title" required>
                <textarea id="quickPostContent" class="login-input" placeholder="Post Content (Markdown supported)" rows="6" required style="resize: vertical;"></textarea>
                <select id="quickPostCategory" class="login-input" required>
                    <option value="">Select Category</option>
                </select>
                <button type="submit" class="btn btn-primary" style="width: 100%;">Create Post</button>
                <button type="button" onclick="closeCreatePostModal()" class="btn btn-secondary" style="width: 100%;">Cancel</button>
            </form>
        </div>
    </div>

    <header class="medium-header">
        <div class="logo">
            <i class="fa-brands fa-medium"></i>
        </div>
        <div class="search-bar">
            <input type="text" placeholder="Search">
        </div>
        <div class="right-nav">
            <a href="#"><i class="fa-regular fa-pen-to-square"></i> Write</a>
            <a href="#"><i class="fa-regular fa-bell"></i></a>
            <a href="#"><img src="https://via.placeholder.com/32" alt="Profile" style="border-radius: 50%;"></a>
        </div>
    </header>

    <div class="container medium-layout">
        <aside class="left-sidebar">
            <ul>
                <li><a href="#"><i class="fa-solid fa-house"></i> Home</a></li>
                <li><a href="#"><i class="fa-solid fa-book-bookmark"></i> Library</a></li>
                <li><a href="#"><i class="fa-regular fa-user"></i> Profile</a></li>
                <li><a href="#"><i class="fa-regular fa-file-lines"></i> Stories</a></li>
                <li><a href="#"><i class="fa-solid fa-chart-line"></i> Stats</a></li>
                <li><a href="#"><i class="fa-solid fa-user-group"></i> Following</a></li>
            </ul>
            <hr>
            <p>Discover more writers and publications to follow.</p>
            <a href="#">See suggestions</a>
        </aside>
        <main class="main-content">
            <section class="posts-section">
                <div id="loading" class="loading">
                    <p>Loading posts...</p>
                </div>
                <div id="error" class="error" style="display: none;"></div>
                <div id="postsContainer" class="posts-grid"></div>
                <div id="pagination" style="text-align: center; margin-top: 2rem;"></div>
            </section>
        </main>
        <aside class="right-sidebar">
            <div class="widget">
                <h3>Staff Picks</h3>
                <div id="staff-picks"></div>
            </div>
            <div class="widget">
                <h3>Recommended topics</h3>
                <div id="recommended-topics"></div>
            </div>
            <div class="widget">
                <h3>Recently viewed</h3>
                <div id="recently-viewed"></div>
            </div>
        </aside>
    </div>

    <footer class="footer">
        <div class="container">
            <p>&copy; 2025 Blog Platform. Powered by <strong>NooblyJS</strong>.</p>
            <p style="margin-top: 0.5rem; font-size: 0.875rem; opacity: 0.8;">
                <a href="/applications/blog/feed.xml" style="color: white; margin: 0 0.5rem;">RSS Feed</a> |
                <a href="/applications/blog/sitemap.xml" style="color: white; margin: 0 0.5rem;">Sitemap</a>
            </p>
        </div>
    </footer>

    <script>
        // Blog Platform JavaScript
        let currentPage = 1;
        let isAuthenticated = false;
        let searchTimeout = null;

        // Initialize the application
        document.addEventListener('DOMContentLoaded', function() {
            checkAuthStatus();
            loadPosts();
            loadRightSidebar();
        });

        // Authentication functions
        async function checkAuthStatus() {
            try {
                const response = await fetch('/applications/blog/api/auth/check');
                const data = await response.json();
                isAuthenticated = data.authenticated;
                updateAdminPanel();
            } catch (error) {
                console.error('Auth check failed:', error);
            }
        }

        function updateAdminPanel() {
            const loginLink = document.getElementById('loginLink');
            const adminPanel = document.getElementById('adminPanel');

            if (isAuthenticated) {
                loginLink.style.display = 'none';
                adminPanel.classList.add('active');
            } else {
                loginLink.style.display = 'block';
                adminPanel.classList.remove('active');
            }
        }

        function showLoginModal() {
            document.getElementById('loginModal').classList.add('active');
        }

        function closeLoginModal() {
            document.getElementById('loginModal').classList.remove('active');
        }

        async function login() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/applications/blog/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();
                if (data.success) {
                    isAuthenticated = true;
                    updateAdminPanel();
                    closeLoginModal();
                    alert('Login successful!');
                } else {
                    alert('Login failed: ' + data.message);
                }
            } catch (error) {
                alert('Login error: ' + error.message);
            }
        }

        async function logout() {
            try {
                await fetch('/applications/blog/logout', { method: 'POST' });
                isAuthenticated = false;
                updateAdminPanel();
                alert('Logged out successfully');
            } catch (error) {
                alert('Logout error: ' + error.message);
            }
        }

        function showCreatePostModal() {
            loadQuickPostCategories();
            document.getElementById('createPostModal').classList.add('active');
        }

        function closeCreatePostModal() {
            document.getElementById('createPostModal').classList.remove('active');
        }

        async function loadQuickPostCategories() {
            try {
                const response = await fetch('/applications/blog/api/categories');
                const categories = await response.json();

                const select = document.getElementById('quickPostCategory');
                select.innerHTML = '<option value="">Select Category</option>' +
                    categories.map(cat => '<option value="' + cat.id + '">' + cat.name + '</option>').join('');
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        }

        async function createPost(title, content) {
            try {
                const response = await fetch('/applications/blog/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title,
                        content,
                        status: 'published',
                        categoryId: 1
                    })
                });

                const data = await response.json();
                if (data.success) {
                    alert('Post created successfully!');
                    loadPosts(); // Reload posts
                } else {
                    alert('Failed to create post: ' + data.error);
                }
            } catch (error) {
                alert('Error creating post: ' + error.message);
            }
        }

        // Content loading functions
        async function loadPosts(page = 1) {
            const loading = document.getElementById('loading');
            const error = document.getElementById('error');
            const container = document.getElementById('postsContainer');

            loading.style.display = 'block';
            error.style.display = 'none';
            container.innerHTML = '';

            try {
                const response = await fetch('/applications/blog/api/posts?page=' + page + '&limit=10');
                const data = await response.json();

                loading.style.display = 'none';

                if (data.posts && data.posts.length > 0) {
                    container.innerHTML = data.posts.map(post => createPostCard(post)).join('');
                    createPagination(data.pagination);
                } else {
                    container.innerHTML = '<p style="text-align: center; color: var(--gray-600);">No posts found.</p>';
                }
            } catch (err) {
                loading.style.display = 'none';
                error.style.display = 'block';
                error.textContent = 'Failed to load posts: ' + err.message;
            }
        }

        function createPostCard(post) {
            const publishedDate = new Date(post.publishedAt).toLocaleDateString();
            const readingTime = post.readingTime || 1;

            return (
                '<article class="post-card" onclick="viewPost('' + post.slug + '')">' +
                    '<div class="post-content">' +
                        '<div class="author-info">' +
                            '<img src="' + (post.author && post.author.avatar ? post.author.avatar : 'https://via.placeholder.com/24') + '" alt="' + (post.author ? post.author.displayName : '') + '" class="author-avatar">' +
                            '<span>' + (post.author ? post.author.displayName : '') + '</span>' +
                        '</div>' +
                        '<h2 class="post-title">' + post.title + '</h2>' +
                        '<p class="post-excerpt">' + post.excerpt + '</p>' +
                        '<div class="post-meta">' +
                            '<span>' + publishedDate + '</span>' +
                            '<span>' + readingTime + ' min read</span>' +
                            '<div class="actions">' +
                                '<a href="#"><i class="fa-regular fa-bookmark"></i></a>' +
                                '<a href="#"><i class="fa-solid fa-ellipsis"></i></a>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    (post.featuredImage ? '<img src="' + post.featuredImage + '" alt="' + post.title + '" class="post-image">' : '') +
                '</article>'
            );
        }

        function viewPost(slug) {
            window.location.href = '/applications/blog/posts/' + slug;
        }

        function createPagination(pagination) {
            const container = document.getElementById('pagination');
            if (!pagination) return;

            let paginationHTML = '';

            if (pagination.hasPrev) {
                paginationHTML += '<button class="btn btn-secondary" onclick="loadPosts(' + (pagination.page - 1) + ')">Previous</button> ';
            }

            paginationHTML += '<span style="margin: 0 1rem;">Page ' + pagination.page + '</span>';

            if (pagination.hasNext) {
                paginationHTML += ' <button class="btn" onclick="loadPosts(' + (pagination.page + 1) + ')">Next</button>';
            }

            container.innerHTML = paginationHTML;
        }

        async function loadRightSidebar() {
            // Staff Picks
            const staffPicksContainer = document.getElementById('staff-picks');
            staffPicksContainer.innerHTML = 'Loading...';
            try {
                const response = await fetch('/applications/blog/api/posts?featured=true&limit=3');
                const data = await response.json();
                if (data.posts && data.posts.length > 0) {
                    staffPicksContainer.innerHTML = data.posts.map(post =>
                        '<div class="sidebar-post">' +
                            '<a href="/applications/blog/posts/' + post.slug + '">' + post.title + '</a>' +
                            '<span>by ' + (post.author ? post.author.displayName : '') + '</span>' +
                        '</div>'
                    ).join('');
                } else {
                    staffPicksContainer.innerHTML = 'No staff picks found.';
                }
            } catch (error) {
                staffPicksContainer.innerHTML = 'Error loading staff picks.';
            }

            // Recommended Topics
            const recommendedTopicsContainer = document.getElementById('recommended-topics');
            recommendedTopicsContainer.innerHTML = 'Loading...';
            try {
                const response = await fetch('/applications/blog/api/categories');
                const categories = await response.json();
                if (categories && categories.length > 0) {
                    recommendedTopicsContainer.innerHTML = categories.slice(0, 5).map(category =>
                        '<a href="/applications/blog/categories/' + category.slug + '" class="tag">' + category.name + '</a>'
                    ).join('');
                } else {
                    recommendedTopicsContainer.innerHTML = 'No recommended topics found.';
                }
            } catch (error) {
                recommendedTopicsContainer.innerHTML = 'Error loading topics.';
            }

            // Recently Viewed
            const recentlyViewedContainer = document.getElementById('recently-viewed');
            recentlyViewedContainer.innerHTML = 'No recently viewed posts.';
        }

        // Search functionality
        function performSearch() {
            const query = document.getElementById('searchInput').value.trim();
            const resultsContainer = document.getElementById('searchResults');

            clearTimeout(searchTimeout);

            if (query.length < 2) {
                resultsContainer.style.display = 'none';
                return;
            }

            searchTimeout = setTimeout(async () => {
                try {
                    const response = await fetch('/applications/blog/api/search?q=' + encodeURIComponent(query));
                    const results = await response.json();

                    if (results.length > 0) {
                        resultsContainer.innerHTML = results.map(result =>
                            '<div style="margin: 0.5rem 0; padding: 0.5rem; background: white; border-radius: 4px; border: 1px solid var(--border-color);">' +
                                '<a href="/applications/blog/posts/' + result.slug + '" style="text-decoration: none; color: var(--text-color); font-weight: 500;">' +
                                    result.title +
                                '</a>' +
                                '<div style="font-size: 0.875rem; color: var(--gray-600); margin-top: 0.25rem;">' +
                                    result.excerpt.substring(0, 100) + '...' +
                                '</div>' +
                            '</div>'
                        ).join('');
                        resultsContainer.style.display = 'block';
                    } else {
                        resultsContainer.innerHTML = '<div style="padding: 0.5rem; text-align: center; color: var(--gray-600);">No results found</div>';
                        resultsContainer.style.display = 'block';
                    }
                } catch (error) {
                    resultsContainer.innerHTML = '<div style="padding: 0.5rem; color: red;">Search failed</div>';
                    resultsContainer.style.display = 'block';
                }
            }, 300);
        }

        // Newsletter subscription
        async function subscribe(event) {
            event.preventDefault();
            const email = document.getElementById('subscribeEmail').value;

            if (!email) {
                alert('Please enter your email address');
                return;
            }

            try {
                const response = await fetch('/applications/blog/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (data.success) {
                    alert('Successfully subscribed to the newsletter!');
                    document.getElementById('subscribeEmail').value = '';
                } else {
                    alert('Subscription failed: ' + data.error);
                }
            } catch (error) {
                alert('Subscription error: ' + error.message);
            }
        }

        // Analytics tracking
        function trackEvent(eventName, data) {
            fetch('/applications/blog/api/analytics/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: eventName,
                    data: data
                })
            }).catch(error => {
                console.warn('Analytics tracking failed:', error);
            });
        }

        // Quick post form handler
        document.getElementById('quickPostForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            const title = document.getElementById('quickPostTitle').value;
            const content = document.getElementById('quickPostContent').value;
            const categoryId = parseInt(document.getElementById('quickPostCategory').value);

            try {
                const response = await fetch('/applications/blog/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title,
                        content,
                        categoryId,
                        status: 'published'
                    })
                });

                const result = await response.json();

                if (result.success) {
                    alert('Post created successfully!');
                    closeCreatePostModal();
                    document.getElementById('quickPostForm').reset();
                    loadPosts(); // Refresh the posts list
                } else {
                    alert('Error creating post: ' + result.error);
                }
            } catch (error) {
                alert('Error creating post: ' + error.message);
            }
        });

        // Close modals when clicking outside
        document.querySelectorAll('.login-modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                }
            });
        });

        // Track page view
        trackEvent('page_view', {
            page: window.location.pathname,
            referrer: document.referrer,
            userAgent: navigator.userAgent
        });
    </script>
</body>
</html>
      `);
    });

    // Individual post view route
    app.get('/applications/blog/posts/:slug', async (req, res) => {
      const { dataManager } = services;
      const slug = req.params.slug;

      try {
        // Get post data
        const post = await dataManager.findBySlug('posts', slug);

        if (!post || post.status !== 'published' || post.visibility !== 'public') {
          return res.status(404).send(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Post Not Found - Blog Platform</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: system-ui; padding: 2rem; text-align: center;">
                <h1>Post Not Found</h1>
                <p>The requested blog post could not be found.</p>
                <a href="/applications/blog" style="color: #3B82F6;">← Back to Blog</a>
              </body>
            </html>
          `);
        }

        // Get additional data
        const categories = await dataManager.read('categories');
        const authors = await dataManager.read('authors');
        const comments = await dataManager.getCommentsByPost(post.id);

        const category = categories.find(c => c.id === post.categoryId);
        const author = authors.find(a => a.id === post.authorId);

        // Increment view count
        await dataManager.incrementViewCount(post.id);

        res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.seoTitle || post.title} - Blog Platform</title>
    <meta name="description" content="${post.seoDescription || post.excerpt}">
    <meta name="keywords" content="${post.seoKeywords ? post.seoKeywords.join(', ') : ''}">
    <meta name="author" content="${author ? author.displayName : 'Unknown'}">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="/applications/blog/posts/${post.slug}">
    <meta property="og:title" content="${post.title}">
    <meta property="og:description" content="${post.excerpt}">
    ${post.featuredImage ? `<meta property="og:image" content="${post.featuredImage}">` : ''}

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="/applications/blog/posts/${post.slug}">
    <meta property="twitter:title" content="${post.title}">
    <meta property="twitter:description" content="${post.excerpt}">
    ${post.featuredImage ? `<meta property="twitter:image" content="${post.featuredImage}">` : ''}

    <link rel="stylesheet" href="/applications/blog/assets/css/blog-theme.css">
    <style>
        body { font-family: system-ui; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
        .post-header { margin-bottom: 2rem; }
        .post-title { font-size: 2.5rem; margin-bottom: 1rem; }
        .post-meta { color: #666; margin-bottom: 1rem; }
        .post-content { font-size: 1.1rem; line-height: 1.8; }
        .post-content h1, .post-content h2, .post-content h3 { margin-top: 2rem; margin-bottom: 1rem; }
        .post-content p { margin-bottom: 1.5rem; }
        .post-content pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; }
        .post-content code { background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 3px; }
        .post-tags { margin: 2rem 0; }
        .tag { background: #e5e7eb; color: #374151; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem; text-decoration: none; margin-right: 0.5rem; }
        .comments-section { margin-top: 3rem; border-top: 1px solid #e5e7eb; padding-top: 2rem; }
        .comment { margin-bottom: 1.5rem; padding: 1rem; background: #f9fafb; border-radius: 8px; }
        .comment-author { font-weight: bold; margin-bottom: 0.5rem; }
        .comment-date { font-size: 0.875rem; color: #666; }
        .comment-content { margin-top: 0.5rem; }
        .back-link { display: inline-block; margin-bottom: 2rem; color: #3B82F6; text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
        .social-share { margin: 2rem 0; }
        .share-btn { display: inline-block; padding: 0.5rem 1rem; margin-right: 0.5rem; background: #3B82F6; color: white; text-decoration: none; border-radius: 4px; font-size: 0.875rem; }
        .share-btn:hover { background: #2563EB; }
    </style>
</head>
<body>
    <div class="container">
        <a href="/applications/blog" class="back-link">← Back to Blog</a>

        <article class="post">
            <header class="post-header">
                <h1 class="post-title">${post.title}</h1>
                <div class="post-meta">
                    By <strong>${author ? author.displayName : 'Unknown'}</strong>
                    on <strong>${new Date(post.publishedAt).toLocaleDateString()}</strong>
                    ${category ? ` in <strong>${category.name}</strong>` : ''}
                    • ${post.readingTime || 1} min read
                    • ${post.viewCount || 0} views
                </div>
                ${post.featuredImage ? `<img src="${post.featuredImage}" alt="${post.title}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin-top: 1rem;">` : ''}
            </header>

            <div class="post-content">
                ${post.content.replace(/\n/g, '<br>').replace(/#{1,6}\s/g, match => `<h${match.trim().length}>`).replace(/<h(\d)>/g, (match, level) => `<h${level}>`)}
            </div>

            <div class="post-tags">
                ${post.tags.map(tag => `<a href="/applications/blog/tags/${tag}" class="tag">${tag}</a>`).join('')}
            </div>

            <div class="social-share">
                <strong>Share this post:</strong><br>
                <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(req.protocol + '://' + req.get('host') + req.originalUrl)}&text=${encodeURIComponent(post.title)}" target="_blank" class="share-btn">Twitter</a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(req.protocol + '://' + req.get('host') + req.originalUrl)}" target="_blank" class="share-btn">Facebook</a>
                <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(req.protocol + '://' + req.get('host') + req.originalUrl)}" target="_blank" class="share-btn">LinkedIn</a>
            </div>
        </article>

        ${post.allowComments ? `
        <section class="comments-section">
            <h3>Comments (${comments.length})</h3>

            ${comments.length > 0 ? comments.map(comment => `
                <div class="comment">
                    <div class="comment-author">${comment.authorName}</div>
                    <div class="comment-date">${new Date(comment.createdAt).toLocaleDateString()}</div>
                    <div class="comment-content">${comment.content}</div>
                </div>
            `).join('') : '<p>No comments yet. Be the first to comment!</p>'}

            <form onsubmit="submitComment(event)" style="margin-top: 2rem; padding: 1.5rem; background: #f9fafb; border-radius: 8px;">
                <h4>Leave a Comment</h4>
                <div style="margin-bottom: 1rem;">
                    <input type="text" id="authorName" placeholder="Your Name" required style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 1rem;">
                    <input type="email" id="authorEmail" placeholder="Your Email" required style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 1rem;">
                    <input type="url" id="authorWebsite" placeholder="Your Website (optional)" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 1rem;">
                    <textarea id="commentContent" placeholder="Your Comment" required rows="4" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 4px; resize: vertical;"></textarea>
                </div>
                <button type="submit" style="background: #3B82F6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 4px; cursor: pointer;">Submit Comment</button>
            </form>
        </section>
        ` : ''}
    </div>

    <script>
        // Submit comment
        async function submitComment(event) {
            event.preventDefault();

            const authorName = document.getElementById('authorName').value;
            const authorEmail = document.getElementById('authorEmail').value;
            const authorWebsite = document.getElementById('authorWebsite').value;
            const content = document.getElementById('commentContent').value;

            try {
                const response = await fetch('/applications/blog/api/posts/${post.id}/comments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        authorName,
                        authorEmail,
                        authorWebsite,
                        content
                    })
                });

                const data = await response.json();

                if (data.success) {
                    alert('Comment submitted for moderation. It will appear after approval.');
                    document.getElementById('authorName').value = '';
                    document.getElementById('authorEmail').value = '';
                    document.getElementById('authorWebsite').value = '';
                    document.getElementById('commentContent').value = '';
                } else {
                    alert('Failed to submit comment: ' + data.error);
                }
            } catch (error) {
                alert('Error submitting comment: ' + error.message);
            }
        }

        // Track analytics events
        fetch('/applications/blog/api/analytics/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: 'post_view',
                data: {
                    postId: ${post.id},
                    postSlug: '${post.slug}',
                    postTitle: '${post.title}'
                }
            })
        }).catch(error => console.warn('Analytics failed:', error));
    </script>
</body>
</html>
        `);
      } catch (error) {
        logger.error('Error loading blog post:', error);
        res.status(500).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Error - Blog Platform</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: system-ui; padding: 2rem; text-align: center;">
              <h1>Error Loading Post</h1>
              <p>There was an error loading the blog post. Please try again later.</p>
              <a href="/applications/blog" style="color: #3B82F6;">← Back to Blog</a>
            </body>
          </html>
        `);
      }
    });

    // Missing routes that were causing 404s

    // Categories page
    app.get('/applications/blog/categories', async (req, res) => {
      try {
        const categories = await dataManager.read('categories');
        const activeCategories = categories.filter(cat => cat.isActive);

        res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Categories - Blog Platform</title>
    <style>
        body { font-family: system-ui; margin: 0; padding: 2rem; background: #f9fafb; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 2rem; }
        .categories-grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
        .category-card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.3s; }
        .category-card:hover { transform: translateY(-2px); }
        .category-name { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; }
        .category-description { color: #6b7280; margin-bottom: 1rem; }
        .category-meta { font-size: 0.875rem; color: #9ca3af; }
        .back-link { display: inline-block; margin-bottom: 2rem; color: #3B82F6; text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <a href="/applications/blog" class="back-link">← Back to Blog</a>

        <div class="header">
            <h1>Categories</h1>
            <p>Explore posts by category</p>
        </div>

        <div class="categories-grid">
            ${activeCategories.map(category => `
                <div class="category-card">
                    <div class="category-name" style="color: ${category.color || '#3B82F6'};">${category.name}</div>
                    <div class="category-description">${category.description}</div>
                    <div class="category-meta">${category.postCount || 0} posts</div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
        `);
      } catch (error) {
        logger.error('Error loading categories page:', error);
        res.status(500).send('Error loading categories');
      }
    });

    // Authors page
    app.get('/applications/blog/authors', async (req, res) => {
      try {
        const authors = await dataManager.read('authors');
        const activeAuthors = authors.filter(author => author.isActive);

        res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authors - Blog Platform</title>
    <style>
        body { font-family: system-ui; margin: 0; padding: 2rem; background: #f9fafb; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 2rem; }
        .authors-grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
        .author-card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
        .author-avatar { width: 80px; height: 80px; border-radius: 50%; background: #e5e7eb; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 2rem; }
        .author-name { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
        .author-bio { color: #6b7280; margin-bottom: 1rem; font-size: 0.875rem; }
        .author-stats { font-size: 0.875rem; color: #9ca3af; }
        .back-link { display: inline-block; margin-bottom: 2rem; color: #3B82F6; text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <a href="/applications/blog" class="back-link">← Back to Blog</a>

        <div class="header">
            <h1>Authors</h1>
            <p>Meet our content creators</p>
        </div>

        <div class="authors-grid">
            ${activeAuthors.map(author => `
                <div class="author-card">
                    <div class="author-avatar">
                        ${author.avatar ? `<img src="${author.avatar}" alt="${author.displayName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` : '👤'}
                    </div>
                    <div class="author-name">${author.displayName}</div>
                    <div class="author-bio">${author.bio || 'Content creator and blogger'}</div>
                    <div class="author-stats">${author.postCount || 0} posts published</div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
        `);
      } catch (error) {
        logger.error('Error loading authors page:', error);
        res.status(500).send('Error loading authors');
      }
    });

    // About page
    app.get('/applications/blog/about', (req, res) => {
      res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About - Blog Platform</title>
    <style>
        body { font-family: system-ui; margin: 0; padding: 2rem; background: #f9fafb; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 2rem; }
        .content h2 { color: #374151; margin-top: 2rem; }
        .content p { color: #6b7280; line-height: 1.6; margin-bottom: 1rem; }
        .features { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin: 2rem 0; }
        .feature { background: #f3f4f6; padding: 1rem; border-radius: 8px; }
        .back-link { display: inline-block; margin-bottom: 2rem; color: #3B82F6; text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <a href="/applications/blog" class="back-link">← Back to Blog</a>

        <div class="header">
            <h1>About Our Blog Platform</h1>
            <p>Powered by NooblyJS Framework</p>
        </div>

        <div class="content">
            <p>Welcome to our modern blog platform built with the powerful NooblyJS framework. Our platform combines cutting-edge technology with user-friendly design to provide an exceptional blogging experience.</p>

            <h2>Features</h2>
            <div class="features">
                <div class="feature">
                    <strong>Rich Content Creation</strong><br>
                    Advanced editor with markdown support
                </div>
                <div class="feature">
                    <strong>SEO Optimized</strong><br>
                    Built-in SEO tools and optimization
                </div>
                <div class="feature">
                    <strong>Community Driven</strong><br>
                    Comments and social engagement
                </div>
                <div class="feature">
                    <strong>Analytics</strong><br>
                    Comprehensive performance tracking
                </div>
                <div class="feature">
                    <strong>Responsive Design</strong><br>
                    Perfect on all devices
                </div>
                <div class="feature">
                    <strong>Fast & Secure</strong><br>
                    High performance with security
                </div>
            </div>

            <h2>Technology Stack</h2>
            <p>Our platform is built using modern web technologies including:</p>
            <ul>
                <li><strong>NooblyJS Core:</strong> Microservices architecture for scalability</li>
                <li><strong>Express.js:</strong> Fast and minimal web framework</li>
                <li><strong>JSON Storage:</strong> Efficient data management</li>
                <li><strong>Real-time Search:</strong> Fast content discovery</li>
                <li><strong>Background Processing:</strong> Efficient task handling</li>
            </ul>

            <h2>Mission</h2>
            <p>Our mission is to provide a powerful, user-friendly blogging platform that enables content creators to focus on what they do best - creating amazing content. We handle the technical complexities so you can concentrate on engaging with your audience.</p>

            <p><strong>Ready to start blogging?</strong> <a href="/applications/blog" style="color: #3B82F6;">Get started today!</a></p>
        </div>
    </div>
</body>
</html>
      `);
    });

    // Admin interface route (disabled)
    app.get('/applications/blog/admin-disabled', (req, res) => {
      if (!req.session.blogAuthenticated) {
        return res.redirect('/applications/blog?login=required');
      }

      res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog Admin - Dashboard</title>
    <style>
        :root {
            --primary: #3B82F6;
            --secondary: #10B981;
            --danger: #EF4444;
            --warning: #F59E0B;
            --gray-50: #F9FAFB;
            --gray-100: #F3F4F6;
            --gray-200: #E5E7EB;
            --gray-300: #D1D5DB;
            --gray-400: #9CA3AF;
            --gray-500: #6B7280;
            --gray-600: #4B5563;
            --gray-700: #374151;
            --gray-800: #1F2937;
            --gray-900: #111827;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui; background: var(--gray-50); color: var(--gray-900); }

        .admin-header {
            background: white;
            border-bottom: 1px solid var(--gray-200);
            padding: 1rem 0;
            margin-bottom: 2rem;
        }

        .admin-nav {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .admin-logo {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--primary);
        }

        .admin-user {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
        }

        .admin-tabs {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
            border-bottom: 1px solid var(--gray-200);
        }

        .tab {
            padding: 0.75rem 1rem;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 0.875rem;
            color: var(--gray-600);
            border-bottom: 2px solid transparent;
            transition: all 0.3s;
        }

        .tab.active {
            color: var(--primary);
            border-bottom-color: var(--primary);
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .stat-value {
            font-size: 2rem;
            font-weight: 600;
            color: var(--primary);
        }

        .stat-label {
            color: var(--gray-600);
            font-size: 0.875rem;
            margin-top: 0.5rem;
        }

        .content-section {
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .section-header {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--gray-200);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s;
        }

        .btn-primary {
            background: var(--primary);
            color: white;
        }

        .btn-primary:hover {
            background: #2563EB;
        }

        .btn-danger {
            background: var(--danger);
            color: white;
        }

        .btn-danger:hover {
            background: #DC2626;
        }

        .btn-secondary {
            background: var(--gray-200);
            color: var(--gray-700);
        }

        .btn-secondary:hover {
            background: var(--gray-300);
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
        }

        .data-table th,
        .data-table td {
            padding: 0.75rem 1.5rem;
            text-align: left;
            border-bottom: 1px solid var(--gray-200);
        }

        .data-table th {
            background: var(--gray-50);
            font-weight: 600;
            color: var(--gray-700);
        }

        .status {
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 500;
        }

        .status-published {
            background: #D1FAE5;
            color: #065F46;
        }

        .status-draft {
            background: #FEF3C7;
            color: #92400E;
        }

        .status-scheduled {
            background: #DBEAFE;
            color: #1E40AF;
        }

        .actions {
            display: flex;
            gap: 0.5rem;
        }

        .form-group {
            margin-bottom: 1rem;
        }

        .form-label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: var(--gray-700);
        }

        .form-input,
        .form-textarea,
        .form-select {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid var(--gray-300);
            border-radius: 4px;
            font-size: 0.875rem;
        }

        .form-textarea {
            resize: vertical;
            min-height: 100px;
        }

        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
        }

        .modal.active {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .modal-content {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--gray-200);
        }

        .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--gray-500);
        }

        .loading {
            text-align: center;
            padding: 2rem;
            color: var(--gray-600);
        }

        .empty-state {
            text-align: center;
            padding: 3rem;
            color: var(--gray-600);
        }

        .tags-input {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            padding: 0.5rem;
            border: 1px solid var(--gray-300);
            border-radius: 4px;
            min-height: 40px;
        }

        .tag {
            background: var(--primary);
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.75rem;
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }

        .tag-remove {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 0.75rem;
        }

        .color-picker {
            width: 40px;
            height: 40px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <header class="admin-header">
        <div class="admin-nav">
            <div class="admin-logo">🌟 Blog Admin</div>
            <div class="admin-user">
                <span>Welcome, Admin</span>
                <a href="/applications/blog" class="btn btn-secondary">View Blog</a>
                <button onclick="logout()" class="btn btn-danger">Logout</button>
            </div>
        </div>
    </header>

    <div class="container">
        <div class="admin-tabs">
            <button class="tab active" onclick="showTab('dashboard')">Dashboard</button>
            <button class="tab" onclick="showTab('posts')">Posts</button>
            <button class="tab" onclick="showTab('categories')">Categories</button>
            <button class="tab" onclick="showTab('comments')">Comments</button>
            <button class="tab" onclick="showTab('settings')">Settings</button>
        </div>

        <!-- Dashboard Tab -->
        <div id="dashboard" class="tab-content active">
            <div class="stats-grid" id="statsGrid">
                <div class="stat-card">
                    <div class="stat-value" id="totalPosts">-</div>
                    <div class="stat-label">Total Posts</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="totalComments">-</div>
                    <div class="stat-label">Comments</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="totalViews">-</div>
                    <div class="stat-label">Total Views</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="totalSubscribers">-</div>
                    <div class="stat-label">Subscribers</div>
                </div>
            </div>

            <div class="content-section">
                <div class="section-header">
                    <h2>Recent Activity</h2>
                </div>
                <div id="recentActivity" class="loading">Loading recent activity...</div>
            </div>
        </div>

        <!-- Posts Tab -->
        <div id="posts" class="tab-content">
            <div class="content-section">
                <div class="section-header">
                    <h2>Manage Posts</h2>
                    <button onclick="showCreatePostModal()" class="btn btn-primary">New Post</button>
                </div>
                <div id="postsTable" class="loading">Loading posts...</div>
            </div>
        </div>

        <!-- Categories Tab -->
        <div id="categories" class="tab-content">
            <div class="content-section">
                <div class="section-header">
                    <h2>Manage Categories</h2>
                    <button onclick="showCreateCategoryModal()" class="btn btn-primary">New Category</button>
                </div>
                <div id="categoriesTable" class="loading">Loading categories...</div>
            </div>
        </div>

        <!-- Comments Tab -->
        <div id="comments" class="tab-content">
            <div class="content-section">
                <div class="section-header">
                    <h2>Manage Comments</h2>
                </div>
                <div id="commentsTable" class="loading">Loading comments...</div>
            </div>
        </div>

        <!-- Settings Tab -->
        <div id="settings" class="tab-content">
            <div class="content-section">
                <div class="section-header">
                    <h2>Blog Settings</h2>
                    <button onclick="saveSettings()" class="btn btn-primary">Save Changes</button>
                </div>
                <div id="settingsForm" class="loading">Loading settings...</div>
            </div>
        </div>
    </div>

    <!-- Post Modal -->
    <div id="postModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="postModalTitle">Create New Post</h3>
                <button class="close-btn" onclick="closeModal('postModal')">&times;</button>
            </div>
            <form id="postForm">
                <input type="hidden" id="postId" name="id">
                <div class="form-group">
                    <label class="form-label" for="postTitle">Title</label>
                    <input type="text" id="postTitle" name="title" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="postExcerpt">Excerpt</label>
                    <textarea id="postExcerpt" name="excerpt" class="form-textarea" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label" for="postContent">Content</label>
                    <textarea id="postContent" name="content" class="form-textarea" rows="10" required></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label" for="postCategory">Category</label>
                    <select id="postCategory" name="categoryId" class="form-select" required>
                        <option value="">Select Category</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Tags</label>
                    <div class="tags-input" id="tagsInput">
                        <input type="text" placeholder="Press Enter to add tag" onkeypress="addTag(event)">
                    </div>
                    <input type="hidden" id="postTags" name="tags">
                </div>
                <div class="form-group">
                    <label class="form-label" for="postStatus">Status</label>
                    <select id="postStatus" name="status" class="form-select">
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="scheduled">Scheduled</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="postSeoTitle">SEO Title</label>
                    <input type="text" id="postSeoTitle" name="seoTitle" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label" for="postSeoDescription">SEO Description</label>
                    <textarea id="postSeoDescription" name="seoDescription" class="form-textarea" rows="3"></textarea>
                </div>
                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                    <button type="button" onclick="closeModal('postModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Post</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Category Modal -->
    <div id="categoryModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="categoryModalTitle">Create New Category</h3>
                <button class="close-btn" onclick="closeModal('categoryModal')">&times;</button>
            </div>
            <form id="categoryForm">
                <input type="hidden" id="categoryId" name="id">
                <div class="form-group">
                    <label class="form-label" for="categoryName">Name</label>
                    <input type="text" id="categoryName" name="name" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="categoryDescription">Description</label>
                    <textarea id="categoryDescription" name="description" class="form-textarea" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label" for="categoryColor">Color</label>
                    <input type="color" id="categoryColor" name="color" class="color-picker" value="#3B82F6">
                </div>
                <div class="form-group">
                    <label class="form-label" for="categorySeoTitle">SEO Title</label>
                    <input type="text" id="categorySeoTitle" name="seoTitle" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label" for="categorySeoDescription">SEO Description</label>
                    <textarea id="categorySeoDescription" name="seoDescription" class="form-textarea" rows="3"></textarea>
                </div>
                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                    <button type="button" onclick="closeModal('categoryModal')" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Category</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        let currentPosts = [];
        let currentCategories = [];
        let currentTags = [];

        // Initialize admin interface
        document.addEventListener('DOMContentLoaded', function() {
            loadDashboard();
        });

        // Tab management
        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });

            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');

            // Load tab content
            switch(tabName) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'posts':
                    loadPosts();
                    break;
                case 'categories':
                    loadCategories();
                    break;
                case 'comments':
                    loadComments();
                    break;
                case 'settings':
                    loadSettings();
                    break;
            }
        }

        // Dashboard functions
        async function loadDashboard() {
            try {
                const response = await fetch('/applications/blog/api/analytics/stats');
                const stats = await response.json();

                document.getElementById('totalPosts').textContent = stats.totalPosts || 0;
                document.getElementById('totalComments').textContent = stats.totalComments || 0;
                document.getElementById('totalViews').textContent = stats.totalViews || 0;
                document.getElementById('totalSubscribers').textContent = stats.totalSubscribers || 0;

                // Load recent activity
                loadRecentActivity();
            } catch (error) {
                console.error('Error loading dashboard:', error);
            }
        }

        async function loadRecentActivity() {
            try {
                const response = await fetch('/applications/blog/api/admin/posts');
                const posts = await response.json();

                const recentPosts = posts.slice(0, 5);
                const activityHtml = recentPosts.length > 0 ?
                    recentPosts.map(post =>
                        '<div style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--gray-200); display: flex; justify-content: space-between; align-items: center;">' +
                            '<div>' +
                                '<div style="font-weight: 500;">' + post.title + '</div>' +
                                '<div style="font-size: 0.875rem; color: var(--gray-600);">' +
                                    (post.status === 'published' ? 'Published' : 'Draft') + ' • ' + new Date(post.createdAt).toLocaleDateString() +
                                '</div>' +
                            '</div>' +
                            '<span class="status status-' + post.status + '">' + post.status + '</span>' +
                        '</div>'
                    ).join('') :
                    '<div class="empty-state">No recent activity</div>';

                document.getElementById('recentActivity').innerHTML = activityHtml;
            } catch (error) {
                document.getElementById('recentActivity').innerHTML = '<div style="padding: 1rem; color: red;">Error loading activity</div>';
            }
        }

        // Posts management
        async function loadPosts() {
            try {
                const response = await fetch('/applications/blog/api/admin/posts');
                currentPosts = await response.json();

                const postsHtml = currentPosts.length > 0 ?
                    '<table class="data-table">' +
                        '<thead>' +
                            '<tr>' +
                                '<th>Title</th>' +
                                '<th>Category</th>' +
                                '<th>Status</th>' +
                                '<th>Date</th>' +
                                '<th>Views</th>' +
                                '<th>Actions</th>' +
                            '</tr>' +
                        '</thead>' +
                        '<tbody>' +
                            currentPosts.map(post =>
                                '<tr>' +
                                    '<td>' +
                                        '<div style="font-weight: 500;">' + post.title + '</div>' +
                                        '<div style="font-size: 0.875rem; color: var(--gray-600);">' + (post.excerpt ? post.excerpt.substring(0, 50) + '...' : '') + '</div>' +
                                    '</td>' +
                                    '<td>' + (post.category ? post.category.name : 'Uncategorized') + '</td>' +
                                    '<td><span class="status status-' + post.status + '">' + post.status + '</span></td>' +
                                    '<td>' + new Date(post.createdAt).toLocaleDateString() + '</td>' +
                                    '<td>' + (post.viewCount || 0) + '</td>' +
                                    '<td>' +
                                        '<div class="actions">' +
                                            '<button onclick="editPost(' + post.id + ')" class="btn btn-secondary">Edit</button>' +
                                            '<button onclick="deletePost(' + post.id + ')" class="btn btn-danger">Delete</button>' +
                                        '</div>' +
                                    '</td>' +
                                '</tr>'
                            ).join('') +
                        '</tbody>' +
                    '</table>' :
                    '<div class="empty-state">No posts found. <button onclick="showCreatePostModal()" class="btn btn-primary">Create your first post</button></div>';

                document.getElementById('postsTable').innerHTML = postsHtml;
            } catch (error) {
                document.getElementById('postsTable').innerHTML = '<div style="padding: 1rem; color: red;">Error loading posts</div>';
            }
        }

        async function loadCategories() {
            try {
                const response = await fetch('/applications/blog/api/categories');
                currentCategories = await response.json();

                const categoriesHtml = currentCategories.length > 0 ?
                    '<table class="data-table">' +
                        '<thead>' +
                            '<tr>' +
                                '<th>Name</th>' +
                                '<th>Description</th>' +
                                '<th>Posts</th>' +
                                '<th>Color</th>' +
                                '<th>Actions</th>' +
                            '</tr>' +
                        '</thead>' +
                        '<tbody>' +
                            currentCategories.map(category =>
                                '<tr>' +
                                    '<td style="font-weight: 500;">' + category.name + '</td>' +
                                    '<td>' + (category.description || 'No description') + '</td>' +
                                    '<td>' + (category.postCount || 0) + '</td>' +
                                    '<td>' +
                                        '<div style="width: 20px; height: 20px; background: ' + category.color + '; border-radius: 4px;"></div>' +
                                    '</td>' +
                                    '<td>' +
                                        '<div class="actions">' +
                                            '<button onclick="editCategory(' + category.id + ')" class="btn btn-secondary">Edit</button>' +
                                            '<button onclick="deleteCategory(' + category.id + ')" class="btn btn-danger">Delete</button>' +
                                        '</div>' +
                                    '</td>' +
                                '</tr>'
                            ).join('') +
                        '</tbody>' +
                    '</table>' :
                    '<div class="empty-state">No categories found. <button onclick="showCreateCategoryModal()" class="btn btn-primary">Create your first category</button></div>';

                document.getElementById('categoriesTable').innerHTML = categoriesHtml;
            } catch (error) {
                document.getElementById('categoriesTable').innerHTML = '<div style="padding: 1rem; color: red;">Error loading categories</div>';
            }
        }

        async function loadComments() {
            document.getElementById('commentsTable').innerHTML = '<div class="empty-state">Comment management coming soon!</div>';
        }

        async function loadSettings() {
            document.getElementById('settingsForm').innerHTML = '<div class="empty-state">Settings management coming soon!</div>';
        }

        // Modal management
        function showCreatePostModal() {
            loadCategoriesForSelect();
            document.getElementById('postModalTitle').textContent = 'Create New Post';
            document.getElementById('postForm').reset();
            document.getElementById('postId').value = '';
            currentTags = [];
            updateTagsDisplay();
            document.getElementById('postModal').classList.add('active');
        }

        function showCreateCategoryModal() {
            document.getElementById('categoryModalTitle').textContent = 'Create New Category';
            document.getElementById('categoryForm').reset();
            document.getElementById('categoryId').value = '';
            document.getElementById('categoryModal').classList.add('active');
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
        }

        // Post management functions
        async function editPost(postId) {
            try {
                const response = await fetch('/applications/blog/api/admin/posts/' + postId);
                const post = await response.json();

                loadCategoriesForSelect();

                document.getElementById('postModalTitle').textContent = 'Edit Post';
                document.getElementById('postId').value = post.id;
                document.getElementById('postTitle').value = post.title;
                document.getElementById('postExcerpt').value = post.excerpt || '';
                document.getElementById('postContent').value = post.content;
                document.getElementById('postCategory').value = post.categoryId;
                document.getElementById('postStatus').value = post.status;
                document.getElementById('postSeoTitle').value = post.seoTitle || '';
                document.getElementById('postSeoDescription').value = post.seoDescription || '';

                currentTags = post.tags || [];
                updateTagsDisplay();

                document.getElementById('postModal').classList.add('active');
            } catch (error) {
                alert('Error loading post: ' + error.message);
            }
        }

        async function deletePost(postId) {
            if (!confirm('Are you sure you want to delete this post?')) return;

            try {
                const response = await fetch('/applications/blog/api/posts/' + postId, {
                    method: 'DELETE'
                });

                const result = await response.json();

                if (result.success) {
                    alert('Post deleted successfully');
                    loadPosts();
                } else {
                    alert('Error deleting post: ' + result.error);
                }
            } catch (error) {
                alert('Error deleting post: ' + error.message);
            }
        }

        // Category management functions
        async function editCategory(categoryId) {
            const category = currentCategories.find(c => c.id === categoryId);
            if (!category) return;

            document.getElementById('categoryModalTitle').textContent = 'Edit Category';
            document.getElementById('categoryId').value = category.id;
            document.getElementById('categoryName').value = category.name;
            document.getElementById('categoryDescription').value = category.description || '';
            document.getElementById('categoryColor').value = category.color || '#3B82F6';
            document.getElementById('categorySeoTitle').value = category.seoTitle || '';
            document.getElementById('categorySeoDescription').value = category.seoDescription || '';

            document.getElementById('categoryModal').classList.add('active');
        }

        async function deleteCategory(categoryId) {
            if (!confirm('Are you sure you want to delete this category?')) return;

            try {
                const response = await fetch('/applications/blog/api/categories/' + categoryId, {
                    method: 'DELETE'
                });

                const result = await response.json();

                if (result.success) {
                    alert('Category deleted successfully');
                    loadCategories();
                } else {
                    alert('Error deleting category: ' + result.error);
                }
            } catch (error) {
                alert('Error deleting category: ' + error.message);
            }
        }

        // Form submissions
        document.getElementById('postForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData(e.target);
            const postData = Object.fromEntries(formData.entries());
            postData.tags = currentTags;

            const postId = document.getElementById('postId').value;
            const isEdit = !!postId;

            try {
                const response = await fetch(
                    isEdit ? '/applications/blog/api/posts/' + postId : '/applications/blog/api/posts',
                    {
                        method: isEdit ? 'PUT' : 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(postData)
                    }
                );

                const result = await response.json();

                if (result.success) {
                    alert('Post ' + (isEdit ? 'updated' : 'created') + ' successfully');
                    closeModal('postModal');
                    loadPosts();
                } else {
                    alert('Error ' + (isEdit ? 'updating' : 'creating') + ' post: ' + result.error);
                }
            } catch (error) {
                alert('Error ' + (isEdit ? 'updating' : 'creating') + ' post: ' + error.message);
            }
        });

        document.getElementById('categoryForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData(e.target);
            const categoryData = Object.fromEntries(formData.entries());

            const categoryId = document.getElementById('categoryId').value;
            const isEdit = !!categoryId;

            try {
                const response = await fetch(
                    isEdit ? '/applications/blog/api/categories/' + categoryId : '/applications/blog/api/categories',
                    {
                        method: isEdit ? 'PUT' : 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(categoryData)
                    }
                );

                const result = await response.json();

                if (result.success) {
                    alert('Category ' + (isEdit ? 'updated' : 'created') + ' successfully');
                    closeModal('categoryModal');
                    loadCategories();
                } else {
                    alert('Error ' + (isEdit ? 'updating' : 'creating') + ' category: ' + result.error);
                }
            } catch (error) {
                alert('Error ' + (isEdit ? 'updating' : 'creating') + ' category: ' + error.message);
            }
        });

        // Helper functions
        async function loadCategoriesForSelect() {
            try {
                const response = await fetch('/applications/blog/api/categories');
                const categories = await response.json();

                const select = document.getElementById('postCategory');
                select.innerHTML = '<option value="">Select Category</option>' +
                    categories.map(cat => '<option value="' + cat.id + '">' + cat.name + '</option>').join('');
            } catch (error) {
                console.error('Error loading categories for select:', error);
            }
        }

        // Tags management
        function addTag(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const input = event.target;
                const tag = input.value.trim();

                if (tag && !currentTags.includes(tag)) {
                    currentTags.push(tag);
                    updateTagsDisplay();
                    input.value = '';
                }
            }
        }

        function removeTag(tagIndex) {
            currentTags.splice(tagIndex, 1);
            updateTagsDisplay();
        }

        function updateTagsDisplay() {
            const container = document.getElementById('tagsInput');
            const input = container.querySelector('input');

            // Clear existing tags
            container.querySelectorAll('.tag').forEach(tag => tag.remove());

            // Add current tags
            currentTags.forEach((tag, index) => {
                const tagEl = document.createElement('span');
                tagEl.className = 'tag';
                tagEl.innerHTML =
                    tag +
                    '<button type="button" class="tag-remove" onclick="removeTag(' + index + ')">&times;</button>';
                container.insertBefore(tagEl, input);
            });

            // Update hidden input
            document.getElementById('postTags').value = JSON.stringify(currentTags);
        }

        // Authentication
        async function logout() {
            try {
                await fetch('/applications/blog/logout', { method: 'POST' });
                window.location.href = '/applications/blog';
            } catch (error) {
                alert('Logout error: ' + error.message);
            }
        }

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                }
            });
        });
    </script>
</body>
</html>
      `);
    });

    logger.info('Blog views registered successfully');
  } catch (error) {
    logger.error('Failed to register blog views:', error);
  }
};
