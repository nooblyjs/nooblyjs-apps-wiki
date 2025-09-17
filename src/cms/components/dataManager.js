/**
 * Enhanced JSON file-based data manager for CMS operations
 * Handles sites, pages, components, templates, assets, and themes
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class DataManager {
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
    return path.join(this.dataDir, `cms_${type}.json`);
  }

  async read(type) {
    try {
      const filePath = this.getFilePath(type);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, return empty array
      return [];
    }
  }

  async write(type, data) {
    try {
      const filePath = this.getFilePath(type);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error writing ${type} data:`, error);
      return false;
    }
  }

  generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
  }

  async add(type, item) {
    const data = await this.read(type);

    // Generate ID if not provided
    if (!item.id) {
      if (type === 'sites') {
        item.id = this.generateId('site');
      } else if (type === 'pages') {
        item.id = this.generateId('page');
      } else if (type === 'components') {
        item.id = this.generateId('comp');
      } else if (type === 'templates') {
        item.id = this.generateId('tpl');
      } else if (type === 'assets') {
        item.id = this.generateId('asset');
      } else {
        const maxId = data.length > 0 ? Math.max(...data.map(d => d.id || 0)) : 0;
        item.id = maxId + 1;
      }
    }

    // Add timestamps
    if (!item.createdAt) {
      item.createdAt = new Date().toISOString();
    }
    item.updatedAt = new Date().toISOString();

    data.push(item);
    await this.write(type, data);
    return item.id;
  }

  async update(type, id, updates) {
    const data = await this.read(type);
    const index = data.findIndex(item => item.id === id || item.id === parseInt(id));

    if (index !== -1) {
      updates.updatedAt = new Date().toISOString();
      data[index] = { ...data[index], ...updates };
      await this.write(type, data);
      return data[index];
    }
    return null;
  }

  async remove(type, id) {
    const data = await this.read(type);
    const filtered = data.filter(item => item.id !== id && item.id !== parseInt(id));

    if (filtered.length !== data.length) {
      await this.write(type, filtered);
      return true;
    }
    return false;
  }

  async find(type, filter = {}) {
    const data = await this.read(type);

    if (Object.keys(filter).length === 0) {
      return data;
    }

    return data.filter(item => {
      return Object.entries(filter).every(([key, value]) => {
        if (Array.isArray(value)) {
          return value.includes(item[key]);
        }
        return item[key] === value;
      });
    });
  }

  async findOne(type, filter = {}) {
    const results = await this.find(type, filter);
    return results.length > 0 ? results[0] : null;
  }

  // CMS-specific methods for sites
  async createSite(siteData) {
    const site = {
      ...siteData,
      id: this.generateId('site'),
      status: siteData.status || 'draft',
      pages: siteData.pages || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: null
    };

    await this.add('sites', site);
    return site;
  }

  async getSiteWithPages(siteId) {
    const site = await this.findOne('sites', { id: siteId });
    if (!site) return null;

    const pages = await this.find('pages', { siteId });
    return { ...site, pages };
  }

  async updateSiteStatus(siteId, status) {
    const updates = { status };
    if (status === 'published') {
      updates.publishedAt = new Date().toISOString();
    }
    return await this.update('sites', siteId, updates);
  }

  // CMS-specific methods for pages
  async createPage(pageData) {
    const page = {
      ...pageData,
      id: this.generateId('page'),
      status: pageData.status || 'draft',
      content: pageData.content || { sections: [] },
      seo: pageData.seo || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.add('pages', page);

    // Update site's pages array
    const site = await this.findOne('sites', { id: pageData.siteId });
    if (site && !site.pages.includes(page.id)) {
      site.pages.push(page.id);
      await this.update('sites', site.id, { pages: site.pages });
    }

    return page;
  }

  async getPageContent(pageId) {
    const page = await this.findOne('pages', { id: pageId });
    if (!page) return null;

    // Populate component details for each section
    const components = await this.read('components');
    const populatedSections = page.content.sections.map(section => {
      const component = components.find(comp => comp.type === section.type);
      return {
        ...section,
        component: component || null
      };
    });

    return {
      ...page,
      content: {
        ...page.content,
        sections: populatedSections
      }
    };
  }

  // CMS-specific methods for components
  async getComponentsByCategory(category) {
    return await this.find('components', { category });
  }

  async getComponentTemplate(componentId) {
    const component = await this.findOne('components', { id: componentId });
    return component ? component.template : null;
  }

  // CMS-specific methods for assets
  async createAsset(assetData) {
    const asset = {
      ...assetData,
      id: this.generateId('asset'),
      uploadedAt: new Date().toISOString(),
      optimized: false
    };

    await this.add('assets', asset);
    return asset;
  }

  async getAssetsByType(type) {
    return await this.find('assets', { type });
  }

  async updateAssetOptimization(assetId, optimizationData) {
    return await this.update('assets', assetId, {
      optimized: true,
      optimizedSize: optimizationData.size,
      optimizedUrl: optimizationData.url,
      optimizedAt: new Date().toISOString()
    });
  }

  // CMS-specific methods for templates
  async getTemplatesByCategory(category) {
    return await this.find('templates', { category });
  }

  async cloneTemplate(templateId, newName) {
    const template = await this.findOne('templates', { id: templateId });
    if (!template) return null;

    const clonedTemplate = {
      ...template,
      id: this.generateId('tpl'),
      name: newName,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.add('templates', clonedTemplate);
    return clonedTemplate;
  }

  // Analytics and reporting methods
  async getSiteAnalytics(siteId, startDate, endDate) {
    // This would integrate with analytics data
    // For now, return mock data structure
    return {
      siteId,
      period: { startDate, endDate },
      pageViews: 0,
      uniqueVisitors: 0,
      bounceRate: 0,
      averageSessionDuration: 0,
      topPages: [],
      trafficSources: {}
    };
  }

  async getDashboardStats() {
    const sites = await this.read('sites');
    const pages = await this.read('pages');
    const assets = await this.read('assets');

    return {
      totalSites: sites.length,
      publishedSites: sites.filter(s => s.status === 'published').length,
      draftSites: sites.filter(s => s.status === 'draft').length,
      totalPages: pages.length,
      totalAssets: assets.length,
      storageUsed: assets.reduce((total, asset) => total + (asset.size || 0), 0)
    };
  }

  // Folder-specific methods (inherited from wiki but kept for compatibility)
  async createFolder(spaceId, folderName, parentPath = '') {
    const folders = await this.read('folders');
    const folder = {
      id: folders.length > 0 ? Math.max(...folders.map(f => f.id || 0)) + 1 : 1,
      name: folderName,
      spaceId: spaceId,
      parentPath: parentPath,
      path: parentPath ? `${parentPath}/${folderName}` : folderName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    folders.push(folder);
    await this.write('folders', folders);
    return folder;
  }

  async getFolderTree(spaceId) {
    // Get space name from spaces data
    const spaces = await this.read('spaces');
    const space = spaces.find(s => s.id === spaceId);
    if (!space) {
      return [];
    }

    // Read from physical file system
    return this.getFolderTreeFromFileSystem(space.name);
  }

  async getFolderTreeFromFileSystem(spaceName) {
    try {
      const documentsDir = path.join(process.cwd(), 'documents');
      const spaceDir = path.join(documentsDir, spaceName);

      // Check if space directory exists
      try {
        await fs.access(spaceDir);
      } catch (error) {
        // Directory doesn't exist, return empty tree
        return [];
      }

      return await this.buildFileSystemTree(spaceDir, spaceName);
    } catch (error) {
      console.error('Error reading folder tree from file system:', error);
      return [];
    }
  }

  async buildFileSystemTree(dirPath, spaceName, relativePath = '') {
    const tree = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativeEntryPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          // It's a folder
          const children = await this.buildFileSystemTree(fullPath, spaceName, relativeEntryPath);
          tree.push({
            type: 'folder',
            name: entry.name,
            path: relativeEntryPath,
            children: children
          });
        } else {
          // It's a file
          tree.push({
            type: 'document',
            name: entry.name,
            title: entry.name,
            path: relativeEntryPath,
            fileName: entry.name,
            spaceName: spaceName
          });
        }
      }

      // Sort: folders first, then files, both alphabetically
      tree.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

    } catch (error) {
      console.error('Error reading directory:', dirPath, error);
    }

    return tree;
  }

  buildFolderTree(folders, documents) {
    const tree = [];
    const folderMap = new Map();

    // Create folder nodes
    folders.forEach(folder => {
      folderMap.set(folder.path, {
        ...folder,
        type: 'folder',
        children: [],
        documents: []
      });
    });

    // Add documents to appropriate folders or root
    documents.forEach(doc => {
      const folderPath = doc.folderPath || '';
      if (folderPath && folderMap.has(folderPath)) {
        folderMap.get(folderPath).documents.push({
          ...doc,
          type: 'document'
        });
      } else {
        tree.push({
          ...doc,
          type: 'document'
        });
      }
    });

    // Build tree structure
    folders.forEach(folder => {
      if (!folder.parentPath) {
        // Root level folder
        tree.push(folderMap.get(folder.path));
      } else {
        // Child folder
        const parent = folderMap.get(folder.parentPath);
        if (parent) {
          parent.children.push(folderMap.get(folder.path));
        }
      }
    });

    return tree;
  }

  async updateDocumentFolder(documentId, newFolderPath) {
    const documents = await this.read('documents');
    const docIndex = documents.findIndex(doc => doc.id === documentId);

    if (docIndex !== -1) {
      documents[docIndex].folderPath = newFolderPath;
      documents[docIndex].updatedAt = new Date().toISOString();
      await this.write('documents', documents);
      return documents[docIndex];
    }
    return null;
  }
}

module.exports = DataManager;