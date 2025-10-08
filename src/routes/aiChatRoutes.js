/**
 * @fileoverview AI Chat API routes for Wiki application
 * Handles AI-powered chat interactions with context awareness
 *
 * @author NooblyJS Core Team
 * @version 1.0.0
 * @since 2025-10-03
 */

'use strict';

/**
 * Configures and registers AI chat routes with the Express application.
 *
 * @param {Object} options - Configuration options object
 * @param {Object} eventEmitter - Event emitter for logging and notifications
 * @param {Object} services - NooblyJS Core services (dataManager, filing, cache, logger, queue, search, aiService)
 * @return {void}
 */
module.exports = (options, eventEmitter, services) => {
  const app = options;
  const { dataManager, cache, logger, aiService } = services;

  /**
   * Send a chat message to AI and get response
   * POST /applications/wiki/api/ai/chat
   */
  app.post('/applications/wiki/api/ai/chat', async (req, res) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userId = req.user.id;
      const { message, context } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Rate limiting: 20 requests per hour per user
      const rateLimitKey = `ai:ratelimit:${userId}`;
      const requestCount = (await cache.get(rateLimitKey)) || 0;

      if (requestCount >= 20) {
        return res.status(429).json({
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: 3600
        });
      }

      // Initialize AI service for this user
      const initialized = await aiService.initialize(userId);

      if (!initialized) {
        return res.status(400).json({
          error: 'AI service not configured. Please configure your AI settings first.',
          needsConfiguration: true
        });
      }

      // Send prompt to AI
      const aiResponse = await aiService.prompt(message, context || {});

      // Increment rate limit counter
      await cache.put(rateLimitKey, requestCount + 1, 3600);

      // Load existing chat history
      let chatHistory = [];
      try {
        chatHistory = await dataManager.read(`chatHistory_${userId}`) || [];
      } catch (error) {
        logger.info(`No chat history found for user ${userId}, creating new`);
        chatHistory = [];
      }

      // Add to chat history
      const messageId = Date.now().toString();
      const chatEntry = {
        id: messageId,
        userMessage: message,
        aiResponse: aiResponse.content,
        context: context || {},
        timestamp: new Date().toISOString(),
        usage: aiResponse.usage,
        model: aiResponse.model,
        provider: aiResponse.provider
      };

      chatHistory.push(chatEntry);

      // Keep only last 100 messages to prevent file bloat
      if (chatHistory.length > 100) {
        chatHistory = chatHistory.slice(-100);
      }

      // Save updated chat history
      await dataManager.write(`chatHistory_${userId}`, chatHistory);

      // Clear cache for chat history
      await cache.delete(`chat:history:${userId}`);

      logger.info(`AI chat message processed for user ${userId}, tokens used: ${aiResponse.usage?.totalTokens || 0}`);

      res.json({
        success: true,
        messageId: messageId,
        response: aiResponse.content,
        usage: aiResponse.usage,
        model: aiResponse.model,
        provider: aiResponse.provider,
        timestamp: chatEntry.timestamp
      });
    } catch (error) {
      logger.error('Error processing AI chat:', error);
      res.status(500).json({
        error: 'Failed to process chat message',
        message: error.message
      });
    }
  });

  /**
   * Get chat history for the current user
   * GET /applications/wiki/api/ai/chat/history
   */
  app.get('/applications/wiki/api/ai/chat/history', async (req, res) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userId = req.user.id;
      const cacheKey = `chat:history:${userId}`;

      // Try cache first
      let chatHistory = await cache.get(cacheKey);

      if (!chatHistory) {
        try {
          chatHistory = await dataManager.read(`chatHistory_${userId}`) || [];
          // Cache for 5 minutes
          await cache.put(cacheKey, chatHistory, 300);
        } catch (error) {
          chatHistory = [];
        }
      }

      // Return last 50 messages (most recent)
      const limit = parseInt(req.query.limit) || 50;
      const recentHistory = chatHistory.slice(-limit);

      res.json({
        success: true,
        history: recentHistory,
        total: chatHistory.length
      });
    } catch (error) {
      logger.error('Error fetching chat history:', error);
      res.status(500).json({ error: 'Failed to fetch chat history' });
    }
  });

  /**
   * Clear chat history for the current user
   * POST /applications/wiki/api/ai/chat/clear
   */
  app.post('/applications/wiki/api/ai/chat/clear', async (req, res) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userId = req.user.id;

      // Clear chat history
      await dataManager.write(`chatHistory_${userId}`, []);

      // Clear cache
      await cache.delete(`chat:history:${userId}`);

      logger.info(`Chat history cleared for user ${userId}`);

      res.json({
        success: true,
        message: 'Chat history cleared successfully'
      });
    } catch (error) {
      logger.error('Error clearing chat history:', error);
      res.status(500).json({ error: 'Failed to clear chat history' });
    }
  });

  /**
   * Delete a specific message from chat history
   * DELETE /applications/wiki/api/ai/chat/:messageId
   */
  app.delete('/applications/wiki/api/ai/chat/:messageId', async (req, res) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userId = req.user.id;
      const { messageId } = req.params;

      // Load chat history
      let chatHistory = [];
      try {
        chatHistory = await dataManager.read(`chatHistory_${userId}`) || [];
      } catch (error) {
        return res.status(404).json({ error: 'Chat history not found' });
      }

      // Filter out the message
      const updatedHistory = chatHistory.filter(entry => entry.id !== messageId);

      if (updatedHistory.length === chatHistory.length) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Save updated history
      await dataManager.write(`chatHistory_${userId}`, updatedHistory);

      // Clear cache
      await cache.delete(`chat:history:${userId}`);

      logger.info(`Chat message ${messageId} deleted for user ${userId}`);

      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting chat message:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  });

  /**
   * Get AI chat status (whether configured and available)
   * GET /applications/wiki/api/ai/chat/status
   */
  app.get('/applications/wiki/api/ai/chat/status', async (req, res) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userId = req.user.id;

      // Check if AI is configured
      let settings;
      try {
        settings = await dataManager.read(`aiSettings_${userId}`);
        logger.info(`AI settings read for user ${userId}: ${JSON.stringify(settings)}`);

        // Check if settings is an empty array (dataManager returns [] on error)
        if (Array.isArray(settings) && settings.length === 0) {
          logger.info(`AI settings returned empty array for user ${userId}, treating as not configured`);
          settings = null;
        }
      } catch (error) {
        logger.error(`Error reading AI settings for user ${userId}:`, error);
        settings = null;
      }

      // Consider configured if provider and API key exist, regardless of enabled flag
      const isConfigured = settings && typeof settings === 'object' && !Array.isArray(settings) && settings.provider && settings.apiKey;

      logger.info(`AI status check for user ${userId}: configured=${!!isConfigured}, enabled=${settings?.enabled}, provider=${settings?.provider}, settingsType=${typeof settings}, isArray=${Array.isArray(settings)}`);

      res.json({
        success: true,
        configured: !!isConfigured,
        enabled: settings?.enabled !== false, // Default to true if not explicitly disabled
        provider: settings?.provider || null,
        model: settings?.model || null
      });
    } catch (error) {
      logger.error('Error checking AI status:', error);
      res.status(500).json({ error: 'Failed to check AI status' });
    }
  });
};
