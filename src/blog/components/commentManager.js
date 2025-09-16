/**
 * @fileoverview Comment Manager for Blog System
 * Handles comment operations including creation, moderation, threading, and spam detection.
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-09-16
 */

'use strict';

/**
 * Comment manager class for handling all comment operations
 */
class CommentManager {
  /**
   * Initialize the comment manager
   * @param {Object} dataManager - Blog data manager instance
   * @param {Object} logger - Logger instance
   * @param {Object} notifying - Notification service (optional)
   */
  constructor(dataManager, logger, notifying = null) {
    this.dataManager = dataManager;
    this.logger = logger;
    this.notifying = notifying;

    // Comment status constants
    this.STATUS = {
      PENDING: 'pending',
      APPROVED: 'approved',
      REJECTED: 'rejected',
      SPAM: 'spam'
    };

    // Initialize comment data structure
    this.initializeCommentData();
  }

  /**
   * Initialize comment data structure if not exists
   */
  async initializeCommentData() {
    try {
      // Initialize comments collection
      const comments = await this.dataManager.read('comments').catch(() => []);
      if (comments.length === 0) {
        await this.dataManager.write('comments', []);
        this.logger.info('Comments collection initialized');
      }

      // Initialize comment settings
      const commentSettings = await this.dataManager.read('commentSettings').catch(() => null);
      if (!commentSettings) {
        const defaultSettings = {
          moderationEnabled: true,
          requireApproval: true,
          allowAnonymous: true,
          maxCommentLength: 1000,
          enableThreading: true,
          maxThreadDepth: 3,
          spamDetection: true,
          emailNotifications: true,
          autoApproveRegistered: false,
          blockedWords: ['spam', 'viagra', 'casino'],
          blockedIPs: [],
          rateLimit: {
            enabled: true,
            maxPerHour: 10,
            maxPerDay: 50
          }
        };
        await this.dataManager.write('commentSettings', defaultSettings);
        this.logger.info('Comment settings initialized');
      }

    } catch (error) {
      this.logger.error('Error initializing comment data:', error);
    }
  }

  /**
   * Create a new comment
   * @param {Object} commentData - Comment data
   * @return {Promise<Object>} Created comment object
   */
  async createComment(commentData) {
    try {
      const {
        postId,
        author,
        email,
        website,
        content,
        parentId = null,
        userAgent = '',
        ipAddress = '127.0.0.1'
      } = commentData;

      // Validate required fields
      if (!postId || !content || !author || !email) {
        throw new Error('Missing required comment fields');
      }

      // Check post exists
      const posts = await this.dataManager.read('posts');
      const post = posts.find(p => p.id === postId);
      if (!post) {
        throw new Error('Post not found');
      }

      // Check if comments are enabled for this post
      if (post.allowComments === false) {
        throw new Error('Comments are disabled for this post');
      }

      // Validate parent comment if provided
      if (parentId) {
        const comments = await this.dataManager.read('comments');
        const parentComment = comments.find(c => c.id === parentId);
        if (!parentComment) {
          throw new Error('Parent comment not found');
        }

        // Check thread depth
        const settings = await this.dataManager.read('commentSettings');
        const depth = await this.getCommentDepth(parentId);
        if (depth >= settings.maxThreadDepth) {
          throw new Error('Maximum thread depth exceeded');
        }
      }

      // Check rate limiting
      await this.checkRateLimit(ipAddress, email);

      // Create comment object
      const comment = {
        id: await this.generateCommentId(),
        postId,
        parentId,
        author: this.sanitizeInput(author),
        email: email.toLowerCase().trim(),
        website: website ? this.sanitizeUrl(website) : '',
        content: this.sanitizeContent(content),
        status: await this.determineInitialStatus(email, content, ipAddress),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ipAddress,
        userAgent,
        votes: { up: 0, down: 0 },
        replies: [],
        metadata: {
          wordCount: content.trim().split(/\s+/).length,
          hasLinks: this.hasLinks(content),
          suspiciousContent: await this.detectSpam(content)
        }
      };

      // Save comment
      const comments = await this.dataManager.read('comments');
      comments.push(comment);
      await this.dataManager.write('comments', comments);

      // Update post comment count
      await this.updatePostCommentCount(postId);

      // Send notifications if approved
      if (comment.status === this.STATUS.APPROVED) {
        await this.sendNotifications(comment, post);
      }

      this.logger.info(`Comment created: ${comment.id} for post ${postId}`);
      return comment;

    } catch (error) {
      this.logger.error('Error creating comment:', error);
      throw error;
    }
  }

  /**
   * Get comments for a post
   * @param {string} postId - Post ID
   * @param {Object} options - Query options
   * @return {Promise<Array>} Array of comments
   */
  async getCommentsForPost(postId, options = {}) {
    try {
      const {
        status = 'approved',
        includeReplies = true,
        sortBy = 'createdAt',
        sortOrder = 'asc',
        limit = null,
        offset = 0
      } = options;

      const allComments = await this.dataManager.read('comments');

      // Filter comments by post and status
      let comments = allComments.filter(comment =>
        comment.postId === postId &&
        (status === 'all' || comment.status === status)
      );

      // Filter to top-level comments first
      const topLevelComments = comments.filter(comment => !comment.parentId);

      // Sort comments
      topLevelComments.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];

        if (sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        }
        return aValue > bValue ? 1 : -1;
      });

      // Apply pagination
      const paginatedComments = limit
        ? topLevelComments.slice(offset, offset + limit)
        : topLevelComments.slice(offset);

      // Add replies if requested
      if (includeReplies) {
        for (const comment of paginatedComments) {
          comment.replies = await this.getRepliesForComment(comment.id, allComments);
        }
      }

      return paginatedComments;

    } catch (error) {
      this.logger.error('Error getting comments for post:', error);
      return [];
    }
  }

  /**
   * Get replies for a comment (recursive)
   * @param {string} commentId - Parent comment ID
   * @param {Array} allComments - All comments array
   * @return {Promise<Array>} Array of reply comments
   */
  async getRepliesForComment(commentId, allComments = null) {
    try {
      if (!allComments) {
        allComments = await this.dataManager.read('comments');
      }

      const replies = allComments.filter(comment =>
        comment.parentId === commentId &&
        comment.status === this.STATUS.APPROVED
      );

      // Sort replies by creation date
      replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      // Recursively get nested replies
      for (const reply of replies) {
        reply.replies = await this.getRepliesForComment(reply.id, allComments);
      }

      return replies;

    } catch (error) {
      this.logger.error('Error getting replies for comment:', error);
      return [];
    }
  }

  /**
   * Moderate a comment (approve, reject, mark as spam)
   * @param {string} commentId - Comment ID
   * @param {string} action - Moderation action (approve, reject, spam)
   * @param {string} moderatorId - Moderator user ID
   * @return {Promise<Object>} Updated comment
   */
  async moderateComment(commentId, action, moderatorId = 'admin') {
    try {
      const comments = await this.dataManager.read('comments');
      const commentIndex = comments.findIndex(c => c.id === commentId);

      if (commentIndex === -1) {
        throw new Error('Comment not found');
      }

      const comment = comments[commentIndex];
      const oldStatus = comment.status;

      // Update comment status
      switch (action) {
        case 'approve':
          comment.status = this.STATUS.APPROVED;
          break;
        case 'reject':
          comment.status = this.STATUS.REJECTED;
          break;
        case 'spam':
          comment.status = this.STATUS.SPAM;
          break;
        default:
          throw new Error('Invalid moderation action');
      }

      comment.updatedAt = new Date().toISOString();
      comment.moderatedBy = moderatorId;
      comment.moderatedAt = new Date().toISOString();

      // Save updated comment
      comments[commentIndex] = comment;
      await this.dataManager.write('comments', comments);

      // Update post comment count if status changed to/from approved
      if (oldStatus !== comment.status) {
        await this.updatePostCommentCount(comment.postId);
      }

      // Send notifications if newly approved
      if (action === 'approve' && oldStatus !== this.STATUS.APPROVED) {
        const posts = await this.dataManager.read('posts');
        const post = posts.find(p => p.id === comment.postId);
        if (post) {
          await this.sendNotifications(comment, post);
        }
      }

      this.logger.info(`Comment ${commentId} moderated: ${action} by ${moderatorId}`);
      return comment;

    } catch (error) {
      this.logger.error('Error moderating comment:', error);
      throw error;
    }
  }

  /**
   * Get comments requiring moderation
   * @param {Object} options - Query options
   * @return {Promise<Array>} Array of pending comments
   */
  async getPendingComments(options = {}) {
    try {
      const { limit = 50, offset = 0, sortBy = 'createdAt' } = options;

      const comments = await this.dataManager.read('comments');
      const posts = await this.dataManager.read('posts');

      // Get pending comments
      let pendingComments = comments.filter(comment =>
        comment.status === this.STATUS.PENDING
      );

      // Sort by creation date (newest first)
      pendingComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination
      pendingComments = pendingComments.slice(offset, offset + limit);

      // Enrich with post information
      pendingComments = pendingComments.map(comment => {
        const post = posts.find(p => p.id === comment.postId);
        return {
          ...comment,
          post: post ? {
            id: post.id,
            title: post.title,
            slug: post.slug
          } : null
        };
      });

      return pendingComments;

    } catch (error) {
      this.logger.error('Error getting pending comments:', error);
      return [];
    }
  }

  /**
   * Delete a comment and its replies
   * @param {string} commentId - Comment ID to delete
   * @return {Promise<boolean>} Success status
   */
  async deleteComment(commentId) {
    try {
      const comments = await this.dataManager.read('comments');

      // Find comment and its replies recursively
      const toDelete = await this.findCommentAndReplies(commentId, comments);

      if (toDelete.length === 0) {
        throw new Error('Comment not found');
      }

      // Remove comments
      const remaining = comments.filter(comment =>
        !toDelete.some(del => del.id === comment.id)
      );

      await this.dataManager.write('comments', remaining);

      // Update post comment count
      const postId = toDelete[0].postId;
      await this.updatePostCommentCount(postId);

      this.logger.info(`Deleted comment ${commentId} and ${toDelete.length - 1} replies`);
      return true;

    } catch (error) {
      this.logger.error('Error deleting comment:', error);
      return false;
    }
  }

  /**
   * Get comment statistics
   * @return {Promise<Object>} Comment statistics
   */
  async getCommentStats() {
    try {
      const comments = await this.dataManager.read('comments');

      const stats = {
        total: comments.length,
        approved: comments.filter(c => c.status === this.STATUS.APPROVED).length,
        pending: comments.filter(c => c.status === this.STATUS.PENDING).length,
        rejected: comments.filter(c => c.status === this.STATUS.REJECTED).length,
        spam: comments.filter(c => c.status === this.STATUS.SPAM).length,
        thisMonth: 0,
        thisWeek: 0,
        today: 0
      };

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      stats.thisMonth = comments.filter(c =>
        new Date(c.createdAt) >= monthStart
      ).length;

      stats.thisWeek = comments.filter(c =>
        new Date(c.createdAt) >= weekStart
      ).length;

      stats.today = comments.filter(c =>
        new Date(c.createdAt) >= dayStart
      ).length;

      return stats;

    } catch (error) {
      this.logger.error('Error getting comment stats:', error);
      return {
        total: 0, approved: 0, pending: 0, rejected: 0, spam: 0,
        thisMonth: 0, thisWeek: 0, today: 0
      };
    }
  }

  // Private helper methods

  async generateCommentId() {
    const comments = await this.dataManager.read('comments');
    const maxId = comments.reduce((max, comment) => {
      const id = parseInt(comment.id);
      return id > max ? id : max;
    }, 0);
    return (maxId + 1).toString();
  }

  async determineInitialStatus(email, content, ipAddress) {
    const settings = await this.dataManager.read('commentSettings');

    // Check if moderation is enabled
    if (!settings.moderationEnabled) {
      return this.STATUS.APPROVED;
    }

    // Check for spam
    if (await this.detectSpam(content)) {
      return this.STATUS.SPAM;
    }

    // Auto-approve registered users if enabled
    if (settings.autoApproveRegistered) {
      // Check if user is registered (this would need auth integration)
      // For now, just check approval requirement
    }

    return settings.requireApproval ? this.STATUS.PENDING : this.STATUS.APPROVED;
  }

  async detectSpam(content) {
    const settings = await this.dataManager.read('commentSettings');

    if (!settings.spamDetection) {
      return false;
    }

    const lowerContent = content.toLowerCase();

    // Check blocked words
    for (const word of settings.blockedWords) {
      if (lowerContent.includes(word.toLowerCase())) {
        return true;
      }
    }

    // Check for excessive links
    const linkCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
    if (linkCount > 3) {
      return true;
    }

    // Check for repeated characters
    if (/(.)\1{10,}/.test(content)) {
      return true;
    }

    return false;
  }

  sanitizeInput(input) {
    return input.trim().replace(/<[^>]*>/g, ''); // Remove HTML tags
  }

  sanitizeContent(content) {
    // Allow basic formatting but remove dangerous HTML
    return content
      .trim()
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*onclick[^>]*>/gi, '')
      .replace(/<[^>]*onload[^>]*>/gi, '');
  }

  sanitizeUrl(url) {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol) ? url : '';
    } catch {
      return '';
    }
  }

  hasLinks(content) {
    return /https?:\/\/[^\s]+/.test(content);
  }

  async getCommentDepth(commentId) {
    const comments = await this.dataManager.read('comments');
    let depth = 0;
    let currentId = commentId;

    while (currentId) {
      const comment = comments.find(c => c.id === currentId);
      if (!comment || !comment.parentId) break;
      depth++;
      currentId = comment.parentId;
    }

    return depth;
  }

  async findCommentAndReplies(commentId, comments) {
    const result = [];
    const comment = comments.find(c => c.id === commentId);

    if (comment) {
      result.push(comment);

      // Find all replies recursively
      const replies = comments.filter(c => c.parentId === commentId);
      for (const reply of replies) {
        result.push(...await this.findCommentAndReplies(reply.id, comments));
      }
    }

    return result;
  }

  async updatePostCommentCount(postId) {
    try {
      const posts = await this.dataManager.read('posts');
      const comments = await this.dataManager.read('comments');

      const postIndex = posts.findIndex(p => p.id === postId);
      if (postIndex !== -1) {
        const approvedComments = comments.filter(c =>
          c.postId === postId && c.status === this.STATUS.APPROVED
        );

        posts[postIndex].commentsCount = approvedComments.length;
        posts[postIndex].updatedAt = new Date().toISOString();

        await this.dataManager.write('posts', posts);
      }
    } catch (error) {
      this.logger.error('Error updating post comment count:', error);
    }
  }

  async checkRateLimit(ipAddress, email) {
    // Implementation for rate limiting
    // This would check recent comments from the same IP/email
    // For now, we'll skip this but it's a placeholder for future enhancement
  }

  async sendNotifications(comment, post) {
    // Send notifications about new comments
    if (this.notifying) {
      try {
        await this.notifying.send({
          type: 'comment',
          title: 'New Comment',
          message: `New comment on "${post.title}" by ${comment.author}`,
          data: { commentId: comment.id, postId: post.id }
        });
      } catch (error) {
        this.logger.error('Error sending comment notification:', error);
      }
    }
  }
}

module.exports = CommentManager;