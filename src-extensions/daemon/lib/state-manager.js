const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');

class StateManager {
  constructor(stateFilePath = '.daemon-state.json') {
    this.stateFilePath = stateFilePath;
    this.state = {
      files: {},      // { filePath: { hash, documentId, lastSync } }
      documents: {},  // { documentId: { filePath, hash, lastSync } }
    };
  }

  /**
   * Load state from disk
   */
  async load() {
    try {
      const data = await fs.readFile(this.stateFilePath, 'utf8');
      this.state = JSON.parse(data);
      console.log('[State] Loaded state from disk');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('[State] No existing state file, starting fresh');
        await this.save();
      } else {
        throw error;
      }
    }
  }

  /**
   * Save state to disk
   */
  async save() {
    try {
      await fs.writeFile(
        this.stateFilePath,
        JSON.stringify(this.state, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('[State] Failed to save state:', error.message);
    }
  }

  /**
   * Calculate hash of file content
   */
  async calculateFileHash(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      throw new Error(`Failed to calculate hash for ${filePath}: ${error.message}`);
    }
  }

  /**
   * Track a file and its associated document
   */
  async trackFile(filePath, documentId, hash = null) {
    if (!hash) {
      hash = await this.calculateFileHash(filePath);
    }

    this.state.files[filePath] = {
      hash,
      documentId,
      lastSync: new Date().toISOString(),
    };

    this.state.documents[documentId] = {
      filePath,
      hash,
      lastSync: new Date().toISOString(),
    };

    await this.save();
  }

  /**
   * Check if a file has changed
   */
  async hasFileChanged(filePath) {
    const currentHash = await this.calculateFileHash(filePath);
    const trackedFile = this.state.files[filePath];

    if (!trackedFile) {
      return true; // New file
    }

    return currentHash !== trackedFile.hash;
  }

  /**
   * Get document ID for a file
   */
  getDocumentId(filePath) {
    return this.state.files[filePath]?.documentId;
  }

  /**
   * Get file path for a document
   */
  getFilePath(documentId) {
    return this.state.documents[documentId]?.filePath;
  }

  /**
   * Check if document is tracked
   */
  isDocumentTracked(documentId) {
    return !!this.state.documents[documentId];
  }

  /**
   * Check if file is tracked
   */
  isFileTracked(filePath) {
    return !!this.state.files[filePath];
  }

  /**
   * Remove file tracking
   */
  async untrackFile(filePath) {
    const documentId = this.state.files[filePath]?.documentId;

    delete this.state.files[filePath];
    if (documentId) {
      delete this.state.documents[documentId];
    }

    await this.save();
  }

  /**
   * Remove document tracking
   */
  async untrackDocument(documentId) {
    const filePath = this.state.documents[documentId]?.filePath;

    delete this.state.documents[documentId];
    if (filePath) {
      delete this.state.files[filePath];
    }

    await this.save();
  }

  /**
   * Get all tracked files
   */
  getAllTrackedFiles() {
    return Object.keys(this.state.files);
  }

  /**
   * Get all tracked documents
   */
  getAllTrackedDocuments() {
    return Object.keys(this.state.documents);
  }

  /**
   * Clear all state
   */
  async clear() {
    this.state = {
      files: {},
      documents: {},
    };
    await this.save();
  }
}

module.exports = StateManager;
