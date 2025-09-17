/**
 * @fileoverview Blog Task Processor
 * Handles background processing of blog-related tasks including
 * content processing, analytics updates, notifications, and maintenance.
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-09-16
 */

'use strict';

const { savePostContent, updatePostContent, deletePostContent, readPostContent } = require('./postContent');

/**
 * Process blog-related background tasks
 */
async function processTask(services, task) {
  const { dataManager, filing, cache, logger, search, notifying, measuring } = services;

  try {
    switch (task.type) {
      case 'createPostFile':
        await handleCreatePostFile(services, task);
        break;

      case 'updatePostFile':
        await handleUpdatePostFile(services, task);
        break;

      case 'deletePostFile':
        await handleDeletePostFile(services, task);
        break;

      case 'indexPostForSearch':
        await handleIndexPostForSearch(services, task);
        break;

      case 'removePostFromSearch':
        await handleRemovePostFromSearch(services, task);
        break;

      case 'updatePostMetadata':
        await handleUpdatePostMetadata(services, task);
        break;

      case 'updateAnalytics':
        await handleUpdateAnalytics(services, task);
        break;

      case 'processCommentModeration':
        await handleProcessCommentModeration(services, task);
        break;

      case 'sendNotification':
        await handleSendNotification(services, task);
        break;

      case 'generateSitemap':
        await handleGenerateSitemap(services, task);
        break;

      case 'schedulePost':
        await handleSchedulePost(services, task);
        break;

      case 'optimizeImages':
        await handleOptimizeImages(services, task);
        break;

      case 'updateSearchIndex':
        await handleUpdateSearchIndex(services, task);
        break;

      case 'cleanupCache':
        await handleCleanupCache(services, task);
        break;

      case 'backupData':
        await handleBackupData(services, task);
        break;

      default:
        logger.warn(`Unknown task type: ${task.type}`);
    }
  } catch (error) {
    logger.error(`Error processing task ${task.type}:`, error);
    throw error;
  }
}

/**
 * Handle creating post file
 */
async function handleCreatePostFile(services, task) {
  const { dataManager, logger } = services;
  const { postId, content } = task;

  try {
    const post = await dataManager.findById('posts', postId);
    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    const postData = { ...post, content };
    await savePostContent(services, postData);
    logger.info(`Created post file for: ${post.slug}`);
  } catch (error) {
    logger.error('Error creating post file:', error);
    throw error;
  }
}

/**
 * Handle updating post file
 */
async function handleUpdatePostFile(services, task) {
  const { dataManager, logger } = services;
  const { postId, content, oldStatus } = task;

  try {
    const post = await dataManager.findById('posts', postId);
    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    const postData = { ...post, content };
    await updatePostContent(services, postData, oldStatus);
    logger.info(`Updated post file for: ${post.slug}`);
  } catch (error) {
    logger.error('Error updating post file:', error);
    throw error;
  }
}

/**
 * Handle deleting post file
 */
async function handleDeletePostFile(services, task) {
  const { dataManager, logger } = services;
  const { postId } = task;

  try {
    const post = await dataManager.findById('posts', postId);
    if (!post) {
      logger.warn(`Post not found for deletion: ${postId}`);
      return;
    }

    await deletePostContent(services, post);
    logger.info(`Deleted post file for: ${post.slug}`);
  } catch (error) {
    logger.error('Error deleting post file:', error);
    throw error;
  }
}

/**
 * Handle indexing post for search
 */
async function handleIndexPostForSearch(services, task) {
  const { dataManager, search, logger } = services;
  const { postId } = task;

  try {
    const post = await dataManager.findById('posts', postId);
    if (!post || post.status !== 'published') {
      return;
    }

    // Get post content
    const postContent = await readPostContent(services, post);
    const content = postContent ? postContent.content : post.excerpt || '';

    // Get related data
    const [categories, authors] = await Promise.all([
      dataManager.read('categories'),
      dataManager.read('authors')
    ]);

    const category = categories.find(c => c.id === post.categoryId);
    const author = authors.find(a => a.id === post.authorId);

    // Index the post
    search.add(post.id.toString(), {
      id: post.id,
      title: post.title,
      content: content.substring(0, 1000), // Limit content length for search
      excerpt: post.excerpt,
      tags: post.tags || [],
      categoryName: category ? category.name : '',
      authorName: author ? author.displayName : '',
      publishedAt: post.publishedAt,
      slug: post.slug
    });

    logger.info(`Indexed post for search: ${post.title}`);
  } catch (error) {
    logger.error('Error indexing post for search:', error);
    throw error;
  }
}

/**
 * Handle removing post from search index
 */
async function handleRemovePostFromSearch(services, task) {
  const { search, logger } = services;
  const { postId } = task;

  try {
    search.remove(postId.toString());
    logger.info(`Removed post from search index: ${postId}`);
  } catch (error) {
    logger.error('Error removing post from search:', error);
    throw error;
  }
}

/**
 * Handle updating post metadata
 */
async function handleUpdatePostMetadata(services, task) {
  const { dataManager, logger } = services;
  const { postId, updates } = task;

  try {
    const success = await dataManager.update('posts', postId, updates);
    if (success) {
      logger.info(`Updated post metadata: ${postId}`, updates);
    } else {
      logger.warn(`Post not found for metadata update: ${postId}`);
    }
  } catch (error) {
    logger.error('Error updating post metadata:', error);
    throw error;
  }
}

/**
 * Handle analytics updates
 */
async function handleUpdateAnalytics(services, task) {
  const { dataManager, logger, measuring } = services;
  const { event, data } = task;

  try {
    let analytics = await dataManager.read('analytics');
    if (!analytics || typeof analytics !== 'object') {
      analytics = {
        totalViews: 0,
        totalPosts: 0,
        totalComments: 0,
        monthlyViews: {},
        popularPosts: [],
        lastUpdated: new Date().toISOString()
      };
    }

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    switch (event) {
      case 'post_view':
        analytics.totalViews = (analytics.totalViews || 0) + 1;
        analytics.monthlyViews[monthKey] = (analytics.monthlyViews[monthKey] || 0) + 1;

        // Update measuring service if available
        if (measuring) {
          measuring.increment('blog.post.views', 1, {
            postId: data.postId,
            postSlug: data.postSlug
          });
        }
        break;

      case 'post_like':
        if (measuring) {
          measuring.increment('blog.post.likes', 1, {
            postId: data.postId
          });
        }
        break;

      case 'comment_added':
        analytics.totalComments = (analytics.totalComments || 0) + 1;
        if (measuring) {
          measuring.increment('blog.comments.total', 1);
        }
        break;

      case 'user_signup':
        if (measuring) {
          measuring.increment('blog.users.signups', 1);
        }
        break;
    }

    analytics.lastUpdated = new Date().toISOString();
    await dataManager.write('analytics', analytics);

    logger.info(`Updated analytics for event: ${event}`);
  } catch (error) {
    logger.error('Error updating analytics:', error);
    throw error;
  }
}

/**
 * Handle comment moderation
 */
async function handleProcessCommentModeration(services, task) {
  const { dataManager, logger } = services;
  const { commentId } = task;

  try {
    const comment = await dataManager.findById('comments', commentId);
    if (!comment) {
      logger.warn(`Comment not found for moderation: ${commentId}`);
      return;
    }

    // Simple auto-moderation rules
    let status = 'approved';
    const content = comment.content.toLowerCase();

    // Basic spam detection
    const spamKeywords = ['spam', 'viagra', 'casino', 'lottery', 'winner'];
    const hasSpam = spamKeywords.some(keyword => content.includes(keyword));

    if (hasSpam) {
      status = 'spam';
    }

    // Update comment status
    await dataManager.update('comments', commentId, {
      status,
      moderatedAt: new Date().toISOString()
    });

    logger.info(`Processed comment moderation: ${commentId} -> ${status}`);
  } catch (error) {
    logger.error('Error processing comment moderation:', error);
    throw error;
  }
}

/**
 * Handle sending notifications
 */
async function handleSendNotification(services, task) {
  const { logger, notifying } = services;
  const { type, recipient, data } = task;

  try {
    if (!notifying) {
      logger.warn('Notification service not available');
      return;
    }

    let message = '';
    let subject = '';

    switch (type) {
      case 'new_comment':
        subject = `New comment on "${data.postTitle}"`;
        message = `${data.commenterName} commented on your post: "${data.postTitle}"`;
        break;

      case 'comment_approved':
        subject = 'Your comment has been approved';
        message = `Your comment on "${data.postTitle}" has been approved and is now visible.`;
        break;

      case 'new_post_published':
        subject = `New post published: "${data.postTitle}"`;
        message = `A new post "${data.postTitle}" has been published on the blog.`;
        break;

      case 'welcome_subscriber':
        subject = 'Welcome to our blog!';
        message = `Welcome ${data.name}! Thank you for subscribing to our blog.`;
        break;

      default:
        logger.warn(`Unknown notification type: ${type}`);
        return;
    }

    await notifying.send({
      to: recipient,
      subject,
      message,
      type: 'email'
    });

    logger.info(`Sent notification: ${type} to ${recipient}`);
  } catch (error) {
    logger.error('Error sending notification:', error);
    throw error;
  }
}

/**
 * Handle sitemap generation
 */
async function handleGenerateSitemap(services, task) {
  const { dataManager, filing, logger } = services;

  try {
    const [posts, settings] = await Promise.all([
      dataManager.getPublishedPosts(1000),
      dataManager.read('settings')
    ]);

    const siteUrl = settings.siteUrl || 'http://localhost:3002';

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/applications/blog</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    posts.forEach(post => {
      sitemap += `
  <url>
    <loc>${siteUrl}/applications/blog/posts/${post.slug}</loc>
    <lastmod>${new Date(post.updatedAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    sitemap += '\n</urlset>';

    await filing.write('sitemap.xml', sitemap);
    logger.info('Generated sitemap.xml');
  } catch (error) {
    logger.error('Error generating sitemap:', error);
    throw error;
  }
}

/**
 * Handle scheduled post publishing
 */
async function handleSchedulePost(services, task) {
  const { dataManager, logger } = services;
  const { postId, publishAt } = task;

  try {
    const publishTime = new Date(publishAt);
    const now = new Date();

    if (now >= publishTime) {
      // Time to publish
      await dataManager.update('posts', postId, {
        status: 'published',
        publishedAt: now.toISOString(),
        updatedAt: now.toISOString()
      });

      // Move file to published directory
      const post = await dataManager.findById('posts', postId);
      if (post) {
        await updatePostContent(services, { ...post, status: 'published' }, 'scheduled');
      }

      logger.info(`Published scheduled post: ${postId}`);
    } else {
      // Re-queue for later
      services.queue.enqueue({
        type: 'schedulePost',
        postId,
        publishAt
      });
    }
  } catch (error) {
    logger.error('Error handling scheduled post:', error);
    throw error;
  }
}

/**
 * Handle image optimization
 */
async function handleOptimizeImages(services, task) {
  const { logger } = services;
  const { imagePath } = task;

  try {
    // Placeholder for image optimization logic
    // This would integrate with image processing libraries
    logger.info(`Image optimization placeholder for: ${imagePath}`);
  } catch (error) {
    logger.error('Error optimizing images:', error);
    throw error;
  }
}

/**
 * Handle search index updates
 */
async function handleUpdateSearchIndex(services, task) {
  const { dataManager, search, logger } = services;

  try {
    // Clear existing index
    search.clear();

    // Re-index all published posts
    const posts = await dataManager.getPublishedPosts(1000);
    const [categories, authors] = await Promise.all([
      dataManager.read('categories'),
      dataManager.read('authors')
    ]);

    for (const post of posts) {
      const category = categories.find(c => c.id === post.categoryId);
      const author = authors.find(a => a.id === post.authorId);

      search.add(post.id.toString(), {
        id: post.id,
        title: post.title,
        content: post.excerpt || '',
        tags: post.tags || [],
        categoryName: category ? category.name : '',
        authorName: author ? author.displayName : '',
        publishedAt: post.publishedAt,
        slug: post.slug
      });
    }

    logger.info(`Updated search index with ${posts.length} posts`);
  } catch (error) {
    logger.error('Error updating search index:', error);
    throw error;
  }
}

/**
 * Handle cache cleanup
 */
async function handleCleanupCache(services, task) {
  const { cache, logger } = services;

  try {
    // Clear blog-related cache entries
    const cacheKeys = ['blog:posts:', 'blog:categories:', 'blog:analytics:'];

    for (const keyPrefix of cacheKeys) {
      // This is a simplified approach - actual implementation depends on cache service capabilities
      await cache.delete(keyPrefix);
    }

    logger.info('Cleaned up blog cache entries');
  } catch (error) {
    logger.error('Error cleaning up cache:', error);
    throw error;
  }
}

/**
 * Handle data backup
 */
async function handleBackupData(services, task) {
  const { dataManager, filing, logger } = services;

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `backups/blog-${timestamp}`;

    // Read all data
    const [posts, categories, authors, comments, analytics, settings] = await Promise.all([
      dataManager.read('posts'),
      dataManager.read('categories'),
      dataManager.read('authors'),
      dataManager.read('comments'),
      dataManager.read('analytics'),
      dataManager.read('settings')
    ]);

    // Create backup data
    const backupData = {
      posts,
      categories,
      authors,
      comments,
      analytics,
      settings,
      timestamp: new Date().toISOString()
    };

    await filing.write(`${backupDir}/backup.json`, JSON.stringify(backupData, null, 2));
    logger.info(`Created blog data backup: ${backupDir}`);
  } catch (error) {
    logger.error('Error creating data backup:', error);
    throw error;
  }
}

module.exports = {
  processTask
};