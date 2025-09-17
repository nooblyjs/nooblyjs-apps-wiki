/**
 * @fileoverview Asset Processor Activity
 * Background process for optimizing images and processing assets
 *
 * @author NooblyJS Team
 * @version 1.0.14
 * @since 2025-08-22
 */

'use strict';

/**
 * Optimize asset in background
 */
async function optimizeAssetActivity(services, assetId) {
  const { assetManager, dataManager, logger, cache } = services;

  try {
    logger.info(`Background asset optimization started for: ${assetId}`);

    // Get asset details
    const asset = await dataManager.findOne('assets', { id: assetId });
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    // Only optimize images that haven't been optimized yet
    if (asset.type !== 'image' || asset.optimized) {
      logger.info(`Asset ${assetId} is not eligible for optimization (type: ${asset.type}, optimized: ${asset.optimized})`);
      return asset;
    }

    // Perform optimization
    const optimizedAsset = await assetManager.optimizeAsset(assetId);

    // Update database with optimization results
    await dataManager.updateAssetOptimization(assetId, {
      size: optimizedAsset.metadata?.optimizedSize || asset.size,
      url: optimizedAsset.url
    });

    // Clear cache
    await cache.delete(`cms:asset:${assetId}`);

    logger.info(`Background asset optimization completed for: ${assetId}`);
    return optimizedAsset;

  } catch (error) {
    logger.error(`Background asset optimization failed for ${assetId}:`, error);

    // Update asset with error status
    await dataManager.update('assets', assetId, {
      optimizationError: error.message,
      optimizationErrorAt: new Date().toISOString()
    });

    throw error;
  }
}

/**
 * Process uploaded asset
 */
async function processUploadedAssetActivity(services, assetId) {
  const { assetManager, dataManager, logger } = services;

  try {
    logger.info(`Processing uploaded asset: ${assetId}`);

    const asset = await dataManager.findOne('assets', { id: assetId });
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const processedAsset = { ...asset };

    // Extract metadata based on file type
    if (asset.type === 'image') {
      // For images, we could extract EXIF data, dimensions, etc.
      // This is a placeholder for real image processing
      processedAsset.metadata = {
        ...processedAsset.metadata,
        dimensions: { width: 1920, height: 1080 }, // Placeholder
        extractedAt: new Date().toISOString()
      };

      // Automatically optimize images
      try {
        await optimizeAssetActivity(services, assetId);
      } catch (optimizationError) {
        logger.warn(`Auto-optimization failed for ${assetId}:`, optimizationError);
      }
    }

    // Update asset with processed metadata
    await dataManager.update('assets', assetId, {
      metadata: processedAsset.metadata,
      processed: true,
      processedAt: new Date().toISOString()
    });

    logger.info(`Asset processing completed for: ${assetId}`);
    return processedAsset;

  } catch (error) {
    logger.error(`Asset processing failed for ${assetId}:`, error);

    // Update asset with error status
    await dataManager.update('assets', assetId, {
      processingError: error.message,
      processingErrorAt: new Date().toISOString()
    });

    throw error;
  }
}

/**
 * Generate responsive image variants
 */
async function generateImageVariantsActivity(services, assetId) {
  const { assetManager, dataManager, logger } = services;

  try {
    logger.info(`Generating image variants for: ${assetId}`);

    const asset = await dataManager.findOne('assets', { id: assetId });
    if (!asset || asset.type !== 'image') {
      throw new Error(`Asset is not an image: ${assetId}`);
    }

    // Generate different sizes for responsive images
    const variants = [];
    const sizes = [
      { width: 300, suffix: 'small' },
      { width: 600, suffix: 'medium' },
      { width: 1200, suffix: 'large' },
      { width: 1920, suffix: 'xlarge' }
    ];

    for (const size of sizes) {
      try {
        // In a real implementation, you would use image processing libraries
        // like Sharp or Jimp to create actual resized versions
        const variant = {
          width: size.width,
          suffix: size.suffix,
          filename: asset.filename.replace('.', `_${size.suffix}.`),
          url: asset.url.replace('.', `_${size.suffix}.`),
          size: Math.round(asset.size * (size.width / 1920)) // Estimated size
        };

        variants.push(variant);
      } catch (variantError) {
        logger.warn(`Failed to generate ${size.suffix} variant for ${assetId}:`, variantError);
      }
    }

    // Update asset with variants
    await dataManager.update('assets', assetId, {
      metadata: {
        ...asset.metadata,
        variants,
        variantsGeneratedAt: new Date().toISOString()
      }
    });

    logger.info(`Generated ${variants.length} variants for asset: ${assetId}`);
    return variants;

  } catch (error) {
    logger.error(`Image variant generation failed for ${assetId}:`, error);
    throw error;
  }
}

/**
 * Clean up orphaned assets
 */
async function cleanupOrphanedAssetsActivity(services) {
  const { dataManager, logger } = services;

  try {
    logger.info('Starting orphaned assets cleanup');

    const assets = await dataManager.find('assets');
    const sites = await dataManager.find('sites');
    const pages = await dataManager.find('pages');

    // Build a set of used asset URLs/IDs
    const usedAssets = new Set();

    // Check site logos and favicons
    sites.forEach(site => {
      if (site.settings?.logo) usedAssets.add(site.settings.logo);
      if (site.settings?.favicon) usedAssets.add(site.settings.favicon);
    });

    // Check page content for asset references
    pages.forEach(page => {
      if (page.content?.sections) {
        page.content.sections.forEach(section => {
          if (section.settings) {
            Object.values(section.settings).forEach(value => {
              if (typeof value === 'string' && (value.startsWith('/uploads/') || value.startsWith('/assets/'))) {
                usedAssets.add(value);
              }
            });
          }
        });
      }
    });

    // Find orphaned assets
    const orphanedAssets = assets.filter(asset =>
      !usedAssets.has(asset.url) &&
      !usedAssets.has(asset.filename) &&
      asset.uploadedAt < new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Older than 1 day
    );

    // Delete orphaned assets
    let deletedCount = 0;
    for (const asset of orphanedAssets) {
      try {
        await dataManager.remove('assets', asset.id);
        deletedCount++;
        logger.info(`Deleted orphaned asset: ${asset.filename}`);
      } catch (deleteError) {
        logger.warn(`Failed to delete orphaned asset ${asset.id}:`, deleteError);
      }
    }

    logger.info(`Orphaned assets cleanup completed. Deleted ${deletedCount} assets`);
    return { deletedCount, totalChecked: assets.length };

  } catch (error) {
    logger.error('Orphaned assets cleanup failed:', error);
    throw error;
  }
}

/**
 * Generate asset statistics
 */
async function generateAssetStatsActivity(services) {
  const { dataManager, logger } = services;

  try {
    logger.info('Generating asset statistics');

    const assets = await dataManager.find('assets');

    const stats = {
      total: assets.length,
      byType: {},
      totalSize: 0,
      optimized: 0,
      averageSize: 0,
      largestAsset: null,
      oldestAsset: null,
      newestAsset: null
    };

    assets.forEach(asset => {
      // Count by type
      stats.byType[asset.type] = (stats.byType[asset.type] || 0) + 1;

      // Sum total size
      stats.totalSize += asset.size || 0;

      // Count optimized
      if (asset.optimized) stats.optimized++;

      // Find largest asset
      if (!stats.largestAsset || asset.size > stats.largestAsset.size) {
        stats.largestAsset = asset;
      }

      // Find oldest asset
      if (!stats.oldestAsset || asset.uploadedAt < stats.oldestAsset.uploadedAt) {
        stats.oldestAsset = asset;
      }

      // Find newest asset
      if (!stats.newestAsset || asset.uploadedAt > stats.newestAsset.uploadedAt) {
        stats.newestAsset = asset;
      }
    });

    // Calculate average size
    stats.averageSize = stats.total > 0 ? Math.round(stats.totalSize / stats.total) : 0;

    // Cache the stats
    const { cache } = services;
    if (cache) {
      await cache.put('cms:asset:stats', stats, 3600); // Cache for 1 hour
    }

    logger.info(`Asset statistics generated: ${stats.total} total assets, ${stats.totalSize} bytes`);
    return stats;

  } catch (error) {
    logger.error('Asset statistics generation failed:', error);
    throw error;
  }
}

module.exports = {
  optimizeAssetActivity,
  processUploadedAssetActivity,
  generateImageVariantsActivity,
  cleanupOrphanedAssetsActivity,
  generateAssetStatsActivity
};