/**
 * @fileoverview Authentication Routes
 * Handles user registration, login, and OAuth authentication endpoints
 *
 * @author NooblyJS Core Team
 * @version 1.0.0
 * @since 2025-08-24
 */

'use strict';

const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { findUserByEmail, createUser } = require('./passport-config');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser({
      email,
      password: hashedPassword,
      name,
      provider: 'local',
      initialized: false  // User needs to complete wizard
    });

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error logging in after registration'
        });
      }
      res.json({
        success: true,
        needsWizard: true,  // Signal that wizard is needed
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          initialized: user.initialized
        }
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
    if (!user) {
      return res.status(401).json({
        success: false,
        message: info.message || 'Invalid credentials'
      });
    }
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error logging in'
        });
      }
      return res.json({
        success: true,
        needsWizard: !user.initialized,  // Check if wizard is needed
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          initialized: user.initialized
        }
      });
    });
  })(req, res, next);
});

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  }
);

router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error logging out' 
      });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: 'Error destroying session' 
        });
      }
      res.json({ success: true });
    });
  });
});

router.get('/check', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      needsWizard: !req.user.initialized,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        initialized: req.user.initialized
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

router.post('/change-password', async (req, res) => {
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

    // Update password in users file
    const { readUsers, writeUsers } = require('./passport-config');
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

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;