import * as vscode from 'vscode';
import { WikiApiClient } from '../api/WikiApiClient';
import { marked } from 'marked';

interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  extension?: string;
  size?: number;
  children?: FileSystemItem[];
}

export class DocumentViewer {
  private panels: Map<string, vscode.WebviewPanel> = new Map();

  constructor(
    private context: vscode.ExtensionContext,
    private api: WikiApiClient
  ) {}

  async openDocument(item: FileSystemItem): Promise<void> {
    const space = this.api.getCurrentSpace();
    if (!space) {
      vscode.window.showErrorMessage('No space selected');
      return;
    }

    const panelKey = `${space.name}:${item.path}`;

    // If panel already exists, reveal it
    if (this.panels.has(panelKey)) {
      this.panels.get(panelKey)?.reveal();
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'nooblyjs-wiki-document',
      item.name,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    this.panels.set(panelKey, panel);

    // Load document content
    try {
      const response = await this.api.getDocumentContent(item.path, space.name);

      if (response.success) {
        // Record visit
        await this.api.recordVisit(item.path, space.name, item.name);

        // Render content based on file type
        const extension = item.extension?.toLowerCase() || '';
        panel.webview.html = this.getDocumentHtml(item, response, extension);
      } else {
        panel.webview.html = this.getErrorHtml('Failed to load document');
      }
    } catch (error: any) {
      panel.webview.html = this.getErrorHtml(error.message || 'Failed to load document');
    }

    // Handle panel disposal
    panel.onDidDispose(
      () => {
        this.panels.delete(panelKey);
      },
      null,
      this.context.subscriptions
    );

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'toggleStar':
            await this.handleToggleStar(item.path, space.name, item.name, message.isStarred);
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  private async handleToggleStar(path: string, spaceName: string, title: string, isStarred: boolean): Promise<void> {
    try {
      await this.api.toggleStar(path, spaceName, title, isStarred ? 'unstar' : 'star');
      vscode.window.showInformationMessage(isStarred ? 'Removed from starred' : 'Added to starred');
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to toggle star: ${error.message}`);
    }
  }

  private getDocumentHtml(item: FileSystemItem, response: any, extension: string): string {
    const baseStyles = this.getBaseStyles();

    // Markdown files
    if (extension === 'md' && response.html) {
      return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${item.name}</title>
    ${baseStyles}
    <style>
        .markdown-body {
            padding: 20px;
            max-width: 900px;
            margin: 0 auto;
        }
    </style>
</head>
<body>
    ${this.getToolbar(item)}
    <div class="markdown-body">
        ${response.html}
    </div>
</body>
</html>`;
    }

    // Code files
    if (['js', 'ts', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'rb', 'php', 'sh', 'json', 'xml', 'yml', 'yaml', 'html', 'css'].includes(extension)) {
      const language = this.getLanguageForExtension(extension);
      return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${item.name}</title>
    ${baseStyles}
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <style>
        .code-container {
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        pre {
            margin: 0;
            border-radius: 6px;
            overflow: auto;
        }
        code {
            font-family: 'Consolas', 'Monaco', monospace;
        }
    </style>
</head>
<body>
    ${this.getToolbar(item)}
    <div class="code-container">
        <pre><code class="language-${language}">${this.escapeHtml(response.content || '')}</code></pre>
    </div>
    <script>hljs.highlightAll();</script>
</body>
</html>`;
    }

    // Text files
    if (['txt', 'log'].includes(extension)) {
      return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${item.name}</title>
    ${baseStyles}
    <style>
        .text-container {
            padding: 20px;
            max-width: 900px;
            margin: 0 auto;
        }
        pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: 'Consolas', 'Monaco', monospace;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    ${this.getToolbar(item)}
    <div class="text-container">
        <pre>${this.escapeHtml(response.content || '')}</pre>
    </div>
</body>
</html>`;
    }

    // Image files
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(extension)) {
      return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${item.name}</title>
    ${baseStyles}
    <style>
        .image-container {
            padding: 20px;
            text-align: center;
        }
        img {
            max-width: 100%;
            height: auto;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
    </style>
</head>
<body>
    ${this.getToolbar(item)}
    <div class="image-container">
        <img src="data:image/${extension};base64,${response.content}" alt="${item.name}">
    </div>
</body>
</html>`;
    }

    // PDF files
    if (extension === 'pdf') {
      return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${item.name}</title>
    ${baseStyles}
    <style>
        .pdf-container {
            padding: 20px;
            height: calc(100vh - 100px);
        }
        embed {
            width: 100%;
            height: 100%;
            border: none;
        }
    </style>
</head>
<body>
    ${this.getToolbar(item)}
    <div class="pdf-container">
        <embed src="data:application/pdf;base64,${response.content}" type="application/pdf">
    </div>
</body>
</html>`;
    }

    // Unsupported file type
    return this.getErrorHtml(`Unsupported file type: ${extension}`);
  }

  private getToolbar(item: FileSystemItem): string {
    return `
    <div class="toolbar">
        <div class="toolbar-left">
            <span class="file-icon">${this.getFileIconSvg(item.extension || '')}</span>
            <span class="file-name">${item.name}</span>
        </div>
        <div class="toolbar-right">
            <button class="star-btn" onclick="toggleStar()" id="starBtn">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                </svg>
            </button>
        </div>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        let isStarred = false;

        function toggleStar() {
            isStarred = !isStarred;
            updateStarButton();
            vscode.postMessage({
                command: 'toggleStar',
                isStarred: isStarred
            });
        }

        function updateStarButton() {
            const btn = document.getElementById('starBtn');
            if (isStarred) {
                btn.style.color = 'var(--vscode-button-background)';
            } else {
                btn.style.color = 'var(--vscode-foreground)';
            }
        }
    </script>`;
  }

  private getBaseStyles(): string {
    return `<style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
        }

        .toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 20px;
            background-color: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .toolbar-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .file-icon {
            display: flex;
            align-items: center;
        }

        .file-name {
            font-weight: 500;
            font-size: 14px;
        }

        .star-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 6px;
            display: flex;
            align-items: center;
            color: var(--vscode-foreground);
        }

        .star-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
            border-radius: 4px;
        }
    </style>`;
  }

  private getFileIconSvg(extension: string): string {
    // Return simple file icon SVG
    return `<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
    </svg>`;
  }

  private getLanguageForExtension(extension: string): string {
    const langMap: { [key: string]: string } = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'go': 'go',
      'rs': 'rust',
      'rb': 'ruby',
      'php': 'php',
      'sh': 'bash',
      'json': 'json',
      'xml': 'xml',
      'yml': 'yaml',
      'yaml': 'yaml',
      'html': 'html',
      'css': 'css'
    };
    return langMap[extension] || extension;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private getErrorHtml(message: string): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Error</title>
    ${this.getBaseStyles()}
    <style>
        .error-container {
            padding: 40px;
            text-align: center;
        }
        .error-message {
            color: var(--vscode-errorForeground);
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-message">${message}</div>
    </div>
</body>
</html>`;
  }
}
