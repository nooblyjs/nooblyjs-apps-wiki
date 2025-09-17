/**
 * @fileoverview Site Generator Activity
 * Background process for generating static sites from CMS content
 *
 * @author NooblyJS Team
 * @version 1.0.14
 * @since 2025-08-22
 */

'use strict';

/**
 * Generate site in background
 */
async function generateSiteActivity(services, siteId) {
  const { siteBuilder, logger, dataManager, cache } = services;

  try {
    logger.info(`Background site generation started for: ${siteId}`);

    // Validate site before generation
    const validation = await siteBuilder.validateSite(siteId);
    if (!validation.valid) {
      throw new Error(`Site validation failed: ${validation.errors.join(', ')}`);
    }

    // Generate the site
    const result = await siteBuilder.generateSite(siteId);

    // Update site status
    await dataManager.updateSiteStatus(siteId, 'generated');

    // Cache the result
    await cache.put(`cms:site:generation:${siteId}`, result, 3600);

    logger.info(`Background site generation completed for: ${siteId}`);
    return result;

  } catch (error) {
    logger.error(`Background site generation failed for ${siteId}:`, error);

    // Update site status to indicate error
    await dataManager.update('sites', siteId, {
      status: 'error',
      lastError: error.message,
      lastErrorAt: new Date().toISOString()
    });

    throw error;
  }
}

/**
 * Publish site in background
 */
async function publishSiteActivity(services, siteId) {
  const { siteBuilder, logger, dataManager, notifications } = services;

  try {
    logger.info(`Background site publishing started for: ${siteId}`);

    // First generate the site
    await generateSiteActivity(services, siteId);

    // Then publish it
    const result = await siteBuilder.publishSite(siteId);

    // Send notification
    if (notifications) {
      try {
        await notifications.send({
          type: 'site_published',
          siteId,
          message: `Site ${siteId} has been successfully published`,
          url: result.url
        });
      } catch (notificationError) {
        logger.warn('Failed to send publication notification:', notificationError);
      }
    }

    logger.info(`Background site publishing completed for: ${siteId}`);
    return result;

  } catch (error) {
    logger.error(`Background site publishing failed for ${siteId}:`, error);

    // Send error notification
    if (notifications) {
      try {
        await notifications.send({
          type: 'site_publish_error',
          siteId,
          message: `Site ${siteId} publishing failed: ${error.message}`,
          error: error.message
        });
      } catch (notificationError) {
        logger.warn('Failed to send error notification:', notificationError);
      }
    }

    throw error;
  }
}

/**
 * Regenerate specific page in background
 */
async function regeneratePageActivity(services, siteId, pageId) {
  const { siteBuilder, logger, dataManager, cache } = services;

  try {
    logger.info(`Background page regeneration started for: ${pageId} in site: ${siteId}`);

    const result = await siteBuilder.regeneratePage(siteId, pageId);

    // Clear relevant caches
    await cache.delete(`cms:page:${pageId}`);
    await cache.delete(`cms:site:generation:${siteId}`);

    logger.info(`Background page regeneration completed for: ${pageId}`);
    return result;

  } catch (error) {
    logger.error(`Background page regeneration failed for ${pageId}:`, error);
    throw error;
  }
}

/**
 * Clean up old site previews
 */
async function cleanupPreviewsActivity(services) {
  const { siteBuilder, logger } = services;

  try {
    logger.info('Starting preview cleanup activity');
    await siteBuilder.cleanupPreviews();
    logger.info('Preview cleanup activity completed');
  } catch (error) {
    logger.error('Preview cleanup activity failed:', error);
    throw error;
  }
}

/**
 * Optimize site performance
 */
async function optimizeSiteActivity(services, siteId) {
  const { siteBuilder, assetManager, logger, dataManager } = services;

  try {
    logger.info(`Starting site optimization for: ${siteId}`);

    // Get all assets used by the site
    const site = await dataManager.getSiteWithPages(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }

    // Optimize all assets used by the site
    // This is a simplified implementation - in real usage you'd track which assets are used
    const assets = await dataManager.find('assets');
    const optimizationResults = [];

    for (const asset of assets) {
      if (asset.type === 'image' && !asset.optimized) {
        try {
          const optimizedAsset = await assetManager.optimizeAsset(asset.id);
          optimizationResults.push({
            assetId: asset.id,
            originalSize: asset.size,
            optimizedSize: optimizedAsset.metadata?.optimizedSize || asset.size,
            savings: asset.size - (optimizedAsset.metadata?.optimizedSize || asset.size)
          });
        } catch (optimizationError) {
          logger.warn(`Failed to optimize asset ${asset.id}:`, optimizationError);
        }
      }
    }

    // Regenerate site with optimized assets
    await generateSiteActivity(services, siteId);

    const totalSavings = optimizationResults.reduce((sum, result) => sum + result.savings, 0);

    logger.info(`Site optimization completed for: ${siteId}. Total savings: ${totalSavings} bytes`);

    return {
      siteId,
      optimizedAssets: optimizationResults.length,
      totalSavings,
      completedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`Site optimization failed for ${siteId}:`, error);
    throw error;
  }
}

module.exports = {
  generateSiteActivity,
  publishSiteActivity,
  regeneratePageActivity,
  cleanupPreviewsActivity,
  optimizeSiteActivity
};