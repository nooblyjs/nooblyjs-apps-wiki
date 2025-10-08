import * as vscode from 'vscode';
import { WikiApiClient } from './api/WikiApiClient';
import { LoginWebview } from './webviews/LoginWebview';
import { DocumentViewer } from './webviews/DocumentViewer';
import { FileTreeProvider } from './providers/FileTreeProvider';
import { RecentFilesProvider } from './providers/RecentFilesProvider';
import { StarredFilesProvider } from './providers/StarredFilesProvider';
import { SearchProvider } from './providers/SearchProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('NooblyJS Wiki extension is now active');

  // Initialize API client
  const api = new WikiApiClient(context);

  // Initialize webviews
  const loginWebview = new LoginWebview(context, api);
  const documentViewer = new DocumentViewer(context, api);

  // Initialize tree providers
  const fileTreeProvider = new FileTreeProvider(api);
  const recentFilesProvider = new RecentFilesProvider(api);
  const starredFilesProvider = new StarredFilesProvider(api);
  const searchProvider = new SearchProvider(api);

  // Register tree views
  vscode.window.registerTreeDataProvider('nooblyjs-wiki.explorer', fileTreeProvider);
  vscode.window.registerTreeDataProvider('nooblyjs-wiki.recent', recentFilesProvider);
  vscode.window.registerTreeDataProvider('nooblyjs-wiki.starred', starredFilesProvider);
  vscode.window.registerTreeDataProvider('nooblyjs-wiki.search', searchProvider);

  // Check authentication status on startup
  api.checkAuth().then(isAuth => {
    if (isAuth) {
      vscode.commands.executeCommand('nooblyjs-wiki.refresh');
    }
  });

  // Register commands

  // Login command
  context.subscriptions.push(
    vscode.commands.registerCommand('nooblyjs-wiki.login', () => {
      loginWebview.show();
    })
  );

  // Logout command
  context.subscriptions.push(
    vscode.commands.registerCommand('nooblyjs-wiki.logout', async () => {
      await api.logout();
      fileTreeProvider.refresh();
      recentFilesProvider.refresh();
      starredFilesProvider.refresh();
      searchProvider.clearSearch();
      vscode.window.showInformationMessage('Logged out from NooblyJS Wiki');
    })
  );

  // Select space command
  context.subscriptions.push(
    vscode.commands.registerCommand('nooblyjs-wiki.selectSpace', async () => {
      if (!api.isAuthenticated()) {
        vscode.window.showWarningMessage('Please log in first');
        return;
      }

      try {
        const spaces = await api.getSpaces();
        const items = spaces.map(space => ({
          label: space.name,
          description: space.description,
          detail: `${space.documentCount} documents • ${space.type}`,
          space: space
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select a space'
        });

        if (selected) {
          await api.setCurrentSpace(selected.space);
          await fileTreeProvider.loadTree();
          vscode.window.showInformationMessage(`Switched to space: ${selected.space.name}`);
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to load spaces: ${error.message}`);
      }
    })
  );

  // Refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand('nooblyjs-wiki.refresh', async () => {
      if (!api.isAuthenticated()) {
        return;
      }

      fileTreeProvider.refresh();
      await recentFilesProvider.loadRecentFiles();
      await starredFilesProvider.loadStarredFiles();
      vscode.window.showInformationMessage('Refreshed NooblyJS Wiki');
    })
  );

  // Open file command
  context.subscriptions.push(
    vscode.commands.registerCommand('nooblyjs-wiki.openFile', async (item: any) => {
      await documentViewer.openDocument(item);
    })
  );

  // Toggle star command
  context.subscriptions.push(
    vscode.commands.registerCommand('nooblyjs-wiki.toggleStar', async (item: any) => {
      const space = api.getCurrentSpace();
      if (!space) {
        vscode.window.showWarningMessage('No space selected');
        return;
      }

      try {
        // Check if already starred
        const activity = await api.getUserActivity();
        const isStarred = activity.starred.some(f => f.path === item.itemData.path);

        await api.toggleStar(
          item.itemData.path,
          space.name,
          item.itemData.name,
          isStarred ? 'unstar' : 'star'
        );

        await starredFilesProvider.loadStarredFiles();
        vscode.window.showInformationMessage(
          isStarred ? 'Removed from starred' : 'Added to starred'
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to toggle star: ${error.message}`);
      }
    })
  );

  // Search command
  context.subscriptions.push(
    vscode.commands.registerCommand('nooblyjs-wiki.search', async () => {
      await searchProvider.search();
    })
  );

  // Breadcrumb navigation commands (for future use)
  context.subscriptions.push(
    vscode.commands.registerCommand('nooblyjs-wiki.navigateUp', () => {
      fileTreeProvider.navigateUp();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nooblyjs-wiki.navigateToRoot', () => {
      fileTreeProvider.navigateToRoot();
    })
  );

  // Status bar item to show current space
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'nooblyjs-wiki.selectSpace';

  const updateStatusBar = () => {
    const space = api.getCurrentSpace();
    if (space) {
      statusBarItem.text = `$(folder) ${space.name}`;
      statusBarItem.tooltip = `Current Wiki Space: ${space.name}\nClick to change`;
      statusBarItem.show();
    } else if (api.isAuthenticated()) {
      statusBarItem.text = '$(folder) Select Space';
      statusBarItem.tooltip = 'Click to select a wiki space';
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  };

  // Update status bar on space change
  const originalSetSpace = api.setCurrentSpace.bind(api);
  api.setCurrentSpace = async (space: any) => {
    await originalSetSpace(space);
    updateStatusBar();
  };

  // Update status bar on login/logout
  const originalLogin = api.login.bind(api);
  api.login = async (email: string, password: string) => {
    const result = await originalLogin(email, password);
    updateStatusBar();
    return result;
  };

  const originalLogout = api.logout.bind(api);
  api.logout = async () => {
    await originalLogout();
    updateStatusBar();
  };

  updateStatusBar();
  context.subscriptions.push(statusBarItem);

  console.log('NooblyJS Wiki extension commands registered');
}

export function deactivate() {
  console.log('NooblyJS Wiki extension is now deactivated');
}
