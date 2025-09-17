/**
 * @fileoverview CMS Application
 * Factory module for creating a comprehensive CMS (Website builder) application instance.
 * Provides visual site building, template management, and publishing capabilities.
 *
 * @author NooblyJS Team
 * @version 1.0.14
 * @since 2025-08-22
 */

'use strict';

const Routes = require('./routes');
const Views = require('./views');
const DataManager = require('./components/dataManager');
const SiteBuilder = require('./components/siteBuilder');
const TemplateEngine = require('./components/templateEngine');
const AssetManager = require('./components/assetManager');
const ThemeManager = require('./components/themeManager');

/**
 * Creates the CMS service
 * Automatically configures routes and views for the CMS service.
 * Integrates with noobly-core services for data persistence, file storage, caching, etc.
 * @param {Object} options - Configuration options
 * @param {EventEmitter} eventEmitter - Global event emitter for inter-service communication
 * @param {Object} serviceRegistry - NooblyJS Core service registry
 * @return {void}
 */
module.exports = (options, eventEmitter, serviceRegistry) => {
  // Initialize data manager for JSON file storage
  const dataManager = new DataManager('./data');

  // Initialize noobly-core services for the CMS
  const filing = serviceRegistry.filing('local', {
    baseDir: './cms-files'
  });
  const cache = serviceRegistry.cache('memory');
  const logger = serviceRegistry.logger('console');
  const queue = serviceRegistry.queue('memory');
  const search = serviceRegistry.searching('memory');
  const auth = serviceRegistry.authservice();
  const ai = serviceRegistry.aiservice();
  const workflow = serviceRegistry.workflow();
  const notifications = serviceRegistry.notifying();

  // Initialize CMS components
  const templateEngine = new TemplateEngine({ filing, cache, logger });
  const assetManager = new AssetManager({ filing, cache, logger });
  const themeManager = new ThemeManager({ filing, cache, logger, templateEngine });
  const siteBuilder = new SiteBuilder({
    dataManager,
    filing,
    cache,
    logger,
    templateEngine,
    assetManager,
    themeManager
  });

  // Initialize CMS data if not exists
  (async () => {
    try {
      await initializeCMSData({
        dataManager,
        filing,
        cache,
        logger,
        queue,
        search,
        templateEngine,
        assetManager,
        themeManager
      });
    } catch (error) {
      logger.error('Failed to initialize CMS data:', error);
    }
  })();

  // Start background queue worker
  startQueueWorker({
    dataManager,
    filing,
    cache,
    logger,
    queue,
    search,
    siteBuilder,
    templateEngine,
    assetManager,
    themeManager
  });

  // Register routes and views
  Routes(options, eventEmitter, {
    dataManager,
    filing,
    cache,
    logger,
    queue,
    search,
    auth,
    ai,
    workflow,
    notifications,
    siteBuilder,
    templateEngine,
    assetManager,
    themeManager
  });

  Views(options, eventEmitter, {
    dataManager,
    filing,
    cache,
    logger,
    queue,
    search,
    siteBuilder,
    templateEngine,
    assetManager,
    themeManager
  });
}

/**
 * Initialize default CMS data
 */
async function initializeCMSData(services) {
  const { dataManager, filing, cache, logger, queue, search, templateEngine, assetManager, themeManager } = services;

  try {
    logger.info('Starting CMS data initialization with JSON file storage...');

    // Check if we already have stored CMS data
    const existingSites = await dataManager.read('sites');
    const existingPages = await dataManager.read('pages');
    const existingComponents = await dataManager.read('components');
    const existingTemplates = await dataManager.read('templates');
    const existingAssets = await dataManager.read('assets');

    if (existingSites.length === 0) {
      logger.info('Initializing default CMS data');

      // Initialize default sites
      const defaultSites = [
        {
          id: "demo-site-001",
          name: "Demo Portfolio Site",
          domain: "",
          subdomain: "demo-portfolio.mysite.com",
          theme: "portfolio",
          status: "draft",
          userId: "admin",
          settings: {
            title: "My Portfolio",
            description: "Professional portfolio website showcasing my work and skills",
            logo: "/assets/logo.png",
            favicon: "/assets/favicon.ico",
            analytics: "",
            seo: {
              metaTitle: "My Portfolio - Creative Professional",
              metaDescription: "Showcasing creative work and professional experience",
              keywords: ["portfolio", "creative", "professional"]
            }
          },
          pages: ["page-home", "page-about", "page-contact"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          publishedAt: null
        }
      ];

      // Initialize default pages
      const defaultPages = [
        {
          id: "page-home",
          siteId: "demo-site-001",
          name: "Home",
          slug: "home",
          title: "Welcome to My Portfolio",
          type: "page",
          status: "draft",
          template: "home-template",
          content: {
            sections: [
              {
                id: "section-hero",
                type: "hero",
                settings: {
                  backgroundImage: "/assets/hero-bg.jpg",
                  title: "Welcome to My Portfolio",
                  subtitle: "Creative professional showcasing amazing work",
                  buttonText: "View My Work",
                  buttonLink: "/portfolio"
                }
              },
              {
                id: "section-about",
                type: "text",
                settings: {
                  title: "About Me",
                  content: "I'm a passionate creative professional with years of experience in delivering exceptional results."
                }
              }
            ]
          },
          seo: {
            metaTitle: "Home - My Portfolio",
            metaDescription: "Welcome to my creative portfolio",
            keywords: ["home", "portfolio"]
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "page-about",
          siteId: "demo-site-001",
          name: "About",
          slug: "about",
          title: "About Me",
          type: "page",
          status: "draft",
          template: "page-template",
          content: {
            sections: [
              {
                id: "section-about-content",
                type: "text",
                settings: {
                  title: "About Me",
                  content: "Learn more about my background, skills, and experience."
                }
              }
            ]
          },
          seo: {
            metaTitle: "About - My Portfolio",
            metaDescription: "Learn more about my background and experience",
            keywords: ["about", "biography"]
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      // Initialize default components
      const defaultComponents = [
        {
          id: "hero-component",
          name: "Hero Section",
          type: "hero",
          category: "headers",
          description: "Full-width hero section with background image and call-to-action",
          thumbnail: "/assets/components/hero-thumb.jpg",
          template: "hero.ejs",
          settings: {
            backgroundImage: {
              type: "image",
              label: "Background Image",
              default: ""
            },
            title: {
              type: "text",
              label: "Title",
              default: "Your Title Here"
            },
            subtitle: {
              type: "textarea",
              label: "Subtitle",
              default: "Your subtitle here"
            },
            buttonText: {
              type: "text",
              label: "Button Text",
              default: "Learn More"
            },
            buttonLink: {
              type: "text",
              label: "Button Link",
              default: "#"
            }
          },
          createdAt: new Date().toISOString()
        },
        {
          id: "text-component",
          name: "Text Block",
          type: "text",
          category: "content",
          description: "Rich text content block with formatting options",
          thumbnail: "/assets/components/text-thumb.jpg",
          template: "text.ejs",
          settings: {
            title: {
              type: "text",
              label: "Title",
              default: "Section Title"
            },
            content: {
              type: "richtext",
              label: "Content",
              default: "Your content goes here..."
            }
          },
          createdAt: new Date().toISOString()
        }
      ];

      // Initialize default templates
      const defaultTemplates = [
        {
          id: "template-001",
          name: "Portfolio Homepage",
          category: "portfolio",
          preview: "/templates/portfolio/homepage-preview.jpg",
          description: "Modern portfolio homepage template",
          type: "page",
          content: {
            sections: ["hero-component", "text-component"]
          },
          createdAt: new Date().toISOString()
        }
      ];

      // Store all data
      await dataManager.write('sites', defaultSites);
      logger.info('Stored default sites');

      await dataManager.write('pages', defaultPages);
      logger.info('Stored default pages');

      await dataManager.write('components', defaultComponents);
      logger.info('Stored default components');

      await dataManager.write('templates', defaultTemplates);
      logger.info('Stored default templates');

      await dataManager.write('assets', []);
      logger.info('Initialized empty assets collection');

      // Initialize default themes
      await themeManager.initializeDefaultThemes();

      // Index content for search
      defaultSites.forEach(site => {
        search.add(site.id, {
          id: site.id,
          title: site.name,
          content: site.settings.description,
          type: 'site',
          tags: []
        });
      });

      defaultPages.forEach(page => {
        search.add(page.id, {
          id: page.id,
          title: page.title,
          content: page.content.sections.map(s => s.settings?.content || '').join(' '),
          type: 'page',
          tags: []
        });
      });

      logger.info('Default CMS data initialized successfully');
    } else {
      logger.info('CMS data already exists, skipping initialization');
    }

    // Always initialize themes and templates
    try {
      await themeManager.initializeDefaultThemes();
    } catch (error) {
      logger.error('Error initializing themes:', error);
    }

  } catch (error) {
    logger.error('Error initializing CMS data:', error.message);
    logger.error('Stack trace:', error.stack);
  }
}

/**
 * Start background queue worker for processing CMS tasks
 */
function startQueueWorker(services) {
  const { queue, logger, siteBuilder } = services;

  // Process queue every 5 seconds
  setInterval(async () => {
    try {
      const task = queue.dequeue();
      if (task && task.type) {
        logger.info(`Processing CMS task: ${task.type}`);
        await processCMSTask(services, task);
        logger.info(`Completed CMS task: ${task.type}`);
      }
    } catch (error) {
      logger.error('Error processing CMS queue task:', error);
    }
  }, 5000);

  logger.info('CMS queue worker started');
}

/**
 * Process CMS background tasks
 */
async function processCMSTask(services, task) {
  const { dataManager, siteBuilder, templateEngine, assetManager, logger } = services;

  switch (task.type) {
    case 'generateSite':
      await siteBuilder.generateSite(task.siteId);
      break;

    case 'publishSite':
      await siteBuilder.publishSite(task.siteId);
      break;

    case 'optimizeAsset':
      await assetManager.optimizeAsset(task.assetId);
      break;

    case 'updateSiteCache':
      await siteBuilder.updateSiteCache(task.siteId);
      break;

    default:
      logger.warn(`Unknown CMS task type: ${task.type}`);
  }
}