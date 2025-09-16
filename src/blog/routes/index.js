/**
 * @fileoverview Blog API routes for Express.js application.
 * Provides comprehensive RESTful endpoints for blog platform operations
 * including posts, categories, comments, authors, analytics, and more.
 *
 * @author NooblyJS Core Team
 * @version 1.0.0
 * @since 2025-09-16
 */

'use strict';

const path = require('path');
const mime = require('mime-types');

/**
 * Configures and registers blog routes with the Express application.
 * Integrates with noobly-core services for data persistence, caching, file storage, etc.
 *
 * @param {Object} options - Configuration options object
 * @param {Object} options.express-app - The Express application instance
 * @param {Object} eventEmitter - Event emitter for logging and notifications
 * @param {Object} services - NooblyJS Core services
 * @return {void}
 */
module.exports = (options, eventEmitter, services) => {
  const app = options;
  const { dataManager, filing, cache, logger, queue, search, scheduling, measuring, notifying, worker, workflow } = services;

  // ===== AUTHENTICATION ROUTES =====

  app.post('/applications/blog/login', (req, res) => {
    const { username, password } = req.body;

    if (username === 'admin' && password === 'password') {
      req.session.blogAuthenticated = true;
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });

  app.post('/applications/blog/logout', (req, res) => {
    req.session.blogAuthenticated = false;
    res.json({ success: true, message: 'Logout successful' });
  });

  app.get('/applications/blog/api/auth/check', (req, res) => {
    res.json({ authenticated: !!req.session.blogAuthenticated });
  });

  // ===== BLOG POSTS ROUTES =====

  // Get all published posts with pagination
  app.get('/applications/blog/api/posts', async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const category = req.query.category;
      const tag = req.query.tag;
      const author = req.query.author;
      const featured = req.query.featured === 'true';

      const cacheKey = `blog:posts:${page}:${limit}:${category || ''}:${tag || ''}:${author || ''}:${featured}`;
      let posts = await cache.get(cacheKey);

      if (!posts) {
        if (category) {
          const categoryObj = await dataManager.findBySlug('categories', category);
          posts = categoryObj ? await dataManager.getPostsByCategory(categoryObj.id, limit) : [];
        } else if (tag) {
          posts = await dataManager.getPostsByTag(tag, limit);
        } else if (author) {
          const authorObj = await dataManager.findBySlug('authors', author);
          posts = authorObj ? await dataManager.getPostsByAuthor(authorObj.id, limit) : [];
        } else if (featured) {
          posts = await dataManager.getFeaturedPosts(limit);
        } else {
          posts = await dataManager.getPublishedPosts(limit, offset);
        }

        // Enrich posts with category and author data
        const categories = await dataManager.read('categories');
        const authors = await dataManager.read('authors');

        posts = posts.map(post => {
          const category = categories.find(c => c.id === post.categoryId);
          const author = authors.find(a => a.id === post.authorId);

          return {
            ...post,
            category: category || null,
            author: author ? {
              id: author.id,
              displayName: author.displayName,
              avatar: author.avatar,
              bio: author.bio
            } : null
          };
        });

        await cache.put(cacheKey, posts, 300); // Cache for 5 minutes
        logger.info(`Loaded ${posts.length} blog posts from dataManager and cached`);
      } else {
        logger.info('Loaded blog posts from cache');
      }

      res.json({
        posts,
        pagination: {
          page,
          limit,
          total: posts.length,
          hasNext: posts.length === limit,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      logger.error('Error fetching blog posts:', error);
      res.status(500).json({ error: 'Failed to fetch blog posts' });
    }
  });

  // Get single post by slug
  app.get('/applications/blog/api/posts/:slug', async (req, res) => {
    try {
      const slug = req.params.slug;
      const cacheKey = `blog:post:${slug}`;

      let post = await cache.get(cacheKey);

      if (!post) {
        post = await dataManager.findBySlug('posts', slug);

        if (!post || post.status !== 'published' || post.visibility !== 'public') {
          return res.status(404).json({ error: 'Post not found' });
        }

        // Enrich with category and author data
        const categories = await dataManager.read('categories');
        const authors = await dataManager.read('authors');
        const comments = await dataManager.getCommentsByPost(post.id);

        const category = categories.find(c => c.id === post.categoryId);
        const author = authors.find(a => a.id === post.authorId);

        post = {
          ...post,
          category: category || null,
          author: author ? {
            id: author.id,
            displayName: author.displayName,
            avatar: author.avatar,
            bio: author.bio,
            website: author.website,
            socialLinks: author.socialLinks
          } : null,
          comments: comments || []
        };

        // Increment view count in background
        queue.enqueue({
          type: 'updatePostMetadata',
          postId: post.id,
          updates: {
            viewCount: (post.viewCount || 0) + 1,
            updatedAt: new Date().toISOString()
          }
        });

        // Record analytics
        queue.enqueue({
          type: 'updateAnalytics',
          event: 'post_view',
          data: {
            postId: post.id,
            postSlug: post.slug,
            timestamp: new Date().toISOString()
          }
        });

        await cache.put(cacheKey, post, 600); // Cache for 10 minutes
      }

      res.json(post);
    } catch (error) {
      logger.error('Error fetching blog post:', error);
      res.status(500).json({ error: 'Failed to fetch blog post' });
    }
  });

  // Create new post (authenticated)
  app.post('/applications/blog/api/posts', async (req, res) => {
    try {
      if (!req.session.blogAuthenticated) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const {
        title,
        content,
        excerpt,
        categoryId,
        tags,
        status,
        visibility,
        featuredImage,
        seoTitle,
        seoDescription,
        seoKeywords,
        publishAt,
        isSticky,
        isFeatured,
        allowComments
      } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }

      // Generate slug from title
      const slug = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Check if slug exists
      const existingPost = await dataManager.findBySlug('posts', slug);
      if (existingPost) {
        return res.status(400).json({ error: 'A post with this title already exists' });
      }

      const postId = await dataManager.getNextId('posts');
      const now = new Date().toISOString();

      const newPost = {
        id: postId,
        title,
        slug,
        content,
        excerpt: excerpt || content.substring(0, 150) + '...',
        authorId: 1, // Default admin author
        categoryId: categoryId || 1,
        status: status || 'draft',
        visibility: visibility || 'public',
        featuredImage: featuredImage || null,
        tags: tags || [],
        seoTitle: seoTitle || title,
        seoDescription: seoDescription || excerpt,
        seoKeywords: seoKeywords || [],
        publishedAt: status === 'published' ? now : (publishAt || null),
        createdAt: now,
        updatedAt: now,
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        readingTime: Math.ceil(content.split(' ').length / 200),
        isSticky: isSticky || false,
        isFeatured: isFeatured || false,
        allowComments: allowComments !== false,
        customFields: {}
      };

      await dataManager.add('posts', newPost);

      // Create post file
      queue.enqueue({
        type: 'createPostFile',
        postId: postId,
        content: content
      });

      // Index for search if published
      if (status === 'published') {
        queue.enqueue({
          type: 'indexPostForSearch',
          postId: postId
        });
      }

      // Schedule publishing if needed
      if (publishAt && status === 'scheduled') {
        queue.enqueue({
          type: 'schedulePost',
          postId: postId,
          publishAt: publishAt
        });
      }

      // Clear relevant caches
      await cache.delete('blog:posts:*');

      logger.info(`Created new blog post: ${title} (ID: ${postId})`);

      res.json({
        success: true,
        message: 'Post created successfully',
        post: newPost
      });
    } catch (error) {
      logger.error('Error creating blog post:', error);
      res.status(500).json({ error: 'Failed to create blog post' });
    }
  });

  // Update post (authenticated)
  app.put('/applications/blog/api/posts/:id', async (req, res) => {
    try {
      if (!req.session.blogAuthenticated) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const postId = parseInt(req.params.id);
      const updates = { ...req.body, updatedAt: new Date().toISOString() };

      // Update reading time if content changed
      if (updates.content) {
        updates.readingTime = Math.ceil(updates.content.split(' ').length / 200);
      }

      const success = await dataManager.update('posts', postId, updates);

      if (!success) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Update post file if content changed
      if (updates.content) {
        queue.enqueue({
          type: 'updatePostFile',
          postId: postId,
          content: updates.content
        });
      }

      // Update search index
      queue.enqueue({
        type: 'indexPostForSearch',
        postId: postId
      });

      // Clear caches
      await cache.delete(`blog:post:*`);
      await cache.delete('blog:posts:*');

      logger.info(`Updated blog post: ${postId}`);

      res.json({
        success: true,
        message: 'Post updated successfully'
      });
    } catch (error) {
      logger.error('Error updating blog post:', error);
      res.status(500).json({ error: 'Failed to update blog post' });
    }
  });

  // Delete post (authenticated)
  app.delete('/applications/blog/api/posts/:id', async (req, res) => {
    try {
      if (!req.session.blogAuthenticated) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const postId = parseInt(req.params.id);

      const success = await dataManager.delete('posts', postId);

      if (!success) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Delete post file
      queue.enqueue({
        type: 'deletePostFile',
        postId: postId
      });

      // Remove from search index
      queue.enqueue({
        type: 'removePostFromSearch',
        postId: postId
      });

      // Clear caches
      await cache.delete(`blog:post:*`);
      await cache.delete('blog:posts:*');

      logger.info(`Deleted blog post: ${postId}`);

      res.json({
        success: true,
        message: 'Post deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting blog post:', error);
      res.status(500).json({ error: 'Failed to delete blog post' });
    }
  });

  // ===== CATEGORIES ROUTES =====

  // Get all categories
  app.get('/applications/blog/api/categories', async (req, res) => {
    try {
      const cacheKey = 'blog:categories:all';
      let categories = await cache.get(cacheKey);

      if (!categories) {
        categories = await dataManager.read('categories');
        categories = categories.filter(cat => cat.isActive);

        // Add post counts
        for (let category of categories) {
          const posts = await dataManager.getPostsByCategory(category.id);
          category.postCount = posts.length;
        }

        await cache.put(cacheKey, categories, 600);
      }

      res.json(categories);
    } catch (error) {
      logger.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // Get category by slug
  app.get('/applications/blog/api/categories/:slug', async (req, res) => {
    try {
      const slug = req.params.slug;
      const category = await dataManager.findBySlug('categories', slug);

      if (!category || !category.isActive) {
        return res.status(404).json({ error: 'Category not found' });
      }

      const posts = await dataManager.getPostsByCategory(category.id, 10);

      res.json({
        ...category,
        posts
      });
    } catch (error) {
      logger.error('Error fetching category:', error);
      res.status(500).json({ error: 'Failed to fetch category' });
    }
  });

  // Create category (authenticated)
  app.post('/applications/blog/api/categories', async (req, res) => {
    try {
      if (!req.session.blogAuthenticated) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { name, description, color, parentId, seoTitle, seoDescription } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
      }

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const categoryId = await dataManager.getNextId('categories');
      const now = new Date().toISOString();

      const newCategory = {
        id: categoryId,
        name,
        slug,
        description: description || '',
        color: color || '#3B82F6',
        parentId: parentId || null,
        postCount: 0,
        isActive: true,
        seoTitle: seoTitle || name,
        seoDescription: seoDescription || description,
        createdAt: now,
        updatedAt: now
      };

      await dataManager.add('categories', newCategory);
      await cache.delete('blog:categories:*');

      res.json({
        success: true,
        message: 'Category created successfully',
        category: newCategory
      });
    } catch (error) {
      logger.error('Error creating category:', error);
      res.status(500).json({ error: 'Failed to create category' });
    }
  });

  // ===== AUTHORS ROUTES =====

  // Get all active authors
  app.get('/applications/blog/api/authors', async (req, res) => {
    try {
      const cacheKey = 'blog:authors:active';
      let authors = await cache.get(cacheKey);

      if (!authors) {
        authors = await dataManager.read('authors');
        authors = authors.filter(author => author.isActive).map(author => ({
          id: author.id,
          username: author.username,
          displayName: author.displayName,
          bio: author.bio,
          avatar: author.avatar,
          website: author.website,
          socialLinks: author.socialLinks,
          postCount: author.postCount,
          createdAt: author.createdAt
        }));

        await cache.put(cacheKey, authors, 600);
      }

      res.json(authors);
    } catch (error) {
      logger.error('Error fetching authors:', error);
      res.status(500).json({ error: 'Failed to fetch authors' });
    }
  });

  // Get author by username
  app.get('/applications/blog/api/authors/:username', async (req, res) => {
    try {
      const username = req.params.username;
      const authors = await dataManager.read('authors');
      const author = authors.find(a => a.username === username && a.isActive);

      if (!author) {
        return res.status(404).json({ error: 'Author not found' });
      }

      const posts = await dataManager.getPostsByAuthor(author.id, 10);

      res.json({
        id: author.id,
        username: author.username,
        displayName: author.displayName,
        bio: author.bio,
        avatar: author.avatar,
        website: author.website,
        socialLinks: author.socialLinks,
        postCount: author.postCount,
        createdAt: author.createdAt,
        posts
      });
    } catch (error) {
      logger.error('Error fetching author:', error);
      res.status(500).json({ error: 'Failed to fetch author' });
    }
  });

  // ===== COMMENTS ROUTES =====

  // Get comments for a post
  app.get('/applications/blog/api/posts/:postId/comments', async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const comments = await dataManager.getCommentsByPost(postId);

      res.json(comments);
    } catch (error) {
      logger.error('Error fetching comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  });

  // Create comment
  app.post('/applications/blog/api/posts/:postId/comments', async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const { authorName, authorEmail, authorWebsite, content, parentId } = req.body;

      if (!authorName || !authorEmail || !content) {
        return res.status(400).json({ error: 'Name, email, and content are required' });
      }

      // Check if post exists and allows comments
      const post = await dataManager.findById('posts', postId);
      if (!post || !post.allowComments) {
        return res.status(400).json({ error: 'Comments not allowed on this post' });
      }

      const commentId = await dataManager.getNextId('comments');
      const now = new Date().toISOString();

      const newComment = {
        id: commentId,
        postId,
        parentId: parentId || null,
        authorName,
        authorEmail,
        authorWebsite: authorWebsite || null,
        content,
        status: 'pending', // Will be moderated
        createdAt: now,
        updatedAt: now
      };

      await dataManager.add('comments', newComment);

      // Queue for moderation
      queue.enqueue({
        type: 'processCommentModeration',
        commentId: commentId
      });

      res.json({
        success: true,
        message: 'Comment submitted for moderation',
        comment: newComment
      });
    } catch (error) {
      logger.error('Error creating comment:', error);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  });

  // ===== SEARCH ROUTES =====

  // Search posts
  app.get('/applications/blog/api/search', async (req, res) => {
    try {
      const query = req.query.q?.trim();
      const limit = parseInt(req.query.limit) || 10;

      if (!query) {
        return res.json([]);
      }

      logger.info(`Blog search query: ${query}`);

      // Use search service
      let searchResults = search.search(query, limit);

      // Fallback to dataManager search if no results
      if (searchResults.length === 0) {
        searchResults = await dataManager.searchPosts(query, limit);
      }

      res.json(searchResults);
    } catch (error) {
      logger.error('Error performing blog search:', error);
      res.status(500).json({ error: 'Failed to perform search' });
    }
  });

  // ===== ANALYTICS ROUTES =====

  // Get blog statistics
  app.get('/applications/blog/api/analytics/stats', async (req, res) => {
    try {
      const cacheKey = 'blog:analytics:stats';
      let stats = await cache.get(cacheKey);

      if (!stats) {
        stats = await dataManager.getBlogStats();
        await cache.put(cacheKey, stats, 300); // Cache for 5 minutes
      }

      res.json(stats);
    } catch (error) {
      logger.error('Error fetching blog stats:', error);
      res.status(500).json({ error: 'Failed to fetch blog statistics' });
    }
  });

  // Record analytics event
  app.post('/applications/blog/api/analytics/event', async (req, res) => {
    try {
      const { event, data } = req.body;

      if (!event) {
        return res.status(400).json({ error: 'Event type is required' });
      }

      // Queue analytics update
      queue.enqueue({
        type: 'updateAnalytics',
        event,
        data: {
          ...data,
          timestamp: new Date().toISOString(),
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      });

      res.json({ success: true });
    } catch (error) {
      logger.error('Error recording analytics event:', error);
      res.status(500).json({ error: 'Failed to record event' });
    }
  });

  // ===== SUBSCRIPTION ROUTES =====

  // Subscribe to newsletter
  app.post('/applications/blog/api/subscribe', async (req, res) => {
    try {
      const { email, name } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Check if already subscribed
      const subscribers = await dataManager.read('subscribers');
      const existing = subscribers.find(sub => sub.email === email);

      if (existing && existing.status === 'active') {
        return res.status(400).json({ error: 'Email already subscribed' });
      }

      const subscriberId = await dataManager.getNextId('subscribers');
      const now = new Date().toISOString();

      const newSubscriber = {
        id: subscriberId,
        email,
        name: name || null,
        status: 'active',
        subscribedAt: now,
        unsubscribeToken: require('crypto').randomBytes(32).toString('hex')
      };

      await dataManager.add('subscribers', newSubscriber);

      // Send welcome email
      queue.enqueue({
        type: 'sendNotification',
        type: 'welcome_subscriber',
        recipient: email,
        data: {
          name: name || 'Subscriber'
        }
      });

      res.json({
        success: true,
        message: 'Successfully subscribed to newsletter'
      });
    } catch (error) {
      logger.error('Error subscribing to newsletter:', error);
      res.status(500).json({ error: 'Failed to subscribe' });
    }
  });

  // ===== SETTINGS ROUTES =====

  // Get blog settings (authenticated)
  app.get('/applications/blog/api/settings', async (req, res) => {
    try {
      if (!req.session.blogAuthenticated) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const settings = await dataManager.read('settings');
      res.json(settings);
    } catch (error) {
      logger.error('Error fetching blog settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  // Update blog settings (authenticated)
  app.put('/applications/blog/api/settings', async (req, res) => {
    try {
      if (!req.session.blogAuthenticated) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const updates = { ...req.body, updatedAt: new Date().toISOString() };
      await dataManager.write('settings', updates);

      // Clear relevant caches
      await cache.delete('blog:settings');

      res.json({
        success: true,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      logger.error('Error updating blog settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // ===== UTILITY ROUTES =====

  // Generate sitemap
  app.get('/applications/blog/sitemap.xml', async (req, res) => {
    try {
      queue.enqueue({
        type: 'generateSitemap'
      });

      res.set('Content-Type', 'text/xml');
      res.send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>');
    } catch (error) {
      logger.error('Error generating sitemap:', error);
      res.status(500).json({ error: 'Failed to generate sitemap' });
    }
  });

  // RSS feed
  app.get('/applications/blog/feed.xml', async (req, res) => {
    try {
      const posts = await dataManager.getPublishedPosts(20);
      const settings = await dataManager.read('settings');

      let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${settings.siteName || 'My Blog'}</title>
    <description>${settings.siteDescription || 'A blog powered by NooblyJS'}</description>
    <link>${settings.siteUrl || 'http://localhost:3002'}</link>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`;

      posts.forEach(post => {
        rss += `
    <item>
      <title>${post.title}</title>
      <description><![CDATA[${post.excerpt}]]></description>
      <link>${settings.siteUrl}/applications/blog/posts/${post.slug}</link>
      <guid>${settings.siteUrl}/applications/blog/posts/${post.slug}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
    </item>`;
      });

      rss += '\n  </channel>\n</rss>';

      res.set('Content-Type', 'application/rss+xml');
      res.send(rss);
    } catch (error) {
      logger.error('Error generating RSS feed:', error);
      res.status(500).send('Error generating RSS feed');
    }
  });

  // Application status endpoint
  app.get('/applications/blog/api/status', (req, res) => {
    res.json({
      status: 'running',
      application: 'Blog Platform',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // ===== ADMIN INTERFACE ROUTES =====

  // Get all posts for admin (including drafts)
  app.get('/applications/blog/api/admin/posts', async (req, res) => {
    try {
      if (!req.session.blogAuthenticated) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const posts = await dataManager.read('posts');
      const categories = await dataManager.read('categories');
      const authors = await dataManager.read('authors');

      const enrichedPosts = posts.map(post => {
        const category = categories.find(c => c.id === post.categoryId);
        const author = authors.find(a => a.id === post.authorId);

        return {
          ...post,
          category: category || null,
          author: author ? {
            id: author.id,
            displayName: author.displayName,
            avatar: author.avatar
          } : null
        };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json(enrichedPosts);
    } catch (error) {
      logger.error('Error fetching admin posts:', error);
      res.status(500).json({ error: 'Failed to fetch posts' });
    }
  });

  // Get single post for editing (admin)
  app.get('/applications/blog/api/admin/posts/:id', async (req, res) => {
    try {
      if (!req.session.blogAuthenticated) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const postId = parseInt(req.params.id);
      const post = await dataManager.findById('posts', postId);

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      res.json(post);
    } catch (error) {
      logger.error('Error fetching post for admin:', error);
      res.status(500).json({ error: 'Failed to fetch post' });
    }
  });

  // Update category (authenticated)
  app.put('/applications/blog/api/categories/:id', async (req, res) => {
    try {
      if (!req.session.blogAuthenticated) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const categoryId = parseInt(req.params.id);
      const updates = { ...req.body, updatedAt: new Date().toISOString() };

      const success = await dataManager.update('categories', categoryId, updates);

      if (!success) {
        return res.status(404).json({ error: 'Category not found' });
      }

      await cache.delete('blog:categories:*');

      res.json({
        success: true,
        message: 'Category updated successfully'
      });
    } catch (error) {
      logger.error('Error updating category:', error);
      res.status(500).json({ error: 'Failed to update category' });
    }
  });

  // Delete category (authenticated)
  app.delete('/applications/blog/api/categories/:id', async (req, res) => {
    try {
      if (!req.session.blogAuthenticated) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const categoryId = parseInt(req.params.id);

      const success = await dataManager.delete('categories', categoryId);

      if (!success) {
        return res.status(404).json({ error: 'Category not found' });
      }

      await cache.delete('blog:categories:*');

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting category:', error);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  });

  logger.info('Blog routes registered successfully');
};