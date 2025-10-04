const axios = require('axios');

class WikiApiClient {
  constructor(baseURL, username, password) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: `${baseURL}/applications/wiki/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add basic authentication if credentials provided
    if (username && password) {
      const auth = Buffer.from(`${username}:${password}`).toString('base64');
      this.client.defaults.headers.common['Authorization'] = `Basic ${auth}`;
    }
  }

  /**
   * Get all spaces
   */
  async getSpaces() {
    try {
      const response = await this.client.get('/spaces');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get spaces: ${error.message}`);
    }
  }

  /**
   * Get all documents from a space
   */
  async getSpaceDocuments(spaceId) {
    try {
      const url = `/spaces/${spaceId}/documents`;
      console.log(`[API] GET ${this.client.defaults.baseURL}${url}`);

      const response = await this.client.get(url);

      console.log(`[API] Found ${response.data.length} documents in space ${spaceId}`);
      if (response.data.length > 0) {
        console.log(`[API] Sample document structure:`, JSON.stringify(response.data[0], null, 2));
      }

      return response.data;
    } catch (error) {
      console.error(`[API] GET ${url} failed:`, error.response?.status, error.response?.statusText);
      throw new Error(`Failed to get space documents: ${error.message}`);
    }
  }

  /**
   * Get document content by path
   */
  async getDocumentContent(documentPath, spaceName) {
    try {
      const url = '/documents/content';
      const params = {
        path: documentPath,
        spaceName: spaceName
      };

      console.log(`[API] GET ${this.client.defaults.baseURL}${url}?path=${params.path}&spaceName=${params.spaceName}`);

      const response = await this.client.get(url, { params });

      console.log(`[API] Response type:`, typeof response.data);
      console.log(`[API] Response content (first 100 chars):`,
        typeof response.data === 'string'
          ? response.data.substring(0, 100)
          : JSON.stringify(response.data).substring(0, 100)
      );

      // The API returns the content directly as text
      return response.data;
    } catch (error) {
      console.error(`[API] GET ${url} failed:`, error.response?.status, error.response?.statusText);
      console.error(`[API] Request params:`, { path: documentPath, spaceName: spaceName });
      console.error(`[API] Error details:`, error.response?.data);
      throw new Error(`Failed to get document content: ${error.message}`);
    }
  }

  /**
   * Get a single document by ID
   */
  async getDocument(documentId) {
    try {
      const response = await this.client.get(`/documents/${documentId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get document ${documentId}: ${error.message}`);
    }
  }

  /**
   * Create a new document
   */
  async createDocument(documentData) {
    try {
      const url = '/documents';
      console.log(`[API] POST ${this.client.defaults.baseURL}${url}`);
      console.log(`[API] Document data:`, JSON.stringify(documentData, null, 2));

      const response = await this.client.post(url, documentData);

      console.log(`[API] Document created:`, response.data.success ? 'Success' : 'Failed');
      return response.data;
    } catch (error) {
      console.error(`[API] POST ${url} failed:`, error.response?.status, error.response?.statusText);
      console.error(`[API] Error details:`, error.response?.data);
      throw new Error(`Failed to create document: ${error.message}`);
    }
  }

  /**
   * Update an existing document
   */
  async updateDocument(documentId, documentData) {
    try {
      const response = await this.client.put('/documents', documentData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update document ${documentId}: ${error.message}`);
    }
  }

  /**
   * Delete a document by path
   */
  async deleteDocument(documentPath, spaceId) {
    try {
      await this.client.delete(`/documents/${encodeURIComponent(documentPath)}`, {
        data: { spaceId }
      });
    } catch (error) {
      throw new Error(`Failed to delete document ${documentPath}: ${error.message}`);
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(query) {
    try {
      const response = await this.client.get('/search', {
        params: { q: query },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to search documents: ${error.message}`);
    }
  }

  /**
   * Upload a file (binary)
   */
  async uploadFile(fileBuffer, fileName, spaceId, folderPath = '') {
    try {
      const FormData = require('form-data');
      const form = new FormData();

      form.append('file', fileBuffer, fileName);
      form.append('spaceId', spaceId.toString());
      if (folderPath) {
        form.append('folderPath', folderPath);
      }

      const url = '/documents/upload';
      console.log(`[API] POST ${this.client.defaults.baseURL}${url} (uploading ${fileName})`);

      const response = await this.client.post(url, form, {
        headers: {
          ...form.getHeaders(),
        },
      });

      console.log(`[API] File uploaded:`, response.data.success ? 'Success' : 'Failed');
      return response.data;
    } catch (error) {
      console.error(`[API] File upload failed:`, error.response?.status, error.response?.statusText);
      console.error(`[API] Error details:`, error.response?.data);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }
}

module.exports = WikiApiClient;
