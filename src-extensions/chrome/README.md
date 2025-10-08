# NooblyJS Wiki Chrome Extension

A read-only Chrome extension for accessing your NooblyJS Wiki documentation directly from your browser.

## Features

- **Secure Login** - Authenticate with your wiki credentials
- **Space Selection** - Choose from available documentation spaces
- **File Navigation** - Browse folders and files with breadcrumb navigation
- **Multiple File Viewers** - Support for markdown, code, text, images, and PDF files
- **Search** - Full-text search across your documentation
- **Recent Files** - Quick access to recently viewed documents
- **Starred Files** - Mark important documents for easy access
- **Consistent UI** - Matches the main wiki application design

## Installation

### Step 1: Prepare Icon Files

Before installing, you need to create the icon files. You can:

1. Use the provided `icon.svg` in the `icons/` folder
2. Convert it to PNG at three sizes (16x16, 48x48, 128x128)
3. Save them as `icon16.png`, `icon48.png`, and `icon128.png` in the `icons/` folder

See `icons/README.md` for detailed instructions.

### Step 2: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extensions/chrome` folder
5. The extension should now appear in your extensions list

## Usage

### First Time Setup

1. Click the extension icon in your Chrome toolbar
2. Enter your wiki server URL (e.g., `http://localhost:3002`)
3. Enter your username and password
4. Click "Sign In"

### Selecting a Space

After login, you'll see a list of available spaces:
- **Personal Space** - Your private documents
- **Shared Space** - Team collaboration documents
- **Read-Only Space** - Reference materials

Click on any space to browse its contents.

### Navigating Files

The extension has four tabs:

#### Files Tab
- Browse folders and documents in the selected space
- Click folders to navigate into them
- Use breadcrumbs to navigate back up
- Click files to view them

#### Recent Tab
- See your recently viewed documents
- Click any file to open it

#### Starred Tab
- View documents you've starred
- Click any file to open it

#### Search Tab
- Type to search across all documents in the current space
- Results appear as you type
- Click any result to open the document

### Viewing Documents

When viewing a document:
- Click the back arrow to return to the file list
- Click the star icon to star/unstar the document
- The extension automatically renders:
  - Markdown files with full formatting
  - Code files with syntax highlighting
  - Text files as plain text
  - Images inline
  - PDFs in an iframe

### Logging Out

Click the logout icon (top right) in the space selection view to sign out.

## Limitations

This is a **read-only** extension. You cannot:
- Create new documents
- Edit existing documents
- Delete files or folders
- Create new spaces

For editing, please use the main wiki application.

## Troubleshooting

### Cannot Connect to Server

- Verify the server URL is correct
- Make sure the wiki application is running
- Check if you need to enable CORS for the extension

### Login Failed

- Double-check your username and password
- Ensure your user account has access to the wiki
- Check the browser console for error messages

### Files Not Loading

- Verify you have permissions for the selected space
- Check your network connection
- Try refreshing the extension (close and reopen)

### Images or PDFs Not Displaying

- Ensure the wiki server is accessible
- Check browser console for CORS errors
- Verify the file exists on the server

## Development

### File Structure

```
extensions/chrome/
├── manifest.json          # Extension configuration
├── popup.html            # Main UI
├── css/
│   └── style.css         # Styling matching wiki app
├── js/
│   ├── api.js           # API client for wiki backend
│   └── popup.js         # Main extension logic
└── icons/
    ├── icon16.png       # 16x16 icon
    ├── icon48.png       # 48x48 icon
    └── icon128.png      # 128x128 icon
```

### API Endpoints Used

The extension communicates with these wiki API endpoints:

- `POST /applications/wiki/login` - Authentication
- `GET /applications/wiki/api/auth/check` - Session validation
- `GET /applications/wiki/api/spaces` - List spaces
- `GET /applications/wiki/api/spaces/:id/folders` - List files/folders
- `GET /applications/wiki/api/documents/content` - Get file content
- `GET /applications/wiki/api/search` - Search documents
- `GET /applications/wiki/api/user/activity` - Get recent/starred files
- `POST /applications/wiki/api/user/star` - Star/unstar documents
- `POST /applications/wiki/api/user/visit` - Track document visits

## Version History

### 1.0.0 (2025-10-02)
- Initial release
- Login and authentication
- Space selection
- File browsing with breadcrumbs
- Document viewing (markdown, code, text, images, PDF)
- Search functionality
- Recent files tracking
- Starred files support

## License

This extension is part of the NooblyJS Wiki application project.

## Support

For issues or questions, please refer to the main NooblyJS Wiki documentation.
