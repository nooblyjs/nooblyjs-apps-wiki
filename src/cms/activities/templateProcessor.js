/**
 * @fileoverview Template Processor Activity
 * Background process for template compilation and validation
 *
 * @author NooblyJS Team
 * @version 1.0.14
 * @since 2025-08-22
 */

'use strict';

/**
 * Compile and validate template
 */
async function compileTemplateActivity(services, templateId) {
  const { templateEngine, dataManager, logger, cache } = services;

  try {
    logger.info(`Compiling template: ${templateId}`);

    const template = await dataManager.findOne('templates', { id: templateId });
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Get template content
    const templateContent = await templateEngine.getTemplate(template.template || 'default');

    // Validate template syntax
    const validation = await templateEngine.validateTemplate(templateContent);
    if (!validation.valid) {
      throw new Error(`Template validation failed: ${validation.error}`);
    }

    // Test compilation with sample data
    const sampleData = {
      title: 'Sample Page',
      content: 'Sample content',
      site: { title: 'Sample Site' },
      seo: { title: 'Sample Page - Sample Site' }
    };

    const compiledTemplate = await templateEngine.compileTemplate(templateContent, sampleData);

    // Update template with compilation results
    await dataManager.update('templates', templateId, {
      compiled: true,
      compiledAt: new Date().toISOString(),
      compilationStatus: 'success',
      sampleOutput: compiledTemplate.substring(0, 500) // Store first 500 chars as preview
    });

    // Clear template cache
    await cache.delete(`template:${template.name}`);

    logger.info(`Template compilation completed: ${templateId}`);
    return { templateId, status: 'success', compiledAt: new Date().toISOString() };

  } catch (error) {
    logger.error(`Template compilation failed for ${templateId}:`, error);

    // Update template with error status
    await dataManager.update('templates', templateId, {
      compiled: false,
      compiledAt: new Date().toISOString(),
      compilationStatus: 'error',
      compilationError: error.message
    });

    throw error;
  }
}

/**
 * Generate template preview
 */
async function generateTemplatePreviewActivity(services, templateId) {
  const { templateEngine, dataManager, logger } = services;

  try {
    logger.info(`Generating template preview: ${templateId}`);

    const template = await dataManager.findOne('templates', { id: templateId });
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Generate preview with sample content
    const samplePage = {
      title: 'Sample Page Title',
      content: {
        sections: [
          {
            id: 'sample-hero',
            type: 'hero',
            settings: {
              title: 'Welcome to Your Site',
              subtitle: 'This is a sample hero section to showcase your template',
              buttonText: 'Get Started',
              buttonLink: '#',
              backgroundImage: '/assets/sample-hero-bg.jpg'
            }
          },
          {
            id: 'sample-text',
            type: 'text',
            settings: {
              title: 'About This Template',
              content: 'This template provides a clean and modern design for your website. It includes responsive layouts, beautiful typography, and easy customization options.'
            }
          }
        ]
      },
      seo: {
        title: 'Sample Page - Your Site',
        metaDescription: 'This is a sample page to demonstrate the template design',
        keywords: ['sample', 'template', 'demo']
      }
    };

    const sampleSite = {
      title: 'Your Site Name',
      description: 'A beautiful website built with our CMS',
      logo: '/assets/sample-logo.png',
      favicon: '/assets/sample-favicon.ico'
    };

    // Render the page with sample data
    const previewHtml = await templateEngine.renderPage(samplePage, sampleSite);

    // Save preview
    const previewPath = `previews/template-${templateId}.html`;
    const { filing } = services;
    await filing.create(previewPath, previewHtml);

    // Update template with preview info
    await dataManager.update('templates', templateId, {
      previewGenerated: true,
      previewGeneratedAt: new Date().toISOString(),
      previewUrl: `/cms/previews/template-${templateId}.html`
    });

    logger.info(`Template preview generated: ${templateId}`);
    return {
      templateId,
      previewUrl: `/cms/previews/template-${templateId}.html`,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`Template preview generation failed for ${templateId}:`, error);

    // Update template with error status
    await dataManager.update('templates', templateId, {
      previewGenerated: false,
      previewGeneratedAt: new Date().toISOString(),
      previewError: error.message
    });

    throw error;
  }
}

/**
 * Initialize default component templates
 */
async function initializeComponentTemplatesActivity(services) {
  const { templateEngine, logger } = services;

  try {
    logger.info('Initializing default component templates');

    await templateEngine.initializeDefaultTemplates();

    logger.info('Default component templates initialized successfully');
    return { status: 'success', initializedAt: new Date().toISOString() };

  } catch (error) {
    logger.error('Failed to initialize default component templates:', error);
    throw error;
  }
}

/**
 * Validate all templates
 */
async function validateAllTemplatesActivity(services) {
  const { templateEngine, dataManager, logger } = services;

  try {
    logger.info('Starting validation of all templates');

    const templates = await dataManager.find('templates');
    const results = [];

    for (const template of templates) {
      try {
        const result = await compileTemplateActivity(services, template.id);
        results.push({ ...result, templateName: template.name });
      } catch (error) {
        results.push({
          templateId: template.id,
          templateName: template.name,
          status: 'error',
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    logger.info(`Template validation completed: ${successCount} successful, ${errorCount} errors`);

    return {
      totalTemplates: templates.length,
      successCount,
      errorCount,
      results,
      completedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Template validation failed:', error);
    throw error;
  }
}

/**
 * Create custom component template
 */
async function createCustomComponentActivity(services, componentData) {
  const { templateEngine, dataManager, logger } = services;

  try {
    logger.info(`Creating custom component: ${componentData.name}`);

    // Validate template syntax
    if (componentData.template) {
      const validation = await templateEngine.validateTemplate(componentData.template);
      if (!validation.valid) {
        throw new Error(`Component template validation failed: ${validation.error}`);
      }
    }

    // Create component in database
    const componentId = await dataManager.add('components', {
      ...componentData,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Save component template if provided
    if (componentData.template) {
      await templateEngine.saveComponentTemplate(componentData.type, componentData.template);
    }

    logger.info(`Custom component created: ${componentData.name} (${componentId})`);

    return {
      componentId,
      name: componentData.name,
      type: componentData.type,
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`Failed to create custom component ${componentData.name}:`, error);
    throw error;
  }
}

/**
 * Export template package
 */
async function exportTemplateActivity(services, templateId) {
  const { templateEngine, dataManager, logger, filing } = services;

  try {
    logger.info(`Exporting template: ${templateId}`);

    const template = await dataManager.findOne('templates', { id: templateId });
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Get template content
    const templateContent = await templateEngine.getTemplate(template.template || 'default');

    // Create export package
    const exportPackage = {
      template: template,
      templateContent: templateContent,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    // Save export package
    const exportPath = `exports/template-${templateId}-${Date.now()}.json`;
    await filing.create(exportPath, JSON.stringify(exportPackage, null, 2));

    logger.info(`Template exported: ${templateId} to ${exportPath}`);

    return {
      templateId,
      exportPath,
      exportedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`Template export failed for ${templateId}:`, error);
    throw error;
  }
}

module.exports = {
  compileTemplateActivity,
  generateTemplatePreviewActivity,
  initializeComponentTemplatesActivity,
  validateAllTemplatesActivity,
  createCustomComponentActivity,
  exportTemplateActivity
};