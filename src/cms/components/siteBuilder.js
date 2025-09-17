/**
 * @fileoverview Site Builder for CMS
 * Handles static site generation, publishing, and deployment
 *
 * @author NooblyJS Team
 * @version 1.0.14
 * @since 2025-08-22
 */

'use strict';

const path = require('path');
const fs = require('fs').promises;

class SiteBuilder {
  constructor({ dataManager, filing, cache, logger, templateEngine, assetManager, themeManager }) {
    this.dataManager = dataManager;
    this.filing = filing;
    this.cache = cache;
    this.logger = logger;
    this.templateEngine = templateEngine;
    this.assetManager = assetManager;
    this.themeManager = themeManager;
    this.outputDir = 'published-sites';
  }

  /**
   * Generate complete static site from CMS data
   */
  async generateSite(siteId) {
    try {
      this.logger.info(`Starting site generation for: ${siteId}`);

      // Get site data with all pages
      const siteData = await this.dataManager.getSiteWithPages(siteId);
      if (!siteData) {
        throw new Error(`Site not found: ${siteId}`);
      }

      // Get theme
      const theme = await this.themeManager.getTheme(siteData.theme);
      if (!theme) {
        throw new Error(`Theme not found: ${siteData.theme}`);
      }

      // Create site output directory
      const siteOutputDir = path.join(this.outputDir, siteId);
      await fs.mkdir(siteOutputDir, { recursive: true });

      // Generate CSS file
      await this.generateSiteCSS(siteId, theme);

      // Generate pages
      const generatedPages = [];
      for (const pageId of siteData.pages) {
        const page = await this.generatePage(siteId, pageId, siteData.settings);
        if (page) {
          generatedPages.push(page);
        }
      }

      // Generate sitemap
      await this.generateSitemap(siteId, generatedPages, siteData.settings);

      // Generate robots.txt
      await this.generateRobotsTxt(siteId, siteData.settings);

      // Copy assets
      await this.copyAssets(siteId);

      // Update site cache
      await this.updateSiteCache(siteId, {
        generatedAt: new Date().toISOString(),
        pages: generatedPages,
        status: 'generated'
      });

      this.logger.info(`Site generation completed for: ${siteId} (${generatedPages.length} pages)`);

      return {
        siteId,
        pages: generatedPages,
        generatedAt: new Date().toISOString(),
        outputDir: siteOutputDir
      };

    } catch (error) {
      this.logger.error(`Error generating site ${siteId}:`, error);
      throw error;
    }
  }

  /**
   * Generate individual page
   */
  async generatePage(siteId, pageId, siteSettings) {
    try {
      // Get page content with populated components
      const pageContent = await this.dataManager.getPageContent(pageId);
      if (!pageContent) {
        this.logger.warn(`Page not found: ${pageId}`);
        return null;
      }

      // Render page HTML
      const pageHtml = await this.templateEngine.renderPage(pageContent, siteSettings);

      // Determine output filename
      const fileName = pageContent.slug === 'home' ? 'index.html' : `${pageContent.slug}.html`;
      const outputPath = path.join(this.outputDir, siteId, fileName);

      // Save generated page
      await this.filing.create(outputPath, pageHtml);

      this.logger.info(`Page generated: ${pageContent.slug} -> ${fileName}`);

      return {
        id: pageId,
        slug: pageContent.slug,
        title: pageContent.title,
        fileName,
        outputPath,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error(`Error generating page ${pageId}:`, error);
      return null;
    }
  }

  /**
   * Generate CSS file for site
   */
  async generateSiteCSS(siteId, theme) {
    try {
      // Get theme CSS
      const themeCSS = await this.themeManager.getThemeCSS(theme.id);

      if (themeCSS) {
        // Create CSS directory
        const cssDir = path.join(this.outputDir, siteId, 'css');
        await fs.mkdir(cssDir, { recursive: true });

        // Save CSS file
        const cssPath = path.join(cssDir, 'styles.css');
        await this.filing.create(cssPath, themeCSS);

        this.logger.info(`CSS generated for site: ${siteId}`);
      }
    } catch (error) {
      this.logger.error(`Error generating CSS for site ${siteId}:`, error);
    }
  }

  /**
   * Generate sitemap.xml
   */
  async generateSitemap(siteId, pages, siteSettings) {
    try {
      const baseUrl = siteSettings.domain || `https://${siteSettings.subdomain || siteId}.example.com`;

      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}/${page.fileName}</loc>
    <lastmod>${page.generatedAt.split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${page.slug === 'home' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

      const sitemapPath = path.join(this.outputDir, siteId, 'sitemap.xml');
      await this.filing.create(sitemapPath, sitemapXml);

      this.logger.info(`Sitemap generated for site: ${siteId}`);
    } catch (error) {
      this.logger.error(`Error generating sitemap for site ${siteId}:`, error);
    }
  }

  /**
   * Generate robots.txt
   */
  async generateRobotsTxt(siteId, siteSettings) {
    try {
      const baseUrl = siteSettings.domain || `https://${siteSettings.subdomain || siteId}.example.com`;

      const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`;

      const robotsPath = path.join(this.outputDir, siteId, 'robots.txt');
      await this.filing.create(robotsPath, robotsTxt);

      this.logger.info(`Robots.txt generated for site: ${siteId}`);
    } catch (error) {
      this.logger.error(`Error generating robots.txt for site ${siteId}:`, error);
    }
  }

  /**
   * Copy assets to site output directory
   */
  async copyAssets(siteId) {
    try {
      // Create assets directory
      const assetsDir = path.join(this.outputDir, siteId, 'assets');
      await fs.mkdir(assetsDir, { recursive: true });

      // In a real implementation, you would:
      // 1. Get all assets used by the site
      // 2. Copy them to the assets directory
      // 3. Update asset URLs in the generated HTML

      this.logger.info(`Assets copied for site: ${siteId}`);
    } catch (error) {
      this.logger.error(`Error copying assets for site ${siteId}:`, error);
    }
  }

  /**
   * Publish site (make it live)
   */
  async publishSite(siteId) {
    try {
      this.logger.info(`Publishing site: ${siteId}`);

      // Generate site first if not already generated
      await this.generateSite(siteId);

      // Update site status to published
      await this.dataManager.updateSiteStatus(siteId, 'published');

      // In a real implementation, you would:
      // 1. Deploy to CDN or hosting provider
      // 2. Update DNS records if needed
      // 3. Invalidate CDN cache
      // 4. Send notifications

      this.logger.info(`Site published successfully: ${siteId}`);

      return {
        siteId,
        status: 'published',
        publishedAt: new Date().toISOString(),
        url: await this.getSiteUrl(siteId)
      };

    } catch (error) {
      this.logger.error(`Error publishing site ${siteId}:`, error);
      throw error;
    }
  }

  /**
   * Unpublish site
   */
  async unpublishSite(siteId) {
    try {
      this.logger.info(`Unpublishing site: ${siteId}`);

      // Update site status to draft
      await this.dataManager.updateSiteStatus(siteId, 'draft');

      // In a real implementation, you would:
      // 1. Remove from hosting/CDN
      // 2. Update DNS records
      // 3. Clean up deployed resources

      this.logger.info(`Site unpublished: ${siteId}`);

      return {
        siteId,
        status: 'draft',
        unpublishedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error(`Error unpublishing site ${siteId}:`, error);
      throw error;
    }
  }

  /**
   * Preview site (generate temporary preview)
   */
  async previewSite(siteId) {
    try {
      this.logger.info(`Generating preview for site: ${siteId}`);

      // Generate site to temporary preview directory
      const previewDir = `preview-${siteId}-${Date.now()}`;
      const originalOutputDir = this.outputDir;
      this.outputDir = previewDir;

      const result = await this.generateSite(siteId);

      // Restore original output directory
      this.outputDir = originalOutputDir;

      const previewUrl = `/preview/${previewDir}/index.html`;

      this.logger.info(`Preview generated for site: ${siteId} at ${previewUrl}`);

      return {
        siteId,
        previewUrl,
        previewDir,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };

    } catch (error) {
      this.logger.error(`Error generating preview for site ${siteId}:`, error);
      throw error;
    }
  }

  /**
   * Get site URL
   */
  async getSiteUrl(siteId) {
    try {
      const site = await this.dataManager.findOne('sites', { id: siteId });
      if (!site) {
        return null;
      }

      if (site.settings.domain) {
        return `https://${site.settings.domain}`;
      } else if (site.settings.subdomain) {
        return `https://${site.settings.subdomain}`;
      } else {
        return `https://${siteId}.example.com`;
      }
    } catch (error) {
      this.logger.error(`Error getting site URL for ${siteId}:`, error);
      return null;
    }
  }

  /**
   * Update site cache with generation metadata
   */
  async updateSiteCache(siteId, cacheData) {
    try {
      const cacheKey = `site:generation:${siteId}`;
      await this.cache.put(cacheKey, cacheData, 3600); // Cache for 1 hour
    } catch (error) {
      this.logger.error(`Error updating site cache for ${siteId}:`, error);
    }
  }

  /**
   * Get site generation status
   */
  async getSiteGenerationStatus(siteId) {
    try {
      const cacheKey = `site:generation:${siteId}`;
      return await this.cache.get(cacheKey);
    } catch (error) {
      this.logger.error(`Error getting site generation status for ${siteId}:`, error);
      return null;
    }
  }

  /**
   * Clean up old preview sites
   */
  async cleanupPreviews() {
    try {
      this.logger.info('Starting preview cleanup...');

      // In a real implementation, you would:
      // 1. Scan for preview directories older than 24 hours
      // 2. Delete expired preview files
      // 3. Clean up associated cache entries

      this.logger.info('Preview cleanup completed');
    } catch (error) {
      this.logger.error('Error during preview cleanup:', error);
    }
  }

  /**
   * Validate site before generation
   */
  async validateSite(siteId) {
    try {
      const site = await this.dataManager.findOne('sites', { id: siteId });
      if (!site) {
        return { valid: false, errors: ['Site not found'] };
      }

      const errors = [];

      // Check if site has pages
      if (!site.pages || site.pages.length === 0) {
        errors.push('Site has no pages');
      }

      // Check if theme exists
      const theme = await this.themeManager.getTheme(site.theme);
      if (!theme) {
        errors.push(`Theme not found: ${site.theme}`);
      }

      // Check each page
      for (const pageId of site.pages || []) {
        const page = await this.dataManager.findOne('pages', { id: pageId });
        if (!page) {
          errors.push(`Page not found: ${pageId}`);
        } else if (!page.content || !page.content.sections) {
          errors.push(`Page has no content: ${page.name}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };

    } catch (error) {
      this.logger.error(`Error validating site ${siteId}:`, error);
      return {
        valid: false,
        errors: ['Validation failed: ' + error.message]
      };
    }
  }

  /**
   * Get site build statistics
   */
  async getSiteBuildStats(siteId) {
    try {
      const generationStatus = await this.getSiteGenerationStatus(siteId);
      if (!generationStatus) {
        return null;
      }

      return {
        siteId,
        lastBuild: generationStatus.generatedAt,
        pageCount: generationStatus.pages?.length || 0,
        status: generationStatus.status,
        buildTime: null, // Would be calculated during actual build
        fileSize: null   // Would be calculated from generated files
      };

    } catch (error) {
      this.logger.error(`Error getting build stats for site ${siteId}:`, error);
      return null;
    }
  }

  /**
   * Regenerate specific page
   */
  async regeneratePage(siteId, pageId) {
    try {
      this.logger.info(`Regenerating page: ${pageId} for site: ${siteId}`);

      const siteData = await this.dataManager.findOne('sites', { id: siteId });
      if (!siteData) {
        throw new Error(`Site not found: ${siteId}`);
      }

      const page = await this.generatePage(siteId, pageId, siteData.settings);

      this.logger.info(`Page regenerated: ${pageId}`);
      return page;

    } catch (error) {
      this.logger.error(`Error regenerating page ${pageId} for site ${siteId}:`, error);
      throw error;
    }
  }
}

module.exports = SiteBuilder;