import * as vscode from 'vscode';
import { WikiApiClient } from '../api/WikiApiClient';

interface StarredFile {
  path: string;
  spaceName: string;
  title: string;
  starredAt: string;
}

export class StarredFileItem extends vscode.TreeItem {
  constructor(
    public readonly file: StarredFile
  ) {
    super(file.title, vscode.TreeItemCollapsibleState.None);

    this.description = file.spaceName;
    this.tooltip = `${file.path}\nStarred: ${new Date(file.starredAt).toLocaleString()}`;
    this.iconPath = new vscode.ThemeIcon('star-full');
    this.contextValue = 'starredFile';

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

export class StarredFilesProvider implements vscode.TreeDataProvider<StarredFileItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<StarredFileItem | undefined | null | void> = new vscode.EventEmitter<StarredFileItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<StarredFileItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private starredFiles: StarredFile[] = [];

  constructor(private api: WikiApiClient) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async loadStarredFiles(): Promise<void> {
    if (!this.api.isAuthenticated()) {
      this.starredFiles = [];
      this.refresh();
      return;
    }

    try {
      const activity = await this.api.getUserActivity();
      this.starredFiles = activity.starred || [];
      this.refresh();
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to load starred files: ${error.message}`);
      this.starredFiles = [];
      this.refresh();
    }
  }

  getTreeItem(element: StarredFileItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: StarredFileItem): Promise<StarredFileItem[]> {
    if (element) {
      return [];
    }

    if (!this.api.isAuthenticated()) {
      return [];
    }

    // Load starred files if not already loaded
    if (this.starredFiles.length === 0) {
      await this.loadStarredFiles();
    }

    return this.starredFiles.map(file => new StarredFileItem(file));
  }
}
