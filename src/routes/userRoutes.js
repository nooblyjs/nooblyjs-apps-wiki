/**
 * @fileoverview User API routes for Wiki application
 * Handles authentication, user profiles, and user activity tracking
 *
 * @author NooblyJS Core Team
 * @version 1.0.14
 * @since 1.0.0
 */

'use strict';

/**
 * Configures and registers user routes with the Express application.
 *
 * @param {Object} options - Configuration options object
 * @param {Object} eventEmitter - Event emitter for logging and notifications
 * @param {Object} services - NooblyJS Core services (dataManager, filing, cache, logger, queue, search)
 * @return {void}
 */
module.exports = (options, eventEmitter, services) => {
  const app = options;
  const { dataManager, filing, cache, logger, queue, search } = services;

  // Authentication endpoints
  app.post('/applications/wiki/login', (req, res) => {
    const { username, password } = req.body;

    if (username === 'admin' && password === 'password') {
      req.session.wikiAuthenticated = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });

  app.post('/applications/wiki/logout', (req, res) => {
    req.session.wikiAuthenticated = false;
    res.json({ success: true });
  });

  app.get('/applications/wiki/api/auth/check', (req, res) => {
    res.json({ authenticated: !!req.session.wikiAuthenticated });
  });

  // User profile endpoints
  app.get('/applications/wiki/api/profile', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session.wikiAuthenticated) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Try to get user profile from cache first
      const cacheKey = 'wiki:user:profile:admin';
      let userProfile = await cache.get(cacheKey);

      if (!userProfile) {
        // Load from dataServe or create default profile
        try {
          userProfile = await dataManager.read('userProfile');
          if (!userProfile) {
            // Create default user profile
            userProfile = {
              id: 'admin',
              username: 'admin',
              name: 'Admin User',
              email: 'admin@example.com',
              role: 'administrator',
              bio: 'System administrator of the wiki platform.',
              location: '',
              timezone: 'UTC',
              preferences: {
                emailNotifications: true,
                darkMode: false,
                defaultLanguage: 'en'
              },
              avatar: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            // Save default profile
            await dataManager.write('userProfile', userProfile);
            logger.info('Created default user profile');
          }

          // Cache for 30 minutes
          await cache.put(cacheKey, userProfile, 1800);
          logger.info('Loaded user profile from dataServe and cached');
        } catch (error) {
          logger.error('Error loading user profile from dataServe:', error);
          // Return default profile without saving
          userProfile = {
            id: 'admin',
            username: 'admin',
            name: 'Admin User',
            email: 'admin@example.com',
            role: 'administrator',
            bio: '',
            location: '',
            timezone: 'UTC',
            preferences: {
              emailNotifications: true,
              darkMode: false,
              defaultLanguage: 'en'
            },
            avatar: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }
      } else {
        logger.info('Loaded user profile from cache');
      }

      res.json(userProfile);
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  app.put('/applications/wiki/api/profile', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session.wikiAuthenticated) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const {
        name,
        email,
        role,
        bio,
        location,
        timezone,
        preferences
      } = req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      // Get current profile
      let currentProfile;
      try {
        currentProfile = await dataManager.read('userProfile');
      } catch (error) {
        logger.warn('No existing user profile found, creating new one');
      }

      // Create updated profile
      const updatedProfile = {
        ...(currentProfile || {}),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role || 'administrator',
        bio: bio || '',
        location: location || '',
        timezone: timezone || 'UTC',
        preferences: {
          emailNotifications: preferences?.emailNotifications ?? true,
          darkMode: preferences?.darkMode ?? false,
          defaultLanguage: preferences?.defaultLanguage || 'en'
        },
        updatedAt: new Date().toISOString(),
        // Preserve existing fields
        id: 'admin',
        username: 'admin',
        avatar: currentProfile?.avatar || null,
        createdAt: currentProfile?.createdAt || new Date().toISOString()
      };

      // Save updated profile
      await dataManager.write('userProfile', updatedProfile);

      // Clear cache to force refresh
      const cacheKey = 'wiki:user:profile:admin';
      await cache.delete(cacheKey);

      logger.info(`Updated user profile for admin: ${name}`);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        profile: updatedProfile
      });
    } catch (error) {
      logger.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  });

  // User activity tracking endpoints
  app.get('/applications/wiki/api/user/activity', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session.wikiAuthenticated) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userId = 'admin'; // For now, we'll use 'admin' as the default user

      // Try to get user activity from dataServe
      let userActivity = await dataManager.read(`userActivity_${userId}`);

      // If result is empty array or doesn't have expected structure, create new activity record
      if (Array.isArray(userActivity) || !userActivity || !userActivity.hasOwnProperty('starred')) {
        logger.info(`No existing activity found for user ${userId}, creating new activity record`);
        userActivity = {
          userId: userId,
          starred: [],
          recent: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Save initial activity record
        await dataManager.write(`userActivity_${userId}`, userActivity);
      }

      res.json(userActivity);
    } catch (error) {
      logger.error('Error fetching user activity:', error);
      res.status(500).json({ error: 'Failed to fetch user activity' });
    }
  });

  app.post('/applications/wiki/api/user/star', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session.wikiAuthenticated) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { path, spaceName, title, action } = req.body;

      if (!path || !spaceName || !title) {
        return res.status(400).json({ error: 'Path, spaceName, and title are required' });
      }

      const userId = 'admin';

      // Get current user activity
      let userActivity = await dataManager.read(`userActivity_${userId}`);

      // If result is empty array or doesn't have expected structure, create new activity record
      if (Array.isArray(userActivity) || !userActivity || !userActivity.hasOwnProperty('starred')) {
        userActivity = {
          userId: userId,
          starred: [],
          recent: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      const documentInfo = {
        path: path,
        spaceName: spaceName,
        title: title,
        starredAt: new Date().toISOString()
      };

      if (action === 'star') {
        // Add to starred if not already starred
        const isAlreadyStarred = userActivity.starred.some(item =>
          item.path === path && item.spaceName === spaceName
        );

        if (!isAlreadyStarred) {
          userActivity.starred.unshift(documentInfo);
        }
      } else if (action === 'unstar') {
        // Remove from starred
        userActivity.starred = userActivity.starred.filter(item =>
          !(item.path === path && item.spaceName === spaceName)
        );
      }

      userActivity.updatedAt = new Date().toISOString();

      // Save updated activity
      await dataManager.write(`userActivity_${userId}`, userActivity);

      logger.info(`Document ${action}red: ${title} by user ${userId}`);

      res.json({
        success: true,
        message: `Document ${action}red successfully`,
        starred: userActivity.starred
      });
    } catch (error) {
      logger.error('Error updating star status:', error);
      res.status(500).json({ error: 'Failed to update star status' });
    }
  });

  app.post('/applications/wiki/api/user/visit', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session.wikiAuthenticated) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { path, spaceName, title, action } = req.body;

      if (!path || !spaceName || !title) {
        return res.status(400).json({ error: 'Path, spaceName, and title are required' });
      }

      const userId = 'admin';

      // Get current user activity
      let userActivity = await dataManager.read(`userActivity_${userId}`);

      // If result is empty array or doesn't have expected structure, create new activity record
      if (Array.isArray(userActivity) || !userActivity || !userActivity.hasOwnProperty('starred')) {
        userActivity = {
          userId: userId,
          starred: [],
          recent: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      const documentInfo = {
        path: path,
        spaceName: spaceName,
        title: title,
        action: action, // 'viewed' or 'edited'
        visitedAt: new Date().toISOString()
      };

      // Remove existing entry for this document if it exists
      userActivity.recent = userActivity.recent.filter(item =>
        !(item.path === path && item.spaceName === spaceName)
      );

      // Add to beginning of recent list
      userActivity.recent.unshift(documentInfo);

      // Keep only last 20 recent items
      userActivity.recent = userActivity.recent.slice(0, 20);

      userActivity.updatedAt = new Date().toISOString();

      // Save updated activity
      await dataManager.write(`userActivity_${userId}`, userActivity);

      logger.info(`Document visit tracked: ${title} (${action}) by user ${userId}`);

      res.json({
        success: true,
        message: 'Visit tracked successfully',
        recent: userActivity.recent
      });
    } catch (error) {
      logger.error('Error tracking visit:', error);
      res.status(500).json({ error: 'Failed to track visit' });
    }
  });

  // Legacy activity tracking endpoints (for backward compatibility)
  app.get('/applications/wiki/api/activity', async (req, res) => {
    try {
      const activity = await dataManager.read('activity');
      res.json(activity[0] || { recent: [], starred: [] });
    } catch (error) {
      logger.error('Error reading activity data:', error);
      res.json({ recent: [], starred: [] });
    }
  });

  app.post('/applications/wiki/api/activity', async (req, res) => {
    try {
      const { recent, starred } = req.body;

      // Validate the data
      if (!Array.isArray(recent)) {
        return res.status(400).json({ success: false, message: 'Invalid recent activity data' });
      }

      // Validate starred data (optional)
      if (starred !== undefined && !Array.isArray(starred)) {
        return res.status(400).json({ success: false, message: 'Invalid starred activity data' });
      }

      // Store activity data (replace existing)
      const activityData = {
        recent,
        starred: starred || [],
        updatedAt: new Date().toISOString()
      };
      await dataManager.write('activity', [activityData]);

      logger.info('Activity data saved successfully');
      res.json({ success: true });
    } catch (error) {
      logger.error('Error saving activity data:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
};
