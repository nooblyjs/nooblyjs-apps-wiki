# NooblyJS Wiki Application - Claude Code Guide

This document provides specific guidance for working with the NooblyJS Wiki Application using Claude Code.

## Project Overview

The NooblyJS Wiki Application is a collaborative documentation and knowledge management platform built with the NooblyJS framework. It provides organized workspaces (spaces) for creating, managing, and searching documentation with full-text search and version control capabilities.

## Development Commands

### Essential Scripts
- `npm start` - Production server
- `npm run dev:web` - Development with auto-reload (nodemon)
- `npm run kill` - Stop server on port 3002

### Testing & Quality
Currently no specific test or lint commands are configured. Consider adding:
- `npm run test` - Run test suite
- `npm run lint` - Code linting
- `npm run typecheck` - Type checking

## Architecture Overview

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

## Key Files & Directories

### Core Application Files
- `app.js` - Express server initialization and service registry setup
- `src/index.js` - Wiki application factory and initialization
- `src/auth/` - Authentication system (Passport.js, Google OAuth)

### Wiki Components
- `src/components/dataManager.js` - JSON file data persistence
- `src/activities/documentContent.js` - Document file operations
- `src/activities/taskProcessor.js` - Background queue task processing

### Routes & Views
- `src/routes/index.js` - Route registration
- `src/routes/documents.js` - Document CRUD API
- `src/routes/spaces.js` - Space management API
- `src/routes/search.js` - Search functionality API
- `src/views/` - Frontend views (EJS templates) and client-side JavaScript

### Data Storage
- `./.application/wiki-data/` - JSON data files
  - `documents.json` - Document metadata
  - `spaces.json` - Space configurations
- `./.application/wiki-files/` - Document content files

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