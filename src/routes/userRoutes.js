/**
 * @fileoverview User API routes for Wiki application
 * Handles authentication, user profiles, and user activity tracking
 *
 * @author NooblyJS Core Team
 * @version 1.0.14
 * @since 1.0.0
 */

'use strict';

const { readUsers, writeUsers } = require('../auth/passport-config');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

/**
 * Configures and registers user routes with the Express application.
 *
 * @param {Object} options - Configuration options object
 * @param {Object} eventEmitter - Event emitter for logging and notifications
 * @param {Object} services - NooblyJS Core services (dataManager, filing, cache, logger, queue, search)
 * @return {void}
 */
module.exports = (options, eventEmitter, services) => {
  
  const app = options.app;
  const { dataManager, filing, cache, logger, queue, search } = services;

  // Configure multer for avatar uploads
  const storage = multer.memoryStorage();
  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

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
      // Check if user is authenticated with Passport
      if (!req.isAuthenticated()) {
        logger.warn('Profile request but user not authenticated');
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get current user from Passport session (from users.json)
      const currentUser = req.user;
      logger.info(`Loading profile for user: ${currentUser.email}, name: ${currentUser.name}`);

      // Load user preferences from userPreferences.json
      let userPreferences;
      try {
        userPreferences = await dataManager.read(`userPreferences_${currentUser.id}`);
        if (!userPreferences) {
          // Create default preferences
          userPreferences = {
            userId: currentUser.id,
            bio: '',
            location: '',
            timezone: 'UTC',
            emailNotifications: true,
            darkMode: false,
            defaultLanguage: 'en',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await dataManager.write(`userPreferences_${currentUser.id}`, userPreferences);
          logger.info(`Created default preferences for user ${currentUser.id}`);
        }
      } catch (error) {
        logger.error('Error loading user preferences:', error);
        // Use defaults
        userPreferences = {
          userId: currentUser.id,
          bio: '',
          location: '',
          timezone: 'UTC',
          emailNotifications: true,
          darkMode: false,
          defaultLanguage: 'en',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      // Combine user data from users.json with preferences from userPreferences.json
      const userProfile = {
        id: currentUser.id,
        name: currentUser.name || '',
        email: currentUser.email,
        role: 'administrator',
        bio: userPreferences.bio || '',
        location: userPreferences.location || '',
        timezone: userPreferences.timezone || 'UTC',
        preferences: {
          emailNotifications: userPreferences.emailNotifications ?? true,
          darkMode: userPreferences.darkMode ?? false,
          defaultLanguage: userPreferences.defaultLanguage || 'en'
        },
        avatar: currentUser.avatar || null,
        createdAt: currentUser.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      res.json(userProfile);
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  app.put('/applications/wiki/api/profile', async (req, res) => {
    try {
      // Check if user is authenticated with Passport
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const {
        name,
        email,
        bio,
        location,
        timezone,
        preferences
      } = req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      const currentUser = req.user;

      // Update name and email in users.json
      const users = await readUsers();
      const userIndex = users.findIndex(u => u.id === currentUser.id);

      if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
      }

      users[userIndex].name = name.trim();
      users[userIndex].email = email.trim().toLowerCase();
      await writeUsers(users);

      logger.info(`Updated user data in users.json for ${email}`);

      // Update preferences in userPreferences.json
      let userPreferences;
      try {
        userPreferences = await dataManager.read(`userPreferences_${currentUser.id}`);
      } catch (error) {
        logger.info('No existing preferences, creating new');
      }

      const updatedPreferences = {
        ...(userPreferences || {}),
        userId: currentUser.id,
        bio: bio || '',
        location: location || '',
        timezone: timezone || 'UTC',
        emailNotifications: preferences?.emailNotifications ?? true,
        darkMode: preferences?.darkMode ?? false,
        defaultLanguage: preferences?.defaultLanguage || 'en',
        updatedAt: new Date().toISOString(),
        createdAt: userPreferences?.createdAt || new Date().toISOString()
      };

      await dataManager.write(`userPreferences_${currentUser.id}`, updatedPreferences);

      logger.info(`Updated user preferences for user ${currentUser.id}`);

      // Return combined profile
      const updatedProfile = {
        id: currentUser.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'administrator',
        bio: updatedPreferences.bio,
        location: updatedPreferences.location,
        timezone: updatedPreferences.timezone,
        preferences: {
          emailNotifications: updatedPreferences.emailNotifications,
          darkMode: updatedPreferences.darkMode,
          defaultLanguage: updatedPreferences.defaultLanguage
        },
        avatar: currentUser.avatar || null,
        createdAt: currentUser.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

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

  // Password change endpoint
  app.post('/applications/wiki/api/profile/change-password', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 6 characters'
        });
      }

      // Verify current password
      const user = req.user;
      const isMatch = await bcrypt.compare(currentPassword, user.password);

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password in users.json
      const users = await readUsers();
      const userIndex = users.findIndex(u => u.id === user.id);

      if (userIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      users[userIndex].password = hashedPassword;
      await writeUsers(users);

      logger.info(`Password changed successfully for user ${user.email}`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Avatar upload endpoint
  app.post('/applications/wiki/api/profile/avatar', upload.single('avatar'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const user = req.user;
      const fileExtension = path.extname(req.file.originalname) || '.png';
      const fileName = `avatar-${user.id}${fileExtension}`;
      const mediaDir = path.join(process.cwd(), '.application', '', 'media');
      const filePath = path.join(mediaDir, fileName);

      // Ensure media directory exists
      try {
        await fs.mkdir(mediaDir, { recursive: true });
      } catch (err) {
        logger.error('Error creating media directory:', err);
      }

      // Write file to disk
      await fs.writeFile(filePath, req.file.buffer);

      logger.info(`Avatar uploaded for user ${user.email}: ${fileName}`);

      // Update user avatar in users.json
      const users = await readUsers();
      const userIndex = users.findIndex(u => u.id === user.id);

      if (userIndex !== -1) {
        users[userIndex].avatar = `/applications/wiki/media/${fileName}`;
        await writeUsers(users);
      }

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        avatarUrl: `/applications/wiki/media/${fileName}`
      });
    } catch (error) {
      logger.error('Avatar upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload avatar'
      });
    }
  });

  // Serve avatar images
  app.get('/applications/wiki/media/:filename', async (req, res) => {
    try {
      const fileName = req.params.filename;
      const mediaDir = path.join(process.cwd(), '.application', '', 'media');
      const filePath = path.join(mediaDir, fileName);

      // Check if file exists
      try {
        await fs.access(filePath);
        res.sendFile(filePath);
      } catch (err) {
        res.status(404).json({ error: 'Avatar not found' });
      }
    } catch (error) {
      logger.error('Error serving avatar:', error);
      res.status(500).json({ error: 'Failed to serve avatar' });
    }
  });

  // User activity tracking endpoints
  app.get('/applications/wiki/api/user/activity', async (req, res) => {
    try {
      // Check if user is authenticated with Passport
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userId = req.user.id;

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
      // Check if user is authenticated with Passport
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { path, spaceName, title, action } = req.body;

      if (!path || !spaceName || !title) {
        return res.status(400).json({ error: 'Path, spaceName, and title are required' });
      }

      const userId = req.user.id;

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
      // Check if user is authenticated with Passport
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { path, spaceName, title, action } = req.body;

      if (!path || !spaceName || !title) {
        return res.status(400).json({ error: 'Path, spaceName, and title are required' });
      }

      const userId = req.user.id;

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

  // Folder view preferences endpoints
  app.get('/applications/wiki/api/user/folder-view-preferences', async (req, res) => {
    try {
      // Check if user is authenticated with Passport
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userId = req.user.id;

      // Try to get user preferences from dataServe
      let userPreferences = await dataManager.read(`userPreferences_${userId}`);

      // If no preferences exist or folderViewPreferences is not set, return empty object
      if (!userPreferences || !userPreferences.folderViewPreferences) {
        return res.json({ folderViewPreferences: {} });
      }

      res.json({ folderViewPreferences: userPreferences.folderViewPreferences });
    } catch (error) {
      logger.error('Error fetching folder view preferences:', error);
      res.status(500).json({ error: 'Failed to fetch folder view preferences' });
    }
  });

  app.post('/applications/wiki/api/user/folder-view-preference', async (req, res) => {
    try {
      // Check if user is authenticated with Passport
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { spaceId, folderPath, viewMode } = req.body;

      if (!spaceId || viewMode === undefined || viewMode === null) {
        return res.status(400).json({ error: 'spaceId and viewMode are required' });
      }

      // Validate viewMode
      const validViewModes = ['grid', 'details', 'cards'];
      if (!validViewModes.includes(viewMode)) {
        return res.status(400).json({ error: 'Invalid view mode' });
      }

      const userId = req.user.id;

      // Get current user preferences
      let userPreferences = await dataManager.read(`userPreferences_${userId}`);

      // If no preferences exist, create default structure
      if (!userPreferences) {
        userPreferences = {
          userId: userId,
          bio: '',
          location: '',
          timezone: 'UTC',
          emailNotifications: true,
          darkMode: false,
          defaultLanguage: 'en',
          folderViewPreferences: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      // Ensure folderViewPreferences exists
      if (!userPreferences.folderViewPreferences) {
        userPreferences.folderViewPreferences = {};
      }

      // Ensure space-specific preferences exist
      if (!userPreferences.folderViewPreferences[spaceId]) {
        userPreferences.folderViewPreferences[spaceId] = {};
      }

      // Use empty string for root folder, otherwise use the provided path
      const key = folderPath || '';
      userPreferences.folderViewPreferences[spaceId][key] = viewMode;
      userPreferences.updatedAt = new Date().toISOString();

      // Save updated preferences
      await dataManager.write(`userPreferences_${userId}`, userPreferences);

      logger.info(`Folder view preference saved: ${viewMode} for space ${spaceId}, folder '${key}' by user ${userId}`);

      res.json({
        success: true,
        message: 'Folder view preference saved successfully',
        folderViewPreferences: userPreferences.folderViewPreferences
      });
    } catch (error) {
      logger.error('Error saving folder view preference:', error);
      res.status(500).json({ error: 'Failed to save folder view preference' });
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
      
      res.json({ success: true });
    } catch (error) {
      logger.error('Error saving activity data:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
};
