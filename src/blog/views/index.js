/**
 * @fileoverview Blog Views Configuration
 * Configures static file serving for the blog application views.
 * Handles HTML, CSS, JavaScript, and media assets for both public
 * and admin interfaces.
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-09-16
 */

'use strict';

const path = require('path');
const mime = require('mime-types');

/**
 * Configure static file serving for blog views
 * @param {Object} options - Configuration options
 * @param {Object} eventEmitter - Event emitter for logging
 * @param {Object} services - NooblyJS Core services
 */
module.exports = (options, eventEmitter, services) => {
  const app = options;
  const { logger } = services;

  try {
    // Serve main blog application
    app.get('/applications/blog', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });

    // Serve blog post pages
    app.get('/applications/blog/posts/:slug', (req, res) => {
      res.sendFile(path.join(__dirname, 'post.html'));
    });

    // Serve admin pages
    app.get('/applications/blog/admin/stories', (req, res) => {
      res.sendFile(path.join(__dirname, 'admin-stories.html'));
    });

    app.get('/applications/blog/admin/write', (req, res) => {
      res.sendFile(path.join(__dirname, 'admin-write.html'));
    });

    app.get('/applications/blog/admin/stats', (req, res) => {
      res.sendFile(path.join(__dirname, 'admin-stats.html'));
    });

    // Note: Login page route is handled by auth service

    // Static assets
    app.get('/applications/blog/css/:file', (req, res) => {
      const fileName = req.params.file;
      const filePath = path.join(__dirname, 'css', fileName);

      const contentType = mime.lookup(fileName) || 'text/css';
      res.setHeader('Content-Type', contentType);
      res.sendFile(filePath);
    });

    app.get('/applications/blog/js/:file', (req, res) => {
      const fileName = req.params.file;
      const filePath = path.join(__dirname, 'js', fileName);

      const contentType = mime.lookup(fileName) || 'application/javascript';
      res.setHeader('Content-Type', contentType);
      res.sendFile(filePath);
    });

    app.get('/applications/blog/images/:file', (req, res) => {
      const fileName = req.params.file;
      const filePath = path.join(__dirname, 'images', fileName);

      const contentType = mime.lookup(fileName) || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.sendFile(filePath);
    });

    app.get('/applications/blog/favicon.ico', (req, res) => {
      res.sendFile(path.join(__dirname, 'favicon.ico'));
    });

    logger.info('Blog views configured successfully');
  } catch (error) {
    logger.error('Error configuring blog views:', error);
    throw error;
  }
};