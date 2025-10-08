import * as vscode from 'vscode';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

interface LoginResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

interface Space {
  id: number;
  name: string;
  description: string;
  icon: string;
  visibility: string;
  documentCount: number;
  type: string;
  permissions: string;
}

interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  extension?: string;
  size?: number;
  children?: FileSystemItem[];
}

interface DocumentContent {
  success: boolean;
  document?: any;
  content?: string;
  html?: string;
}

interface SearchResult {
  id: number;
  title: string;
  path: string;
  spaceName: string;
  excerpt: string;
}

interface UserActivity {
  recent: Array<{
    path: string;
    spaceName: string;
    title: string;
    lastVisited: string;
  }>;
  starred: Array<{
    path: string;
    spaceName: string;
    title: string;
    starredAt: string;
  }>;
}

export class WikiApiClient {
  private axios: AxiosInstance;
  private baseUrl: string;
  private apiBase: string;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    const config = vscode.workspace.getConfiguration('nooblyjs-wiki');
    this.baseUrl = config.get<string>('serverUrl') || 'http://localhost:3002';
    this.apiBase = `${this.baseUrl}/applications/wiki/api`;

    this.axios = axios.create({
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<LoginResponse> = await this.axios.post(
        `${this.baseUrl}/api/auth/login`,
        { email, password }
      );

      if (response.data.success) {
        await this.context.globalState.update('isAuthenticated', true);
        await this.context.globalState.update('userEmail', email);
        await vscode.commands.executeCommand('setContext', 'nooblyjs-wiki.authenticated', true);
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  /**
   * Check authentication status
   */
  async checkAuth(): Promise<boolean> {
    try {
      const response = await this.axios.get(`${this.baseUrl}/api/auth/check`);
      const isAuth = response.data?.authenticated || false;
      await this.context.globalState.update('isAuthenticated', isAuth);
      await vscode.commands.executeCommand('setContext', 'nooblyjs-wiki.authenticated', isAuth);
      return isAuth;
    } catch (error) {
      await this.context.globalState.update('isAuthenticated', false);
      await vscode.commands.executeCommand('setContext', 'nooblyjs-wiki.authenticated', false);
      return false;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.context.globalState.update('isAuthenticated', false);
    await this.context.globalState.update('userEmail', undefined);
    await this.context.globalState.update('currentSpace', undefined);
    await vscode.commands.executeCommand('setContext', 'nooblyjs-wiki.authenticated', false);
  }

  /**
   * Get all spaces
   */
  async getSpaces(): Promise<Space[]> {
    try {
      const response: AxiosResponse<Space[]> = await this.axios.get(`${this.apiBase}/spaces`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch spaces');
    }
  }

  /**
   * Get folder tree for a space
   */
  async getFolderTree(spaceId: number): Promise<FileSystemItem[]> {
    try {
      const response: AxiosResponse<FileSystemItem[]> = await this.axios.get(
        `${this.apiBase}/spaces/${spaceId}/folders`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch folder tree');
    }
  }

  /**
   * Get document content
   */
  async getDocumentContent(path: string, spaceName: string, enhanced: boolean = true): Promise<DocumentContent> {
    try {
      const response: AxiosResponse<DocumentContent> = await this.axios.get(
        `${this.apiBase}/documents/content`,
        {
          params: { path, spaceName, enhanced }
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch document content');
    }
  }

  /**
   * Search documents
   */
  async search(query: string, spaceName?: string): Promise<SearchResult[]> {
    try {
      const params: any = { q: query, includeContent: false };
      if (spaceName) {
        params.spaceName = spaceName;
      }

      const response: AxiosResponse<SearchResult[]> = await this.axios.get(
        `${this.apiBase}/search`,
        { params }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Search failed');
    }
  }

  /**
   * Get user activity (recent and starred files)
   */
  async getUserActivity(): Promise<UserActivity> {
    try {
      const response: AxiosResponse<UserActivity> = await this.axios.get(
        `${this.apiBase}/user/activity`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user activity');
    }
  }

  /**
   * Toggle star on a document
   */
  async toggleStar(path: string, spaceName: string, title: string, action: 'star' | 'unstar'): Promise<void> {
    try {
      await this.axios.post(`${this.apiBase}/user/star`, {
        path,
        spaceName,
        title,
        action
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to toggle star');
    }
  }

  /**
   * Record document visit
   */
  async recordVisit(path: string, spaceName: string, title: string): Promise<void> {
    try {
      await this.axios.post(`${this.apiBase}/user/visit`, {
        path,
        spaceName,
        title,
        action: 'viewed'
      });
    } catch (error: any) {
      // Don't throw error for visit tracking failures
      console.error('Failed to record visit:', error);
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.context.globalState.get<boolean>('isAuthenticated', false);
  }

  /**
   * Get current space
   */
  getCurrentSpace(): Space | undefined {
    return this.context.globalState.get<Space>('currentSpace');
  }

  /**
   * Set current space
   */
  async setCurrentSpace(space: Space | undefined): Promise<void> {
    await this.context.globalState.update('currentSpace', space);
  }
}
