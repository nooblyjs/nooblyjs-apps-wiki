import * as vscode from 'vscode';
import { WikiApiClient } from '../api/WikiApiClient';

export class LoginWebview {
  private panel: vscode.WebviewPanel | undefined;
  private api: WikiApiClient;

  constructor(private context: vscode.ExtensionContext, api: WikiApiClient) {
    this.api = api;
  }

  public show(): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'nooblyjs-wiki-login',
      'NooblyJS Wiki - Login',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    this.panel.webview.html = this.getHtmlContent();

    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'login':
            await this.handleLogin(message.email, message.password);
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );

    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      undefined,
      this.context.subscriptions
    );
  }

  private async handleLogin(email: string, password: string): Promise<void> {
    try {
      const response = await this.api.login(email, password);

      if (response.success) {
        vscode.window.showInformationMessage('Successfully logged in to NooblyJS Wiki');

        // Close login panel
        if (this.panel) {
          this.panel.dispose();
        }

        // Refresh all views
        await vscode.commands.executeCommand('nooblyjs-wiki.refresh');
      } else {
        this.panel?.webview.postMessage({
          command: 'loginError',
          message: response.message || 'Login failed'
        });
      }
    } catch (error: any) {
      this.panel?.webview.postMessage({
        command: 'loginError',
        message: error.message || 'Login failed'
      });
    }
  }

  private getHtmlContent(): string {
    const config = vscode.workspace.getConfiguration('nooblyjs-wiki');
    const serverUrl = config.get<string>('serverUrl') || 'http://localhost:3002';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NooblyJS Wiki - Login</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            max-width: 400px;
            margin: 0 auto;
        }

        .login-container {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 24px;
            margin-top: 40px;
        }

        .logo {
            text-align: center;
            margin-bottom: 24px;
        }

        .logo-icon {
            width: 64px;
            height: 64px;
            background-color: var(--vscode-button-background);
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: bold;
            color: var(--vscode-button-foreground);
        }

        h1 {
            text-align: center;
            font-size: 24px;
            margin: 16px 0 8px 0;
            color: var(--vscode-foreground);
        }

        .subtitle {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 24px;
            font-size: 14px;
        }

        .form-group {
            margin-bottom: 16px;
        }

        label {
            display: block;
            margin-bottom: 6px;
            font-size: 13px;
            font-weight: 500;
            color: var(--vscode-foreground);
        }

        input {
            width: 100%;
            padding: 8px 12px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-size: 13px;
            box-sizing: border-box;
        }

        input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .btn {
            width: 100%;
            padding: 10px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            margin-top: 8px;
        }

        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .error-message {
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-errorForeground);
            padding: 8px 12px;
            border-radius: 4px;
            margin-bottom: 16px;
            font-size: 13px;
            display: none;
        }

        .error-message.show {
            display: block;
        }

        .server-info {
            text-align: center;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--vscode-panel-border);
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <div class="logo-icon">W</div>
        </div>

        <h1>NooblyJS Wiki</h1>
        <p class="subtitle">Sign in to access your documentation</p>

        <div id="errorMessage" class="error-message"></div>

        <form id="loginForm">
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" placeholder="Enter your email" required autocomplete="email">
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" placeholder="Enter your password" required autocomplete="current-password">
            </div>

            <button type="submit" class="btn" id="loginBtn">Sign In</button>
        </form>

        <div class="server-info">
            Connected to: ${serverUrl}
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const form = document.getElementById('loginForm');
        const loginBtn = document.getElementById('loginBtn');
        const errorMessage = document.getElementById('errorMessage');

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (!email || !password) {
                showError('Please enter both email and password');
                return;
            }

            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in...';
            hideError();

            vscode.postMessage({
                command: 'login',
                email: email,
                password: password
            });
        });

        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'loginError':
                    showError(message.message);
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Sign In';
                    break;
            }
        });

        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.classList.add('show');
        }

        function hideError() {
            errorMessage.classList.remove('show');
        }

        // Focus email input on load
        document.getElementById('email').focus();
    </script>
</body>
</html>`;
  }
}
