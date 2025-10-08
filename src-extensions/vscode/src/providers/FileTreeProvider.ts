import * as vscode from 'vscode';
import * as path from 'path';
import { WikiApiClient } from '../api/WikiApiClient';

interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  extension?: string;
  size?: number;
  children?: FileSystemItem[];
}

export class FileTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemData: FileSystemItem,
    public readonly parentPath: string = ''
  ) {
    super(label, collapsibleState);

    if (itemData.type === 'file') {
      this.command = {
        command: 'nooblyjs-wiki.openFile',
        title: 'Open File',
        arguments: [itemData]
      };
      this.contextValue = 'file';
      this.iconPath = this.getFileIcon(itemData.extension || '');
    } else {
      this.contextValue = 'folder';
      this.iconPath = new vscode.ThemeIcon('folder');
    }

    this.tooltip = itemData.path;
    this.description = itemData.type === 'file' ? this.getFileSize(itemData.size) : '';
  }

  private getFileIcon(extension: string): vscode.ThemeIcon {
    const iconMap: { [key: string]: string } = {
      'md': 'markdown',
      'js': 'symbol-method',
      'ts': 'symbol-method',
      'json': 'json',
      'html': 'code',
      'css': 'symbol-color',
      'py': 'symbol-class',
      'java': 'symbol-class',
      'c': 'symbol-file',
      'cpp': 'symbol-file',
      'go': 'symbol-module',
      'rs': 'symbol-module',
      'rb': 'ruby',
      'php': 'symbol-variable',
      'sh': 'terminal',
      'bat': 'terminal',
      'txt': 'file-text',
      'pdf': 'file-pdf',
      'png': 'file-media',
      'jpg': 'file-media',
      'jpeg': 'file-media',
      'gif': 'file-media',
      'svg': 'file-media',
      'xml': 'file-code',
      'yml': 'file-code',
      'yaml': 'file-code'
    };

    return new vscode.ThemeIcon(iconMap[extension.toLowerCase()] || 'file');
  }

  private getFileSize(size?: number): string {
    if (!size) return '';

    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
}

export class FileTreeProvider implements vscode.TreeDataProvider<FileTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FileTreeItem | undefined | null | void> = new vscode.EventEmitter<FileTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<FileTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private tree: FileSystemItem[] = [];
  private currentPath: string[] = [];

  constructor(private api: WikiApiClient) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async loadTree(): Promise<void> {
    const space = this.api.getCurrentSpace();
    if (!space) {
      this.tree = [];
      this.currentPath = [];
      this.refresh();
      return;
    }

    try {
      this.tree = await this.api.getFolderTree(space.id);
      this.currentPath = [];
      this.refresh();
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to load files: ${error.message}`);
      this.tree = [];
      this.refresh();
    }
  }

  navigateToFolder(folderName: string): void {
    this.currentPath.push(folderName);
    this.refresh();
  }

  navigateUp(): void {
    this.currentPath.pop();
    this.refresh();
  }

  navigateToRoot(): void {
    this.currentPath = [];
    this.refresh();
  }

  getCurrentItems(): FileSystemItem[] {
    let items = this.tree;

    // Navigate through the path
    for (const folderName of this.currentPath) {
      const folder = items.find(item => item.type === 'folder' && item.name === folderName);
      if (folder && folder.children) {
        items = folder.children;
      } else {
        return [];
      }
    }

    return items;
  }

  getBreadcrumbs(): string {
    const space = this.api.getCurrentSpace();
    if (!space) return '';

    if (this.currentPath.length === 0) {
      return space.name;
    }

    return `${space.name} > ${this.currentPath.join(' > ')}`;
  }

  getTreeItem(element: FileTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: FileTreeItem): Promise<FileTreeItem[]> {
    if (!this.api.isAuthenticated()) {
      return [];
    }

    const space = this.api.getCurrentSpace();
    if (!space) {
      return [];
    }

    // If no tree loaded yet, load it
    if (this.tree.length === 0) {
      await this.loadTree();
    }

    // Root level - show current directory items
    if (!element) {
      const items = this.getCurrentItems();
      return items.map(item => new FileTreeItem(
        item.name,
        item.type === 'folder' ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
        item,
        this.currentPath.join('/')
      ));
    }

    // Folder level - show children
    if (element.itemData.type === 'folder' && element.itemData.children) {
      return element.itemData.children.map(item => new FileTreeItem(
        item.name,
        item.type === 'folder' ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
        item,
        element.itemData.path
      ));
    }

    return [];
  }
}
