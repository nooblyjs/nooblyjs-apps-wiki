/**
 * @fileoverview Blog task processor for background operations
 * Handles various blog-related background tasks like content processing,
 * analytics updates, notifications, and maintenance operations
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-09-16
 */

'use strict';

const { createPostFile, updatePostFile, deletePostFile } = require('./contentManager');

/**
 * Process a blog-related background task
 * @param {Object} services - NooblyJS services
 * @param {Object} task - Task object to process
 */
async function processTask(services, task) {
  const { dataManager, filing, cache, logger, queue, search, scheduling, measuring, notifying, worker, workflow } = services;

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

      case 'updatePostMetadata':
        await handleUpdatePostMetadata(services, task);
        break;

      case 'updateBlogStats':
        await handleUpdateBlogStats(services, task);
        break;

      case 'indexPostForSearch':
        await handleIndexPostForSearch(services, task);
        break;

      case 'removePostFromSearch':
        await handleRemovePostFromSearch(services, task);
        break;

      case 'sendNotification':
        await handleSendNotification(services, task);
        break;

      case 'processCommentModeration':
        await handleProcessCommentModeration(services, task);
        break;

      case 'generateSitemap':
        await handleGenerateSitemap(services, task);
        break;

      case 'backupBlogData':
        await handleBackupBlogData(services, task);
        break;

      case 'optimizeImages':
        await handleOptimizeImages(services, task);
        break;

      case 'updateAnalytics':
        await handleUpdateAnalytics(services, task);
        break;

      case 'schedulePost':
        await handleSchedulePost(services, task);
        break;

      case 'sendNewsletterUpdate':
        await handleSendNewsletterUpdate(services, task);
        break;

      default:
        logger.warn(`Unknown blog task type: ${task.type}`);
    }
  } catch (error) {
    logger.error(`Error processing blog task ${task.type}:`, error);
    throw error;
  }
}

/**
 * Handle creating a new post file
 */
async function handleCreatePostFile(services, task) {
  const { filing, logger } = services;
  const { postId, content } = task;

  await createPostFile({ filing, logger, postId, content });
}

/**
 * Handle updating an existing post file
 */
async function handleUpdatePostFile(services, task) {
  const { filing, logger } = services;
  const { postId, content } = task;

  await updatePostFile({ filing, logger, postId, content });
}

/**
 * Handle deleting a post file
 */
async function handleDeletePostFile(services, task) {
  const { filing, logger } = services;
  const { postId } = task;

  await deletePostFile({ filing, logger, postId });
}

/**
 * Handle updating post metadata
 */
async function handleUpdatePostMetadata(services, task) {
  const { dataManager, cache, logger } = services;
  const { postId, updates } = task;

  try {
    await dataManager.update('posts', postId, updates);

    // Clear relevant caches
    await cache.delete(`blog:post:${postId}`);
    await cache.delete('blog:posts:recent');
    await cache.delete('blog:posts:popular');
    await cache.delete('blog:posts:featured');

    logger.info(`Updated metadata for post ${postId}`);
  } catch (error) {
    logger.error(`Error updating post metadata for ${postId}:`, error);
  }
}

/**
 * Handle updating blog statistics
 */
async function handleUpdateBlogStats(services, task) {
  const { dataManager, cache, logger } = services;

  try {
    const stats = await dataManager.getBlogStats();
    await dataManager.write('analytics', stats);

    // Clear analytics cache
    await cache.delete('blog:analytics');

    logger.info('Updated blog statistics');
  } catch (error) {
    logger.error('Error updating blog statistics:', error);
  }
}

/**
 * Handle indexing a post for search
 */
async function handleIndexPostForSearch(services, task) {
  const { dataManager, search, logger } = services;
  const { postId } = task;

  try {
    const post = await dataManager.findById('posts', postId);
    if (post && post.status === 'published' && post.visibility === 'public') {
      const categories = await dataManager.read('categories');
      const authors = await dataManager.read('authors');

      const category = categories.find(c => c.id === post.categoryId);
      const author = authors.find(a => a.id === post.authorId);

      search.add(post.id.toString(), {
        id: post.id,
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        tags: post.tags || [],
        categoryName: category ? category.name : 'Uncategorized',
        authorName: author ? author.displayName : 'Unknown',
        publishedAt: post.publishedAt,
        slug: post.slug
      });

      logger.info(`Indexed post ${postId} for search`);
    }
  } catch (error) {
    logger.error(`Error indexing post ${postId} for search:`, error);
  }
}

/**
 * Handle removing a post from search index
 */
async function handleRemovePostFromSearch(services, task) {
  const { search, logger } = services;
  const { postId } = task;

  try {
    search.remove(postId.toString());
    logger.info(`Removed post ${postId} from search index`);
  } catch (error) {
    logger.error(`Error removing post ${postId} from search:`, error);
  }
}

/**
 * Handle sending notifications
 */
async function handleSendNotification(services, task) {
  const { notifying, logger } = services;
  const { type, recipient, data } = task;

  try {
    switch (type) {
      case 'new_post':
        await notifying.send('email', {
          to: recipient,
          subject: `New Post: ${data.title}`,
          template: 'new_post',
          data: data
        });
        break;

      case 'new_comment':
        await notifying.send('email', {
          to: recipient,
          subject: `New Comment on: ${data.postTitle}`,
          template: 'new_comment',
          data: data
        });
        break;

      case 'comment_approved':
        await notifying.send('email', {
          to: recipient,
          subject: 'Your comment has been approved',
          template: 'comment_approved',
          data: data
        });
        break;

      default:
        logger.warn(`Unknown notification type: ${type}`);
    }

    logger.info(`Sent ${type} notification to ${recipient}`);
  } catch (error) {
    logger.error(`Error sending notification:`, error);
  }
}

/**
 * Handle comment moderation processing
 */
async function handleProcessCommentModeration(services, task) {
  const { dataManager, queue, logger } = services;
  const { commentId } = task;

  try {
    const comment = await dataManager.findById('comments', commentId);
    if (comment) {
      // Simple auto-moderation based on content
      let status = 'pending';
      const content = comment.content.toLowerCase();

      // Check for spam indicators
      const spamWords = ['spam', 'buy now', 'click here', 'free money', 'get rich'];
      const hasSpam = spamWords.some(word => content.includes(word));

      if (hasSpam) {
        status = 'spam';
      } else if (comment.authorEmail && comment.authorEmail.includes('@')) {
        // Simple validation - has valid email
        status = 'approved';
      }

      await dataManager.update('comments', commentId, {
        status,
        moderatedAt: new Date().toISOString()
      });

      // Update post comment count if approved
      if (status === 'approved') {
        await dataManager.updatePostCommentCount(comment.postId);

        // Send approval notification
        queue.enqueue({
          type: 'sendNotification',
          type: 'comment_approved',
          recipient: comment.authorEmail,
          data: {
            commentContent: comment.content,
            postTitle: comment.postTitle
          }
        });
      }

      logger.info(`Processed comment moderation for ${commentId}: ${status}`);
    }
  } catch (error) {
    logger.error(`Error processing comment moderation:`, error);
  }
}

/**
 * Handle generating sitemap
 */
async function handleGenerateSitemap(services, task) {
  const { dataManager, filing, logger } = services;

  try {
    const posts = await dataManager.getPublishedPosts();
    const categories = await dataManager.read('categories');
    const settings = await dataManager.read('settings');

    const baseUrl = settings.siteUrl || 'http://localhost:3002';

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/applications/blog</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    // Add posts to sitemap
    posts.forEach(post => {
      sitemap += `
  <url>
    <loc>${baseUrl}/applications/blog/posts/${post.slug}</loc>
    <lastmod>${post.updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    // Add categories to sitemap
    categories.forEach(category => {
      sitemap += `
  <url>
    <loc>${baseUrl}/applications/blog/categories/${category.slug}</loc>
    <lastmod>${category.updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    });

    sitemap += '\n</urlset>';

    await filing.create('sitemap.xml', sitemap);
    logger.info('Generated blog sitemap');
  } catch (error) {
    logger.error('Error generating sitemap:', error);
  }
}

/**
 * Handle backing up blog data
 */
async function handleBackupBlogData(services, task) {
  const { dataManager, filing, logger } = services;

  try {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupDir = `backups/${timestamp}`;

    const dataTypes = ['posts', 'categories', 'authors', 'comments', 'subscribers', 'analytics', 'settings'];

    for (const type of dataTypes) {
      const data = await dataManager.read(type);
      await filing.create(`${backupDir}/${type}.json`, JSON.stringify(data, null, 2));
    }

    logger.info(`Created blog data backup at ${backupDir}`);
  } catch (error) {
    logger.error('Error backing up blog data:', error);
  }
}

/**
 * Handle image optimization
 */
async function handleOptimizeImages(services, task) {
  const { filing, logger } = services;
  const { imagePath } = task;

  try {
    // Placeholder for image optimization logic
    // In a real implementation, you might use sharp, imagemin, or similar libraries
    logger.info(`Image optimization placeholder for: ${imagePath}`);
  } catch (error) {
    logger.error('Error optimizing images:', error);
  }
}

/**
 * Handle analytics updates
 */
async function handleUpdateAnalytics(services, task) {
  const { dataManager, measuring, logger } = services;
  const { event, data } = task;

  try {
    // Record analytics event
    await measuring.record(event, data);

    // Update blog statistics
    if (event === 'post_view' || event === 'post_like' || event === 'post_share') {
      const stats = await dataManager.getBlogStats();
      await dataManager.write('analytics', stats);
    }

    logger.info(`Recorded analytics event: ${event}`);
  } catch (error) {
    logger.error('Error updating analytics:', error);
  }
}

/**
 * Handle scheduled post publishing
 */
async function handleSchedulePost(services, task) {
  const { dataManager, queue, logger } = services;
  const { postId, publishAt } = task;

  try {
    const publishTime = new Date(publishAt);
    const now = new Date();

    if (publishTime <= now) {
      // Time to publish
      await dataManager.update('posts', postId, {
        status: 'published',
        publishedAt: now.toISOString(),
        updatedAt: now.toISOString()
      });

      // Index for search
      queue.enqueue({
        type: 'indexPostForSearch',
        postId: postId
      });

      // Send notifications to subscribers
      queue.enqueue({
        type: 'sendNewsletterUpdate',
        postId: postId
      });

      logger.info(`Published scheduled post ${postId}`);
    } else {
      // Reschedule for later
      const delay = publishTime - now;
      setTimeout(() => {
        queue.enqueue({
          type: 'schedulePost',
          postId: postId,
          publishAt: publishAt
        });
      }, delay);

      logger.info(`Rescheduled post ${postId} for ${publishAt}`);
    }
  } catch (error) {
    logger.error(`Error scheduling post ${postId}:`, error);
  }
}

/**
 * Handle sending newsletter updates
 */
async function handleSendNewsletterUpdate(services, task) {
  const { dataManager, notifying, logger } = services;
  const { postId } = task;

  try {
    const post = await dataManager.findById('posts', postId);
    const subscribers = await dataManager.read('subscribers');

    if (post && subscribers.length > 0) {
      const activeSubscribers = subscribers.filter(sub => sub.status === 'active');

      for (const subscriber of activeSubscribers) {
        await notifying.send('email', {
          to: subscriber.email,
          subject: `New Post: ${post.title}`,
          template: 'newsletter',
          data: {
            subscriberName: subscriber.name || 'Reader',
            postTitle: post.title,
            postExcerpt: post.excerpt,
            postUrl: `/applications/blog/posts/${post.slug}`,
            unsubscribeUrl: `/applications/blog/unsubscribe?token=${subscriber.unsubscribeToken}`
          }
        });
      }

      logger.info(`Sent newsletter update for post ${postId} to ${activeSubscribers.length} subscribers`);
    }
  } catch (error) {
    logger.error(`Error sending newsletter update:`, error);
  }
}

module.exports = {
  processTask
};