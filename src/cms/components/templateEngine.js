/**
 * @fileoverview Template Engine for CMS
 * Handles EJS template processing, component rendering, and template compilation
 *
 * @author NooblyJS Team
 * @version 1.0.14
 * @since 2025-08-22
 */

'use strict';

const ejs = require('ejs');
const path = require('path');
const fs = require('fs').promises;

class TemplateEngine {
  constructor({ filing, cache, logger }) {
    this.filing = filing;
    this.cache = cache;
    this.logger = logger;
    this.templateCache = new Map();
    this.componentCache = new Map();
  }

  /**
   * Render a page using template and content data
   */
  async renderPage(pageData, siteSettings = {}) {
    try {
      const { content, template, title, seo } = pageData;

      // Get the page template
      const pageTemplate = await this.getTemplate(template || 'default-page');

      // Render each section
      const renderedSections = await Promise.all(
        content.sections.map(section => this.renderSection(section))
      );

      // Compile the page
      const pageHtml = await this.compileTemplate(pageTemplate, {
        title,
        seo: { ...seo, title: seo?.metaTitle || title },
        content: renderedSections.join('\n'),
        site: siteSettings,
        sections: renderedSections
      });

      return pageHtml;
    } catch (error) {
      this.logger.error('Error rendering page:', error);
      throw error;
    }
  }

  /**
   * Render a single content section/component
   */
  async renderSection(sectionData) {
    try {
      const { type, settings, id } = sectionData;

      // Get component template
      const componentTemplate = await this.getComponentTemplate(type);

      if (!componentTemplate) {
        this.logger.warn(`No template found for component type: ${type}`);
        return `<!-- Component template not found: ${type} -->`;
      }

      // Render the component with its settings
      const sectionHtml = await this.compileTemplate(componentTemplate, {
        ...settings,
        sectionId: id,
        type
      });

      return sectionHtml;
    } catch (error) {
      this.logger.error(`Error rendering section ${sectionData.type}:`, error);
      return `<!-- Error rendering section: ${sectionData.type} -->`;
    }
  }

  /**
   * Get template content by name
   */
  async getTemplate(templateName) {
    const cacheKey = `template:${templateName}`;

    // Check cache first
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey);
    }

    try {
      // Try to load from filing system
      const templatePath = `templates/${templateName}.ejs`;
      const templateContent = await this.filing.read(templatePath);

      if (templateContent) {
        const content = Buffer.isBuffer(templateContent) ?
          templateContent.toString('utf8') : templateContent;

        this.templateCache.set(cacheKey, content);
        return content;
      }
    } catch (error) {
      this.logger.warn(`Template not found in filing system: ${templateName}`);
    }

    // Fallback to default template
    const defaultTemplate = this.getDefaultPageTemplate();
    this.templateCache.set(cacheKey, defaultTemplate);
    return defaultTemplate;
  }

  /**
   * Get component template by type
   */
  async getComponentTemplate(componentType) {
    const cacheKey = `component:${componentType}`;

    // Check cache first
    if (this.componentCache.has(cacheKey)) {
      return this.componentCache.get(cacheKey);
    }

    try {
      // Try to load from filing system
      const templatePath = `components/${componentType}.ejs`;
      const templateContent = await this.filing.read(templatePath);

      if (templateContent) {
        const content = Buffer.isBuffer(templateContent) ?
          templateContent.toString('utf8') : templateContent;

        this.componentCache.set(cacheKey, content);
        return content;
      }
    } catch (error) {
      this.logger.warn(`Component template not found: ${componentType}`);
    }

    // Fallback to built-in component templates
    const builtInTemplate = this.getBuiltInComponentTemplate(componentType);
    if (builtInTemplate) {
      this.componentCache.set(cacheKey, builtInTemplate);
      return builtInTemplate;
    }

    return null;
  }

  /**
   * Compile EJS template with data
   */
  async compileTemplate(templateContent, data) {
    try {
      return ejs.render(templateContent, data, {
        async: true,
        cache: true
      });
    } catch (error) {
      this.logger.error('Error compiling template:', error);
      throw error;
    }
  }

  /**
   * Save custom template
   */
  async saveTemplate(templateName, templateContent) {
    try {
      const templatePath = `templates/${templateName}.ejs`;
      await this.filing.create(templatePath, templateContent);

      // Clear cache
      this.templateCache.delete(`template:${templateName}`);

      this.logger.info(`Template saved: ${templateName}`);
      return true;
    } catch (error) {
      this.logger.error(`Error saving template ${templateName}:`, error);
      return false;
    }
  }

  /**
   * Save custom component template
   */
  async saveComponentTemplate(componentType, templateContent) {
    try {
      const templatePath = `components/${componentType}.ejs`;
      await this.filing.create(templatePath, templateContent);

      // Clear cache
      this.componentCache.delete(`component:${componentType}`);

      this.logger.info(`Component template saved: ${componentType}`);
      return true;
    } catch (error) {
      this.logger.error(`Error saving component template ${componentType}:`, error);
      return false;
    }
  }

  /**
   * Clear template caches
   */
  clearCache() {
    this.templateCache.clear();
    this.componentCache.clear();
    this.logger.info('Template caches cleared');
  }

  /**
   * Get default page template
   */
  getDefaultPageTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= seo?.title || title %></title>
    <% if (seo?.metaDescription) { %>
    <meta name="description" content="<%= seo.metaDescription %>">
    <% } %>
    <% if (seo?.keywords?.length) { %>
    <meta name="keywords" content="<%= seo.keywords.join(', ') %>">
    <% } %>
    <% if (site?.favicon) { %>
    <link rel="icon" href="<%= site.favicon %>">
    <% } %>
    <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
    <% if (site?.logo || site?.title) { %>
    <header class="site-header">
        <div class="container">
            <% if (site.logo) { %>
            <img src="<%= site.logo %>" alt="<%= site.title || 'Logo' %>" class="site-logo">
            <% } %>
            <% if (site.title) { %>
            <h1 class="site-title"><%= site.title %></h1>
            <% } %>
        </div>
    </header>
    <% } %>

    <main class="site-content">
        <%- content %>
    </main>

    <footer class="site-footer">
        <div class="container">
            <p>&copy; <%= new Date().getFullYear() %> <%= site?.title || 'Website' %>. All rights reserved.</p>
        </div>
    </footer>

    <% if (site?.analytics) { %>
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=<%= site.analytics %>"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '<%= site.analytics %>');
    </script>
    <% } %>
</body>
</html>`;
  }

  /**
   * Get built-in component templates
   */
  getBuiltInComponentTemplate(componentType) {
    const templates = {
      hero: `<section class="hero-section" id="<%= sectionId %>" style="<% if (backgroundImage) { %>background-image: url('<%= backgroundImage %>'); background-size: cover; background-position: center;<% } %>">
    <div class="hero-content">
        <div class="container">
            <% if (title) { %>
            <h1 class="hero-title"><%= title %></h1>
            <% } %>
            <% if (subtitle) { %>
            <p class="hero-subtitle"><%= subtitle %></p>
            <% } %>
            <% if (buttonText && buttonLink) { %>
            <a href="<%= buttonLink %>" class="hero-button btn btn-primary"><%= buttonText %></a>
            <% } %>
        </div>
    </div>
</section>`,

      text: `<section class="text-section" id="<%= sectionId %>">
    <div class="container">
        <% if (title) { %>
        <h2 class="section-title"><%= title %></h2>
        <% } %>
        <% if (content) { %>
        <div class="section-content">
            <%- content %>
        </div>
        <% } %>
    </div>
</section>`,

      gallery: `<section class="gallery-section" id="<%= sectionId %>">
    <div class="container">
        <% if (title) { %>
        <h2 class="section-title"><%= title %></h2>
        <% } %>
        <div class="gallery-grid">
            <% if (images && images.length) { %>
                <% images.forEach(function(image) { %>
                <div class="gallery-item">
                    <img src="<%= image.src %>" alt="<%= image.alt || '' %>" loading="lazy">
                    <% if (image.caption) { %>
                    <p class="gallery-caption"><%= image.caption %></p>
                    <% } %>
                </div>
                <% }); %>
            <% } %>
        </div>
    </div>
</section>`,

      contact: `<section class="contact-section" id="<%= sectionId %>">
    <div class="container">
        <% if (title) { %>
        <h2 class="section-title"><%= title %></h2>
        <% } %>
        <% if (description) { %>
        <p class="section-description"><%= description %></p>
        <% } %>
        <form class="contact-form" action="/contact" method="POST">
            <div class="form-group">
                <label for="name">Name</label>
                <input type="text" id="name" name="name" required>
            </div>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
                <label for="message">Message</label>
                <textarea id="message" name="message" rows="5" required></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Send Message</button>
        </form>
    </div>
</section>`
    };

    return templates[componentType] || null;
  }

  /**
   * Initialize default templates
   */
  async initializeDefaultTemplates() {
    try {
      // Save default page template
      await this.saveTemplate('default-page', this.getDefaultPageTemplate());

      // Save built-in component templates
      const componentTypes = ['hero', 'text', 'gallery', 'contact'];
      for (const type of componentTypes) {
        const template = this.getBuiltInComponentTemplate(type);
        if (template) {
          await this.saveComponentTemplate(type, template);
        }
      }

      this.logger.info('Default templates initialized');
    } catch (error) {
      this.logger.error('Error initializing default templates:', error);
    }
  }

  /**
   * Validate template syntax
   */
  async validateTemplate(templateContent) {
    try {
      // Try to compile with dummy data
      await ejs.render(templateContent, {
        title: 'Test',
        content: 'Test content',
        site: { title: 'Test Site' }
      });
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        line: error.line,
        column: error.column
      };
    }
  }
}

module.exports = TemplateEngine;