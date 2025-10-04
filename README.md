# NooblyJS Wiki Application

A collaborative documentation and knowledge management platform built with the NooblyJS framework. Create, organize, and search documentation across multiple workspaces with full-text search capabilities and permission controls.

![Version](https://img.shields.io/badge/version-1.0.14-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Features

### 📚 **Multi-Space Organization**
- **Personal Spaces** - Private workspace for individual notes and drafts
- **Shared Spaces** - Team collaboration with full read-write access
- **Read-Only Spaces** - Reference materials, policies, and official documentation
- Custom space creation with configurable permissions

### 📝 **Rich Document Management**
- Markdown-based document editing with live preview
- Support for multiple file types (Markdown, PDF, Images, Code files)
- Full-text search across all documents and spaces
- Tag-based organization and filtering
- Folder hierarchies for structured content
- Document templates for consistency
- **Custom code injection** with `wiki-code` blocks for dynamic content

### 🔒 **Permission Controls**
- Space-level permissions (read-write / read-only)
- UI dynamically adapts based on permissions
- Context menus and edit controls hidden in read-only spaces
- User authentication with Google OAuth and local strategy

### 🔍 **Search & Discovery**
- Real-time full-text search
- Search within specific spaces
- Tag filtering and organization
- Recent documents tracking
- Starred documents for quick access

### 🎨 **Modern UI/UX**
- Responsive Bootstrap 5 interface
- Collapsible sidebar navigation
- File tree view with folder expansion
- Multiple document viewers (Markdown, PDF, Code, Images)
- Dark mode support (coming soon)

### ⚡ **Dynamic Content & Extensibility**
- **Wiki-Code Execution:** Execute JavaScript functions directly in markdown documents
- **Document API Access:** Global `window.documents` and `window.currentDocuments` arrays for programmatic access
- **Use Cases:** Dynamic navigation, statistics dashboards, custom tables, automated content generation
- **Live Preview:** Code execution works in both view and edit modes
- **Error Handling:** Graceful error messages displayed inline for debugging

## Quick Start

### Prerequisites

- Node.js >= 14.0.0
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nooblyjs-apps-wiki
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment** (optional)
   ```bash
   PORT=3002
   # Add Google OAuth credentials for authentication
   ```

4. **Start the application**
   ```bash
   # Development mode with auto-reload
   npm run dev:web

   # Production mode
   npm start
   ```

5. **Access the application**
   - Open your browser to `http://localhost:3002`
   - Register a new account
   - Complete the setup wizard to configure your spaces

### First-Time Setup Wizard

New users are automatically guided through a setup wizard that:
1. Collects user profile information (name, email, password)
2. Allows selection and configuration of default spaces
3. Creates sample folders and documents to get started
4. Initializes the folder structure on your file system

## Architecture

### Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JavaScript + Bootstrap 5
- **Framework**: NooblyJS Core (service registry pattern)
- **Authentication**: Passport.js (Local + Google OAuth)
- **Storage**: JSON files + File system
- **Search**: In-memory search indexing

### Project Structure

```
nooblyjs-apps-wiki/
├── app.js                          # Express server entry point
├── src/
│   ├── index.js                    # Wiki application factory
│   ├── auth/                       # Authentication system
│   │   ├── passport-config.js      # Passport strategies
│   │   ├── routes.js               # Auth routes
│   │   └── middleware.js           # Auth middleware
│   ├── routes/                     # API endpoints
│   │   ├── index.js                # Route registration
│   │   ├── documentRoutes.js       # Document CRUD
│   │   ├── spacesRoutes.js         # Space management
│   │   ├── searchRoutes.js         # Search functionality
│   │   ├── navigationRoutes.js     # Navigation/folders
│   │   ├── userRoutes.js           # User profiles
│   │   └── wizardRoutes.js         # Setup wizard
│   ├── views/                      # Frontend
│   │   ├── index.html              # Main application
│   │   ├── wizard.html             # Setup wizard
│   │   └── js/                     # Client-side JavaScript
│   │       ├── app.js              # Main app controller
│   │       └── modules/            # Feature modules
│   ├── components/                 # Core components
│   │   └── dataManager.js          # JSON persistence
│   ├── activities/                 # Background tasks
│   │   ├── documentContent.js      # Document file ops
│   │   └── taskProcessor.js        # Queue processing
│   └── initialisation/             # Setup configuration
│       └── spaces-template.json    # Default spaces config
├── .application/                   # Application data
│   ├── wiki-data/                  # JSON data files
│   │   ├── spaces.json
│   │   ├── documents.json
│   │   └── users.json
│   └── wiki-files/                 # Document content files
├── documents/                      # Personal space (default)
├── documents-shared/               # Shared space (default)
└── documents-readonly/             # Read-only space (default)
```

## Usage Guide

### Creating Documents

1. Select a space from the sidebar
2. Click the "New File" button or use the "+" dropdown
3. Enter document details (title, tags)
4. Write content using Markdown
5. Save the document

### Organizing with Spaces

**Create a New Space:**
1. Click the "+" button in the Spaces section
2. Enter space name and description
3. Choose visibility (Private/Team/Public)
4. Set permissions (Read-Write/Read-Only)
5. Specify folder path
6. Click "Create Space"

**Space Types:**
- **Personal**: Private, individual workspace
- **Shared**: Team collaboration with full access
- **Read-Only**: Reference materials, no editing allowed

### Search & Navigation

- **Quick Search**: Use the search bar at the top
- **File Tree**: Browse folders in the left sidebar
- **Recent Files**: Access recently viewed documents
- **Starred**: Mark important documents for quick access
- **Tags**: Filter documents by tags

### Templates

Create reusable document templates:
1. Navigate to the Templates section
2. Create a new template with standard content
3. Use templates when creating new documents

### Custom Code Injection (Wiki-Code)

Execute JavaScript directly in markdown documents for dynamic content:

**Basic Example:**
````markdown
```wiki-code
function() {
  return "Hello World from wiki-code!";
}
```
````

**Access Document Structure:**
````markdown
```wiki-code
function() {
  let html = '<ul>';
  for (let i = 0; i < window.currentDocuments.length; i++) {
    const doc = window.currentDocuments[i];
    html += '<li>' + doc.name + ' (' + doc.type + ')</li>';
  }
  html += '</ul>';
  return html;
}
```
````

**Available Global Variables:**
- `window.documents` - Full hierarchical tree of all documents/folders
- `window.currentDocuments` - Array of documents in current folder

**Document Object Structure:**
```javascript
{
  name: "filename.md",
  type: "document" | "folder",
  created: "2025-01-01T00:00:00.000Z",
  path: "folder/filename.md",
  space: "1",
  icon: "bg-1 file",
  children: [] // For folders only
}
```

See `documents/wiki-code-feature-demo.md` for comprehensive examples.

## Configuration

### Environment Variables

```bash
PORT=3002                           # Server port (default: 3002)
GOOGLE_CLIENT_ID=your_client_id     # Google OAuth
GOOGLE_CLIENT_SECRET=your_secret    # Google OAuth
SESSION_SECRET=your_secret          # Session encryption
```

### Wiki Factory Options

```javascript
{
  dataDirectory: './.application/wiki-data',  // JSON data storage
  filesDir: './.application/wiki-files',      // Document files
  cacheProvider: 'memory',                    // Cache provider
  filerProvider: 'local',                     // File service
  loggerProvider: 'console',                  // Logger
  queueProvider: 'memory',                    // Background queue
  searchProvider: 'memory'                    // Search engine
}
```

### Space Template Configuration

Edit `src/initialisation/spaces-template.json` to customize:
- Default spaces created during setup
- Folder structure for each space
- Sample documents and content
- Space permissions and settings

## Data Schema

### Spaces (`spaces.json`)

```json
{
  "id": 1,
  "name": "Personal Space",
  "description": "Private workspace",
  "icon": "👤",
  "visibility": "private",
  "permissions": "read-write",
  "type": "personal",
  "path": "/absolute/path/to/documents",
  "documentCount": 5,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "author": "System"
}
```

### Documents (`documents.json`)

```json
{
  "id": 1,
  "title": "Getting Started",
  "spaceName": "Personal Space",
  "spaceId": 1,
  "tags": ["guide", "welcome"],
  "excerpt": "Welcome to your wiki...",
  "filePath": "/path/to/document.md",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "author": "User Name"
}
```

### Users (`users.json`)

```json
{
  "id": "unique-id",
  "email": "user@example.com",
  "name": "User Name",
  "password": "hashed_password",
  "provider": "local",
  "initialized": true,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

## Development

### Scripts

```bash
npm start              # Production server
npm run dev:web        # Development with auto-reload (nodemon)
npm run kill           # Stop server on port 3002
```

### Adding Features

1. **New Route**: Create route file in `src/routes/`
2. **Register Route**: Add to `src/routes/index.js`
3. **Frontend**: Add UI components in `src/views/`
4. **Controller**: Create module in `src/views/js/modules/`
5. **Test**: Use `npm run dev:web` for live testing

### NooblyJS Service Registry

The application uses NooblyJS core services:

```javascript
const filing = serviceRegistry.filing('local', options);
const cache = serviceRegistry.cache('memory');
const logger = serviceRegistry.logger('console');
const queue = serviceRegistry.queue('memory');
const search = serviceRegistry.searching('memory');
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/check` - Check auth status

### Spaces
- `GET /applications/wiki/api/spaces` - List all spaces
- `POST /applications/wiki/api/spaces` - Create new space
- `GET /applications/wiki/api/spaces/:id/documents` - Get space documents
- `GET /applications/wiki/api/spaces/:id/folders` - Get folder tree

### Documents
- `GET /applications/wiki/api/documents` - List documents
- `POST /applications/wiki/api/documents` - Create document
- `GET /applications/wiki/api/documents/content` - Get document content
- `PUT /applications/wiki/api/documents/:id` - Update document
- `DELETE /applications/wiki/api/documents/:id` - Delete document

### Search
- `GET /applications/wiki/api/search` - Search documents
- Query params: `q` (query), `spaceId` (filter by space)

### User
- `GET /applications/wiki/api/profile` - Get user profile
- `PUT /applications/wiki/api/profile` - Update profile
- `GET /applications/wiki/api/user/activity` - Get user activity

### Setup Wizard
- `GET /applications/wiki/api/wizard/check` - Check if wizard needed
- `GET /applications/wiki/api/wizard/config` - Get spaces template
- `POST /applications/wiki/api/wizard/initialize` - Initialize spaces

## Troubleshooting

### Port Already in Use
```bash
npm run kill
# Or manually:
lsof -ti:3002 | xargs kill -9
```

### Missing Data Files
The application auto-creates empty data files on first run. If you encounter issues:
```bash
mkdir -p .application/wiki-data
mkdir -p .application/wiki-files
```

### Authentication Issues
- Check Google OAuth credentials in `src/auth/passport-config.js`
- Verify session secret is set
- Clear browser cookies and try again

### Search Not Working
- Restart the application to rebuild search index
- Check that documents have content in `wiki-files` directory

## Performance Considerations

- **JSON Storage**: Suitable for <10,000 documents
- **Memory Cache**: Fast lookups, cleared on restart
- **Search Index**: In-memory, rebuilt on startup
- **File Storage**: Documents stored as separate files to avoid memory issues
- **Background Queue**: Processes tasks every 5 seconds

For larger deployments, consider:
- Migrating to a database (PostgreSQL, MongoDB)
- External search engine (Elasticsearch)
- Redis for caching
- Message queue for background jobs

## Security

- Passwords hashed with bcrypt (10 rounds)
- Session-based authentication with Passport.js
- Google OAuth for SSO
- Permission-based access control
- Read-only spaces prevent editing
- User-specific data isolation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

- **Documentation**: See `CLAUDE.md` for development guide
- **Issues**: Report bugs on GitHub Issues
- **Questions**: Contact the development team

## Roadmap

- [x] Custom code injection with wiki-code blocks ✅
- [x] Document structure API access ✅
- [ ] Dark mode support
- [ ] Real-time collaboration
- [ ] Document versioning
- [ ] Export to PDF/HTML
- [ ] Mobile responsive improvements
- [ ] Advanced search filters
- [ ] Document comments
- [ ] @mentions and notifications
- [ ] Webhooks and integrations
- [ ] API documentation with Swagger

---

Built with ❤️ using NooblyJS Framework
