/**
 * @fileoverview Blog Data Manager
 * Handles JSON file-based data persistence for blog posts, categories,
 * authors, comments, and analytics with advanced querying capabilities.
 *
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-09-16
 */

'use strict';

const fs = require('fs').promises;
const path = require('path');

class DataManager {
  constructor(baseDir = './application/blog-data') {
    this.baseDir = baseDir;
    this.ensureDirectoryExists();
  }

  /**
   * Ensure the data directory exists
   */
  async ensureDirectoryExists() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Get the file path for a data type
   */
  getFilePath(dataType) {
    return path.join(this.baseDir, `${dataType}.json`);
  }

  /**
   * Read data from JSON file
   */
  async read(dataType) {
    try {
      const filePath = this.getFilePath(dataType);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Write data to JSON file
   */
  async write(dataType, data) {
    try {
      await this.ensureDirectoryExists();
      const filePath = this.getFilePath(dataType);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add new item to collection
   */
  async add(dataType, item) {
    try {
      const data = await this.read(dataType);
      data.push(item);
      await this.write(dataType, data);
      return item;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update item in collection
   */
  async update(dataType, id, updates) {
    try {
      const data = await this.read(dataType);
      const index = data.findIndex(item => item.id === id);

      if (index === -1) {
        return false;
      }

      data[index] = { ...data[index], ...updates };
      await this.write(dataType, data);
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete item from collection
   */
  async delete(dataType, id) {
    try {
      const data = await this.read(dataType);
      const filteredData = data.filter(item => item.id !== id);

      if (filteredData.length === data.length) {
        return false;
      }

      await this.write(dataType, filteredData);
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find item by ID
   */
  async findById(dataType, id) {
    try {
      const data = await this.read(dataType);
      return data.find(item => item.id === id) || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find item by slug
   */
  async findBySlug(dataType, slug) {
    try {
      const data = await this.read(dataType);
      return data.find(item => item.slug === slug) || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get next available ID for a collection
   */
  async getNextId(dataType) {
    try {
      const data = await this.read(dataType);
      if (data.length === 0) {
        return 1;
      }
      return Math.max(...data.map(item => item.id)) + 1;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get published posts with pagination
   */
  async getPublishedPosts(limit = 10, offset = 0) {
    try {
      const posts = await this.read('posts');
      const publishedPosts = posts
        .filter(post => post.status === 'published' && post.visibility === 'public')
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .slice(offset, offset + limit);

      return publishedPosts;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get posts by category
   */
  async getPostsByCategory(categoryId, limit = 10) {
    try {
      const posts = await this.read('posts');
      return posts
        .filter(post => post.categoryId === categoryId && post.status === 'published')
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .slice(0, limit);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get posts by author
   */
  async getPostsByAuthor(authorId, limit = 10) {
    try {
      const posts = await this.read('posts');
      return posts
        .filter(post => post.authorId === authorId && post.status === 'published')
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .slice(0, limit);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get posts by tag
   */
  async getPostsByTag(tag, limit = 10) {
    try {
      const posts = await this.read('posts');
      return posts
        .filter(post =>
          post.tags &&
          post.tags.includes(tag) &&
          post.status === 'published'
        )
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .slice(0, limit);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get featured posts
   */
  async getFeaturedPosts(limit = 5) {
    try {
      const posts = await this.read('posts');
      return posts
        .filter(post => post.isFeatured && post.status === 'published')
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .slice(0, limit);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get comments for a post
   */
  async getCommentsByPost(postId) {
    try {
      const comments = await this.read('comments');
      return comments
        .filter(comment => comment.postId === postId && comment.status === 'approved')
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search posts
   */
  async searchPosts(query, limit = 10) {
    try {
      const posts = await this.read('posts');
      const searchTerms = query.toLowerCase().split(' ');

      const results = posts
        .filter(post => {
          if (post.status !== 'published') return false;

          const searchableContent = `
            ${post.title}
            ${post.excerpt}
            ${post.content || ''}
            ${(post.tags || []).join(' ')}
          `.toLowerCase();

          return searchTerms.some(term => searchableContent.includes(term));
        })
        .sort((a, b) => {
          // Sort by relevance (title matches first, then content)
          const aTitle = a.title.toLowerCase();
          const bTitle = b.title.toLowerCase();
          const queryLower = query.toLowerCase();

          if (aTitle.includes(queryLower) && !bTitle.includes(queryLower)) return -1;
          if (!aTitle.includes(queryLower) && bTitle.includes(queryLower)) return 1;

          return new Date(b.publishedAt) - new Date(a.publishedAt);
        })
        .slice(0, limit);

      return results;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get blog statistics
   */
  async getBlogStats() {
    try {
      const [posts, comments, analytics] = await Promise.all([
        this.read('posts'),
        this.read('comments'),
        this.read('analytics')
      ]);

      const publishedPosts = posts.filter(post => post.status === 'published');
      const totalViews = publishedPosts.reduce((sum, post) => sum + (post.viewCount || 0), 0);
      const totalLikes = publishedPosts.reduce((sum, post) => sum + (post.likeCount || 0), 0);
      const approvedComments = comments.filter(comment => comment.status === 'approved');

      return {
        totalPosts: publishedPosts.length,
        totalDrafts: posts.filter(post => post.status === 'draft').length,
        totalViews,
        totalLikes,
        totalComments: approvedComments.length,
        pendingComments: comments.filter(comment => comment.status === 'pending').length,
        popularPosts: publishedPosts
          .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
          .slice(0, 5)
          .map(post => ({
            id: post.id,
            title: post.title,
            slug: post.slug,
            viewCount: post.viewCount || 0,
            likeCount: post.likeCount || 0,
            commentCount: post.commentCount || 0
          })),
        recentPosts: publishedPosts
          .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
          .slice(0, 5)
          .map(post => ({
            id: post.id,
            title: post.title,
            slug: post.slug,
            publishedAt: post.publishedAt,
            viewCount: post.viewCount || 0
          })),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Increment view count for a post
   */
  async incrementViewCount(postId) {
    try {
      const posts = await this.read('posts');
      const postIndex = posts.findIndex(post => post.id === postId);

      if (postIndex !== -1) {
        posts[postIndex].viewCount = (posts[postIndex].viewCount || 0) + 1;
        posts[postIndex].updatedAt = new Date().toISOString();
        await this.write('posts', posts);
        return posts[postIndex].viewCount;
      }

      return 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = DataManager;