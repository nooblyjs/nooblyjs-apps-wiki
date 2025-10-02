import * as vscode from 'vscode';
import { WikiApiClient } from '../api/WikiApiClient';

interface RecentFile {
  path: string;
  spaceName: string;
  title: string;
  lastVisited: string;
}

export class RecentFileItem extends vscode.TreeItem {
  constructor(
    public readonly file: RecentFile
  ) {
    super(file.title, vscode.TreeItemCollapsibleState.None);

    this.description = file.spaceName;
    this.tooltip = `${file.path}\nLast visited: ${new Date(file.lastVisited).toLocaleString()}`;
    this.iconPath = new vscode.ThemeIcon('history');
    this.contextValue = 'recentFile';

    this.command = {
      command: 'nooblyjs-wiki.openFile',
      title: 'Open File',
      arguments: [{
        name: file.title,
        path: file.path,
        type: 'file',
        extension: this.getExtension(file.path)
      }]
    };
  }

  private getExtension(path: string): string {
    const parts = path.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }
}

export class RecentFilesProvider implements vscode.TreeDataProvider<RecentFileItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<RecentFileItem | undefined | null | void> = new vscode.EventEmitter<RecentFileItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<RecentFileItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private recentFiles: RecentFile[] = [];

  constructor(private api: WikiApiClient) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async loadRecentFiles(): Promise<void> {
    if (!this.api.isAuthenticated()) {
      this.recentFiles = [];
      this.refresh();
      return;
    }

    try {
      const activity = await this.api.getUserActivity();
      this.recentFiles = activity.recent || [];
      this.refresh();
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to load recent files: ${error.message}`);
      this.recentFiles = [];
      this.refresh();
    }
  }

  getTreeItem(element: RecentFileItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: RecentFileItem): Promise<RecentFileItem[]> {
    if (element) {
      return [];
    }

    if (!this.api.isAuthenticated()) {
      return [];
    }

    // Load recent files if not already loaded
    if (this.recentFiles.length === 0) {
      await this.loadRecentFiles();
    }

    return this.recentFiles.map(file => new RecentFileItem(file));
  }
}
