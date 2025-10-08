/**
 * @fileoverview AI Service Helper
 * Direct AI provider integration (Claude, ChatGPT, Ollama)
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-10-03
 */

'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

/**
 * AI Service Helper Class
 * Provides context-aware AI assistance for wiki operations
 */
class AIService {
  /**
   * @param {Object} serviceRegistry - NooblyJS service registry
   * @param {Object} dataManager - Data manager instance
   * @param {Object} logger - Logger service
   */
  constructor(serviceRegistry, dataManager, logger) {
    this.serviceRegistry = serviceRegistry;
    this.dataManager = dataManager;
    this.logger = logger;
    this.aiClient = null;
    this.userSettings = null;
  }

  /**
   * Initialize AI service with user-specific settings
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async initialize(userId) {
    try {
      // Load user AI settings
      const settings = await this.dataManager.read(`aiSettings_${userId}`);

      if (!settings || !settings.enabled || !settings.provider || !settings.apiKey) {
        this.logger.info(`AI not configured for user ${userId}`);
        return false;
      }

      // Initialize AI client based on provider
      this.aiClient = this.createClient(settings);
      this.userSettings = settings;

      this.logger.info(`AI service initialized for user ${userId} with provider ${settings.provider}`);
      return true;
    } catch (error) {
      this.logger.error('Error initializing AI service:', error);
      return false;
    }
  }

  /**
   * Create AI client for specific provider
   * @param {Object} settings - AI settings
   * @returns {Object} AI client instance
   */
  createClient(settings) {
    const { provider, apiKey, endpoint } = settings;

    switch (provider) {
      case 'claude':
        return new Anthropic({ apiKey });

      case 'chatgpt':
        return new OpenAI({
          apiKey,
          ...(endpoint && { baseURL: endpoint })
        });

      case 'ollama':
        return new OpenAI({
          apiKey: 'ollama', // Ollama doesn't need a real API key
          baseURL: endpoint || 'http://localhost:11434/v1'
        });

      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * Get default model for provider
   * @param {string} provider - AI provider name
   * @returns {string} Default model name
   */
  getDefaultModel(provider) {
    const defaults = {
      'claude': 'claude-3-5-sonnet-20241022',
      'chatgpt': 'gpt-4',
      'ollama': 'llama2'
    };
    return defaults[provider] || 'claude-3-5-sonnet-20241022';
  }

  /**
   * Send a prompt to the AI service
   * @param {string} userMessage - User's message
   * @param {Object} context - Optional context (document, space, etc.)
   * @returns {Promise<Object>} AI response
   */
  async prompt(userMessage, context = {}) {
    if (!this.aiClient || !this.userSettings) {
      throw new Error('AI service not initialized. Please configure AI settings first.');
    }

    try {
      // Build context-aware prompt
      let fullPrompt = userMessage;

      if (context.includeDocumentContext && context.documentContent) {
        fullPrompt = `Context: I'm working on a document titled "${context.documentTitle || 'Untitled'}".\n\nDocument content:\n${context.documentContent}\n\nQuestion: ${userMessage}`;
      } else if (context.includeSpaceContext && context.spaceName) {
        fullPrompt = `Context: I'm working in a wiki space called "${context.spaceName}".\n\nQuestion: ${userMessage}`;
      }

      const model = this.userSettings.model || this.getDefaultModel(this.userSettings.provider);
      const maxTokens = this.userSettings.maxTokens || 4096;
      const temperature = this.userSettings.temperature || 0.7;

      let response;

      // Call appropriate AI provider
      if (this.userSettings.provider === 'claude') {
        const result = await this.aiClient.messages.create({
          model: model,
          max_tokens: maxTokens,
          temperature: temperature,
          messages: [{ role: 'user', content: fullPrompt }]
        });

        response = {
          content: result.content[0].text,
          usage: {
            inputTokens: result.usage.input_tokens,
            outputTokens: result.usage.output_tokens,
            totalTokens: result.usage.input_tokens + result.usage.output_tokens
          },
          model: result.model
        };
      } else {
        // ChatGPT and Ollama use OpenAI-compatible API
        const result = await this.aiClient.chat.completions.create({
          model: model,
          max_tokens: maxTokens,
          temperature: temperature,
          messages: [{ role: 'user', content: fullPrompt }]
        });

        response = {
          content: result.choices[0].message.content,
          usage: {
            inputTokens: result.usage.prompt_tokens,
            outputTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens
          },
          model: result.model
        };
      }

      return {
        success: true,
        content: response.content,
        usage: response.usage,
        model: response.model,
        provider: this.userSettings.provider
      };
    } catch (error) {
      this.logger.error('Error calling AI service:', error);
      throw error;
    }
  }

  /**
   * Test AI connection
   * @param {string} provider - Provider name
   * @param {string} apiKey - API key
   * @param {string} model - Model name
   * @param {string} endpoint - Optional endpoint URL
   * @returns {Promise<Object>} Test result
   */
  async testConnection(provider, apiKey, model, endpoint) {
    try {
      // Create temporary settings for testing
      const testSettings = {
        provider,
        apiKey,
        model: model || this.getDefaultModel(provider),
        endpoint,
        maxTokens: 50,
        temperature: 0.1
      };

      // Create test client
      const testClient = this.createClient(testSettings);

      let response;

      // Test with appropriate provider
      if (provider === 'claude') {
        const result = await testClient.messages.create({
          model: testSettings.model,
          max_tokens: 50,
          temperature: 0.1,
          messages: [{ role: 'user', content: 'Reply with: Connection successful' }]
        });

        response = {
          model: result.model,
          tokensUsed: result.usage.input_tokens + result.usage.output_tokens
        };
      } else {
        // ChatGPT and Ollama
        const result = await testClient.chat.completions.create({
          model: testSettings.model,
          max_tokens: 50,
          temperature: 0.1,
          messages: [{ role: 'user', content: 'Reply with: Connection successful' }]
        });

        response = {
          model: result.model,
          tokensUsed: result.usage.total_tokens
        };
      }

      return {
        success: true,
        message: 'Connection test successful',
        provider: provider,
        model: response.model,
        tokensUsed: response.tokensUsed
      };
    } catch (error) {
      console.log(error)
      this.logger.error('AI connection test failed:', error);
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  /**
   * Check if AI service is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.aiClient !== null;
  }
}

module.exports = AIService;
