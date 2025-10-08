import * as vscode from 'vscode';
import { WikiApiClient } from '../api/WikiApiClient';

interface SearchResult {
  id: number;
  title: string;
  path: string;
  spaceName: string;
  excerpt: string;
}

export class SearchResultItem extends vscode.TreeItem {
  constructor(
    public readonly result: SearchResult
  ) {
    super(result.title, vscode.TreeItemCollapsibleState.None);

    this.description = result.spaceName;
    this.tooltip = `${result.path}\n\n${result.excerpt}`;
    this.iconPath = new vscode.ThemeIcon('file');
    this.contextValue = 'searchResult';

    this.command = {
      command: 'nooblyjs-wiki.openFile',
      title: 'Open File',
      arguments: [{
        name: result.title,
        path: result.path,
        type: 'file',
        extension: this.getExtension(result.path)
      }]
    };
  }

  private getExtension(path: string): string {
    const parts = path.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }
}

export class SearchProvider implements vscode.TreeDataProvider<SearchResultItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SearchResultItem | undefined | null | void> = new vscode.EventEmitter<SearchResultItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SearchResultItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private searchResults: SearchResult[] = [];
  private currentQuery: string = '';

  constructor(private api: WikiApiClient) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async search(query?: string): Promise<void> {
    if (!this.api.isAuthenticated()) {
      vscode.window.showWarningMessage('Please log in to search');
      return;
    }

    // If no query provided, prompt user
    if (!query) {
      query = await vscode.window.showInputBox({
        prompt: 'Enter search query',
        placeHolder: 'Search documents...',
        value: this.currentQuery
      });
    }

    if (!query || query.trim() === '') {
      this.searchResults = [];
      this.currentQuery = '';
      this.refresh();
      return;
    }

    this.currentQuery = query;

    try {
      const space = this.api.getCurrentSpace();
      const spaceName = space ? space.name : undefined;

      this.searchResults = await this.api.search(query, spaceName);
      this.refresh();

      if (this.searchResults.length === 0) {
        vscode.window.showInformationMessage(`No results found for "${query}"`);
      } else {
        vscode.window.showInformationMessage(`Found ${this.searchResults.length} result(s) for "${query}"`);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Search failed: ${error.message}`);
      this.searchResults = [];
      this.refresh();
    }
  }

  clearSearch(): void {
    this.searchResults = [];
    this.currentQuery = '';
    this.refresh();
  }

  getTreeItem(element: SearchResultItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SearchResultItem): Promise<SearchResultItem[]> {
    if (element) {
      return [];
    }

    if (!this.api.isAuthenticated()) {
      return [];
    }

    if (this.searchResults.length === 0 && this.currentQuery) {
      // Show a message item when no results
      const noResults = new vscode.TreeItem('No results found', vscode.TreeItemCollapsibleState.None);
      noResults.iconPath = new vscode.ThemeIcon('info');
      return [noResults as any];
    }

    return this.searchResults.map(result => new SearchResultItem(result));
  }

  getCurrentQuery(): string {
    return this.currentQuery;
  }
}
