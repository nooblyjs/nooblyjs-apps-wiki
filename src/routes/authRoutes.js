/**
 * @fileoverview Wiki Authentication Routes Bridge
 * Provides authentication endpoints for the Wiki application by bridging to the
 * nooblyjs-core authentication service. Handles user registration, login, logout,
 * and session validation while maintaining wiki-specific behavior (wizard redirects, etc.)
 *
 * This module acts as an adapter layer between the frontend's expected `/api/auth/`
 * endpoints and the core service's `/services/authservice/api/` endpoints.
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-11-06
 */

'use strict';

/**
 * Configures and registers wiki authentication routes with the Express application.
 * Bridges frontend requests to the nooblyjs-core authentication service.
 *
 * @param {Object} options - Configuration options object
 * @param {Object} options.app - The Express application instance
 * @param {Object} eventEmitter - Event emitter for logging and notifications
 * @param {Object} services - NooblyJS Core services object
 * @param {Object} services.dataManager - Data manager for wiki data persistence
 * @param {Object} services.logger - Logger service instance
 * @return {void}
 */
module.exports = (options, eventEmitter, services) => {
  const app = options.app;
  const { logger } = services;

  // Helper function to handle async route errors with proper error response
  const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      logger.error('Auth route error:', err.message);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    });
  };

  /**
   * POST /api/auth/register
   * Registers a new user account and creates a session.
   * Delegates to nooblyjs-core auth service.
   *
   * Request body:
   * - name: User's full name
   * - email: User's email address
   * - password: User's password
   *
   * Response:
   * - success: boolean
   * - needsWizard: boolean - indicates if user should complete setup wizard
   * - user: object with id, email, name, initialized flag
   * - message: string
   */
  app.post('/api/auth/register', asyncHandler(async (req, res) => {
    try {
      const { email, password, name } = req.body;

      // Validate required fields
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, and name are required'
        });
      }

      logger.info(`Registration attempt for email: ${email}`);

      // Call the core auth service's createUser method
      // The auth service is available via serviceRegistry, which was initialized in app.js
      // We need to access it from the app context where it's available
      const authService = req.app.get('authservice');

      if (!authService) {
        logger.error('Auth service not available in app context');
        return res.status(500).json({
          success: false,
          message: 'Authentication service unavailable'
        });
      }

      // Generate username from email (convert email to valid username)
      // Use the part before @ and replace invalid chars with underscores
      const username = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

      // Create user through the auth service
      // The core service requires: username, email, password
      const user = await authService.createUser({
        username,
        email,
        password,
        role: 'user'
      });

      logger.info(`User created successfully: ${username} (id: ${user.id})`);

      // Establish session through Passport so req.isAuthenticated() works
      if (req.logIn) {
        await new Promise((resolve, reject) => {
          req.logIn(user, (err) => {
            if (err) {
              logger.error('Error establishing session after registration:', err.message);
              return reject(err);
            }
            resolve();
          });
        });
      }

      eventEmitter.emit('wiki:user-registered', { email });

      res.status(201).json({
        success: true,
        needsWizard: true,  // New users always need to complete wizard
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: name,  // Use the name from request, as core service doesn't store it
          initialized: false
        },
        message: 'Registration successful'
      });
    } catch (error) {
      logger.error('Registration error:', error.message);

      // Check if user already exists
      if (error.message && error.message.includes('already exists')) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Registration failed'
      });
    }
  }));

  /**
   * POST /api/auth/login
   * Authenticates a user and creates a session.
   * Delegates to nooblyjs-core auth service.
   *
   * Request body:
   * - email: User's email address
   * - password: User's password
   *
   * Response:
   * - success: boolean
   * - needsWizard: boolean - indicates if user should complete setup wizard
   * - user: object with id, email, name, initialized flag
   * - message: string
   */
  app.post('/api/auth/login', asyncHandler(async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      logger.info(`Login attempt for email: ${email}`);

      const authService = req.app.get('authservice');

      if (!authService) {
        logger.error('Auth service not available in app context');
        return res.status(500).json({
          success: false,
          message: 'Authentication service unavailable'
        });
      }

      // Generate username from email (same logic as register)
      const username = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

      logger.info(`Generated username from email: ${username}`);

      // Authenticate user through the auth service using username
      // The core service authenticates via username + password
      // Returns { user: {...}, session: {...} }
      const authResult = await authService.authenticateUser(username, password);

      if (!authResult || !authResult.user) {
        logger.warn(`Login failed for email: ${email}`);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const user = authResult.user;
      const session = authResult.session;

      logger.info(`Auth service result: user=${user ? 'present' : 'missing'}, session=${session ? 'present' : 'missing'}`);

      // Establish session through Passport so req.isAuthenticated() works
      if (req.logIn) {
        await new Promise((resolve, reject) => {
          req.logIn(user, (err) => {
            if (err) {
              logger.error('Error establishing session after login:', err.message);
              return reject(err);
            }
            resolve();
          });
        });
      }

      eventEmitter.emit('wiki:user-login', { email });
      logger.info(`Login successful for email: ${email}`);

      res.status(200).json({
        success: true,
        needsWizard: !user.initialized,  // Check if user completed wizard (default to true for new users)
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name || user.username,  // Use username as fallback for name
          initialized: user.initialized || false
        },
        message: 'Login successful'
      });
    } catch (error) {
      logger.error('Login error:', error.message);
      res.status(500).json({
        success: false,
        message: error.message || 'Login failed'
      });
    }
  }));

  /**
   * POST /api/auth/logout
   * Logs out the current user and destroys their session.
   *
   * Response:
   * - success: boolean
   * - message: string
   */
  app.post('/api/auth/logout', asyncHandler(async (req, res) => {
    try {
      const email = req.user?.email || 'unknown';
      logger.info(`Logout request for user: ${email}`);

      // Destroy the session
      req.logout((err) => {
        if (err) {
          logger.error('Error during logout:', err.message);
          return res.status(500).json({
            success: false,
            message: 'Error during logout'
          });
        }

        // Also destroy the session data
        req.session.destroy((sessErr) => {
          if (sessErr) {
            logger.warn('Error destroying session:', sessErr.message);
            // Still return success even if session destroy fails
          }

          eventEmitter.emit('wiki:user-logout', { email });
          logger.info(`Logout successful for user: ${email}`);

          res.status(200).json({
            success: true,
            message: 'Logout successful'
          });
        });
      });
    } catch (error) {
      logger.error('Logout error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }));

  /**
   * GET /api/auth/check
   * Checks if the current user is authenticated and returns their status.
   * Includes a flag indicating if the user needs to complete the setup wizard.
   *
   * Response:
   * - authenticated: boolean
   * - needsWizard: boolean (only if authenticated)
   * - user: object with id, email, name (only if authenticated)
   */
  app.get('/api/auth/check', asyncHandler(async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        logger.info(`Auth check successful for user: ${req.user?.email}`);

        res.status(200).json({
          authenticated: true,
          needsWizard: !req.user.initialized,  // Check if user completed wizard
          user: {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            initialized: req.user.initialized || false
          }
        });
      } else {
        res.status(200).json({
          authenticated: false
        });
      }
    } catch (error) {
      logger.error('Auth check error:', error.message);
      res.status(200).json({
        authenticated: false
      });
    }
  }));

  /**
   * POST /api/auth/change-password
   * Changes the password for the authenticated user.
   * Requires current password verification before allowing the change.
   *
   * Request body:
   * - currentPassword: User's current password
   * - newPassword: User's new password
   *
   * Response:
   * - success: boolean
   * - message: string
   */
  app.post('/api/auth/change-password', asyncHandler(async (req, res) => {
    try {
      // Verify user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Validate required fields
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      // Validate new password length
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters'
        });
      }

      logger.info(`Password change requested for user: ${req.user?.email}`);

      const authService = req.app.get('authservice');

      if (!authService) {
        return res.status(500).json({
          success: false,
          message: 'Authentication service unavailable'
        });
      }

      // Verify current password and change to new password
      // Use username for auth service (which is stored in req.user.username from Passport)
      const username = req.user.username || req.user.email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      const result = await authService.changePassword(
        username,
        currentPassword,
        newPassword
      );

      if (result.success) {
        eventEmitter.emit('wiki:password-changed', { email: req.user.email });
        logger.info(`Password changed successfully for user: ${req.user?.email}`);

        res.status(200).json({
          success: true,
          message: 'Password changed successfully'
        });
      } else {
        logger.warn(`Password change failed for user: ${req.user?.email}`);
        res.status(400).json({
          success: false,
          message: result.message || 'Current password is incorrect'
        });
      }
    } catch (error) {
      logger.error('Change password error:', error.message);
      res.status(500).json({
        success: false,
        message: error.message || 'Change password failed'
      });
    }
  }));

  logger.info('Wiki authentication routes registered successfully');
};
