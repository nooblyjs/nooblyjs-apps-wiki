/**
 * @fileoverview CMS API routes for Express.js application.
 * Provides comprehensive RESTful endpoints for CMS operations including
 * site management, page editing, template handling, asset management, and publishing
 *
 * @author NooblyJS Core Team
 * @version 1.0.14
 * @since 1.0.0
 */

'use strict';

const path = require('path');
const mime = require('mime-types');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * Configures and registers comprehensive CMS routes with the Express application.
 * Integrates with noobly-core services for data persistence, caching, file storage, etc.
 *
 * @param {Object} options - Configuration options object
 * @param {Object} options.express-app - The Express application instance
 * @param {Object} eventEmitter - Event emitter for logging and notifications
 * @param {Object} services - NooblyJS Core services and CMS components
 * @return {void}
 */
module.exports = (options, eventEmitter, services) => {
  const app = options;
  const {
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
  } = services;

  // Authentication middleware for CMS routes
  const authenticateUser = (req, res, next) => {
    // For demo purposes, we'll use a simple session check
    // In production, you'd use proper JWT or session authentication
    if (!req.session.cmsAuthenticated) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  };

  // === AUTHENTICATION ROUTES ===

  app.post('/applications/cms/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      // Simple demo authentication - replace with proper auth
      if (username === 'admin' && password === 'cms123') {
        req.session.cmsAuthenticated = true;
        req.session.cmsUser = { id: 'admin', username: 'admin', role: 'admin' };

        res.json({
          success: true,
          user: req.session.cmsUser,
          message: 'Login successful'
        });
      } else {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/applications/cms/api/auth/logout', (req, res) => {
    req.session.cmsAuthenticated = false;
    req.session.cmsUser = null;
    res.json({ success: true, message: 'Logged out successfully' });
  });

  app.get('/applications/cms/api/auth/check', (req, res) => {
    res.json({
      authenticated: !!req.session.cmsAuthenticated,
      user: req.session.cmsUser || null
    });
  });

  // === DASHBOARD ROUTES ===

  app.get('/applications/cms/api/dashboard/stats', authenticateUser, async (req, res) => {
    try {
      const stats = await dataManager.getDashboardStats();
      res.json(stats);
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
  });

  // === SITE MANAGEMENT ROUTES ===

  app.get('/applications/cms/api/sites', authenticateUser, async (req, res) => {
    try {
      const { status, search: searchQuery } = req.query;

      let filter = {};
      if (status) filter.status = status;

      const sites = await dataManager.find('sites', filter);

      // Apply search filter if provided
      let filteredSites = sites;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredSites = sites.filter(site =>
          site.name.toLowerCase().includes(query) ||
          site.settings.title.toLowerCase().includes(query) ||
          site.settings.description.toLowerCase().includes(query)
        );
      }

      res.json(filteredSites);
    } catch (error) {
      logger.error('Error fetching sites:', error);
      res.status(500).json({ error: 'Failed to fetch sites' });
    }
  });

  app.post('/applications/cms/api/sites', authenticateUser, async (req, res) => {
    try {
      const siteData = {
        ...req.body,
        userId: req.session.cmsUser.id
      };

      const site = await dataManager.createSite(siteData);

      // Clear cache
      await cache.delete('cms:sites:list');

      logger.info(`Site created: ${site.name} (${site.id})`);
      res.json({ success: true, site });
    } catch (error) {
      logger.error('Error creating site:', error);
      res.status(500).json({ error: 'Failed to create site' });
    }
  });

  app.get('/applications/cms/api/sites/:id', authenticateUser, async (req, res) => {
    try {
      const site = await dataManager.getSiteWithPages(req.params.id);
      if (!site) {
        return res.status(404).json({ error: 'Site not found' });
      }
      res.json(site);
    } catch (error) {
      logger.error('Error fetching site:', error);
      res.status(500).json({ error: 'Failed to fetch site' });
    }
  });

  app.put('/applications/cms/api/sites/:id', authenticateUser, async (req, res) => {
    try {
      const updatedSite = await dataManager.update('sites', req.params.id, req.body);
      if (!updatedSite) {
        return res.status(404).json({ error: 'Site not found' });
      }

      // Clear cache
      await cache.delete(`cms:site:${req.params.id}`);
      await cache.delete('cms:sites:list');

      res.json({ success: true, site: updatedSite });
    } catch (error) {
      logger.error('Error updating site:', error);
      res.status(500).json({ error: 'Failed to update site' });
    }
  });

  app.delete('/applications/cms/api/sites/:id', authenticateUser, async (req, res) => {
    try {
      const success = await dataManager.remove('sites', req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Site not found' });
      }

      // Also delete all pages for this site
      const pages = await dataManager.find('pages', { siteId: req.params.id });
      for (const page of pages) {
        await dataManager.remove('pages', page.id);
      }

      // Clear cache
      await cache.delete(`cms:site:${req.params.id}`);
      await cache.delete('cms:sites:list');

      res.json({ success: true, message: 'Site deleted successfully' });
    } catch (error) {
      logger.error('Error deleting site:', error);
      res.status(500).json({ error: 'Failed to delete site' });
    }
  });

  // === SITE PUBLISHING ROUTES ===

  app.post('/applications/cms/api/sites/:id/publish', authenticateUser, async (req, res) => {
    try {
      const result = await siteBuilder.publishSite(req.params.id);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Error publishing site:', error);
      res.status(500).json({ error: 'Failed to publish site: ' + error.message });
    }
  });

  app.post('/applications/cms/api/sites/:id/unpublish', authenticateUser, async (req, res) => {
    try {
      const result = await siteBuilder.unpublishSite(req.params.id);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Error unpublishing site:', error);
      res.status(500).json({ error: 'Failed to unpublish site: ' + error.message });
    }
  });

  app.post('/applications/cms/api/sites/:id/preview', authenticateUser, async (req, res) => {
    try {
      const result = await siteBuilder.previewSite(req.params.id);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Error generating preview:', error);
      res.status(500).json({ error: 'Failed to generate preview: ' + error.message });
    }
  });

  app.get('/applications/cms/api/sites/:id/status', authenticateUser, async (req, res) => {
    try {
      const status = await siteBuilder.getSiteGenerationStatus(req.params.id);
      const buildStats = await siteBuilder.getSiteBuildStats(req.params.id);

      res.json({
        generationStatus: status,
        buildStats
      });
    } catch (error) {
      logger.error('Error fetching site status:', error);
      res.status(500).json({ error: 'Failed to fetch site status' });
    }
  });

  // === PAGE MANAGEMENT ROUTES ===

  app.get('/applications/cms/api/sites/:siteId/pages', authenticateUser, async (req, res) => {
    try {
      const pages = await dataManager.find('pages', { siteId: req.params.siteId });
      res.json(pages);
    } catch (error) {
      logger.error('Error fetching pages:', error);
      res.status(500).json({ error: 'Failed to fetch pages' });
    }
  });

  app.post('/applications/cms/api/sites/:siteId/pages', authenticateUser, async (req, res) => {
    try {
      const pageData = {
        ...req.body,
        siteId: req.params.siteId
      };

      const page = await dataManager.createPage(pageData);

      logger.info(`Page created: ${page.name} (${page.id})`);
      res.json({ success: true, page });
    } catch (error) {
      logger.error('Error creating page:', error);
      res.status(500).json({ error: 'Failed to create page' });
    }
  });

  app.get('/applications/cms/api/pages/:id', authenticateUser, async (req, res) => {
    try {
      const page = await dataManager.getPageContent(req.params.id);
      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }
      res.json(page);
    } catch (error) {
      logger.error('Error fetching page:', error);
      res.status(500).json({ error: 'Failed to fetch page' });
    }
  });

  app.put('/applications/cms/api/pages/:id', authenticateUser, async (req, res) => {
    try {
      const updatedPage = await dataManager.update('pages', req.params.id, req.body);
      if (!updatedPage) {
        return res.status(404).json({ error: 'Page not found' });
      }

      // Clear cache
      await cache.delete(`cms:page:${req.params.id}`);

      res.json({ success: true, page: updatedPage });
    } catch (error) {
      logger.error('Error updating page:', error);
      res.status(500).json({ error: 'Failed to update page' });
    }
  });

  app.delete('/applications/cms/api/pages/:id', authenticateUser, async (req, res) => {
    try {
      const success = await dataManager.remove('pages', req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Page not found' });
      }

      // Clear cache
      await cache.delete(`cms:page:${req.params.id}`);

      res.json({ success: true, message: 'Page deleted successfully' });
    } catch (error) {
      logger.error('Error deleting page:', error);
      res.status(500).json({ error: 'Failed to delete page' });
    }
  });

  // === COMPONENT MANAGEMENT ROUTES ===

  app.get('/applications/cms/api/components', authenticateUser, async (req, res) => {
    try {
      const { category } = req.query;
      let components;

      if (category) {
        components = await dataManager.getComponentsByCategory(category);
      } else {
        components = await dataManager.find('components');
      }

      res.json(components);
    } catch (error) {
      logger.error('Error fetching components:', error);
      res.status(500).json({ error: 'Failed to fetch components' });
    }
  });

  app.get('/applications/cms/api/components/categories', authenticateUser, async (req, res) => {
    try {
      const components = await dataManager.find('components');
      const categories = [...new Set(components.map(comp => comp.category))];
      res.json(categories);
    } catch (error) {
      logger.error('Error fetching component categories:', error);
      res.status(500).json({ error: 'Failed to fetch component categories' });
    }
  });

  app.post('/applications/cms/api/components', authenticateUser, async (req, res) => {
    try {
      const componentId = await dataManager.add('components', req.body);
      const component = await dataManager.findOne('components', { id: componentId });

      res.json({ success: true, component });
    } catch (error) {
      logger.error('Error creating component:', error);
      res.status(500).json({ error: 'Failed to create component' });
    }
  });

  // === TEMPLATE MANAGEMENT ROUTES ===

  app.get('/applications/cms/api/templates', authenticateUser, async (req, res) => {
    try {
      const { category } = req.query;
      let templates;

      if (category) {
        templates = await dataManager.getTemplatesByCategory(category);
      } else {
        templates = await dataManager.find('templates');
      }

      res.json(templates);
    } catch (error) {
      logger.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  app.get('/applications/cms/api/templates/:id', authenticateUser, async (req, res) => {
    try {
      const template = await dataManager.findOne('templates', { id: req.params.id });
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      res.json(template);
    } catch (error) {
      logger.error('Error fetching template:', error);
      res.status(500).json({ error: 'Failed to fetch template' });
    }
  });

  app.post('/applications/cms/api/templates', authenticateUser, async (req, res) => {
    try {
      const templateId = await dataManager.add('templates', req.body);
      const template = await dataManager.findOne('templates', { id: templateId });

      res.json({ success: true, template });
    } catch (error) {
      logger.error('Error creating template:', error);
      res.status(500).json({ error: 'Failed to create template' });
    }
  });

  // === ASSET MANAGEMENT ROUTES ===

  app.get('/applications/cms/api/assets', authenticateUser, async (req, res) => {
    try {
      const { type, search: searchQuery } = req.query;
      let filter = {};
      if (type) filter.type = type;

      let assets = await dataManager.find('assets', filter);

      // Apply search filter if provided
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        assets = assets.filter(asset =>
          asset.filename.toLowerCase().includes(query) ||
          asset.originalName.toLowerCase().includes(query)
        );
      }

      res.json(assets);
    } catch (error) {
      logger.error('Error fetching assets:', error);
      res.status(500).json({ error: 'Failed to fetch assets' });
    }
  });

  app.post('/applications/cms/api/assets/upload', authenticateUser, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileData = {
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype
      };

      const metadata = {
        uploadedBy: req.session.cmsUser.id,
        tags: req.body.tags ? req.body.tags.split(',') : []
      };

      const asset = await assetManager.uploadAsset(fileData, metadata);
      const assetId = await dataManager.createAsset(asset);

      res.json({ success: true, asset: { ...asset, id: assetId } });
    } catch (error) {
      logger.error('Error uploading asset:', error);
      res.status(500).json({ error: 'Failed to upload asset: ' + error.message });
    }
  });

  app.delete('/applications/cms/api/assets/:id', authenticateUser, async (req, res) => {
    try {
      const success = await dataManager.remove('assets', req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      // Also delete the actual file
      try {
        await assetManager.deleteAsset(req.params.id);
      } catch (fileError) {
        logger.warn(`Failed to delete asset file: ${req.params.id}`);
      }

      res.json({ success: true, message: 'Asset deleted successfully' });
    } catch (error) {
      logger.error('Error deleting asset:', error);
      res.status(500).json({ error: 'Failed to delete asset' });
    }
  });

  app.post('/applications/cms/api/assets/:id/optimize', authenticateUser, async (req, res) => {
    try {
      const asset = await assetManager.optimizeAsset(req.params.id);

      // Update asset in database
      await dataManager.update('assets', req.params.id, {
        optimized: asset.optimized,
        metadata: asset.metadata
      });

      res.json({ success: true, asset });
    } catch (error) {
      logger.error('Error optimizing asset:', error);
      res.status(500).json({ error: 'Failed to optimize asset: ' + error.message });
    }
  });

  // === THEME MANAGEMENT ROUTES ===

  app.get('/applications/cms/api/themes', authenticateUser, async (req, res) => {
    try {
      const themes = await themeManager.getAllThemes();
      res.json(themes);
    } catch (error) {
      logger.error('Error fetching themes:', error);
      res.status(500).json({ error: 'Failed to fetch themes' });
    }
  });

  app.get('/applications/cms/api/themes/:id', authenticateUser, async (req, res) => {
    try {
      const theme = await themeManager.getTheme(req.params.id);
      if (!theme) {
        return res.status(404).json({ error: 'Theme not found' });
      }
      res.json(theme);
    } catch (error) {
      logger.error('Error fetching theme:', error);
      res.status(500).json({ error: 'Failed to fetch theme' });
    }
  });

  app.post('/applications/cms/api/themes/:id/customize', authenticateUser, async (req, res) => {
    try {
      const { customizations, name } = req.body;
      const customTheme = await themeManager.createCustomTheme(
        req.params.id,
        customizations,
        { name }
      );

      res.json({ success: true, theme: customTheme });
    } catch (error) {
      logger.error('Error creating custom theme:', error);
      res.status(500).json({ error: 'Failed to create custom theme: ' + error.message });
    }
  });

  app.post('/applications/cms/api/themes/:id/duplicate', authenticateUser, async (req, res) => {
    try {
      const { name } = req.body;
      const duplicatedTheme = await themeManager.duplicateTheme(req.params.id, name);

      res.json({ success: true, theme: duplicatedTheme });
    } catch (error) {
      logger.error('Error duplicating theme:', error);
      res.status(500).json({ error: 'Failed to duplicate theme: ' + error.message });
    }
  });

  // === SEARCH ROUTES ===

  app.get('/applications/cms/api/search', authenticateUser, async (req, res) => {
    try {
      const { q: query, type, limit = 20 } = req.query;

      if (!query) {
        return res.json([]);
      }

      // Search across different content types
      const results = [];

      // Search sites
      if (!type || type === 'sites') {
        const sites = await dataManager.find('sites');
        const siteResults = sites.filter(site =>
          site.name.toLowerCase().includes(query.toLowerCase()) ||
          site.settings.title.toLowerCase().includes(query.toLowerCase())
        ).map(site => ({ ...site, type: 'site' }));
        results.push(...siteResults);
      }

      // Search pages
      if (!type || type === 'pages') {
        const pages = await dataManager.find('pages');
        const pageResults = pages.filter(page =>
          page.title.toLowerCase().includes(query.toLowerCase()) ||
          page.name.toLowerCase().includes(query.toLowerCase())
        ).map(page => ({ ...page, type: 'page' }));
        results.push(...pageResults);
      }

      // Search assets
      if (!type || type === 'assets') {
        const assets = await dataManager.find('assets');
        const assetResults = assets.filter(asset =>
          asset.filename.toLowerCase().includes(query.toLowerCase()) ||
          asset.originalName.toLowerCase().includes(query.toLowerCase())
        ).map(asset => ({ ...asset, type: 'asset' }));
        results.push(...assetResults);
      }

      res.json(results.slice(0, parseInt(limit)));
    } catch (error) {
      logger.error('Error performing search:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // === ANALYTICS ROUTES ===

  app.get('/applications/cms/api/analytics/:siteId', authenticateUser, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await dataManager.getSiteAnalytics(
        req.params.siteId,
        startDate,
        endDate
      );

      res.json(analytics);
    } catch (error) {
      logger.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // === APPLICATION STATUS ===

  app.get('/applications/cms/api/status', (req, res) => {
    res.json({
      status: 'running',
      application: 'Content Management System',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      features: {
        siteBuilder: true,
        templateEngine: true,
        assetManager: true,
        themeManager: true,
        authentication: true
      }
    });
  });

  logger.info('CMS routes registered successfully');
};
