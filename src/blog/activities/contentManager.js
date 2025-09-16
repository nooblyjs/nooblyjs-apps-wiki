/**
 * @fileoverview Blog content management utilities
 * Handles blog file operations, content initialization, and file processing
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-09-16
 */

'use strict';

const path = require('path');

/**
 * Initialize blog content files structure
 * @param {Object} options - Initialization options
 * @param {Object} options.filing - Filing service instance
 * @param {Object} options.logger - Logger service instance
 */
async function initializeBlogFiles({ filing, logger }) {
  try {
    logger.info('Initializing blog files structure...');

    // Create basic directory structure for blog files
    const directories = [
      'posts',
      'images',
      'uploads',
      'themes',
      'templates',
      'assets/css',
      'assets/js',
      'assets/images'
    ];

    for (const dir of directories) {
      try {
        const dirPath = path.join('blog', dir);
        await filing.ensureDirectory(dirPath);
        logger.info(`Created blog directory: ${dirPath}`);
      } catch (error) {
        logger.warn(`Could not create directory ${dir}:`, error.message);
      }
    }

    // Create default post content file
    try {
      const defaultPostPath = 'posts/1.md';
      const defaultPostContent = `# Welcome to Your New Blog Platform

Congratulations on setting up your new blog platform! This system is built on the powerful NooblyJS framework and offers a comprehensive set of features for content creation and community engagement.

## Features

- Rich text editor with markdown support
- SEO optimization tools
- Comment system
- Social sharing
- Analytics integration
- Content scheduling
- Multi-author support

## Getting Started

1. Create your first post
2. Set up categories and tags
3. Customize your blog settings
4. Invite other authors
5. Engage with your community

Enjoy blogging!`;

      await filing.create(defaultPostPath, defaultPostContent);
      logger.info('Created default blog post file');
    } catch (error) {
      logger.warn('Could not create default post file:', error.message);
    }

    // Create basic CSS theme
    try {
      const cssPath = 'assets/css/blog-theme.css';
      const cssContent = `/* Blog Theme CSS */
:root {
  --primary-color: #3B82F6;
  --secondary-color: #10B981;
  --accent-color: #F59E0B;
  --text-color: #1F2937;
  --bg-color: #FFFFFF;
  --border-color: #E5E7EB;
}

.blog-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.blog-header {
  background: var(--primary-color);
  color: white;
  padding: 2rem 0;
  text-align: center;
  margin-bottom: 2rem;
}

.blog-post {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.blog-post h1, .blog-post h2, .blog-post h3 {
  color: var(--text-color);
  margin-bottom: 1rem;
}

.blog-meta {
  color: #6B7280;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.blog-tags {
  margin-top: 1rem;
}

.blog-tag {
  background: var(--secondary-color);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  margin-right: 0.5rem;
}

.blog-sidebar {
  background: #F9FAFB;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.blog-comments {
  border-top: 1px solid var(--border-color);
  margin-top: 2rem;
  padding-top: 2rem;
}

@media (max-width: 768px) {
  .blog-container {
    padding: 10px;
  }

  .blog-post {
    padding: 1rem;
  }
}`;

      await filing.create(cssPath, cssContent);
      logger.info('Created default blog CSS theme');
    } catch (error) {
      logger.warn('Could not create CSS theme:', error.message);
    }

    // Create basic JavaScript for blog functionality
    try {
      const jsPath = 'assets/js/blog.js';
      const jsContent = `// Blog Platform JavaScript
(function() {
  'use strict';

  // Initialize blog functionality
  document.addEventListener('DOMContentLoaded', function() {
    initializeBlog();
  });

  function initializeBlog() {
    // Social sharing functionality
    initializeSocialSharing();

    // Comment form handling
    initializeCommentForm();

    // Search functionality
    initializeSearch();

    // Reading time calculation
    calculateReadingTime();

    console.log('Blog platform initialized');
  }

  function initializeSocialSharing() {
    const shareButtons = document.querySelectorAll('.share-button');
    shareButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        const platform = this.dataset.platform;
        const url = encodeURIComponent(window.location.href);
        const title = encodeURIComponent(document.title);

        let shareUrl = '';
        switch(platform) {
          case 'twitter':
            shareUrl = \`https://twitter.com/intent/tweet?url=\${url}&text=\${title}\`;
            break;
          case 'facebook':
            shareUrl = \`https://www.facebook.com/sharer/sharer.php?u=\${url}\`;
            break;
          case 'linkedin':
            shareUrl = \`https://www.linkedin.com/sharing/share-offsite/?url=\${url}\`;
            break;
        }

        if (shareUrl) {
          window.open(shareUrl, '_blank', 'width=600,height=400');
        }
      });
    });
  }

  function initializeCommentForm() {
    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
      commentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        // Comment submission logic would go here
        console.log('Comment form submitted');
      });
    }
  }

  function initializeSearch() {
    const searchInput = document.getElementById('blog-search');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          performSearch(this.value);
        }, 300);
      });
    }
  }

  function performSearch(query) {
    if (query.length < 2) return;

    // Search logic would go here
    console.log('Searching for:', query);
  }

  function calculateReadingTime() {
    const posts = document.querySelectorAll('.blog-post-content');
    posts.forEach(post => {
      const text = post.textContent || post.innerText;
      const wordsPerMinute = 200;
      const wordCount = text.trim().split(/\\s+/).length;
      const readingTime = Math.ceil(wordCount / wordsPerMinute);

      const readingTimeElement = post.parentElement.querySelector('.reading-time');
      if (readingTimeElement) {
        readingTimeElement.textContent = \`\${readingTime} min read\`;
      }
    });
  }

  // Export functions for external use
  window.BlogPlatform = {
    initializeBlog: initializeBlog,
    calculateReadingTime: calculateReadingTime
  };
})();`;

      await filing.create(jsPath, jsContent);
      logger.info('Created blog JavaScript file');
    } catch (error) {
      logger.warn('Could not create JavaScript file:', error.message);
    }

    // Create blog template files
    try {
      const templatePath = 'templates/post-template.md';
      const templateContent = `# {{title}}

*Published on {{date}} by {{author}}*

{{content}}

---

**Tags:** {{tags}}

**Category:** {{category}}`;

      await filing.create(templatePath, templateContent);
      logger.info('Created blog post template');
    } catch (error) {
      logger.warn('Could not create blog template:', error.message);
    }

    logger.info('Blog files structure initialized successfully');
  } catch (error) {
    logger.error('Error initializing blog files:', error);
    throw error;
  }
}

/**
 * Create a new blog post file
 * @param {Object} options - Post creation options
 * @param {Object} options.filing - Filing service instance
 * @param {Object} options.logger - Logger service instance
 * @param {number} options.postId - Post ID
 * @param {string} options.content - Post content
 */
async function createPostFile({ filing, logger, postId, content }) {
  try {
    const filePath = `posts/${postId}.md`;
    await filing.create(filePath, content);
    logger.info(`Created blog post file: ${filePath}`);
    return filePath;
  } catch (error) {
    logger.error(`Error creating post file for ID ${postId}:`, error);
    throw error;
  }
}

/**
 * Update an existing blog post file
 * @param {Object} options - Post update options
 * @param {Object} options.filing - Filing service instance
 * @param {Object} options.logger - Logger service instance
 * @param {number} options.postId - Post ID
 * @param {string} options.content - Updated post content
 */
async function updatePostFile({ filing, logger, postId, content }) {
  try {
    const filePath = `posts/${postId}.md`;
    await filing.create(filePath, content); // create overwrites if exists
    logger.info(`Updated blog post file: ${filePath}`);
    return filePath;
  } catch (error) {
    logger.error(`Error updating post file for ID ${postId}:`, error);
    throw error;
  }
}

/**
 * Delete a blog post file
 * @param {Object} options - Post deletion options
 * @param {Object} options.filing - Filing service instance
 * @param {Object} options.logger - Logger service instance
 * @param {number} options.postId - Post ID
 */
async function deletePostFile({ filing, logger, postId }) {
  try {
    const filePath = `posts/${postId}.md`;
    await filing.remove(filePath);
    logger.info(`Deleted blog post file: ${filePath}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting post file for ID ${postId}:`, error);
    throw error;
  }
}

/**
 * Read a blog post file
 * @param {Object} options - Post read options
 * @param {Object} options.filing - Filing service instance
 * @param {Object} options.logger - Logger service instance
 * @param {number} options.postId - Post ID
 */
async function readPostFile({ filing, logger, postId }) {
  try {
    const filePath = `posts/${postId}.md`;
    const content = await filing.read(filePath);
    return Buffer.isBuffer(content) ? content.toString('utf8') : content;
  } catch (error) {
    logger.warn(`Could not read post file for ID ${postId}:`, error.message);
    return null;
  }
}

module.exports = {
  initializeBlogFiles,
  createPostFile,
  updatePostFile,
  deletePostFile,
  readPostFile
};