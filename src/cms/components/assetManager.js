/**
 * @fileoverview Asset Manager for CMS
 * Handles file uploads, image optimization, and asset management
 *
 * @author NooblyJS Team
 * @version 1.0.14
 * @since 2025-08-22
 */

'use strict';

const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const mime = require('mime-types');

class AssetManager {
  constructor({ filing, cache, logger }) {
    this.filing = filing;
    this.cache = cache;
    this.logger = logger;
    this.uploadsDir = 'uploads';

    // Supported file types
    this.imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
    this.videoTypes = ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'];
    this.documentTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB default
  }

  /**
   * Upload and process asset
   */
  async uploadAsset(fileData, metadata = {}) {
    try {
      const { buffer, originalName, mimeType } = fileData;

      // Validate file
      const validation = this.validateFile(buffer, originalName, mimeType);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Generate unique filename
      const fileExtension = path.extname(originalName).toLowerCase();
      const fileName = this.generateFileName(originalName, fileExtension);
      const filePath = path.join(this.uploadsDir, fileName);

      // Save file
      await this.filing.create(filePath, buffer);

      // Create asset record
      const asset = {
        id: this.generateAssetId(),
        filename: fileName,
        originalName: originalName,
        path: filePath,
        url: `/uploads/${fileName}`,
        mimeType: mimeType || mime.lookup(originalName) || 'application/octet-stream',
        size: buffer.length,
        type: this.getFileType(fileExtension),
        extension: fileExtension.substring(1),
        uploadedAt: new Date().toISOString(),
        optimized: false,
        metadata: {
          ...metadata,
          dimensions: null,
          optimizedVersions: []
        }
      };

      // For images, extract dimensions and create optimized versions
      if (asset.type === 'image' && this.isOptimizableImage(asset.extension)) {
        try {
          await this.processImage(asset, buffer);
        } catch (error) {
          this.logger.warn(`Failed to process image ${fileName}:`, error);
        }
      }

      this.logger.info(`Asset uploaded: ${fileName} (${asset.size} bytes)`);
      return asset;

    } catch (error) {
      this.logger.error('Error uploading asset:', error);
      throw error;
    }
  }

  /**
   * Process image asset - extract dimensions and create optimized versions
   */
  async processImage(asset, buffer) {
    try {
      // Note: In a real implementation, you would use libraries like Sharp or Jimp
      // For this demo, we'll create placeholder optimized versions

      const optimizedVersions = [];

      // Create different sizes for responsive images
      const sizes = [
        { width: 300, suffix: 'small' },
        { width: 600, suffix: 'medium' },
        { width: 1200, suffix: 'large' }
      ];

      for (const size of sizes) {
        const optimizedFileName = asset.filename.replace(
          `.${asset.extension}`,
          `_${size.suffix}.${asset.extension}`
        );
        const optimizedPath = path.join(this.uploadsDir, optimizedFileName);

        // In real implementation, resize image here
        // For demo, we'll just copy the original
        await this.filing.create(optimizedPath, buffer);

        optimizedVersions.push({
          width: size.width,
          suffix: size.suffix,
          filename: optimizedFileName,
          url: `/uploads/${optimizedFileName}`,
          size: buffer.length // In real implementation, this would be the optimized size
        });
      }

      // Update asset with optimization data
      asset.metadata.dimensions = { width: 1920, height: 1080 }; // Placeholder
      asset.metadata.optimizedVersions = optimizedVersions;
      asset.optimized = true;
      asset.optimizedAt = new Date().toISOString();

      this.logger.info(`Image processed: ${asset.filename} with ${optimizedVersions.length} versions`);

    } catch (error) {
      this.logger.error(`Error processing image ${asset.filename}:`, error);
      throw error;
    }
  }

  /**
   * Get asset by ID
   */
  async getAsset(assetId) {
    try {
      const cacheKey = `asset:${assetId}`;
      let asset = await this.cache.get(cacheKey);

      if (!asset) {
        // In a real implementation, this would query the database
        // For demo purposes, we'll return null
        return null;
      }

      return asset;
    } catch (error) {
      this.logger.error(`Error getting asset ${assetId}:`, error);
      return null;
    }
  }

  /**
   * Delete asset
   */
  async deleteAsset(assetId) {
    try {
      const asset = await this.getAsset(assetId);
      if (!asset) {
        throw new Error('Asset not found');
      }

      // Delete main file
      await this.filing.remove(asset.path);

      // Delete optimized versions
      if (asset.metadata?.optimizedVersions) {
        for (const version of asset.metadata.optimizedVersions) {
          const versionPath = path.join(this.uploadsDir, version.filename);
          try {
            await this.filing.remove(versionPath);
          } catch (error) {
            this.logger.warn(`Failed to delete optimized version: ${version.filename}`);
          }
        }
      }

      // Remove from cache
      await this.cache.delete(`asset:${assetId}`);

      this.logger.info(`Asset deleted: ${asset.filename}`);
      return true;

    } catch (error) {
      this.logger.error(`Error deleting asset ${assetId}:`, error);
      throw error;
    }
  }

  /**
   * Get optimized image URL
   */
  getOptimizedImageUrl(asset, width = null) {
    if (!asset.optimized || !asset.metadata?.optimizedVersions) {
      return asset.url;
    }

    if (!width) {
      return asset.url;
    }

    // Find closest size
    let bestMatch = asset.metadata.optimizedVersions[0];
    for (const version of asset.metadata.optimizedVersions) {
      if (version.width >= width) {
        bestMatch = version;
        break;
      }
    }

    return bestMatch.url;
  }

  /**
   * Generate responsive image srcset
   */
  generateSrcSet(asset) {
    if (!asset.optimized || !asset.metadata?.optimizedVersions) {
      return asset.url;
    }

    const srcSetParts = asset.metadata.optimizedVersions.map(version =>
      `${version.url} ${version.width}w`
    );

    // Add original as largest size
    if (asset.metadata.dimensions) {
      srcSetParts.push(`${asset.url} ${asset.metadata.dimensions.width}w`);
    }

    return srcSetParts.join(', ');
  }

  /**
   * Validate uploaded file
   */
  validateFile(buffer, originalName, mimeType) {
    // Check file size
    if (buffer.length > this.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size (${this.maxFileSize / 1024 / 1024}MB)`
      };
    }

    // Check file extension
    const extension = path.extname(originalName).toLowerCase().substring(1);
    const allowedTypes = [...this.imageTypes, ...this.videoTypes, ...this.documentTypes];

    if (!allowedTypes.includes(extension)) {
      return {
        valid: false,
        error: `File type not allowed: ${extension}`
      };
    }

    // Basic security check - reject files with multiple extensions
    const nameParts = originalName.split('.');
    if (nameParts.length > 2) {
      return {
        valid: false,
        error: 'Files with multiple extensions are not allowed'
      };
    }

    return { valid: true };
  }

  /**
   * Generate unique filename
   */
  generateFileName(originalName, extension) {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    const baseName = path.basename(originalName, extension)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);

    return `${baseName}-${timestamp}-${random}${extension}`;
  }

  /**
   * Generate asset ID
   */
  generateAssetId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(6).toString('hex');
    return `asset-${timestamp}-${random}`;
  }

  /**
   * Get file type category
   */
  getFileType(extension) {
    const ext = extension.toLowerCase().substring(1);

    if (this.imageTypes.includes(ext)) {
      return 'image';
    } else if (this.videoTypes.includes(ext)) {
      return 'video';
    } else if (this.documentTypes.includes(ext)) {
      return 'document';
    } else {
      return 'other';
    }
  }

  /**
   * Check if image can be optimized
   */
  isOptimizableImage(extension) {
    const optimizableTypes = ['jpg', 'jpeg', 'png', 'webp'];
    return optimizableTypes.includes(extension);
  }

  /**
   * Get asset stats
   */
  async getAssetStats() {
    try {
      // In real implementation, this would query the database
      return {
        totalAssets: 0,
        totalSize: 0,
        imageCount: 0,
        videoCount: 0,
        documentCount: 0,
        otherCount: 0
      };
    } catch (error) {
      this.logger.error('Error getting asset stats:', error);
      return null;
    }
  }

  /**
   * Clean up orphaned assets
   */
  async cleanupOrphanedAssets() {
    try {
      this.logger.info('Starting orphaned asset cleanup...');

      // This would identify and remove assets not referenced by any content
      // Implementation depends on your data structure

      this.logger.info('Orphaned asset cleanup completed');
    } catch (error) {
      this.logger.error('Error during asset cleanup:', error);
    }
  }

  /**
   * Optimize existing asset
   */
  async optimizeAsset(assetId) {
    try {
      const asset = await this.getAsset(assetId);
      if (!asset) {
        throw new Error('Asset not found');
      }

      if (asset.type !== 'image' || asset.optimized) {
        return asset; // Already optimized or not an image
      }

      // Read the file
      const buffer = await this.filing.read(asset.path);

      // Process the image
      await this.processImage(asset, buffer);

      this.logger.info(`Asset optimized: ${asset.filename}`);
      return asset;

    } catch (error) {
      this.logger.error(`Error optimizing asset ${assetId}:`, error);
      throw error;
    }
  }

  /**
   * Search assets
   */
  async searchAssets(query, filters = {}) {
    try {
      // In real implementation, this would search the database
      // For demo, return empty array
      return [];
    } catch (error) {
      this.logger.error('Error searching assets:', error);
      return [];
    }
  }
}

module.exports = AssetManager;