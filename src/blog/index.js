/**
 * @fileoverview Blog Application
 * Factory module for creating a Blog application instance.
 * Provides Medium.com-style blogging platform with content management,
 * analytics, and community features.
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-09-16
 */

'use strict';

const Routes = require('./routes');
const Views = require('./views');
const { initializePostFiles } = require('./activities/postContent');
const { processTask } = require('./activities/taskProcessor');
const DataManager = require('./components/dataManager');
const BlogAuth = require('../auth');

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
  const dataManager = new DataManager('./data');

  // Initialize noobly-core services for the blog
  const filing = serviceRegistry.filing('local', {
    baseDir: './blog-posts'
  });
  const cache = serviceRegistry.cache('memory');
  const logger = serviceRegistry.logger('console');
  const queue = serviceRegistry.queue('memory');
  const search = serviceRegistry.searching('memory');
  const scheduling = serviceRegistry.scheduling ? serviceRegistry.scheduling('memory') : null;
  const measuring = serviceRegistry.measuring ? serviceRegistry.measuring('memory') : null;
  const notifying = serviceRegistry.notifying ? serviceRegistry.notifying('console') : null;
  const emailing = serviceRegistry.emailing ? serviceRegistry.emailing('console') : null;

  // Initialize authentication service
  const authService = BlogAuth(options, eventEmitter, serviceRegistry);

  // Initialize blog data if not exists
  (async () => {
    try {
      await initializeBlogData(dataManager, filing, cache, logger, queue, search);
    } catch (error) {
      logger.error('Failed to initialize blog data:', error);
    }
  })();

  // Start background queue worker
  startQueueWorker({ dataManager, filing, cache, logger, queue, search, scheduling, measuring, notifying, emailing });

  // Register authentication routes first
  authService.registerRoutes(options);

  // Register routes and views with auth middleware
  Routes(options, eventEmitter, {
    dataManager, filing, cache, logger, queue, search, scheduling, measuring, notifying, emailing,
    authService
  });
  Views(options, eventEmitter, {
    dataManager, filing, cache, logger, queue, search, scheduling, measuring, notifying, emailing,
    authService
  });
}

/**
 * Initialize default blog data
 */
async function initializeBlogData(dataManager, filing, cache, logger, queue, search) {
  try {
    logger.info('Starting blog data initialization with JSON file storage...');

    // Check if we already have stored blog data
    const existingPosts = await dataManager.read('posts');
    const existingCategories = await dataManager.read('categories');
    const existingAuthors = await dataManager.read('authors');
    const existingComments = await dataManager.read('comments');
    const existingAnalytics = await dataManager.read('analytics');
    const existingSettings = await dataManager.read('settings');

    if (existingPosts.length === 0) {
      logger.info('Initializing default blog data');

      // Initialize default categories
      const defaultCategories = [
        {
          id: 1,
          name: 'Technology',
          slug: 'technology',
          description: 'Latest in tech trends and innovations',
          color: '#3B82F6',
          postCount: 0,
          isActive: true,
          seoTitle: 'Technology Articles',
          seoDescription: 'Latest technology articles and insights',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Programming',
          slug: 'programming',
          description: 'Programming tutorials and best practices',
          color: '#10B981',
          postCount: 0,
          isActive: true,
          seoTitle: 'Programming Articles',
          seoDescription: 'Programming tutorials and development insights',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 3,
          name: 'Design',
          slug: 'design',
          description: 'UI/UX design principles and trends',
          color: '#F59E0B',
          postCount: 0,
          isActive: true,
          seoTitle: 'Design Articles',
          seoDescription: 'Design principles and creative inspiration',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      // Initialize default authors
      const defaultAuthors = [
        {
          id: 1,
          username: 'admin',
          displayName: 'Admin User',
          email: 'admin@example.com',
          bio: 'System administrator and content creator',
          avatar: 'https://via.placeholder.com/80',
          website: '',
          socialLinks: {
            twitter: '',
            linkedin: '',
            github: ''
          },
          postCount: 0,
          isActive: true,
          role: 'admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      // Initialize default settings
      const defaultSettings = {
        siteName: 'My Blog',
        siteDescription: 'A modern blogging platform built with NooblyJS',
        siteUrl: 'http://localhost:3002',
        seoTitle: 'My Blog - Insights and Stories',
        seoDescription: 'Discover insights, stories, and knowledge on our modern blogging platform',
        seoKeywords: ['blog', 'stories', 'insights', 'technology'],
        socialLinks: {
          twitter: '',
          facebook: '',
          linkedin: '',
          instagram: ''
        },
        analytics: {
          googleAnalytics: '',
          enableComments: true,
          moderateComments: true,
          allowGuestComments: true
        },
        appearance: {
          theme: 'default',
          primaryColor: '#1a8917',
          accentColor: '#3B82F6'
        },
        updatedAt: new Date().toISOString()
      };

      // Store data
      await dataManager.write('categories', defaultCategories);
      await dataManager.write('authors', defaultAuthors);
      await dataManager.write('posts', []);
      await dataManager.write('comments', []);
      await dataManager.write('analytics', {
        totalViews: 0,
        totalPosts: 0,
        totalComments: 0,
        totalSubscribers: 0,
        monthlyViews: {},
        popularPosts: [],
        lastUpdated: new Date().toISOString()
      });
      await dataManager.write('settings', defaultSettings);

      logger.info('Stored all blog data to JSON files');

      // Initialize post content files
      await initializePostFiles({ filing, logger });

      logger.info('Default blog data initialized successfully');
    } else {
      logger.info('Blog data already exists, skipping initialization');
    }

    // Always initialize post files
    try {
      await initializePostFiles({ filing, logger });
    } catch (error) {
      logger.error('Error initializing post files:', error);
    }

    // Always populate search index
    try {
      const posts = await dataManager.read('posts');
      posts.forEach(post => {
        if (post.status === 'published') {
          search.add(post.id.toString(), {
            id: post.id,
            title: post.title,
            content: post.excerpt || '',
            tags: post.tags || [],
            categoryName: post.categoryName || '',
            authorName: post.authorName || '',
            excerpt: post.excerpt
          });
        }
      });
      logger.info(`Populated search index with ${posts.filter(p => p.status === 'published').length} published posts`);
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