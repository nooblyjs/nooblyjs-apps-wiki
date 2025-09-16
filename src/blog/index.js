/**
 * @fileoverview Blog Application
 * Factory module for creating a Blog Platform application instance.
 * Implements comprehensive content publishing and community engagement system.
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-09-16
 */

'use strict';

const Routes = require('./routes');
const Views = require('./views');
const { initializeBlogFiles } = require('./activities/contentManager');
const { processTask } = require('./activities/taskProcessor');
const BlogDataManager = require('./components/dataManager');

/**
 * Creates the blog service
 * Automatically configures routes and views for the blog service.
 * Integrates with noobly-core services for data persistence, file storage, caching, etc.
 * @param {Object} options - Configuration options
 * @param {EventEmitter} eventEmitter - Global event emitter for inter-service communication
 * @param {Object} serviceRegistry - NooblyJS Core service registry
 * @return {void}
 */
module.exports = (options, eventEmitter, serviceRegistry) => {
  // Initialize data manager for JSON file storage
  const dataManager = new BlogDataManager('./data');

  // Initialize noobly-core services for the blog
  const filing = serviceRegistry.filing('local', {
    baseDir: './blog-files'
  });
  const cache = serviceRegistry.cache('memory');
  const logger = serviceRegistry.logger('console');
  const queue = serviceRegistry.queue('memory');
  const search = serviceRegistry.searching('memory');
  const scheduling = serviceRegistry.scheduling('memory');
  const measuring = serviceRegistry.measuring('memory');
  const notifying = serviceRegistry.notifying('memory');
  const worker = serviceRegistry.working('memory');
  const workflow = serviceRegistry.workflow('memory');

  // Initialize blog data if not exists
  (async () => {
    try {
      await initializeBlogData(dataManager, filing, cache, logger, queue, search);
    } catch (error) {
      logger.error('Failed to initialize blog data:', error);
    }
  })();

  // Start background queue worker
  startQueueWorker({ dataManager, filing, cache, logger, queue, search, scheduling, measuring, notifying, worker, workflow });

  // Register routes and views
  Routes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, scheduling, measuring, notifying, worker, workflow });
  Views(options, eventEmitter, { dataManager, filing, cache, logger, queue, search, scheduling, measuring, notifying, worker, workflow });
}

/**
 * Initialize default blog data
 */
async function initializeBlogData(dataManager, filing, cache, logger, queue, search) {
  try {
    logger.info('Starting blog data initialization with JSON file storage...');

    // Check if we already have stored blog data
    const existingCategories = await dataManager.read('categories');
    const existingPosts = await dataManager.read('posts');
    const existingAuthors = await dataManager.read('authors');

    if (existingCategories.length === 0 || existingPosts.length === 0 || existingAuthors.length === 0) {
      logger.info('Initializing default blog data');

      // Initialize default categories
      const defaultCategories = [
        {
          id: 1,
          name: 'Technology',
          slug: 'technology',
          description: 'Latest technology trends and insights',
          color: '#3B82F6',
          parentId: null,
          postCount: 0,
          isActive: true,
          seoTitle: 'Technology Articles',
          seoDescription: 'Explore the latest in technology trends, programming, and digital innovation.',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-08-20T14:30:00Z'
        },
        {
          id: 2,
          name: 'Business',
          slug: 'business',
          description: 'Business strategies and industry insights',
          color: '#10B981',
          parentId: null,
          postCount: 0,
          isActive: true,
          seoTitle: 'Business Articles',
          seoDescription: 'Business strategies, market insights, and industry analysis.',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-08-20T14:35:00Z'
        },
        {
          id: 3,
          name: 'Lifestyle',
          slug: 'lifestyle',
          description: 'Lifestyle tips and personal development',
          color: '#F59E0B',
          parentId: null,
          postCount: 0,
          isActive: true,
          seoTitle: 'Lifestyle Articles',
          seoDescription: 'Tips for better living, personal development, and life balance.',
          createdAt: '2024-01-15T11:00:00Z',
          updatedAt: '2024-08-20T14:40:00Z'
        }
      ];

      logger.info(`Storing ${defaultCategories.length} categories with JSON file storage...`);
      await dataManager.write('categories', defaultCategories);
      logger.info('Stored all categories to categories.json');

      // Initialize default authors
      const defaultAuthors = [
        {
          id: 1,
          username: 'admin',
          email: 'admin@blog.com',
          firstName: 'Blog',
          lastName: 'Administrator',
          displayName: 'Admin',
          bio: 'Blog platform administrator and content curator.',
          avatar: null,
          website: '',
          socialLinks: {
            twitter: '',
            linkedin: '',
            github: ''
          },
          role: 'administrator',
          isActive: true,
          emailVerified: true,
          postCount: 0,
          followerCount: 0,
          followingCount: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-08-20T14:45:00Z',
          lastLoginAt: '2024-08-20T14:45:00Z'
        }
      ];

      logger.info(`Storing ${defaultAuthors.length} authors with JSON file storage...`);
      await dataManager.write('authors', defaultAuthors);
      logger.info('Stored all authors to authors.json');

      // Initialize default posts
      const defaultPosts = [
        {
          id: 1,
          title: 'Welcome to Your New Blog Platform',
          slug: 'welcome-to-your-new-blog-platform',
          excerpt: 'Get started with your new blog platform built on NooblyJS. This comprehensive blogging solution offers everything you need to create engaging content.',
          content: '# Welcome to Your New Blog Platform\n\nCongratulations on setting up your new blog platform! This system is built on the powerful NooblyJS framework and offers a comprehensive set of features for content creation and community engagement.\n\n## Features\n\n- Rich text editor with markdown support\n- SEO optimization tools\n- Comment system\n- Social sharing\n- Analytics integration\n- Content scheduling\n- Multi-author support\n\n## Getting Started\n\n1. Create your first post\n2. Set up categories and tags\n3. Customize your blog settings\n4. Invite other authors\n5. Engage with your community\n\nEnjoy blogging!',
          authorId: 1,
          categoryId: 1,
          status: 'published',
          visibility: 'public',
          featuredImage: null,
          tags: ['welcome', 'getting-started', 'blogging'],
          seoTitle: 'Welcome to Your New Blog Platform - Getting Started Guide',
          seoDescription: 'Learn how to get started with your new NooblyJS-powered blog platform. Complete guide to features and setup.',
          seoKeywords: ['blog platform', 'NooblyJS', 'content management', 'blogging'],
          publishedAt: '2024-08-20T15:00:00Z',
          createdAt: '2024-08-20T14:50:00Z',
          updatedAt: '2024-08-20T15:00:00Z',
          viewCount: 0,
          likeCount: 0,
          commentCount: 0,
          shareCount: 0,
          readingTime: 2,
          isSticky: true,
          isFeatured: true,
          allowComments: true,
          customFields: {}
        }
      ];

      // Store posts
      await dataManager.write('posts', defaultPosts);
      logger.info('Stored all posts to posts.json');

      // Initialize blog content files
      await initializeBlogFiles({ filing, logger });

      // Initialize search index with posts
      defaultPosts.forEach(post => {
        search.add(post.id.toString(), {
          id: post.id,
          title: post.title,
          content: post.content,
          excerpt: post.excerpt,
          tags: post.tags || [],
          categoryName: 'Technology', // Default category
          authorName: 'Admin',
          publishedAt: post.publishedAt,
          slug: post.slug
        });
      });

      // Initialize other data structures
      await dataManager.write('comments', []);
      await dataManager.write('subscribers', []);
      await dataManager.write('analytics', {
        totalViews: 0,
        totalPosts: 1,
        totalComments: 0,
        totalSubscribers: 0,
        lastUpdated: new Date().toISOString()
      });
      await dataManager.write('settings', {
        siteName: 'My Blog',
        siteDescription: 'A modern blog platform built with NooblyJS',
        siteUrl: 'http://localhost:3002',
        postsPerPage: 10,
        allowComments: true,
        requireApproval: true,
        allowGuestComments: false,
        seoEnabled: true,
        analyticsEnabled: true,
        socialSharing: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      logger.info('Default blog data initialized successfully');
    } else {
      logger.info('Blog data already exists, skipping initialization');
    }

    // Always initialize blog files
    try {
      await initializeBlogFiles({ filing, logger });
    } catch (error) {
      logger.error('Error initializing blog files:', error);
    }

    // Always populate search index
    try {
      const posts = await dataManager.read('posts');
      const categories = await dataManager.read('categories');
      const authors = await dataManager.read('authors');

      posts.forEach(post => {
        const category = categories.find(c => c.id === post.categoryId);
        const author = authors.find(a => a.id === post.authorId);

        search.add(post.id.toString(), {
          id: post.id,
          title: post.title,
          content: post.content,
          excerpt: post.excerpt,
          tags: post.tags || [],
          categoryName: category ? category.name : 'Uncategorized',
          authorName: author ? author.displayName : 'Unknown',
          publishedAt: post.publishedAt,
          slug: post.slug
        });
      });
      logger.info(`Populated search index with ${posts.length} posts`);
    } catch (error) {
      logger.error('Error populating search index:', error);
    }
  } catch (error) {
    logger.error('Error initializing blog data:', error.message);
    logger.error('Stack trace:', error.stack);
  }
}

/**
 * Start background queue worker for processing tasks
 */
function startQueueWorker(services) {
  const { queue, logger } = services;

  // Process queue every 5 seconds
  setInterval(async () => {
    try {
      const task = queue.dequeue();
      if (task && task.type) {
        logger.info(`Processing blog task: ${task.type}`);
        await processTask(services, task);
        logger.info(`Completed blog task: ${task.type}`);
      }
    } catch (error) {
      logger.error('Error processing blog queue task:', error);
    }
  }, 5000);

  logger.info('Blog queue worker started');
}