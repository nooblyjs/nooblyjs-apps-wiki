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
const { readPostContent, savePostContent, updatePostContent, deletePostContent } = require('../activities/postContent');
const CommentManager = require('../components/commentManager');

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
  const { dataManager, filing, cache, logger, queue, search, measuring, notifying, authService } = services;

  // Get authentication middleware
  const requireAuth = authService ? authService.getMiddleware() : (req, res, next) => next();
  const requireAdmin = authService ? authService.getAdminMiddleware() : (req, res, next) => next();

  // Initialize comment manager
  const commentManager = new CommentManager(dataManager, logger, notifying);

  // ===== BLOG API ROUTES =====

  // ===== PUBLIC BLOG ROUTES =====

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

        // Get post content from markdown file
        const postContent = await readPostContent(services, post);
        if (postContent) {
          post.content = postContent.content;
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

  // ===== COMMENT SYSTEM =====

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

      // Update analytics
      queue.enqueue({
        type: 'updateAnalytics',
        event: 'comment_added',
        data: { postId, commentId }
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

  // ===== COMMENT ROUTES =====

  // Get comments for a post (public)
  app.get('/applications/blog/api/posts/:postId/comments', async (req, res) => {
    try {
      const { postId } = req.params;
      const { limit = 20, offset = 0, sort = 'asc' } = req.query;

      const comments = await commentManager.getCommentsForPost(postId, {
        status: 'approved',
        includeReplies: true,
        sortBy: 'createdAt',
        sortOrder: sort,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        comments,
        meta: {
          total: comments.length,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      logger.error('Error fetching comments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch comments'
      });
    }
  });

  // Submit a new comment (public with rate limiting)
  app.post('/applications/blog/api/posts/:postId/comments', async (req, res) => {
    try {
      const { postId } = req.params;
      const { author, email, website, content, parentId } = req.body;

      // Basic validation
      if (!author || !email || !content) {
        return res.status(400).json({
          success: false,
          error: 'Author, email, and content are required'
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email address'
        });
      }

      // Content length validation
      if (content.length > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Comment is too long (maximum 1000 characters)'
        });
      }

      // Create comment
      const comment = await commentManager.createComment({
        postId,
        author,
        email,
        website,
        content,
        parentId,
        userAgent: req.get('User-Agent') || '',
        ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1'
      });

      res.status(201).json({
        success: true,
        message: comment.status === 'approved'
          ? 'Comment posted successfully'
          : 'Comment submitted for moderation',
        comment: {
          id: comment.id,
          author: comment.author,
          content: comment.content,
          createdAt: comment.createdAt,
          status: comment.status
        }
      });

    } catch (error) {
      logger.error('Error creating comment:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create comment'
      });
    }
  });

  // Get comment statistics (public)
  app.get('/applications/blog/api/comments/stats', async (req, res) => {
    try {
      const stats = await commentManager.getCommentStats();

      // Only return public stats
      res.json({
        success: true,
        stats: {
          total: stats.approved,
          thisMonth: stats.thisMonth,
          thisWeek: stats.thisWeek
        }
      });
    } catch (error) {
      logger.error('Error fetching comment stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch comment statistics'
      });
    }
  });

  // ===== ADMIN ROUTES (AUTHENTICATED) =====

  // Get all posts for admin (including drafts)
  app.get('/applications/blog/api/admin/posts', requireAdmin, async (req, res) => {
    try {

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
  app.get('/applications/blog/api/admin/posts/:id', requireAdmin, async (req, res) => {
    try {

      const postId = parseInt(req.params.id);
      const post = await dataManager.findById('posts', postId);

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Get post content from markdown file
      const postContent = await readPostContent(services, post);
      if (postContent) {
        post.content = postContent.content;
      }

      res.json(post);
    } catch (error) {
      logger.error('Error fetching post for admin:', error);
      res.status(500).json({ error: 'Failed to fetch post' });
    }
  });

  // Create new post (authenticated)
  app.post('/applications/blog/api/admin/posts', requireAdmin, async (req, res) => {
    try {

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
      await cache.delete('blog:posts:');
      await cache.delete('blog:categories:');

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
  app.put('/applications/blog/api/admin/posts/:id', requireAdmin, async (req, res) => {
    try {

      const postId = parseInt(req.params.id);
      const updates = { ...req.body, updatedAt: new Date().toISOString() };
      const oldPost = await dataManager.findById('posts', postId);

      if (!oldPost) {
        return res.status(404).json({ error: 'Post not found' });
      }

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
        const updatedPost = { ...oldPost, ...updates };
        queue.enqueue({
          type: 'updatePostFile',
          postId: postId,
          content: updates.content,
          oldStatus: oldPost.status
        });
      }

      // Update search index
      queue.enqueue({
        type: 'indexPostForSearch',
        postId: postId
      });

      // Clear caches
      await cache.delete(`blog:post:`);
      await cache.delete('blog:posts:');

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
  app.delete('/applications/blog/api/admin/posts/:id', requireAdmin, async (req, res) => {
    try {

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
      await cache.delete(`blog:post:`);
      await cache.delete('blog:posts:');

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

  // Get blog analytics (authenticated)
  app.get('/applications/blog/api/admin/analytics', requireAdmin, async (req, res) => {
    try {

      const stats = await dataManager.getBlogStats();
      res.json(stats);
    } catch (error) {
      logger.error('Error fetching blog analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // Get pending comments for moderation
  app.get('/applications/blog/api/admin/comments', requireAdmin, async (req, res) => {
    try {
      const { status = 'all', limit = 50, offset = 0 } = req.query;

      let comments;
      if (status === 'pending') {
        comments = await commentManager.getPendingComments({
          limit: parseInt(limit),
          offset: parseInt(offset)
        });
      } else {
        // Get all comments with post information
        const allComments = await dataManager.read('comments');
        const posts = await dataManager.read('posts');

        comments = allComments
          .filter(comment => status === 'all' || comment.status === status)
          .map(comment => {
            const post = posts.find(p => p.id === comment.postId);
            return {
              ...comment,
              post: post ? {
                id: post.id,
                title: post.title,
                slug: post.slug
              } : null
            };
          })
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
      }

      const stats = await commentManager.getCommentStats();

      res.json({
        success: true,
        comments,
        stats,
        meta: {
          total: comments.length,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      logger.error('Error fetching admin comments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch comments'
      });
    }
  });

  // Moderate a comment (approve, reject, spam)
  app.put('/applications/blog/api/admin/comments/:id/moderate', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body; // approve, reject, spam

      if (!['approve', 'reject', 'spam'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid moderation action'
        });
      }

      const moderatedComment = await commentManager.moderateComment(
        id,
        action,
        req.blogAuth?.user?.username || 'admin'
      );

      res.json({
        success: true,
        message: `Comment ${action}d successfully`,
        comment: moderatedComment
      });
    } catch (error) {
      logger.error('Error moderating comment:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to moderate comment'
      });
    }
  });

  // Legacy approve endpoint (for backward compatibility)
  app.put('/applications/blog/api/admin/comments/:id/approve', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const moderatedComment = await commentManager.moderateComment(
        id,
        'approve',
        req.blogAuth?.user?.username || 'admin'
      );

      res.json({
        success: true,
        message: 'Comment approved successfully',
        comment: moderatedComment
      });
    } catch (error) {
      logger.error('Error approving comment:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to approve comment'
      });
    }
  });

  // Delete a comment and its replies
  app.delete('/applications/blog/api/admin/comments/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await commentManager.deleteComment(id);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found'
        });
      }

      res.json({
        success: true,
        message: 'Comment deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting comment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete comment'
      });
    }
  });

  // Get comment statistics for admin
  app.get('/applications/blog/api/admin/comments/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await commentManager.getCommentStats();

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      logger.error('Error fetching comment stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch comment statistics'
      });
    }
  });

  // ===== STATIC FILE SERVING =====

  // Admin routes
  app.get('/applications/blog/admin/stories', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin-stories.html'));
  });

  app.get('/applications/blog/admin/write', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin-write.html'));
  });

  app.get('/applications/blog/admin/stats', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin-stats.html'));
  });

  // Legacy routes (redirect to admin)
  app.get('/applications/blog/admin', (req, res) => {
    res.redirect('/applications/blog/admin/stories');
  });

  app.get('/applications/blog/write', (req, res) => {
    res.redirect('/applications/blog/admin/write');
  });

  app.get('/applications/blog/stats', (req, res) => {
    res.redirect('/applications/blog/admin/stats');
  });

  logger.info('Blog routes registered successfully');
};