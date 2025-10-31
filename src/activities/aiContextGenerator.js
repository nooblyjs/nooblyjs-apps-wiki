/**
 * @fileoverview AI Context Generator Service
 * Automatically generates AI-powered context files for folders and documents
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-10-19
 */

'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * AI Context Generator Class
 * Manages automatic generation of context files for folders and documents
 */
class AIContextGenerator {
  constructor(logger, dataManager, aiService, serviceRegistry) {
    this.logger = logger;
    this.dataManager = dataManager;
    this.aiService = aiService;
    this.serviceRegistry = serviceRegistry;
    this.isProcessing = false;
    this.lastProcessedTime = null;
    this.userId = 'system'; // Default user ID for background tasks
    this.aiClient = null; // Direct AI client to bypass AIService initialization issues

    // File extensions considered as "text-based"
    this.textFileExtensions = new Set(['.md', '.txt', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rb', '.php', '.json', '.yaml', '.yml', '.xml', '.html', '.css', '.sql', '.sh', '.bash']);
  }

  /**
   * Initialize AI service with user settings
   * @param {string} userId - User ID to load settings for
   * @returns {Promise<boolean>} True if successfully initialized
   */
  async initializeAIService(userId = 'system') {
    try {
      this.userId = userId;
      this.logger.info(`[AI INIT] Initializing AI service for user: ${userId}`);

      // Read user's AI settings from data manager
      this.logger.info(`[AI INIT] Reading AI settings for user: ${userId}`);
      const settingsFileName = `aiSettings_${userId}`;
      let aiSettings;

      try {
        aiSettings = await this.dataManager.read(settingsFileName);
        console.log(aiSettings);
        this.logger.info(`[AI INIT] AI settings loaded for ${userId}: provider=${aiSettings.provider}, enabled=${aiSettings.enabled}`);
      } catch (readError) {
        this.logger.error(`[AI INIT] Could not read AI settings for ${userId}: ${readError.message}`);
        return false;
      }

      if (!aiSettings || !aiSettings.enabled || !aiSettings.provider) {
        this.logger.error(`[AI INIT] Invalid AI settings for ${userId}: enabled=${aiSettings?.enabled}, provider=${aiSettings?.provider}, hasKey=${!!aiSettings?.apiKey}`);
        return false;
      }

      // Create direct AI client using service registry
      this.logger.info(`[AI INIT] Creating AI client with provider: ${aiSettings.provider}`);
      try {
        if (!this.serviceRegistry) {
          this.logger.error('[AI INIT] Service registry not available');
          return false;
        }

        const serviceOptions = {
          model: aiSettings.model || this.getDefaultModel(aiSettings.provider),
          apiKey: aiSettings.apiKey,
          dependencies: { logging: this.logger }
        };

        // Add provider-specific options
        if (aiSettings.provider === 'ollama') {
          serviceOptions.baseUrl = aiSettings.endpoint || 'http://localhost:11434';
        } else if (aiSettings.endpoint) {
          serviceOptions.endpoint = aiSettings.endpoint;
        }

        if (aiSettings.organization) {
          serviceOptions.organization = aiSettings.organization;
        }

        this.logger.info(`[AI INIT] Service options prepared: ${JSON.stringify({
          model: serviceOptions.model,
          hasApiKey: !!serviceOptions.apiKey,
          provider: aiSettings.provider,
          endpoint: serviceOptions.endpoint
        })}`);

        this.aiClient = await this.serviceRegistry.aiservice(aiSettings.provider, serviceOptions);
        this.logger.info(`[AI INIT] AI client successfully created for provider: ${aiSettings.provider}`);
        return true;
      } catch (clientError) {
        this.logger.error(`[AI INIT] Error creating AI client: ${clientError.message}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`[AI INIT] Error initializing AI service: ${error.message}`);
      return false;
    }
  }

  /**
   * Get default model for provider
   */
  getDefaultModel(provider) {
    const defaults = {
      claude: 'claude-3-5-sonnet-20241022',
      chatgpt: 'gpt-4',
      ollama: 'llama2'
    };
    return defaults[provider] || 'claude-3-5-sonnet-20241022';
  }

  /**
   * Check if AI service is configured and ready
   * @returns {Promise<boolean>} True if AI is ready to use
   */
  async isAIReady() {
    try {
      if (!this.aiClient) {
        this.logger.info('[AI READY] AI client not initialized');
        return false;
      }

      this.logger.info('[AI READY] AI service is ready');
      return true;
    } catch (error) {
      this.logger.warn(`[AI READY] Error checking AI readiness: ${error.message}`);
      return false;
    }
  }

  /**
   * Main entry point: process all spaces for context generation
   * @returns {Promise<Object>} Statistics about processing
   */
  async processAllSpaces() {
    if (this.isProcessing) {
      this.logger.warn('[PROCESS ALL SPACES] AI Context generation already in progress');
      return { skipped: true, reason: 'Already processing' };
    }

    this.isProcessing = true;
    this.logger.info('[PROCESS ALL SPACES] Starting AI Context generation for all spaces');

    const stats = {
      foldersProcessed: 0,
      filesProcessed: 0,
      folderContextsCreated: 0,
      fileContextsCreated: 0,
      errors: 0
    };

    try {
      // First, try to get list of users with AI settings configured
      this.logger.info('[PROCESS ALL SPACES] Looking for users with AI settings');
      let aiUser = null;

      try {
        // Try to find any user with configured AI settings
        const fs = require('fs').promises;
        const path = require('path');
        const appDir = './.application';

        try {
          const files = await fs.readdir(appDir);
          const aiSettingsFiles = files.filter(f => f.startsWith('aiSettings_') && f.endsWith('.json'));

          if (aiSettingsFiles.length > 0) {
            // Extract user ID from first AI settings file found
            const firstFile = aiSettingsFiles[0];
            aiUser = firstFile.replace('aiSettings_', '').replace('.json', '');
            this.logger.info(`[PROCESS ALL SPACES] Found AI settings for user: ${aiUser}`);
          }
        } catch (err) {
          this.logger.info('[PROCESS ALL SPACES] Could not scan application directory');
        }
      } catch (err) {
        this.logger.info('[PROCESS ALL SPACES] Error looking for AI users');
      }

      // Initialize AI service with the found user (or system user)
      const userIdToUse = aiUser || 'system';
      this.logger.info(`[PROCESS ALL SPACES] Initializing AI service with user: ${userIdToUse}`);
      const aiInitialized = await this.initializeAIService(userIdToUse);

      if (!aiInitialized) {
        this.logger.info('[PROCESS ALL SPACES] Failed to initialize AI service');
        return { ...stats, aiReady: false };
      }

      // Check if AI is ready
      this.logger.info('[PROCESS ALL SPACES] Checking if AI service is ready');
      const aiReady = await this.isAIReady();
      this.logger.info(`[PROCESS ALL SPACES] AI service ready: ${aiReady}`);

      if (!aiReady) {
        this.logger.info('[PROCESS ALL SPACES] AI service not configured, skipping context generation');
        return { ...stats, aiReady: false };
      }

      // Get spaces
      this.logger.info('[PROCESS ALL SPACES] Reading spaces from data manager');
      const spaces = await this.dataManager.read('spaces');
      this.logger.info(`[PROCESS ALL SPACES] Found ${spaces.length} spaces to process`);

      // Process each space
      for (const space of spaces) {
        try {
          const spaceStats = await this.processSpace(space);
          stats.foldersProcessed += spaceStats.foldersProcessed;
          stats.filesProcessed += spaceStats.filesProcessed;
          stats.folderContextsCreated += spaceStats.folderContextsCreated;
          stats.fileContextsCreated += spaceStats.fileContextsCreated;
          stats.errors += spaceStats.errors;
        } catch (error) {
          this.logger.error(`Error processing space ${space.name}:`, error.message);
          stats.errors++;
        }
      }

      this.lastProcessedTime = new Date();
      this.logger.info(`AI Context generation completed: ${JSON.stringify(stats)}`);
      return stats;

    } catch (error) {
      this.logger.error('Error in AI Context generation:', error);
      stats.errors++;
      return stats;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single space for context generation
   * @param {Object} space - Space configuration
   * @returns {Promise<Object>} Statistics
   */
  async processSpace(space) {
    const stats = {
      foldersProcessed: 0,
      filesProcessed: 0,
      folderContextsCreated: 0,
      fileContextsCreated: 0,
      errors: 0
    };

    try {
      const spaceDir = space.path || path.resolve(__dirname, `../../${space.name.replace(/\s+/g, '-').toLowerCase()}`);

      // Check if directory exists
      try {
        await fs.access(spaceDir);
      } catch {
        this.logger.warn(`Space directory not found: ${spaceDir}`);
        return stats;
      }

      // Recursively process directory
      const dirStats = await this.processDirectory(spaceDir, space.name);
      return dirStats;

    } catch (error) {
      this.logger.error(`Error processing space ${space.name}:`, error.message);
      stats.errors++;
      return stats;
    }
  }

  /**
   * Recursively process a directory for context generation
   * @param {string} dirPath - Directory path
   * @param {string} spaceName - Space name
   * @returns {Promise<Object>} Statistics
   */
  async processDirectory(dirPath, spaceName) {
    const stats = {
      foldersProcessed: 0,
      filesProcessed: 0,
      folderContextsCreated: 0,
      fileContextsCreated: 0,
      errors: 0
    };

    try {
      this.logger.info(`[DIRECTORY] Processing directory: ${dirPath} in space: ${spaceName}`);

      // Create .aicontext folder if it doesn't exist
      const aiContextDir = path.join(dirPath, '.aicontext');
      try {
        await fs.mkdir(aiContextDir, { recursive: true });
        this.logger.info(`[DIRECTORY] Created .aicontext directory at: ${aiContextDir}`);
      } catch (error) {
        this.logger.warn(`[DIRECTORY] Could not create .aicontext directory at ${aiContextDir}: ${error.message}`);
      }

      // Check if folder-context.md exists, if not generate it
      const folderContextPath = path.join(aiContextDir, 'folder-context.md');
      try {
        await fs.access(folderContextPath);
        // File exists, skip
      } catch {
        // File doesn't exist, generate it
        try {
          await this.generateFolderContext(dirPath, spaceName, aiContextDir);
          stats.folderContextsCreated++;
        } catch (error) {
          this.logger.error(`Error generating folder context for ${dirPath}:`, error.message);
          stats.errors++;
        }
      }

      stats.foldersProcessed++;

      // Process files in directory
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        // Skip all hidden directories and files (including .aicontext)
        // .aicontext should never be processed - only created for storing contexts
        if (item.name.startsWith('.')) {
          continue;
        }

        const itemPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
          // Recursively process subdirectories
          const subStats = await this.processDirectory(itemPath, spaceName);
          stats.foldersProcessed += subStats.foldersProcessed;
          stats.filesProcessed += subStats.filesProcessed;
          stats.folderContextsCreated += subStats.folderContextsCreated;
          stats.fileContextsCreated += subStats.fileContextsCreated;
          stats.errors += subStats.errors;
        } else if (item.isFile()) {
          // Check if file needs context generation
          try {
            const contextCreated = await this.processFile(itemPath, dirPath, spaceName);
            if (contextCreated) {
              stats.fileContextsCreated++;
            }
            stats.filesProcessed++;
          } catch (error) {
            this.logger.error(`Error processing file ${itemPath}:`, error.message);
            stats.errors++;
          }
        }
      }

      return stats;

    } catch (error) {
      this.logger.error(`Error processing directory ${dirPath}:`, error.message);
      stats.errors++;
      return stats;
    }
  }

  /**
   * Generate context for a folder
   * @param {string} dirPath - Directory path
   * @param {string} spaceName - Space name
   * @param {string} aiContextDir - AI context directory path
   */
  async generateFolderContext(dirPath, spaceName, aiContextDir) {
    try {
      const folderName = path.basename(dirPath);
      this.logger.info(`[FOLDER CONTEXT] Starting generation for folder: ${folderName}`);

      // Get folder contents summary
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      const fileCount = items.filter(i => i.isFile()).length;
      const folderCount = items.filter(i => i.isDirectory() && !i.name.startsWith('.')).length;

      // Get first few files for context
      const sampleFiles = items
        .filter(i => i.isFile() && !i.name.startsWith('.') && this.textFileExtensions.has(path.extname(i.name).toLowerCase()))
        .slice(0, 5)
        .map(i => i.name);

      this.logger.info(`[FOLDER CONTEXT] Folder stats - Files: ${fileCount}, Folders: ${folderCount}, Samples: ${sampleFiles.join(', ')}`);

      // Create prompt for AI
      const prompt = `Analyze this folder structure and provide a brief description of its purpose and what type of content it contains:

Folder Name: ${folderName}
Files in folder: ${fileCount}
Subfolders in folder: ${folderCount}
Sample files: ${sampleFiles.join(', ')}

Please provide a concise description (2-3 sentences) of what this folder's purpose is based on its structure and file names. Format your response as markdown.`;

      this.logger.info(`[FOLDER CONTEXT] Calling AI service for folder: ${folderName}`);

      // Call AI to generate context
      let result;
      try {
        if (!this.aiClient) {
          this.logger.error(`[FOLDER CONTEXT] AI client not initialized for folder ${folderName}`);
          return;
        }

        this.logger.info(`[FOLDER CONTEXT] Using aiClient to prompt for folder: ${folderName}`);
        result = await this.aiClient.prompt(prompt, {
          maxTokens: 4096,
          temperature: 0.7
        });
        this.logger.info(`[FOLDER CONTEXT] AI response received. Type: ${typeof result}, Keys: ${result ? Object.keys(result).join(', ') : 'null'}`);
      } catch (aiError) {
        this.logger.error(`[FOLDER CONTEXT] AI service error for folder ${folderName}: ${aiError.message}`);
        this.logger.error(`[FOLDER CONTEXT] Full error: ${JSON.stringify(aiError)}`);
        return; // Skip this folder if AI fails
      }

      // Check if we got valid content
      if (!result) {
        this.logger.warn(`[FOLDER CONTEXT] No response from AI for folder ${folderName}`);
        return;
      }

      this.logger.info(`[FOLDER CONTEXT] Result object: ${JSON.stringify(result).substring(0, 200)}`);

      const content = result.content || result.message || '';
      this.logger.info(`[FOLDER CONTEXT] Content length: ${content ? content.length : 0}, Content preview: ${String(content).substring(0, 100)}`);

      if (!content || content.trim().length === 0) {
        this.logger.warn(`[FOLDER CONTEXT] AI returned empty content for folder ${folderName}. Full result: ${JSON.stringify(result)}`);
        return;
      }

      const contextContent = `# Folder Context: ${folderName}

${content}

---
*Generated automatically by AI Context Generator on ${new Date().toISOString()}*`;

      const folderContextPath = path.join(aiContextDir, 'folder-context.md');
      this.logger.info(`[FOLDER CONTEXT] Writing context file to: ${folderContextPath}`);
      await fs.writeFile(folderContextPath, contextContent, 'utf8');

      this.logger.info(`[FOLDER CONTEXT] Successfully generated folder context for: ${folderName}`);

    } catch (error) {
      this.logger.error(`[FOLDER CONTEXT] Error generating folder context for ${dirPath}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Process a single file for context generation
   * @param {string} filePath - File path
   * @param {string} dirPath - Parent directory path
   * @param {string} spaceName - Space name
   * @returns {Promise<boolean>} True if context was created
   */
  async processFile(filePath, dirPath, spaceName) {
    try {
      const fileName = path.basename(filePath);
      const ext = path.extname(fileName).toLowerCase();
      this.logger.info(`[FILE CONTEXT] Starting file context generation for: ${fileName}`);

      // Only process text-based files
      if (!this.textFileExtensions.has(ext)) {
        this.logger.info(`[FILE CONTEXT] Skipping ${fileName} - extension ${ext} not in supported list`);
        return false;
      }

      // Check if context file already exists
      const aiContextDir = path.join(dirPath, '.aicontext');
      const contextFileName = `${fileName}-context.md`;
      const contextPath = path.join(aiContextDir, contextFileName);

      try {
        await fs.access(contextPath);
        // Context already exists
        this.logger.info(`[FILE CONTEXT] Context already exists for: ${fileName}`);
        return false;
      } catch {
        // Context doesn't exist, generate it
        this.logger.info(`[FILE CONTEXT] Context does not exist, will generate for: ${fileName}`);
      }

      // Read file content
      const fileContent = await fs.readFile(filePath, 'utf8');
      this.logger.info(`[FILE CONTEXT] Read file content for ${fileName}, size: ${fileContent.length} bytes`);

      // Limit content to first 5000 characters for context window
      const contentPreview = fileContent.substring(0, 5000);

      // Create prompt for AI
      const prompt = `Analyze this file and provide a brief context description:

File Name: ${fileName}
File Type: ${ext}

File Content (first part):
\`\`\`${ext.substring(1) || 'text'}
${contentPreview}${fileContent.length > 5000 ? '\n... (truncated)' : ''}
\`\`\`

Please provide a concise description (2-4 sentences) of what this file contains and its purpose. Format your response as markdown.`;

      // Call AI to generate context
      let result;
      this.logger.info(`[FILE CONTEXT] Calling AI service for file: ${fileName}`);
      try {
        if (!this.aiClient) {
          this.logger.error(`[FILE CONTEXT] AI client not initialized for file ${fileName}`);
          return false;
        }

        this.logger.info(`[FILE CONTEXT] Using aiClient to prompt for file: ${fileName}`);
        result = await this.aiClient.prompt(prompt, {
          maxTokens: 4096,
          temperature: 0.7
        });
        this.logger.info(`[FILE CONTEXT] AI response received for ${fileName}. Full response object: ${JSON.stringify(result)}`);
      } catch (aiError) {
        this.logger.error(`[FILE CONTEXT] AI service error for file ${fileName}: ${aiError.message}`);
        this.logger.error(`[FILE CONTEXT] Full error: ${JSON.stringify(aiError)}`);
        return false; // Skip this file if AI fails
      }

      // Check if we got valid content
      if (!result) {
        this.logger.warn(`[FILE CONTEXT] No response from AI for file ${fileName}`);
        return false;
      }

      this.logger.info(`[FILE CONTEXT] Result keys for ${fileName}: ${result ? Object.keys(result).join(', ') : 'null'}`);

      const content = result.content || result.message || '';
      this.logger.info(`[FILE CONTEXT] Content extraction - content length: ${content ? content.length : 0}, message exists: ${!!result.message}`);

      if (!content || content.trim().length === 0) {
        this.logger.warn(`[FILE CONTEXT] AI returned empty content for file ${fileName}. Full result: ${JSON.stringify(result)}`);
        return false;
      }

      const contextContent = `# File Context: ${fileName}

${content}

---
*Generated automatically by AI Context Generator on ${new Date().toISOString()}*`;

      this.logger.info(`[FILE CONTEXT] Context content prepared for ${fileName}, size: ${contextContent.length} bytes`);

      // Ensure .aicontext directory exists
      try {
        this.logger.info(`[FILE CONTEXT] Creating directory: ${aiContextDir}`);
        await fs.mkdir(aiContextDir, { recursive: true });
        this.logger.info(`[FILE CONTEXT] Directory created/verified: ${aiContextDir}`);
      } catch (error) {
        if (error.code !== 'EEXIST') {
          this.logger.error(`[FILE CONTEXT] Failed to create directory ${aiContextDir}: ${error.message}`);
          throw error;
        }
      }

      this.logger.info(`[FILE CONTEXT] Writing context file to: ${contextPath}`);
      await fs.writeFile(contextPath, contextContent, 'utf8');
      this.logger.info(`[FILE CONTEXT] Successfully wrote context file to: ${contextPath}`);

      // Verify file was created
      try {
        const stats = await fs.stat(contextPath);
        this.logger.info(`[FILE CONTEXT] File verified - size: ${stats.size} bytes, path: ${contextPath}`);
      } catch (verifyError) {
        this.logger.error(`[FILE CONTEXT] Failed to verify file after writing: ${verifyError.message}`);
      }

      this.logger.info(`[FILE CONTEXT] Successfully generated file context for: ${fileName}`);
      return true;

    } catch (error) {
      this.logger.error(`[FILE CONTEXT] Error processing file ${filePath}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get processing statistics
   * @returns {Object} Current statistics
   */
  getStats() {
    return {
      isProcessing: this.isProcessing,
      lastProcessedTime: this.lastProcessedTime
    };
  }
}

module.exports = AIContextGenerator;
