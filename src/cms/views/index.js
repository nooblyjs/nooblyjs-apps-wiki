/**
 * @fileoverview CMS service views module for noobly-applications framework.
 * This module provides Express.js view registration and static file serving
 * capabilities for the CMS service. It registers static routes to serve
 * CMS-related view files, templates, and admin interface through the Express application.
 *
 * @author NooblyJS
 * @version 1.0.14
 * @module CMS
 */

'use strict';

const path = require('path');
const express = require('express');

/**
 * CMS service views module for noobly-applications framework.
 * This module provides Express.js view registration and static file serving
 * capabilities for the CMS service. It registers static routes to serve
 * CMS-related view files and templates through the Express application.
 *
 * @function
 * @param {Object} options - Configuration options for the views setup
 * @param {express.Application} options.express-app - The Express application instance
 * @param {Object} eventEmitter - Event emitter instance for inter-service communication
 * @param {Object} services - NooblyJS Core services and CMS components
 * @returns {void}
 */
module.exports = (options, eventEmitter, services) => {
  const app = options;
  const { logger, dataManager, siteBuilder, templateEngine, assetManager, themeManager } = services;

  // Store services for access in middleware
  app.locals.cmsServices = services;

  // Set EJS as the view engine for CMS routes
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'admin'));

  // Authentication middleware
  function requireAuth(req, res, next) {
    if (!req.session.cmsAuthenticated) {
      return res.redirect('/applications/cms/login');
    }
    next();
  }

  // CMS Admin Routes (serving HTML pages) - Register these BEFORE static middleware

  // Redirect root CMS path to dashboard
  app.get('/applications/cms', (req, res) => {
    if (req.session.cmsAuthenticated) {
      res.redirect('/applications/cms/dashboard');
    } else {
      res.redirect('/applications/cms/login');
    }
  });

  // Login page
  app.get('/applications/cms/login', (req, res) => {
    // Redirect to dashboard if already authenticated
    if (req.session.cmsAuthenticated) {
      return res.redirect('/applications/cms/dashboard');
    }
    res.render(path.join(__dirname, 'admin/login.ejs'));
  });

  // Dashboard
  app.get('/applications/cms/dashboard', requireAuth, (req, res) => {
    res.render(path.join(__dirname, 'admin/dashboard.ejs'), {
      user: req.session.cmsUser
    });
  });

  // Site Builder
  app.get('/applications/cms/sites/:id/builder', requireAuth, async (req, res) => {
    try {
      const site = await dataManager.findOne('sites', { id: req.params.id });
      if (!site) {
        return res.status(404).send('Site not found');
      }

      res.render(path.join(__dirname, 'builder/editor.ejs'), {
        site,
        user: req.session.cmsUser
      });
    } catch (error) {
      logger.error('Error loading site builder:', error);
      res.status(500).send('Failed to load site builder');
    }
  });

  // Sites listing page
  app.get('/applications/cms/sites', requireAuth, (req, res) => {
    res.render(path.join(__dirname, 'admin/sites.ejs'), {
      user: req.session.cmsUser
    });
  });

  // Site creation page
  app.get('/applications/cms/sites/new', requireAuth, (req, res) => {
    res.render(path.join(__dirname, 'admin/site-form.ejs'), {
      user: req.session.cmsUser,
      site: null,
      isEdit: false
    });
  });

  // Site edit page
  app.get('/applications/cms/sites/:id/edit', requireAuth, async (req, res) => {
    try {
      const site = await dataManager.findOne('sites', { id: req.params.id });
      if (!site) {
        return res.status(404).send('Site not found');
      }

      res.render(path.join(__dirname, 'admin/site-form.ejs'), {
        user: req.session.cmsUser,
        site,
        isEdit: true
      });
    } catch (error) {
      logger.error('Error loading site edit page:', error);
      res.status(500).send('Failed to load site');
    }
  });

  // Assets page
  app.get('/applications/cms/assets', requireAuth, (req, res) => {
    res.render(path.join(__dirname, 'admin/assets.ejs'), {
      user: req.session.cmsUser
    });
  });

  // Templates page
  app.get('/applications/cms/templates', requireAuth, (req, res) => {
    res.render(path.join(__dirname, 'admin/templates.ejs'), {
      user: req.session.cmsUser
    });
  });

  // Themes page
  app.get('/applications/cms/themes', requireAuth, (req, res) => {
    res.render(path.join(__dirname, 'admin/themes.ejs'), {
      user: req.session.cmsUser
    });
  });

  // Analytics page
  app.get('/applications/cms/analytics', requireAuth, (req, res) => {
    res.render(path.join(__dirname, 'admin/analytics.ejs'), {
      user: req.session.cmsUser
    });
  });

  // Settings page
  app.get('/applications/cms/settings', requireAuth, (req, res) => {
    res.render(path.join(__dirname, 'admin/settings.ejs'), {
      user: req.session.cmsUser
    });
  });

  // Serve static files for CMS application (CSS, JS, images)
  // This must come AFTER all route definitions to avoid conflicts
  app.use('/applications/cms/css', express.static(path.join(__dirname, 'css')));
  app.use('/applications/cms/js', express.static(path.join(__dirname, 'js')));
  app.use('/applications/cms/assets', express.static(path.join(__dirname, 'assets')));

  // Serve published sites (this would be enhanced in a real implementation)
  app.get('/sites/:siteId/*', async (req, res) => {
    try {
      const { siteId } = req.params;
      const pagePath = req.params[0] || 'index.html';

      // In a real implementation, you would serve the generated static files
      // For now, we'll redirect to a placeholder
      res.send(`
        <html>
          <head><title>Published Site</title></head>
          <body>
            <h1>Published Site: ${siteId}</h1>
            <p>Page: ${pagePath}</p>
            <p>This is where the generated static site would be served.</p>
          </body>
        </html>
      `);
    } catch (error) {
      logger.error('Error serving published site:', error);
      res.status(500).send('Site not available');
    }
  });

  // Log that CMS views are registered
  logger.info('CMS views and routes registered successfully');
};