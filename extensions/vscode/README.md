# NooblyJS Wiki - VS Code Extension

Read-only access to your NooblyJS Wiki documentation directly from VS Code.

## Features

- **Authentication**: Secure login with your wiki credentials
- **Space Management**: Browse and switch between different wiki spaces
- **File Explorer**: Navigate folders and files in a tree view
- **Document Viewer**: View markdown, code, text, images, and PDF files
- **Search**: Full-text search across all documents
- **Recent Files**: Quick access to recently viewed documents
- **Starred Files**: Mark and access your favorite documents
- **Read-Only**: Safe browsing without editing capabilities

## Installation

### From VSIX (Development)

1. Download the `.vsix` file
2. Open VS Code
3. Go to Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
4. Click the `...` menu at the top
5. Select "Install from VSIX..."
6. Choose the downloaded `.vsix` file

### From Source

1. Clone the repository
2. Navigate to `extensions/vscode`
3. Run `npm install`
4. Run `npm run compile`
5. Press `F5` to open a new VS Code window with the extension loaded

## Usage

### Getting Started

1. **Login**
   - Click the "Sign In" icon in the NooblyJS Wiki sidebar
   - Enter your email and password
   - Click "Sign In"

2. **Select a Space**
   - Click the folder icon in the Files view title bar
   - Choose a space from the list

3. **Browse Files**
   - Navigate folders in the tree view
   - Click files to view them
   - Use the star icon to mark favorites

4. **Search**
   - Click the search icon in the Search view
   - Enter your search query
   - Click results to open documents

### Views

#### Files Explorer
- Browse folders and files in the current space
- Click folders to expand/collapse
- Click files to view content
- Right-click files to star/unstar

#### Recent Files
- Shows recently viewed documents
- Click to reopen

#### Starred Files
- Shows your starred documents
- Quick access to favorites

#### Search
- Full-text search across documents
- Filter by current space
- Click results to open

### Commands

Access commands via Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- `NooblyJS Wiki: Login` - Show login screen
- `NooblyJS Wiki: Logout` - Sign out
- `NooblyJS Wiki: Select Space` - Choose a wiki space
- `NooblyJS Wiki: Refresh` - Reload all views
- `NooblyJS Wiki: Search` - Search documents

### Configuration

Set your wiki server URL in settings:

```json
{
  "nooblyjs-wiki.serverUrl": "http://localhost:3002"
}
```

## Supported File Types

### Documents
- **Markdown** (`.md`) - Rendered with syntax highlighting
- **Text** (`.txt`, `.log`) - Plain text viewer
- **Code Files** - JavaScript, TypeScript, Python, Java, C/C++, Go, Rust, Ruby, PHP, HTML, CSS, JSON, YAML, XML
- **Images** (`.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`)
- **PDF** (`.pdf`) - Embedded viewer

## Requirements

- VS Code 1.75.0 or higher
- Access to a NooblyJS Wiki server
- Valid wiki user credentials

## Development

### Project Structure

```
extensions/vscode/
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── api/
│   │   └── WikiApiClient.ts      # API communication
│   ├── providers/
│   │   ├── FileTreeProvider.ts   # File explorer
│   │   ├── RecentFilesProvider.ts
│   │   ├── StarredFilesProvider.ts
│   │   └── SearchProvider.ts
│   └── webviews/
│       ├── LoginWebview.ts       # Login UI
│       └── DocumentViewer.ts     # Document rendering
├── media/
│   ├── icon.svg                  # Extension icon
│   └── refresh.svg
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-compile)
npm run watch

# Package extension
vsce package
```

### Testing

1. Open the extension folder in VS Code
2. Press `F5` to launch Extension Development Host
3. Test all features in the new window

## Troubleshooting

### Cannot login
- Verify server URL in settings
- Check server is running
- Verify credentials are correct
- Check browser console for errors

### Files not loading
- Ensure you selected a space
- Click the refresh icon
- Check server connectivity

### Search not working
- Ensure you're logged in
- Verify server has search enabled
- Try refreshing the extension

## Known Limitations

- Read-only access (no editing)
- Requires active server connection
- Session may expire after inactivity

## License

See main project license.

## Support

For issues and feature requests, please contact the NooblyJS Wiki team.
