/**
 * @fileoverview Post Content Management
 * Handles markdown file operations for blog posts including
 * creation, reading, updating, and organization.
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-09-16
 */

'use strict';

const path = require('path');

/**
 * Initialize post files directory structure
 */
async function initializePostFiles({ filing, logger }) {
  try {
    logger.info('Initializing blog post files directory structure...');

    // Create main posts directory
    await filing.createDirectory('');

    // Create subdirectories for organization
    const directories = [
      'drafts',
      'published',
      'archived',
      'media'
    ];

    for (const dir of directories) {
      try {
        await filing.createDirectory(dir);
        logger.info(`Created directory: ${dir}`);
      } catch (error) {
        if (error.code !== 'EEXIST') {
          logger.warn(`Could not create directory ${dir}:`, error.message);
        }
      }
    }

    logger.info('Post files directory structure initialized successfully');
  } catch (error) {
    logger.error('Error initializing post files:', error);
    throw error;
  }
}

/**
 * Save post content to markdown file
 */
async function savePostContent({ filing, logger }, postData) {
  try {
    const { id, slug, content, status = 'draft' } = postData;

    if (!id || !slug || !content) {
      throw new Error('Post ID, slug, and content are required');
    }

    // Determine directory based on status
    const directory = getPostDirectory(status);
    const filename = `${slug}.md`;
    const filePath = path.join(directory, filename);

    // Create frontmatter with metadata
    const frontmatter = createFrontmatter(postData);
    const markdownContent = `${frontmatter}\n\n${content}`;

    // Save to appropriate directory
    await filing.write(filePath, markdownContent);
    logger.info(`Saved post content: ${filePath}`);

    return filePath;
  } catch (error) {
    logger.error('Error saving post content:', error);
    throw error;
  }
}

/**
 * Read post content from markdown file
 */
async function readPostContent({ filing, logger }, postData) {
  try {
    const { slug, status = 'published' } = postData;

    if (!slug) {
      throw new Error('Post slug is required');
    }

    // Try different directories based on status
    const directories = [
      getPostDirectory(status),
      'published',
      'drafts',
      'archived'
    ];

    let content = null;
    let filePath = null;

    for (const directory of directories) {
      try {
        const filename = `${slug}.md`;
        const testPath = path.join(directory, filename);
        content = await filing.read(testPath);
        filePath = testPath;
        break;
      } catch (error) {
        // Continue to next directory
        continue;
      }
    }

    if (!content) {
      logger.warn(`Post content not found for slug: ${slug}`);
      return null;
    }

    // Parse frontmatter and content
    const { frontmatter, body } = parseFrontmatter(content);

    logger.info(`Read post content: ${filePath}`);
    return {
      filePath,
      frontmatter,
      content: body
    };
  } catch (error) {
    logger.error('Error reading post content:', error);
    throw error;
  }
}

/**
 * Update post content and move between directories if needed
 */
async function updatePostContent({ filing, logger }, postData, oldStatus) {
  try {
    const { slug, status } = postData;

    if (!slug) {
      throw new Error('Post slug is required');
    }

    // Save new content
    const newFilePath = await savePostContent({ filing, logger }, postData);

    // If status changed, remove old file
    if (oldStatus && oldStatus !== status) {
      try {
        const oldDirectory = getPostDirectory(oldStatus);
        const oldFilePath = path.join(oldDirectory, `${slug}.md`);
        await filing.delete(oldFilePath);
        logger.info(`Removed old post file: ${oldFilePath}`);
      } catch (error) {
        logger.warn(`Could not remove old post file:`, error.message);
      }
    }

    return newFilePath;
  } catch (error) {
    logger.error('Error updating post content:', error);
    throw error;
  }
}

/**
 * Delete post content file
 */
async function deletePostContent({ filing, logger }, postData) {
  try {
    const { slug, status } = postData;

    if (!slug) {
      throw new Error('Post slug is required');
    }

    // Try to find and delete the file
    const directories = [
      getPostDirectory(status || 'published'),
      'published',
      'drafts',
      'archived'
    ];

    let deleted = false;

    for (const directory of directories) {
      try {
        const filename = `${slug}.md`;
        const filePath = path.join(directory, filename);
        await filing.delete(filePath);
        logger.info(`Deleted post file: ${filePath}`);
        deleted = true;
        break;
      } catch (error) {
        // Continue to next directory
        continue;
      }
    }

    if (!deleted) {
      logger.warn(`Post file not found for deletion: ${slug}`);
    }

    return deleted;
  } catch (error) {
    logger.error('Error deleting post content:', error);
    throw error;
  }
}

/**
 * List all post files in a directory
 */
async function listPostFiles({ filing, logger }, status = 'published') {
  try {
    const directory = getPostDirectory(status);
    const files = await filing.list(directory);

    // Filter for markdown files
    const markdownFiles = files.filter(file => file.endsWith('.md'));

    logger.info(`Found ${markdownFiles.length} post files in ${directory}`);
    return markdownFiles.map(file => ({
      filename: file,
      slug: path.basename(file, '.md'),
      directory,
      fullPath: path.join(directory, file)
    }));
  } catch (error) {
    logger.error('Error listing post files:', error);
    return [];
  }
}

/**
 * Get directory for post based on status
 */
function getPostDirectory(status) {
  switch (status) {
    case 'draft':
      return 'drafts';
    case 'published':
      return 'published';
    case 'archived':
      return 'archived';
    default:
      return 'drafts';
  }
}

/**
 * Create frontmatter for markdown file
 */
function createFrontmatter(postData) {
  const {
    title,
    excerpt,
    authorId,
    categoryId,
    tags = [],
    status,
    visibility,
    featuredImage,
    seoTitle,
    seoDescription,
    seoKeywords = [],
    publishedAt,
    createdAt,
    updatedAt,
    isFeatured,
    isSticky,
    allowComments,
    readingTime
  } = postData;

  const frontmatter = `---
title: "${title || ''}"
excerpt: "${excerpt || ''}"
authorId: ${authorId || 1}
categoryId: ${categoryId || 1}
tags: [${tags.map(tag => `"${tag}"`).join(', ')}]
status: "${status || 'draft'}"
visibility: "${visibility || 'public'}"
featuredImage: "${featuredImage || ''}"
seoTitle: "${seoTitle || title || ''}"
seoDescription: "${seoDescription || excerpt || ''}"
seoKeywords: [${seoKeywords.map(keyword => `"${keyword}"`).join(', ')}]
publishedAt: "${publishedAt || ''}"
createdAt: "${createdAt || new Date().toISOString()}"
updatedAt: "${updatedAt || new Date().toISOString()}"
isFeatured: ${isFeatured || false}
isSticky: ${isSticky || false}
allowComments: ${allowComments !== false}
readingTime: ${readingTime || 1}
---`;

  return frontmatter;
}

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n(.*?)\n---\s*\n/s;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {
      frontmatter: {},
      body: content
    };
  }

  const frontmatterText = match[1];
  const body = content.substring(match[0].length);

  // Parse YAML-like frontmatter
  const frontmatter = {};
  const lines = frontmatterText.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmedLine.substring(0, colonIndex).trim();
    let value = trimmedLine.substring(colonIndex + 1).trim();

    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Parse arrays
    if (value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1).trim();
      if (arrayContent) {
        frontmatter[key] = arrayContent
          .split(',')
          .map(item => item.trim().replace(/^["']|["']$/g, ''));
      } else {
        frontmatter[key] = [];
      }
    }
    // Parse booleans
    else if (value === 'true' || value === 'false') {
      frontmatter[key] = value === 'true';
    }
    // Parse numbers
    else if (!isNaN(value) && value !== '') {
      frontmatter[key] = parseInt(value) || parseFloat(value);
    }
    // String values
    else {
      frontmatter[key] = value;
    }
  }

  return {
    frontmatter,
    body: body.trim()
  };
}

module.exports = {
  initializePostFiles,
  savePostContent,
  readPostContent,
  updatePostContent,
  deletePostContent,
  listPostFiles,
  parseFrontmatter
};