/**
 * Blog-specific data manager with enhanced features for blog operations
 */

const fs = require('fs').promises;
const path = require('path');

class BlogDataManager {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    this.ensureDataDir();
  }

  async ensureDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  getFilePath(type) {
    return path.join(this.dataDir, `blog-${type}.json`);
  }

  async read(type) {
    try {
      const filePath = this.getFilePath(type);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, return empty array or appropriate default
      if (type === 'analytics' || type === 'settings') {
        return {};
      }
      return [];
    }
  }

  async write(type, data) {
    try {
      const filePath = this.getFilePath(type);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error writing blog ${type} data:`, error);
      return false;
    }
  }

  async add(type, item) {
    const data = await this.read(type);
    if (Array.isArray(data)) {
      data.push(item);
      return await this.write(type, data);
    }
    return false;
  }

  async update(type, id, updates) {
    const data = await this.read(type);
    if (Array.isArray(data)) {
      const index = data.findIndex(item => item.id === id);
      if (index !== -1) {
        data[index] = { ...data[index], ...updates };
        return await this.write(type, data);
      }
    }
    return false;
  }

  async delete(type, id) {
    const data = await this.read(type);
    if (Array.isArray(data)) {
      const filtered = data.filter(item => item.id !== id);
      if (filtered.length !== data.length) {
        return await this.write(type, filtered);
      }
    }
    return false;
  }

  async findById(type, id) {
    const data = await this.read(type);
    if (Array.isArray(data)) {
      return data.find(item => item.id === id);
    }
    return null;
  }

  async findBySlug(type, slug) {
    const data = await this.read(type);
    if (Array.isArray(data)) {
      return data.find(item => item.slug === slug);
    }
    return null;
  }

  async getNextId(type) {
    const data = await this.read(type);
    if (Array.isArray(data) && data.length > 0) {
      return Math.max(...data.map(item => item.id)) + 1;
    }
    return 1;
  }

  // Blog-specific methods
  async getPublishedPosts(limit = null, offset = 0) {
    const posts = await this.read('posts');
    const published = posts
      .filter(post => post.status === 'published' && post.visibility === 'public')
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    if (limit) {
      return published.slice(offset, offset + limit);
    }
    return published;
  }

  async getPostsByCategory(categoryId, limit = null) {
    const posts = await this.read('posts');
    const categoryPosts = posts
      .filter(post => post.categoryId === categoryId && post.status === 'published' && post.visibility === 'public')
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    if (limit) {
      return categoryPosts.slice(0, limit);
    }
    return categoryPosts;
  }

  async getPostsByAuthor(authorId, limit = null) {
    const posts = await this.read('posts');
    const authorPosts = posts
      .filter(post => post.authorId === authorId && post.status === 'published' && post.visibility === 'public')
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    if (limit) {
      return authorPosts.slice(0, limit);
    }
    return authorPosts;
  }

  async getPostsByTag(tag, limit = null) {
    const posts = await this.read('posts');
    const taggedPosts = posts
      .filter(post => post.tags && post.tags.includes(tag) && post.status === 'published' && post.visibility === 'public')
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    if (limit) {
      return taggedPosts.slice(0, limit);
    }
    return taggedPosts;
  }

  async getFeaturedPosts(limit = 5) {
    const posts = await this.read('posts');
    return posts
      .filter(post => post.isFeatured && post.status === 'published' && post.visibility === 'public')
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, limit);
  }

  async getRecentPosts(limit = 10) {
    return await this.getPublishedPosts(limit);
  }

  async getPopularPosts(limit = 10) {
    const posts = await this.read('posts');
    return posts
      .filter(post => post.status === 'published' && post.visibility === 'public')
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, limit);
  }

  async incrementViewCount(postId) {
    const posts = await this.read('posts');
    const postIndex = posts.findIndex(post => post.id === postId);
    if (postIndex !== -1) {
      posts[postIndex].viewCount = (posts[postIndex].viewCount || 0) + 1;
      posts[postIndex].updatedAt = new Date().toISOString();
      await this.write('posts', posts);
      return posts[postIndex].viewCount;
    }
    return null;
  }

  async getCommentsByPost(postId) {
    const comments = await this.read('comments');
    return comments
      .filter(comment => comment.postId === postId && comment.status === 'approved')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  async updatePostCommentCount(postId) {
    const comments = await this.getCommentsByPost(postId);
    const posts = await this.read('posts');
    const postIndex = posts.findIndex(post => post.id === postId);
    if (postIndex !== -1) {
      posts[postIndex].commentCount = comments.length;
      posts[postIndex].updatedAt = new Date().toISOString();
      await this.write('posts', posts);
    }
  }

  async getBlogStats() {
    const posts = await this.read('posts');
    const comments = await this.read('comments');
    const authors = await this.read('authors');
    const subscribers = await this.read('subscribers');

    const publishedPosts = posts.filter(post => post.status === 'published');
    const totalViews = posts.reduce((sum, post) => sum + (post.viewCount || 0), 0);
    const approvedComments = comments.filter(comment => comment.status === 'approved');

    return {
      totalPosts: publishedPosts.length,
      totalComments: approvedComments.length,
      totalAuthors: authors.filter(author => author.isActive).length,
      totalSubscribers: subscribers.length,
      totalViews: totalViews,
      lastUpdated: new Date().toISOString()
    };
  }

  async searchPosts(query, limit = 20) {
    const posts = await this.read('posts');
    const queryLower = query.toLowerCase();

    const matchingPosts = posts
      .filter(post =>
        post.status === 'published' &&
        post.visibility === 'public' &&
        (
          post.title.toLowerCase().includes(queryLower) ||
          post.excerpt.toLowerCase().includes(queryLower) ||
          post.content.toLowerCase().includes(queryLower) ||
          (post.tags && post.tags.some(tag => tag.toLowerCase().includes(queryLower)))
        )
      )
      .map(post => {
        // Calculate relevance score
        let score = 0;
        const titleMatch = post.title.toLowerCase().includes(queryLower);
        const excerptMatch = post.excerpt.toLowerCase().includes(queryLower);
        const contentMatch = post.content.toLowerCase().includes(queryLower);
        const tagMatch = post.tags && post.tags.some(tag => tag.toLowerCase().includes(queryLower));

        if (titleMatch) score += 5;
        if (excerptMatch) score += 3;
        if (contentMatch) score += 2;
        if (tagMatch) score += 4;

        return { ...post, relevanceScore: score };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    return matchingPosts;
  }
}

module.exports = BlogDataManager;