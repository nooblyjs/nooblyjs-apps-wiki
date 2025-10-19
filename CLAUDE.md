# NooblyJS Wiki Application - Claude Code Guide

This document provides specific guidance for working with the NooblyJS Wiki Application using Claude Code.

## Project Overview

**Project Name:** NooblyJS Wiki Application
**Version:** CLI 1.0.2 / App 1.0.14
**Type:** Collaborative Documentation and Knowledge Management Platform

The NooblyJS Wiki Application is a fully-featured collaborative documentation and knowledge management platform built on the NooblyJS framework that enables teams to create, organize, search, and manage documentation across multiple collaborative workspaces with permission controls and dynamic content generation capabilities.

### Core Purpose
- Create and manage organized documentation across multiple workspaces (Personal, Shared, Read-Only)
- Enable full-text search and tag-based organization of documents
- Support multiple file types (Markdown, PDF, Images, Code, Word, Excel, PowerPoint)
- Execute custom JavaScript code in documents for dynamic content generation
- Provide real-time collaboration with permission controls
- Support multiple authentication methods (Google OAuth, Local)
- Enable programmatic access through global document APIs

## Development Commands

### Essential Scripts
- `npm start` - Production server (port 3002)
- `npm run dev:web` - Development with auto-reload (nodemon)
- `npm run kill` - Stop server on port 3002
- `npm run electron` - Run Electron desktop application
- `npm run electron:build` - Build Electron desktop app

### Testing & Quality
Currently no specific test or lint commands are configured. Consider adding:
- `npm run test` - Run test suite
- `npm run lint` - Code linting
- `npm run typecheck` - Type checking

## Architecture Overview

### Technology Stack

#### Backend
- **Runtime:** Node.js (>= 14.0.0)
- **Web Framework:** Express.js 4.18.2
- **Service Layer:** NooblyJS Core 1.0.7 (service registry pattern)
- **Authentication:** Passport.js 0.7.0 with Google OAuth 2.0 and local strategy
- **Real-time:** Socket.IO 4.8.1
- **Session Management:** express-session 1.17.3

#### Frontend
- **UI Framework:** Bootstrap 5
- **JavaScript:** Vanilla JavaScript (ES6+) with module-based architecture
- **Template Engine:** EJS for server-side rendering
- **HTTP Client:** Fetch API with custom APIClient wrapper

#### Data & Storage
- **Primary Storage:** JSON files in `./.application/wiki-data/`
- **Document Files:** Separate markdown/text files in `./.application/wiki-files/`
- **Caching:** In-memory cache (configurable)
- **Search:** In-memory search indexing (configurable)

#### File Processing
- **PDF:** pdf-parse, pdf-to-img
- **Word Documents:** mammoth
- **Excel:** xlsx
- **PowerPoint:** pptx2json, pptx-parser
- **File Upload:** multer
- **File Watching:** chokidar

#### Extensions
- **Desktop:** Electron 38.2.0 with electron-builder
- **VS Code Extension:** Wiki access from VS Code
- **Chrome Extension:** Browser-based wiki access
- **Daemon Extension:** Folder monitoring and sync service

### Core Structure
- **Entry Point**: `app.js` - Express server with NooblyJS service registry
- **Wiki Factory**: `src/index.js` - Wiki application initialization
- **Port**: 3002 (configurable via PORT env var)
- **Authentication**: Passport.js with Google OAuth and local strategy
- **Data Storage**: JSON files in `./.application/wiki-data/` directory (configurable)
- **File Storage**: Document files in `./.application/wiki-files/` directory (configurable)

### Service Registry Integration
The application heavily relies on NooblyJS Core services:
- `serviceRegistry.logger('console')` - Logging
- `serviceRegistry.cache('memory')` - Caching
- `serviceRegistry.dataServe('memory')` - Data management
- `serviceRegistry.filing('local')` - File operations
- `serviceRegistry.queue('memory')` - Background tasks
- `serviceRegistry.searching('memory')` - Search functionality

## Project Structure

```
nooblyjs-apps-wiki/
├── app.js                              # Express server initialization
├── index.js                            # Wiki factory (entry point)
├── app-electron.js                     # Electron app entry point
│
├── src/
│   ├── index.js                        # Wiki application factory
│   ├── auth/                           # Authentication system
│   │   ├── passport-config.js          # Passport strategies setup
│   │   ├── middleware.js               # Auth middleware
│   │   ├── components/                 # UserManager
│   │   └── routes/                     # Auth routes
│   │
│   ├── routes/                         # API endpoints
│   │   ├── index.js                    # Route registration hub
│   │   ├── documentRoutes.js           # Document CRUD operations
│   │   ├── spacesRoutes.js             # Space management
│   │   ├── searchRoutes.js             # Search functionality
│   │   ├── navigationRoutes.js         # Navigation and folder operations
│   │   ├── userRoutes.js               # User profiles and management
│   │   ├── wizardRoutes.js             # Setup wizard
│   │   ├── settingsRoutes.js           # User settings
│   │   ├── aiChatRoutes.js             # AI chat integration
│   │   └── aiContextRoutes.js          # AI context (deprecated)
│   │
│   ├── views/                          # Frontend (EJS templates and JS)
│   │   ├── index.html                  # Main application page
│   │   ├── wizard.html                 # Setup wizard page
│   │   ├── index.js                    # Views configuration
│   │   ├── js/wizard.js                # Wizard client-side logic
│   │   └── js/modules/                 # Feature modules
│   │       ├── documentcontroller.js   # Document viewing and editing
│   │       ├── navigationcontroller.js # File tree and navigation
│   │       ├── searchcontroller.js     # Search UI
│   │       ├── spacescontroller.js     # Space management UI
│   │       ├── usercontroller.js       # User profile UI
│   │       ├── settingscontroller.js   # Settings UI
│   │       ├── templatescontroller.js  # Template management
│   │       ├── aichatcontroller.js     # AI chat UI
│   │       ├── apiClient.js            # Unified API client
│   │       └── assistantcontroller.js  # Assistant features
│   │
│   ├── components/                     # Core application components
│   │   ├── dataManager.js              # JSON file persistence layer
│   │   └── aiService.js                # AI service integration
│   │
│   ├── activities/                     # Background tasks
│   │   ├── taskProcessor.js            # Queue task processing
│   │   ├── fileWatcher.js              # File system monitoring
│   │   ├── searchIndexer.js            # Search index management
│   │   └── documentContent.js          # Document file operations
│   │
│   ├── initialisation/                 # Setup and initialization
│   │   ├── initialiseWikiData.js       # Wiki data initialization
│   │   ├── documentContent.js          # Document file initialization
│   │   └── spaces-template.json        # Default spaces configuration
│   │
│   ├── processing/                     # File type processors
│   │   ├── pdfprocessor.js            # PDF processing
│   │   ├── docxprocessor.js           # Word document processing
│   │   ├── xlsxprocessor.js           # Excel processing
│   │   └── pptxprocessor.js           # PowerPoint processing
│   │
│   └── utils/
│       └── fileTypeUtils.js            # File type utilities
│
├── src-extensions/                     # Extensions to the wiki
│   ├── daemon/                         # Folder monitoring daemon
│   ├── vscode/                        # VS Code extension
│   └── chrome/                        # Chrome extension
│
├── public/                             # Static assets (CSS, images, icons)
├── .application/                       # Application data directory
│   ├── wiki-data/                     # JSON data files
│   │   ├── spaces.json               # Space configurations
│   │   ├── documents.json            # Document metadata
│   │   ├── users.json                # User accounts
│   │   └── aiSettings_*.json         # User AI settings
│   └── wiki-files/                   # Document content files
│
├── documents/                          # Personal space (default)
├── documents-shared/                   # Shared space (default)
├── documents-readonly/                 # Read-only space (default)
│
├── data/                              # Runtime data directory
├── docs/                              # Documentation
│
├── package.json                        # Project configuration
├── README.md                           # User documentation
└── CLAUDE.md                          # Claude development guide
```

## Key Files & Directories

### Core Application Files
- `app.js` - Express server initialization and service registry setup
- `src/index.js` - Wiki application factory and initialization
- `src/auth/` - Authentication system (Passport.js, Google OAuth)

### Wiki Components
- `src/components/dataManager.js` - JSON file data persistence
- `src/components/aiService.js` - AI service integration
- `src/activities/documentContent.js` - Document file operations
- `src/activities/taskProcessor.js` - Background queue task processing
- `src/activities/fileWatcher.js` - File system monitoring

### Routes & Views
- `src/routes/index.js` - Route registration hub
- `src/routes/documentRoutes.js` - Document CRUD API
- `src/routes/spacesRoutes.js` - Space management API
- `src/routes/searchRoutes.js` - Search functionality API
- `src/routes/navigationRoutes.js` - Navigation and folder operations
- `src/routes/userRoutes.js` - User profiles and management
- `src/routes/wizardRoutes.js` - Setup wizard routes
- `src/routes/aiChatRoutes.js` - AI chat integration
- `src/views/` - Frontend views (EJS templates) and client-side JavaScript

### File Processing
- `src/processing/pdfprocessor.js` - PDF file handling
- `src/processing/docxprocessor.js` - Word document handling
- `src/processing/xlsxprocessor.js` - Excel spreadsheet handling
- `src/processing/pptxprocessor.js` - PowerPoint presentation handling

### Data Storage
- `./.application/wiki-data/` - JSON data files
  - `documents.json` - Document metadata
  - `spaces.json` - Space configurations
  - `users.json` - User account data
  - `aiSettings_*.json` - User AI settings
- `./.application/wiki-files/` - Document content files

## Key Features & Capabilities

### Document Management
- **Rich Markdown Editing:** Full-featured markdown editor with live preview
- **Multiple File Types:** Support for PDF, Word, Excel, PowerPoint, images, and code files
- **Document Templates:** Custom templates for consistent documentation
- **Full-text Search:** Instant search across all documents and spaces
- **Tag-based Organization:** Tag filtering and organization
- **Folder Hierarchies:** Structured content organization with nested folders
- **Recent & Starred:** Quick access to frequently used documents

### Multi-Space Workspaces
- **Personal Spaces:** Private, read-write workspaces for individual notes
- **Shared Spaces:** Team collaboration areas with read-write access
- **Read-Only Spaces:** Reference materials and official documentation
- **Dynamic UI:** Interface adapts based on space permissions

### Advanced Features
- **Wiki-Code Execution:** Execute JavaScript code blocks in markdown for dynamic content
- **Document API:** Programmatic access via `window.documents` and `window.currentDocuments`
- **Real-time Search:** Fast in-memory full-text search with tag filtering
- **AI Context Generation:** Automatic AI-powered context files for folders and documents
- **Background Processing:** Queue-based async task processing (5-second intervals)
- **File Watching:** Automatic detection and indexing of file changes
- **Socket.IO Integration:** Real-time bidirectional communication

### Authentication & Permissions
- **Multiple Auth Methods:** Google OAuth 2.0 and local authentication
- **Session Management:** express-session with configurable storage
- **Permission Controls:** Space-level read/write and read-only permissions
- **User Isolation:** User-specific data and workspace separation

### Extensions
- **Desktop App:** Electron-based desktop application with native features
- **VS Code Integration:** Access wiki documentation from VS Code
- **Chrome Extension:** Browser-based wiki access
- **Daemon Service:** Automated folder monitoring and content synchronization

## Development Guidelines

### Code Conventions
- **Style**: Standard Node.js/Express patterns
- **Dependencies**: Check `package.json` for available libraries
- **Error Handling**: Use NooblyJS logger service
- **File Operations**: Use NooblyJS filing service, not direct fs calls

### Common Patterns
1. **Application Structure**:
   ```
   src/
   ├── index.js          # Wiki factory function
   ├── routes/           # API endpoints
   ├── views/            # Frontend
   ├── components/       # Core functionality (DataManager)
   └── activities/       # Background tasks (document processing, queue tasks)
   ```

2. **Service Injection**: The wiki factory receives configuration and services:
   ```javascript
   module.exports = (options, eventEmitter, serviceRegistry) => {
     // Initialize services with providers
     const filing = serviceRegistry.filing(filerProvider, { baseDir: filesDir });
     const dataManager = new DataManager(dataDirectory, filing);
     const logger = serviceRegistry.logger(loggerProvider);
     const cache = serviceRegistry.cache(cacheProvider);
     const queue = serviceRegistry.queue(queueProvider);
     const search = serviceRegistry.searching(searchProvider);
   }
   ```

3. **Data Management**: Use DataManager for JSON persistence:
   ```javascript
   const dataManager = new DataManager(dataDirectory, filing);
   const documents = await dataManager.read('documents');
   await dataManager.write('documents', documentsData);
   const spaces = await dataManager.read('spaces');
   await dataManager.write('spaces', spacesData);
   ```

4. **Default Spaces**: Three default spaces are created on initialization:
   - **Personal Space** (id: 1) - Private documents, read-write permissions
   - **Shared Space** (id: 2) - Team collaboration, read-write permissions
   - **Read-Only Space** (id: 3) - Reference materials, read-only permissions

5. **Custom Code Injection**: The platform supports dynamic content generation through wiki-code blocks:
   ```markdown
   ```wiki-code
   function() {
     return "Hello World";
   }
   ```
   ```
   - Code is executed in `src/views/js/modules/documentcontroller.js:processWikiCodeBlocks()`
   - Provides access to `window.documents` and `window.currentDocuments` global arrays
   - Arrays populated in `src/views/js/modules/navigationcontroller.js:populateWindowDocuments()`
   - Enables dynamic navigation, statistics, dashboards, and custom content generation

## API Endpoints

### Authentication Routes
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/check` - Check authentication status

### Space Management
- `GET /applications/wiki/api/spaces` - List all spaces
- `POST /applications/wiki/api/spaces` - Create new space
- `GET /applications/wiki/api/spaces/:id/documents` - Get documents in space
- `GET /applications/wiki/api/spaces/:id/folders` - Get folder tree structure
- `GET /applications/wiki/api/spaces/:id` - Get space details

### Document Operations
- `GET /applications/wiki/api/documents` - List all documents
- `POST /applications/wiki/api/documents` - Create new document
- `GET /applications/wiki/api/documents/:id` - Get document details
- `GET /applications/wiki/api/documents/content` - Get document content (with query params)
- `PUT /applications/wiki/api/documents/:id` - Update document
- `DELETE /applications/wiki/api/documents/:id` - Delete document
- `GET /applications/wiki/api/documents/:id/versions` - Get document version history

### Search & Navigation
- `GET /applications/wiki/api/search` - Full-text search (query params: `q`, `spaceId`)
- `GET /applications/wiki/api/navigation/folder/:path` - Get folder contents
- `POST /applications/wiki/api/navigation/folders` - Create new folder
- `DELETE /applications/wiki/api/navigation/folder/:path` - Delete folder

### User Management
- `GET /applications/wiki/api/profile` - Get current user profile
- `PUT /applications/wiki/api/profile` - Update user profile
- `GET /applications/wiki/api/user/activity` - Get user activity log
- `GET /applications/wiki/api/users/:id` - Get user details

### Setup & Configuration
- `GET /applications/wiki/api/wizard/check` - Check if setup wizard completed
- `GET /applications/wiki/api/wizard/config` - Get default spaces template
- `POST /applications/wiki/api/wizard/initialize` - Initialize default spaces

### Settings
- `GET /applications/wiki/api/settings` - Get user settings
- `PUT /applications/wiki/api/settings` - Update user settings
- `GET /applications/wiki/api/settings/theme` - Get theme settings
- `PUT /applications/wiki/api/settings/theme` - Update theme settings

### AI Integration
- `POST /applications/wiki/api/ai/chat` - Send message to AI chat
- `GET /applications/wiki/api/ai/settings` - Get AI settings
- `PUT /applications/wiki/api/ai/settings` - Update AI settings
- `POST /applications/wiki/api/ai/context` - Set AI context (deprecated)

## Custom Code Injection Feature

### Overview
The wiki supports executing JavaScript code blocks directly within markdown documents for dynamic content generation. This powerful feature enables users to create interactive dashboards, dynamic navigation, live statistics, and custom visualizations without modifying the application code.

### Implementation Details

#### Frontend Components
1. **Document Controller** (`src/views/js/modules/documentcontroller.js`)
   - `showMarkdownViewer()` - Calls `processWikiCodeBlocks()` before rendering markdown
   - `togglePreview()` - Applies code execution in live preview mode
   - `processWikiCodeBlocks()` - Regex-based parser that finds and executes wiki-code blocks

2. **Navigation Controller** (`src/views/js/modules/navigationcontroller.js`)
   - `renderFileTree()` - Calls `populateWindowDocuments()` to initialize global arrays
   - `loadFolderContent()` - Updates `window.currentDocuments` when navigating folders
   - `populateWindowDocuments()` - Converts file tree to structured document objects
   - `updateCurrentDocuments()` - Filters documents for current folder context

#### Code Execution Process
1. Regex matches code blocks with `wiki-code` language tag
2. Code is wrapped in `new Function('return ' + code)` for safe execution
3. Function is called twice: `func()()` to execute the user's function
4. Returned string replaces the code block in rendered HTML
5. Errors are caught and displayed as Bootstrap alert messages

#### Global API Objects
```javascript
// Full document tree structure
window.documents = [{
  name: "Folder Name",
  type: "folder" | "document",
  created: "ISO timestamp",
  path: "relative/path",
  space: "space_id",
  icon: "display_icon",
  children: [/* nested items */]
}]

// Current folder contents
window.currentDocuments = [{
  name: "File Name",
  type: "folder" | "document",
  created: "ISO timestamp",
  path: "relative/path",
  space: "space_id",
  icon: "display_icon"
}]
```

### Usage Examples

#### Basic Output
```markdown
```wiki-code
function() {
  return "Hello World from wiki-code!";
}
```
```

#### List Current Folder
```markdown
```wiki-code
function() {
  let html = '<ul>';
  for (let i = 0; i < window.currentDocuments.length; i++) {
    html += '<li>' + window.currentDocuments[i].name + '</li>';
  }
  html += '</ul>';
  return html;
}
```
```

#### Document Statistics
```markdown
```wiki-code
function() {
  let count = 0;
  function countDocs(items) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].type === 'document') count++;
      if (items[i].children) countDocs(items[i].children);
    }
  }
  countDocs(window.documents);
  return '<p>Total Documents: <strong>' + count + '</strong></p>';
}
```
```

### Security Considerations
- Code executes in browser context with full window object access
- No server-side execution or file system access
- User session data is accessible through window object
- XSS protection relies on proper HTML escaping of user input
- Only authenticated users can create/edit documents with code

### Demo Document
See `documents/wiki-code-feature-demo.md` for comprehensive examples including:
- Simple text output
- Dynamic date/time
- Dynamic lists
- Current folder contents
- Document statistics
- Interactive tables

## AI Context Generation Feature

### Overview
The AI Context Generator is an intelligent background service that automatically creates context documentation for folders and files in your wiki. It leverages AI to analyze folder structures and file contents, generating meaningful summaries stored in `.aicontext` hidden directories.

### How It Works

#### Processing Strategy
- **Only processes visible (non-hidden) files and folders** - skips all items starting with `.`
- **Never recurses into `.aicontext` directories** - these are only for storing generated contexts
- **Non-destructive** - never modifies or deletes existing files
- **Incremental** - only creates NEW contexts, never regenerates existing ones

#### Scheduled Execution
- **Runs immediately on startup** (after 2-second initialization delay)
- **Then runs every 60 seconds** on a dedicated scheduler
- Only executes if AI service is configured and ready
- Skips processing if already running (prevents overlaps)
- Logs detailed statistics after each run

#### Folder Context Generation
1. Checks for `{folder}/.aicontext/folder-context.md`
2. If missing, analyzes folder structure:
   - Folder name and purpose
   - File types and count
   - Sample files
   - Subfolder organization
3. Sends analysis prompt to AI
4. Saves AI-generated context to `folder-context.md`

#### File Context Generation
1. For each text-based file (`.md`, `.txt`, `.js`, `.py`, etc.)
2. Checks for `{folder}/.aicontext/{filename}-context.md`
3. If missing:
   - Reads file content (first 5000 chars)
   - Sends to AI with analysis prompt
   - Saves context to `{filename}-context.md`

#### Supported Text File Types
- Markdown: `.md`
- Documentation: `.txt`, `.log`
- Programming: `.js`, `.ts`, `.py`, `.java`, `.cpp`, `.c`, `.go`, `.rb`, `.php`
- Data: `.json`, `.yaml`, `.yml`, `.xml`, `.csv`, `.sql`
- Web: `.html`, `.css`
- Scripts: `.sh`, `.bash`

### Configuration

#### AI Service Requirements
The AI Context Generator requires:
- **AI Service Configured:** Valid provider (Claude, ChatGPT, Ollama, etc.)
- **API Key Set:** Valid credentials for chosen provider
- **Enabled:** AI settings must be enabled in user configuration
- **Ready:** Service must pass readiness check

#### Configuration Files
- AI settings stored in: `./.application/aiSettings_{userId}.json`
- Context files stored in: `{space}/{folder}/.aicontext/`
- Auto-generated contexts are read-only initially

### API Endpoints

#### Manual Trigger
```
POST /applications/wiki/api/ai/generate-contexts
```
Manually trigger AI context generation for all spaces.

**Response:**
```json
{
  "success": true,
  "message": "AI Context generation started in background"
}
```

#### Status Check
```
GET /applications/wiki/api/ai/context-status
```
Check AI context generation status and readiness.

**Response:**
```json
{
  "success": true,
  "isAIReady": true,
  "isProcessing": false,
  "lastProcessedTime": "2025-10-19T10:30:45.123Z"
}
```

### Implementation Details

#### Core Service: AIContextGenerator
**Location:** `src/activities/aiContextGenerator.js`

**Key Methods:**
- `processAllSpaces()` - Main entry point, processes all spaces
- `isAIReady()` - Validates AI service configuration
- `processSpace(space)` - Process individual space
- `processDirectory(dirPath, spaceName)` - Recursively process folders
- `generateFolderContext(dirPath, spaceName, aiContextDir)` - Create folder context
- `processFile(filePath, dirPath, spaceName)` - Create file context

#### Integration Points

**1. AI Context Scheduler** (`index.js:181-224`)
- Dedicated scheduler function
- Runs on startup (after 2-second delay)
- Then every 60 seconds
- Independent from main task queue
- Detailed logging of statistics

**2. Search Routes** (`src/routes/searchRoutes.js`)
- `POST /applications/wiki/api/ai/generate-contexts` - Manual trigger endpoint
- `GET /applications/wiki/api/ai/context-status` - Status check endpoint
- Both integrated with existing search route structure
- Returns AI readiness status

### Usage Examples

#### Automatic Generation
1. Configure AI service in user settings
2. Start the wiki application
3. Watch server logs for startup message: "AI Context generation scheduler started"
4. First run happens automatically within ~2-3 seconds of startup
5. Subsequent runs occur every 60 seconds
6. Check `.aicontext` folders for generated `folder-context.md` and `{filename}-context.md` files

#### Manual Trigger
```bash
curl -X POST http://localhost:3002/applications/wiki/api/ai/generate-contexts
```

#### Check Status
```bash
curl http://localhost:3002/applications/wiki/api/ai/context-status
```

### Example Generated Content

**Folder Context Example:**
```markdown
# Folder Context: utils

The utils folder contains utility functions and helpers for common operations like formatting, validation, and data transformation. It provides reusable code snippets used throughout the project.

---
*Generated automatically by AI Context Generator on 2025-10-19T10:30:45.123Z*
```

**File Context Example:**
```markdown
# File Context: dateFormatter.js

This file exports date formatting utilities including functions to format dates in various formats (ISO, US, European), parse date strings, and calculate date differences. It's a core utility used by document metadata handling.

---
*Generated automatically by AI Context Generator on 2025-10-19T10:30:45.123Z*
```

### Performance Considerations

- **Rate Limiting:** Runs every 60 seconds to avoid overwhelming AI API
- **Content Limiting:** Reads only first 5000 chars of files
- **Skip Existing:** Never regenerates existing context files
- **Error Handling:** Continues processing even if individual files fail
- **Async Processing:** Runs in background without blocking user interactions

### Troubleshooting

#### AI Context Generation Not Running
1. Check AI service is configured: `GET /applications/wiki/api/ai/context-status`
2. Verify `isAIReady` is true
3. Check server logs for errors
4. Manually trigger: `POST /applications/wiki/api/ai/generate-contexts`

#### Missing Context Files
1. Verify `.aicontext` directories are created
2. Check file/folder write permissions
3. Verify AI responses are valid
4. Check logs for API errors

#### High API Usage
- AI context generation only creates NEW contexts
- Existing contexts are never recreated
- To regenerate, delete `.aicontext` folders and re-trigger

## Common Tasks

### Adding New Features
1. Determine if feature is document-related, space-related, or search-related
2. Add API routes in `src/routes/` (create new route file if needed)
3. Register new routes in `src/routes/index.js`
4. Add frontend views in `src/views/` if needed
5. Update data schemas in DataManager if needed
6. Update search indexing in `src/index.js` if needed
7. Test with `npm run dev:web`

### Debugging
- Check browser console for frontend errors
- Server logs appear in terminal when using `npm run dev:web`
- JSON data files in `./.application/wiki-data/` can be inspected directly
- Document files in `./.application/wiki-files/` can be inspected directly
- Queue processing runs every 5 seconds (see background worker in `src/index.js:205`)

### Authentication
- Google OAuth configured in `src/auth/passport-config.js`
- Routes protected with `authMiddleware.js`
- User sessions managed by express-session

## Data Schema

### Wiki Data Files

#### `spaces.json` - Document organization
```javascript
{
  id: Number,              // Unique space identifier
  name: String,            // Space name (e.g., "Personal Space")
  description: String,     // Space description
  icon: String,            // Emoji icon for UI
  visibility: String,      // "private", "team", or "public"
  documentCount: Number,   // Number of documents in space
  path: String,            // Absolute path to document storage
  type: String,            // "personal", "shared", or "readonly"
  permissions: String,     // "read-write" or "read-only"
  createdAt: String,       // ISO timestamp
  updatedAt: String,       // ISO timestamp
  author: String           // Creator username
}
```

#### `documents.json` - Wiki documents metadata
```javascript
{
  id: Number,              // Unique document identifier
  title: String,           // Document title
  spaceName: String,       // Associated space name
  spaceId: Number,         // Associated space ID
  tags: Array<String>,     // Document tags for organization
  excerpt: String,         // Brief summary
  createdAt: String,       // ISO timestamp
  updatedAt: String,       // ISO timestamp
  author: String           // Creator username
}
```

Note: Document content is stored separately as markdown files in `./.application/wiki-files/`

## Environment Setup

### Required Environment Variables
- `PORT` - Server port (default: 3002)
- Google OAuth credentials for authentication (configured in `src/auth/passport-config.js`)

### Configuration Options (passed to wiki factory)
- `dataDirectory` - JSON data storage location (default: `./.application/wiki-data`)
- `filesDir` - Document file storage location (default: `./.application/wiki-files`)
- `cacheProvider` - Cache provider name (default: `memory`)
- `filerProvider` - File service provider (default: `local`)
- `loggerProvider` - Logger provider (default: `console`)
- `queueProvider` - Queue provider (default: `memory`)
- `searchProvider` - Search provider (default: `memory`)

### File System Requirements
- Write access to `./.application/wiki-data/` directory
- Write access to `./.application/wiki-files/` directory
- Write access to space directories (created automatically on initialization)
- Public asset serving from `./public/`

## Troubleshooting

### Common Issues
1. **Port 3002 in use**: Run `npm run kill` or `lsof -ti:3002 | xargs kill -9`
2. **Missing data files**: Application auto-creates default data on first run
3. **Authentication issues**: Check Google OAuth configuration
4. **File permissions**: Ensure write access to data and file directories

### Log Analysis
- Server startup logs indicate successful wiki initialization
- Wiki logs data loading from JSON files
- Queue worker logs task processing every 5 seconds
- Document file initialization logs
- Search index population logs

## Extension Points

### Adding New Document Types
1. Extend document schema in `documents.json`
2. Add new fields to document creation/update routes in `src/routes/documents.js`
3. Update frontend forms in `src/views/` to capture new fields
4. Update search indexing in `src/index.js` if needed

### Adding Custom Spaces
1. Add space creation route in `src/routes/spaces.js`
2. Update space initialization in `src/index.js:64` if default spaces change
3. Create corresponding directories using filing service
4. Update frontend UI to manage custom spaces

### Integrating External Services
- Use NooblyJS service registry pattern
- Add service configuration to wiki factory in `src/index.js`
- Implement background queue processing for async operations
- Process tasks in `src/activities/taskProcessor.js`

## Performance Considerations

- JSON file storage is suitable for small to medium datasets (< 10,000 documents)
- Consider database migration for larger deployments
- Memory caching used throughout for performance
- Search indexing happens in-memory for fast lookups
- Queue processing runs every 5 seconds for background tasks
- Document content stored as separate files to avoid loading large data in memory

## Key Implementation Notes

1. **Document Storage**: Documents use a dual-storage approach:
   - Metadata in `documents.json` (id, title, tags, dates, etc.)
   - Content in separate markdown files in `./.application/wiki-files/`

2. **Space Directories**: Each space has an absolute path pointing to a directory:
   - Personal: `{cwd}/documents`
   - Shared: `{cwd}/documents-shared`
   - Read-Only: `{cwd}/documents-readonly`
   - Directories auto-created with `.gitkeep` files on initialization

3. **Search Integration**: Documents are indexed using NooblyJS search service:
   - Index populated on startup from `documents.json`
   - New documents added to index on creation
   - Search across title, content, tags, and excerpt fields

4. **Background Processing**: Queue worker runs continuously:
   - Dequeues and processes tasks every 5 seconds
   - Tasks defined in `src/activities/taskProcessor.js`
   - Use queue for async operations like document processing, notifications, etc.