/**
 * @fileoverview Theme Manager for CMS
 * Handles theme management, customization, and CSS generation
 *
 * @author NooblyJS Team
 * @version 1.0.14
 * @since 2025-08-22
 */

'use strict';

const path = require('path');
const fs = require('fs').promises;

class ThemeManager {
  constructor({ filing, cache, logger, templateEngine }) {
    this.filing = filing;
    this.cache = cache;
    this.logger = logger;
    this.templateEngine = templateEngine;
    this.themesDir = '.application/cms-themes';
    this.customThemesDir = '.application/custom-themes';
  }

  /**
   * Initialize default themes
   */
  async initializeDefaultThemes() {
    try {
      this.logger.info('Initializing default themes...');

      const defaultThemes = [
        {
          id: 'default',
          name: 'Default Theme',
          description: 'Clean and modern default theme',
          category: 'business',
          author: 'NooblyJS Team',
          version: '1.0.0',
          colors: {
            primary: '#007bff',
            secondary: '#6c757d',
            success: '#28a745',
            danger: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8',
            light: '#f8f9fa',
            dark: '#343a40'
          },
          typography: {
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            headingFont: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            fontSize: '16px',
            lineHeight: '1.5'
          },
          layout: {
            containerWidth: '1200px',
            gridColumns: 12,
            spacing: '1rem'
          }
        },
        {
          id: 'portfolio',
          name: 'Portfolio Theme',
          description: 'Perfect for showcasing creative work',
          category: 'portfolio',
          author: 'NooblyJS Team',
          version: '1.0.0',
          colors: {
            primary: '#212529',
            secondary: '#6c757d',
            accent: '#fd7e14',
            background: '#ffffff',
            text: '#212529',
            muted: '#6c757d'
          },
          typography: {
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
            headingFont: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '16px',
            lineHeight: '1.6'
          },
          layout: {
            containerWidth: '1140px',
            gridColumns: 12,
            spacing: '2rem'
          }
        },
        {
          id: 'business',
          name: 'Business Pro',
          description: 'Professional theme for business websites',
          category: 'business',
          author: 'NooblyJS Team',
          version: '1.0.0',
          colors: {
            primary: '#0056b3',
            secondary: '#495057',
            accent: '#20c997',
            background: '#ffffff',
            text: '#212529',
            light: '#f8f9fa'
          },
          typography: {
            fontFamily: '"Roboto", -apple-system, BlinkMacSystemFont, sans-serif',
            headingFont: '"Roboto Slab", Georgia, serif',
            fontSize: '16px',
            lineHeight: '1.5'
          },
          layout: {
            containerWidth: '1200px',
            gridColumns: 12,
            spacing: '1.5rem'
          }
        }
      ];

      // Save each theme
      for (const theme of defaultThemes) {
        await this.saveTheme(theme);
        await this.generateThemeCSS(theme);
      }

      this.logger.info(`Initialized ${defaultThemes.length} default themes`);
    } catch (error) {
      this.logger.error('Error initializing default themes:', error);
    }
  }

  /**
   * Get theme by ID
   */
  async getTheme(themeId) {
    try {
      const cacheKey = `theme:${themeId}`;
      let theme = await this.cache.get(cacheKey);

      if (!theme) {
        // Try to load from filing system
        const themePath = `${this.themesDir}/${themeId}/theme.json`;
        const themeData = await this.filing.read(themePath);

        if (themeData) {
          theme = JSON.parse(Buffer.isBuffer(themeData) ? themeData.toString('utf8') : themeData);
          await this.cache.put(cacheKey, theme, 3600); // Cache for 1 hour
        }
      }

      return theme;
    } catch (error) {
      this.logger.warn(`Theme not found: ${themeId}`);
      return null;
    }
  }

  /**
   * Get all available themes
   */
  async getAllThemes() {
    try {
      const cacheKey = 'themes:all';
      let themes = await this.cache.get(cacheKey);

      if (!themes) {
        themes = [];

        // Get built-in themes
        const builtInThemes = ['default', 'portfolio', 'business'];
        for (const themeId of builtInThemes) {
          const theme = await this.getTheme(themeId);
          if (theme) {
            themes.push({
              ...theme,
              isBuiltIn: true,
              isCustom: false
            });
          }
        }

        // Get custom themes
        // In a real implementation, you would scan the custom themes directory
        // For now, we'll just return the built-in themes

        await this.cache.put(cacheKey, themes, 1800); // Cache for 30 minutes
      }

      return themes;
    } catch (error) {
      this.logger.error('Error getting all themes:', error);
      return [];
    }
  }

  /**
   * Save theme configuration
   */
  async saveTheme(theme) {
    try {
      const themeDir = `${this.themesDir}/${theme.id}`;
      const themePath = `${themeDir}/theme.json`;

      // Ensure directory exists
      const fs = require('fs').promises;
      await fs.mkdir(themeDir, { recursive: true });

      // Save theme configuration
      await this.filing.create(themePath, JSON.stringify(theme, null, 2));

      // Clear cache
      await this.cache.delete(`theme:${theme.id}`);
      await this.cache.delete('themes:all');

      this.logger.info(`Theme saved: ${theme.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Error saving theme ${theme.id}:`, error);
      return false;
    }
  }

  /**
   * Create custom theme from existing theme
   */
  async createCustomTheme(baseThemeId, customizations, newThemeData) {
    try {
      const baseTheme = await this.getTheme(baseThemeId);
      if (!baseTheme) {
        throw new Error(`Base theme not found: ${baseThemeId}`);
      }

      // Create new theme with customizations
      const customTheme = {
        ...baseTheme,
        ...newThemeData,
        id: `custom-${Date.now()}`,
        isCustom: true,
        isBuiltIn: false,
        basedOn: baseThemeId,
        customizations,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Apply customizations
      if (customizations.colors) {
        customTheme.colors = { ...customTheme.colors, ...customizations.colors };
      }

      if (customizations.typography) {
        customTheme.typography = { ...customTheme.typography, ...customizations.typography };
      }

      if (customizations.layout) {
        customTheme.layout = { ...customTheme.layout, ...customizations.layout };
      }

      // Save the custom theme
      await this.saveTheme(customTheme);

      // Generate CSS for the custom theme
      await this.generateThemeCSS(customTheme);

      this.logger.info(`Custom theme created: ${customTheme.id} based on ${baseThemeId}`);
      return customTheme;

    } catch (error) {
      this.logger.error('Error creating custom theme:', error);
      throw error;
    }
  }

  /**
   * Generate CSS from theme configuration
   */
  async generateThemeCSS(theme) {
    try {
      const css = this.buildThemeCSS(theme);
      const cssPath = `${this.themesDir}/${theme.id}/styles.css`;

      await this.filing.create(cssPath, css);

      this.logger.info(`CSS generated for theme: ${theme.id}`);
      return cssPath;
    } catch (error) {
      this.logger.error(`Error generating CSS for theme ${theme.id}:`, error);
      throw error;
    }
  }

  /**
   * Build CSS from theme configuration
   */
  buildThemeCSS(theme) {
    const { colors, typography, layout } = theme;

    return `/* Theme: ${theme.name} */
/* Generated on: ${new Date().toISOString()} */

:root {
  /* Colors */
  --color-primary: ${colors.primary};
  --color-secondary: ${colors.secondary};
  --color-success: ${colors.success || '#28a745'};
  --color-danger: ${colors.danger || '#dc3545'};
  --color-warning: ${colors.warning || '#ffc107'};
  --color-info: ${colors.info || '#17a2b8'};
  --color-light: ${colors.light || '#f8f9fa'};
  --color-dark: ${colors.dark || '#343a40'};
  --color-background: ${colors.background || '#ffffff'};
  --color-text: ${colors.text || '#212529'};
  --color-muted: ${colors.muted || '#6c757d'};
  --color-accent: ${colors.accent || colors.primary};

  /* Typography */
  --font-family: ${typography.fontFamily};
  --font-heading: ${typography.headingFont || typography.fontFamily};
  --font-size: ${typography.fontSize};
  --line-height: ${typography.lineHeight};

  /* Layout */
  --container-width: ${layout.containerWidth};
  --grid-columns: ${layout.gridColumns};
  --spacing: ${layout.spacing};
}

/* Base Styles */
* {
  box-sizing: border-box;
}

body {
  font-family: var(--font-family);
  font-size: var(--font-size);
  line-height: var(--line-height);
  color: var(--color-text);
  background-color: var(--color-background);
  margin: 0;
  padding: 0;
}

.container {
  max-width: var(--container-width);
  margin: 0 auto;
  padding: 0 var(--spacing);
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: 600;
  line-height: 1.2;
  margin-top: 0;
  margin-bottom: calc(var(--spacing) * 0.5);
}

h1 { font-size: 2.5rem; }
h2 { font-size: 2rem; }
h3 { font-size: 1.75rem; }
h4 { font-size: 1.5rem; }
h5 { font-size: 1.25rem; }
h6 { font-size: 1rem; }

p {
  margin-top: 0;
  margin-bottom: var(--spacing);
}

a {
  color: var(--color-primary);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* Components */
.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  margin-bottom: 0;
  font-size: var(--font-size);
  font-weight: 400;
  line-height: 1.5;
  text-align: center;
  white-space: nowrap;
  vertical-align: middle;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  text-decoration: none;
  transition: all 0.15s ease-in-out;
}

.btn-primary {
  color: #fff;
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.btn-primary:hover {
  background-color: var(--color-primary);
  filter: brightness(85%);
  text-decoration: none;
}

.btn-secondary {
  color: #fff;
  background-color: var(--color-secondary);
  border-color: var(--color-secondary);
}

/* Layout */
.hero-section {
  position: relative;
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-light);
  color: var(--color-dark);
}

.hero-content {
  text-align: center;
  z-index: 2;
}

.hero-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: calc(var(--spacing) * 0.5);
}

.hero-subtitle {
  font-size: 1.25rem;
  margin-bottom: calc(var(--spacing) * 1.5);
  color: var(--color-muted);
}

.text-section {
  padding: calc(var(--spacing) * 3) 0;
}

.section-title {
  margin-bottom: calc(var(--spacing) * 1.5);
}

.section-content {
  max-width: 800px;
  margin: 0 auto;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing);
  margin-top: calc(var(--spacing) * 1.5);
}

.gallery-item img {
  width: 100%;
  height: auto;
  border-radius: 0.375rem;
}

.contact-form {
  max-width: 600px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: var(--spacing);
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 0.375rem;
  font-size: var(--font-size);
  font-family: var(--font-family);
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.site-header {
  background-color: var(--color-light);
  padding: calc(var(--spacing) * 1.5) 0;
  border-bottom: 1px solid #dee2e6;
}

.site-header .container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.site-logo {
  height: 40px;
  width: auto;
}

.site-title {
  margin: 0;
  font-size: 1.5rem;
}

.site-footer {
  background-color: var(--color-dark);
  color: var(--color-light);
  padding: calc(var(--spacing) * 2) 0;
  margin-top: calc(var(--spacing) * 3);
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .container {
    padding: 0 calc(var(--spacing) * 0.5);
  }

  .gallery-grid {
    grid-template-columns: 1fr;
  }
}`;
  }

  /**
   * Get theme CSS content
   */
  async getThemeCSS(themeId) {
    try {
      const cssPath = `${this.themesDir}/${themeId}/styles.css`;
      const cssContent = await this.filing.read(cssPath);

      return Buffer.isBuffer(cssContent) ? cssContent.toString('utf8') : cssContent;
    } catch (error) {
      this.logger.warn(`CSS not found for theme: ${themeId}`);

      // Generate CSS if it doesn't exist
      const theme = await this.getTheme(themeId);
      if (theme) {
        try {
          await this.generateThemeCSS(theme);
          // Try to read the generated CSS file directly, without recursion
          const cssPath = `${this.themesDir}/${themeId}/styles.css`;
          const cssContent = await this.filing.read(cssPath);
          return Buffer.isBuffer(cssContent) ? cssContent.toString('utf8') : cssContent;
        } catch (generateError) {
          this.logger.error(`Failed to generate CSS for theme ${themeId}:`, generateError);
          return null;
        }
      }

      return null;
    }
  }

  /**
   * Update theme customizations
   */
  async updateThemeCustomizations(themeId, customizations) {
    try {
      const theme = await this.getTheme(themeId);
      if (!theme) {
        throw new Error(`Theme not found: ${themeId}`);
      }

      // Apply customizations
      const updatedTheme = { ...theme };

      if (customizations.colors) {
        updatedTheme.colors = { ...updatedTheme.colors, ...customizations.colors };
      }

      if (customizations.typography) {
        updatedTheme.typography = { ...updatedTheme.typography, ...customizations.typography };
      }

      if (customizations.layout) {
        updatedTheme.layout = { ...updatedTheme.layout, ...customizations.layout };
      }

      updatedTheme.updatedAt = new Date().toISOString();

      // Save updated theme
      await this.saveTheme(updatedTheme);

      // Regenerate CSS
      await this.generateThemeCSS(updatedTheme);

      this.logger.info(`Theme customizations updated: ${themeId}`);
      return updatedTheme;

    } catch (error) {
      this.logger.error(`Error updating theme customizations for ${themeId}:`, error);
      throw error;
    }
  }

  /**
   * Delete custom theme
   */
  async deleteTheme(themeId) {
    try {
      const theme = await this.getTheme(themeId);
      if (!theme) {
        throw new Error(`Theme not found: ${themeId}`);
      }

      if (theme.isBuiltIn) {
        throw new Error('Cannot delete built-in theme');
      }

      // Delete theme directory
      const themeDir = `${this.themesDir}/${themeId}`;
      await this.filing.deleteDirectory(themeDir);

      // Clear cache
      await this.cache.delete(`theme:${themeId}`);
      await this.cache.delete('themes:all');

      this.logger.info(`Theme deleted: ${themeId}`);
      return true;

    } catch (error) {
      this.logger.error(`Error deleting theme ${themeId}:`, error);
      throw error;
    }
  }

  /**
   * Duplicate theme
   */
  async duplicateTheme(themeId, newName) {
    try {
      const sourceTheme = await this.getTheme(themeId);
      if (!sourceTheme) {
        throw new Error(`Source theme not found: ${themeId}`);
      }

      const duplicatedTheme = {
        ...sourceTheme,
        id: `custom-${Date.now()}`,
        name: newName,
        isCustom: true,
        isBuiltIn: false,
        basedOn: themeId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.saveTheme(duplicatedTheme);
      await this.generateThemeCSS(duplicatedTheme);

      this.logger.info(`Theme duplicated: ${themeId} -> ${duplicatedTheme.id}`);
      return duplicatedTheme;

    } catch (error) {
      this.logger.error(`Error duplicating theme ${themeId}:`, error);
      throw error;
    }
  }
}

module.exports = ThemeManager;