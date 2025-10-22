/**
 * @fileoverview Search API routes for Wiki application
 * Handles search operations, indexing, and search suggestions
 *
 * @author NooblyJS Core Team
 * @version 1.0.14
 * @since 1.0.0
 */

'use strict';
const SearchIndexer = require('../activities/searchIndexer');

/**
 * Configures and registers search routes with the Express application.
 *
 * @param {Object} options - Configuration options object
 * @param {Object} eventEmitter - Event emitter for logging and notifications
 * @param {Object} services - NooblyJS Core services (dataManager, filing, cache, logger, queue, search, searchIndexer)
 * @return {void}
 */
module.exports = (options, eventEmitter, services) => {

  const app = options.app;
  const { dataManager, filing, cache, logger, queue, search, searchIndexer } = services;

  // Build initial index (async, non-blocking)
  setImmediate(() => {
    searchIndexer.buildIndex().catch(error => {
      logger.error('Failed to build initial search index:', error);
    });
  });

  // Helper function to calculate relevance score
  function calculateRelevanceScore(doc, query) {
    let score = 0;
    const queryWords = query.split(' ');

    queryWords.forEach(word => {
      if (doc.title.toLowerCase().includes(word)) score += 3;
      if (doc.excerpt.toLowerCase().includes(word)) score += 2;
      if (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(word))) score += 2;
    });

    return score / queryWords.length;
  }

  // Enhanced search endpoint with comprehensive file indexing
  app.get('/applications/wiki/api/search', async (req, res) => {
    try {
      const query = req.query.q?.trim() || '';
      const fileTypes = req.query.fileTypes ? req.query.fileTypes.split(',') : [];
      const spaceNames = req.query.spaceNames ? req.query.spaceNames.split(',') : [];
      const spaceName = req.query.spaceName?.trim(); // Single space filter
      const includeContent = req.query.includeContent === 'true';

      if (!query) {
        return res.json([]);
      }

      // Combine spaceName and spaceNames filters
      const spaceFilter = [];
      if (spaceName) spaceFilter.push(spaceName);
      if (spaceNames.length > 0) spaceFilter.push(...spaceNames);

      logger.info(`Enhanced search for: ${query}, fileTypes: ${fileTypes}, spaceNames: ${spaceFilter.join(', ')}`);

      // Use the enhanced search indexer
      let searchResults = searchIndexer.search(query, {
        maxResults: 20,
        includeContent: includeContent,
        fileTypes: fileTypes,
        spaceNames: spaceFilter
      });

      // Fall back to original search for wiki documents if no file results
      if (searchResults.length === 0) {
        logger.info('No file search results, falling back to document search');
        const allDocuments = await dataManager.read('documents');
        const queryLower = query.toLowerCase();

        const docResults = allDocuments
          .filter(doc =>
            doc.title.toLowerCase().includes(queryLower) ||
            doc.excerpt.toLowerCase().includes(queryLower) ||
            (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(queryLower)))
          )
          .map(doc => ({
            ...doc,
            score: calculateRelevanceScore(doc, queryLower),
            type: 'wiki-document',
            baseType: 'wiki'
          }))
          .sort((a, b) => b.score - a.score);

        searchResults = docResults;
      }

      // Format results for frontend
      const formattedResults = searchResults.slice(0, 20).map(result => ({
        id: result.id || result.relativePath,
        title: result.title || result.name,
        excerpt: result.excerpt || result.excerpt,
        path: result.relativePath || result.path,
        spaceName: result.spaceName || result.baseType,
        modifiedAt: result.modifiedAt || result.modifiedTime,
        tags: result.tags || [],
        type: result.type,
        size: result.size,
        relevance: result.score || 0.5,
        content: result.content // Only included if requested
      }));

      logger.info(`Found ${formattedResults.length} enhanced search results`);
      res.json(formattedResults);
    } catch (error) {
      logger.error('Error performing enhanced search:', error.message);
      logger.error('Search error stack:', error.stack);
      res.status(500).json({ error: 'Failed to perform search: ' + error.message });
    }
  });

  // Search suggestions endpoint for autocomplete
  app.get('/applications/wiki/api/search/suggestions', async (req, res) => {
    try {
      const query = req.query.q?.trim() || '';
      const maxSuggestions = parseInt(req.query.limit) || 10;

      if (!query) {
        return res.json([]);
      }

      const suggestions = searchIndexer.getSuggestions(query, maxSuggestions);
      res.json(suggestions);
    } catch (error) {
      logger.error('Error getting search suggestions:', error);
      res.status(500).json({ error: 'Failed to get search suggestions' });
    }
  });

  // Search index statistics endpoint
  app.get('/applications/wiki/api/search/stats', async (req, res) => {
    try {
      const stats = searchIndexer.getStats();
      res.json(stats);
    } catch (error) {
      logger.error('Error getting search stats:', error);
      res.status(500).json({ error: 'Failed to get search statistics' });
    }
  });

  // Rebuild search index endpoint
  app.post('/applications/wiki/api/search/rebuild', async (req, res) => {
    try {
      // Rebuild index in background
      setImmediate(() => {
        searchIndexer.buildIndex().catch(error => {
          logger.error('Failed to rebuild search index:', error);
        });
      });

      res.json({ success: true, message: 'Index rebuild started' });
    } catch (error) {
      logger.error('Error starting index rebuild:', error);
      res.status(500).json({ error: 'Failed to start index rebuild' });
    }
  });

  // AI Context generation endpoints
  const AIContextGenerator = require('../activities/aiContextGenerator');

  // Manually trigger AI Context generation
  app.post('/applications/wiki/api/ai/generate-contexts', async (req, res) => {
    try {
      const { aiService } = services;

      if (!aiService) {
        return res.status(400).json({
          success: false,
          message: 'AI service not available'
        });
      }

      const contextGenerator = new AIContextGenerator(logger, dataManager, aiService);

      // Run in background
      setImmediate(async () => {
        try {
          const stats = await contextGenerator.processAllSpaces();
          logger.info(`Manual AI Context generation completed: ${JSON.stringify(stats)}`);
        } catch (error) {
          logger.error('Error in manual AI Context generation:', error);
        }
      });

      res.json({
        success: true,
        message: 'AI Context generation started in background'
      });
    } catch (error) {
      logger.error('Error starting AI Context generation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start AI Context generation: ' + error.message
      });
    }
  });

  // Get AI Context generation status
  app.get('/applications/wiki/api/ai/context-status', async (req, res) => {
    try {
      const { aiService } = services;

      const contextGenerator = new AIContextGenerator(logger, dataManager, aiService);
      const stats = contextGenerator.getStats();

      const isAIReady = await contextGenerator.isAIReady();

      res.json({
        success: true,
        isAIReady,
        isProcessing: stats.isProcessing,
        lastProcessedTime: stats.lastProcessedTime
      });
    } catch (error) {
      logger.error('Error getting AI Context status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get AI Context status: ' + error.message
      });
    }
  });
};
