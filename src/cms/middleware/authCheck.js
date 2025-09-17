/**
 * @fileoverview Authentication Middleware for CMS
 * Handles user authentication and authorization for CMS operations
 *
 * @author NooblyJS Team
 * @version 1.0.14
 * @since 2025-08-22
 */

'use strict';

/**
 * Check if user is authenticated for CMS access
 */
function requireAuth(req, res, next) {
  if (!req.session.cmsAuthenticated) {
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(401).json({ error: 'Authentication required' });
    } else {
      return res.redirect('/applications/cms/login');
    }
  }
  next();
}

/**
 * Check if user has admin role
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.session.cmsUser || req.session.cmsUser.role !== 'admin') {
      if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(403).json({ error: 'Admin access required' });
      } else {
        return res.status(403).send('Admin access required');
      }
    }
    next();
  });
}

/**
 * Check if user can edit specific site
 */
function requireSiteAccess(req, res, next) {
  requireAuth(req, res, async () => {
    const siteId = req.params.siteId || req.params.id;

    // Admin can access all sites
    if (req.session.cmsUser?.role === 'admin') {
      return next();
    }

    // Check if user owns the site
    try {
      const { dataManager } = req.app.locals.cmsServices || {};
      if (!dataManager) {
        return res.status(500).json({ error: 'Service not available' });
      }

      const site = await dataManager.findOne('sites', { id: siteId });
      if (!site) {
        return res.status(404).json({ error: 'Site not found' });
      }

      if (site.userId !== req.session.cmsUser?.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Failed to check site access' });
    }
  });
}

/**
 * Attach user information to request
 */
function attachUser(req, res, next) {
  if (req.session.cmsAuthenticated && req.session.cmsUser) {
    req.user = req.session.cmsUser;
  }
  next();
}

/**
 * Log CMS activities
 */
function logActivity(action) {
  return (req, res, next) => {
    const originalSend = res.send;

    res.send = function(...args) {
      // Log successful operations
      if (res.statusCode < 400) {
        const activityLog = {
          userId: req.session.cmsUser?.id,
          username: req.session.cmsUser?.username,
          action,
          method: req.method,
          url: req.originalUrl,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString(),
          success: true
        };

        // Add specific data based on the action
        if (req.params.id) activityLog.resourceId = req.params.id;
        if (req.params.siteId) activityLog.siteId = req.params.siteId;

        // You could save this to a logging service or database
        console.log('[CMS Activity]', JSON.stringify(activityLog));
      }

      originalSend.apply(this, args);
    };

    next();
  };
}

/**
 * Rate limiting for API endpoints
 */
function rateLimit(options = {}) {
  const { maxRequests = 100, windowMs = 15 * 60 * 1000 } = options; // 100 requests per 15 minutes
  const clients = new Map();

  return (req, res, next) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();

    if (!clients.has(clientId)) {
      clients.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const client = clients.get(clientId);

    if (now > client.resetTime) {
      client.count = 1;
      client.resetTime = now + windowMs;
      return next();
    }

    if (client.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((client.resetTime - now) / 1000)
      });
    }

    client.count++;
    next();
  };
}

/**
 * Validate request data
 */
function validateRequest(schema) {
  return (req, res, next) => {
    const errors = [];

    // Simple validation - in production you'd use a library like Joi or Yup
    Object.entries(schema).forEach(([field, rules]) => {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
      }

      if (value && rules.type) {
        if (rules.type === 'string' && typeof value !== 'string') {
          errors.push(`${field} must be a string`);
        }
        if (rules.type === 'number' && typeof value !== 'number') {
          errors.push(`${field} must be a number`);
        }
        if (rules.type === 'email' && !/\S+@\S+\.\S+/.test(value)) {
          errors.push(`${field} must be a valid email`);
        }
      }

      if (value && rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }

      if (value && rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be at most ${rules.maxLength} characters`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    next();
  };
}

/**
 * CORS middleware for CMS API
 */
function corsMiddleware(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireSiteAccess,
  attachUser,
  logActivity,
  rateLimit,
  validateRequest,
  corsMiddleware
};