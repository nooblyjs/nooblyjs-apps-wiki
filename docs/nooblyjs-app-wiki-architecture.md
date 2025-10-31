# NooblyJS Wiki Application - Architecture Documentation

**Version:** 1.0.14
**Last Updated:** October 2025
**Framework:** NooblyJS Core 1.0.10

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Diagram](#architecture-diagram)
4. [Core Components](#core-components)
5. [Data Flow](#data-flow)
6. [Database Schema](#database-schema)
7. [API Architecture](#api-architecture)
8. [Real-Time Architecture](#real-time-architecture)
9. [Background Services](#background-services)
10. [Security Architecture](#security-architecture)
11. [Deployment Architecture](#deployment-architecture)

---

## System Overview

The NooblyJS Wiki Application is a real-time collaborative documentation platform that combines traditional wiki functionality with modern web technologies. It provides:

- **Multi-workspace organization** with Personal, Shared, and Read-Only spaces
- **Real-time collaboration** via Socket.IO with event-driven architecture
- **Full-text search** with in-memory indexing
- **Dynamic content generation** through wiki-code execution
- **AI-powered context generation** for automatic documentation
- **File type support** for Markdown, PDF, Word, Excel, PowerPoint, and code files

### Key Architectural Decisions

1. **Service Registry Pattern**: Uses NooblyJS Core services for loose coupling and modularity
2. **Event-Driven Updates**: Socket.IO broadcasts ensure all clients see changes instantly
3. **JSON File Storage**: Simple, human-readable persistence suitable for <10,000 documents
4. **Dual-Document Storage**: Metadata in JSON, content in separate files
5. **In-Memory Caching & Indexing**: Fast performance without database overhead
6. **Background Task Queue**: Decouples long-running operations from request handling

---

## Technology Stack

### Backend
- **Runtime**: Node.js v14+
- **Web Framework**: Express.js 4.18.2
- **Service Layer**: NooblyJS Core 1.0.10
- **Real-Time**: Socket.IO 4.8.1
- **Authentication**: Passport.js 0.7.0 (Google OAuth 2.0 + Local)
- **File Processing**:
  - PDF: pdf-parse, pdf-to-img
  - Word: mammoth
  - Excel: xlsx
  - PowerPoint: pptx2json, pptx-parser
- **File Monitoring**: chokidar
- **Data Format**: bcryptjs (password hashing)

### Frontend
- **UI Framework**: Bootstrap 5
- **Language**: Vanilla JavaScript (ES6+)
- **Template Engine**: EJS
- **HTTP Client**: Fetch API with custom APIClient
- **Real-Time**: Socket.IO client

### Data Storage
- **Primary**: JSON files in `.application/wiki-data/`
- **Content**: Document files in `.application/wiki-files/`
- **Cache**: In-memory (NooblyJS cache service)
- **Search Index**: In-memory (NooblyJS search service)

### Services (NooblyJS Core)
- `logger` - Logging and debugging
- `cache` - Data caching
- `filing` - File operations
- `queue` - Background task processing
- `searching` - Full-text search
- `scheduling` - Task scheduling
- `measuring` - Metrics collection
- `notifying` - Notifications
- `workflow` - Workflow orchestration
- `aiservice` - AI integration (Ollama, Claude, ChatGPT, Gemini)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer (Browser)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Navigation   │  │  Document    │  │  Search UI   │          │
│  │  Controller  │  │  Viewer      │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
│                    ┌───────▼────────┐                           │
│                    │  APIClient     │                           │
│                    │  Socket.IO     │                           │
│                    └───────┬────────┘                           │
└─────────────────────────────┼────────────────────────────────────┘
                              │ HTTP/WebSocket
┌─────────────────────────────▼────────────────────────────────────┐
│                  Express.js Server (Node.js)                     │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Route Handlers                          │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐    │  │
│  │  │ Document    │ │ Navigation  │ │ Search Routes    │    │  │
│  │  │ Routes      │ │ Routes      │ │ AI Chat Routes   │    │  │
│  │  └─────────────┘ └─────────────┘ └──────────────────┘    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                            │                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                  Core Services                             │  │
│  │  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐   │  │
│  │  │ DataManager │ │ AIService    │ │ SearchIndexer    │   │  │
│  │  │ EventBus    │ │ UserManager  │ │ Authentication   │   │  │
│  │  └─────────────┘ └──────────────┘ └──────────────────┘   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                            │                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              NooblyJS Core Services                        │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │  │
│  │  │Logger  │ │Cache   │ │Filing  │ │Queue   │ │Search  │ │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ │  │
│  └────────────────────────────────────────────────────────────┘  │
│                            │                                     │
└─────────────────────────────┼────────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│                    Background Services                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ File Watcher │  │ AI Context   │  │ Task Proc.   │          │
│  │ (chokidar)   │  │ Generator    │  │ (Queue)      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────┬────────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│                    File System & Storage                         │
│  ┌──────────────────────────────┐  ┌──────────────────────────┐ │
│  │  .application/wiki-data/     │  │  .application/wiki-files/│ │
│  │  - spaces.json               │  │  - document contents    │ │
│  │  - documents.json            │  │  - .aicontext/ folders │ │
│  │  - users.json                │  │                        │ │
│  │  - activity.json             │  │                        │ │
│  │  - aiSettings_*.json         │  │                        │ │
│  │  - userActivity_*.json       │  │                        │ │
│  │  - chatHistory_*.json        │  │                        │ │
│  └──────────────────────────────┘  └──────────────────────────┘ │
│  ┌──────────────────────────────┐  ┌──────────────────────────┐ │
│  │  documents/ (Personal)       │  │  documents-shared/       │ │
│  │  - user files                │  │  - team files           │ │
│  │  - .aicontext/               │  │  - .aicontext/          │ │
│  └──────────────────────────────┘  └──────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Entry Points

#### `app.js` - Express Server Initialization
```
Responsibilities:
- Initialize Express server and HTTP server
- Configure body-parser and session middleware
- Set up Passport.js authentication
- Initialize NooblyJS service registry
- Create all core services (logger, cache, filing, queue, search, etc.)
- Instantiate aiservice with Ollama provider
- Load and initialize wiki factory
- Serve static assets
- Listen on port 3002
```

#### `index.js` - Wiki Factory
```
Responsibilities:
- Create and configure the wiki application
- Initialize Socket.IO server with CORS
- Create WikiEventBus for real-time updates
- Initialize DataManager, AIService, SearchIndexer
- Start initialization of wiki data
- Start background queue worker (5-second interval)
- Start file watcher for real-time file monitoring
- Start AI context generation scheduler (60-second interval)
- Register all route handlers
- Register view handlers
```

### 2. Components

#### `DataManager` (`src/components/dataManager.js`)
```
Responsibilities:
- Abstract JSON file persistence layer
- Read/write operations for:
  - spaces.json (space configurations)
  - documents.json (document metadata)
  - users.json (user accounts)
  - activity.json (activity logging)
  - aiSettings_*.json (per-user AI settings)
  - userPreferences_*.json (user preferences)
  - userActivity_*.json (activity logs)
  - chatHistory_*.json (AI chat history)
- Provide CRUD interface for all data types
- Handle file locking and atomic writes
```

#### `AIService` (`src/components/aiService.js`)
```
Responsibilities:
- Integrate with configured AI provider
- Support multiple AI models (Claude, ChatGPT, Ollama, Gemini)
- Provide chat message API
- Manage AI context generation prompts
- Handle token counting and rate limiting
- Store and retrieve user AI settings
- Validate API key configuration
```

#### `WikiEventBus` (`src/components/eventBus.js`)
```
Responsibilities:
- Track all file and folder changes
- Broadcast events to all connected Socket.IO clients
- Maintain in-memory event history
- Provide event filtering and subscription
- Support debugging and monitoring
- Log event statistics
```

### 3. Routes

#### Authentication Routes (`src/auth/routes.js`)
```
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user
- POST /api/auth/logout - Logout user
- GET /api/auth/check - Check authentication status
```

#### Document Routes (`src/routes/documentRoutes.js`)
```
- GET /applications/wiki/api/documents - List all documents
- POST /applications/wiki/api/documents - Create document
- GET /applications/wiki/api/documents/:id - Get document details
- GET /applications/wiki/api/documents/content - Get document content
- PUT /applications/wiki/api/documents/:id - Update document
- DELETE /applications/wiki/api/documents/:id - Delete document
- GET /applications/wiki/api/documents/:id/versions - Get version history
```

#### Space Routes (`src/routes/spacesRoutes.js`)
```
- GET /applications/wiki/api/spaces - List all spaces
- POST /applications/wiki/api/spaces - Create new space
- GET /applications/wiki/api/spaces/:id - Get space details
- GET /applications/wiki/api/spaces/:id/documents - Get space documents
- GET /applications/wiki/api/spaces/:id/folders - Get folder tree
```

#### Navigation Routes (`src/routes/navigationRoutes.js`)
```
- GET /applications/wiki/api/navigation/folder/:path - Get folder contents
- POST /applications/wiki/api/navigation/folders - Create folder
- DELETE /applications/wiki/api/navigation/folder/:path - Delete folder
```

#### Search Routes (`src/routes/searchRoutes.js`)
```
- GET /applications/wiki/api/search - Full-text search
- POST /applications/wiki/api/ai/generate-contexts - Trigger AI context generation
- GET /applications/wiki/api/ai/context-status - Check AI context status
```

#### User Routes (`src/routes/userRoutes.js`)
```
- GET /applications/wiki/api/profile - Get user profile
- PUT /applications/wiki/api/profile - Update profile
- GET /applications/wiki/api/user/activity - Get user activity
- GET /applications/wiki/api/users/:id - Get user details
```

#### AI Chat Routes (`src/routes/aiChatRoutes.js`)
```
- POST /applications/wiki/api/ai/chat - Send message to AI
- GET /applications/wiki/api/ai/settings - Get AI settings
- PUT /applications/wiki/api/ai/settings - Update AI settings
```

#### Settings Routes (`src/routes/settingsRoutes.js`)
```
- GET /applications/wiki/api/settings - Get user settings
- PUT /applications/wiki/api/settings - Update settings
- GET /applications/wiki/api/settings/theme - Get theme settings
- PUT /applications/wiki/api/settings/theme - Update theme
```

### 4. Background Services

#### File Watcher (`src/activities/fileWatcher.js`)
```
Responsibilities:
- Monitor space directories with chokidar
- Detect file additions, modifications, deletions
- Emit events through WikiEventBus
- Trigger search index updates
- Update document metadata
- Real-time UI refresh
```

#### AI Context Generator (`src/activities/aiContextGenerator.js`)
```
Responsibilities:
- Process all spaces recursively
- Generate AI-powered context files
- Store contexts in .aicontext/ directories
- Folder analysis and summarization
- File content analysis
- Integration with configured AI provider
- Skip hidden files and .aicontext directories
- Incremental processing (no regeneration of existing contexts)
```

#### Task Processor (`src/activities/taskProcessor.js`)
```
Responsibilities:
- Process queued background tasks
- Handle async operations
- Support task types:
  - File uploads
  - Document processing
  - Search index updates
  - AI context generation
  - Notifications
- Error handling and retry logic
```

#### Search Indexer (`src/activities/searchIndexer.js`)
```
Responsibilities:
- Build in-memory search index
- Index documents on creation/update
- Support full-text search
- Filter by tags and spaces
- Relevance ranking
- Auto-complete suggestions
```

### 5. File Processors

#### PDF Processor (`src/processing/pdfprocessor.js`)
```
- Extract text from PDF files
- Generate preview images
- Extract metadata
- Handle multi-page documents
```

#### Word Processor (`src/processing/docxprocessor.js`)
```
- Convert DOCX to Markdown/HTML
- Extract text content
- Preserve formatting
- Extract tables and images
```

#### Excel Processor (`src/processing/xlsxprocessor.js`)
```
- Convert XLSX to viewable format
- Extract sheet data
- Preserve cell formatting
- Handle formulas
```

#### PowerPoint Processor (`src/processing/pptxprocessor.js`)
```
- Convert PPTX to viewable format
- Extract slide content
- Generate slide previews
- Extract speaker notes
```

---

## Data Flow

### Document Creation Flow
```
1. User submits new document form (Frontend)
   ↓
2. APIClient sends POST /api/documents (Frontend)
   ↓
3. DocumentRoutes handler receives request
   ↓
4. Authentication middleware validates user
   ↓
5. DataManager writes to documents.json
   ↓
6. Filing service creates document file
   ↓
7. SearchIndexer adds to search index
   ↓
8. WikiEventBus emits 'document-created' event
   ↓
9. Socket.IO broadcasts to all connected clients
   ↓
10. EventBusListener updates UI (Frontend)
    ↓
11. Navigation and search UI refresh automatically
    ↓
12. Response returned to client
```

### Real-Time File Change Flow
```
1. User modifies file on disk or via web UI
   ↓
2. File Watcher detects change (chokidar)
   ↓
3. DocumentRoutes handler processes update
   ↓
4. DataManager updates documents.json metadata
   ↓
5. Filing service updates document file
   ↓
6. SearchIndexer refreshes index entry
   ↓
7. WikiEventBus emits 'file-modified' event
   ↓
8. Socket.IO broadcasts to all clients
   ↓
9. EventBusListener receives event (Frontend)
   ↓
10. UI components update automatically
    ↓
11. Document viewer refreshes if open
    ↓
12. File tree updates with new modification time
```

### Search Flow
```
1. User types in search bar
   ↓
2. APIClient sends GET /api/search?q=query
   ↓
3. SearchRoutes handler receives query
   ↓
4. SearchIndexer performs full-text search
   ↓
5. Results filtered by space if specified
   ↓
6. Results ranked by relevance
   ↓
7. JSON results returned with:
   - Document ID
   - Title
   - Preview snippet
   - Space name
   - Match score
   ↓
8. Frontend displays results in search UI
```

---

## Database Schema

### spaces.json
```json
{
  "id": 1,
  "name": "Personal Space",
  "description": "Private workspace",
  "icon": "👤",
  "visibility": "private",
  "type": "personal",
  "permissions": "read-write",
  "path": "/absolute/path/to/documents",
  "documentCount": 5,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "author": "System"
}
```

### documents.json
```json
{
  "id": 1,
  "title": "Getting Started",
  "spaceName": "Personal Space",
  "spaceId": 1,
  "path": "getting-started.md",
  "tags": ["guide", "welcome"],
  "excerpt": "Welcome to your wiki...",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "author": "User Name"
}
```

### users.json
```json
{
  "id": "user-id-123",
  "email": "user@example.com",
  "name": "User Name",
  "password": "bcrypt-hash",
  "provider": "local",
  "initialized": true,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### aiSettings_{userId}.json
```json
{
  "userId": "user-id-123",
  "provider": "ollama",
  "model": "tinyllama:1.1b",
  "apiKey": "encrypted-key",
  "enabled": true,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

---

## API Architecture

### Request/Response Pattern
```
HTTP Request
  ↓
Express Middleware (body-parser, session)
  ↓
Authentication Middleware
  ↓
Route Handler
  ↓
Service Operations (DataManager, SearchIndexer, etc.)
  ↓
Event Bus Emission (if applicable)
  ↓
JSON Response
  ↓
HTTP Response
  ↓
Client receives and processes response
```

### Error Handling
```
Try/Catch in Routes
  ↓
Logger service logs error
  ↓
HTTP 400/500 status returned
  ↓
Error message sent to client
  ↓
Frontend displays user-friendly message
  ↓
Console shows detailed error for debugging
```

### Authentication Flow
```
1. User login via /api/auth/login
   ↓
2. Passport.js validates credentials
   ↓
3. express-session creates session
   ↓
4. Session ID stored in httpOnly cookie
   ↓
5. Subsequent requests include session cookie
   ↓
6. authMiddleware verifies session
   ↓
7. req.user populated from session
   ↓
8. Route handler accesses req.user
```

---

## Real-Time Architecture

### Socket.IO Integration
```
Server (index.js):
  - Create Socket.IO server with CORS enabled
  - Listen on connection/disconnect events
  - Make io instance global (global.io)
  - Handle client connections

Client (eventBusListener.js):
  - Initialize Socket.IO client
  - Connect to server automatically
  - Listen for event broadcasts
  - Update UI on event receipt

Event Emission:
  - Routes emit events after operations
  - WikiEventBus broadcasts to all clients
  - Socket.IO sends event to connected clients
  - Client listens and updates UI
```

### Event Types
```
File Events:
  - file-created
  - file-modified
  - file-deleted

Folder Events:
  - folder-created
  - folder-modified
  - folder-deleted

Document Events:
  - document-created
  - document-updated
  - document-deleted

Space Events:
  - space-created
  - space-updated
  - space-deleted
```

### Client-Side UI Updates
```
1. Event received from Socket.IO
   ↓
2. eventBusListener.js handles event
   ↓
3. Appropriate controller notified
   ↓
4. Component state updated
   ↓
5. DOM re-rendered
   ↓
6. User sees changes instantly
```

---

## Background Services

### Queue Worker (5-second interval)
```
1. Check queue for tasks
   ↓
2. If task exists:
     a. Dequeue task
     b. Pass to processTask()
     c. Log completion
   ↓
3. Every 60 seconds (12 iterations):
     - Trigger AI context generation
   ↓
4. Repeat after 5 seconds
```

### AI Context Scheduler (60-second interval)
```
1. Initialize on startup (after 2-second delay)
   ↓
2. Create AIContextGenerator instance
   ↓
3. Check if AI service is ready
   ↓
4. If ready:
     a. Process all spaces
     b. Generate folder contexts
     c. Generate file contexts
     d. Log statistics
   ↓
5. Schedule next run (60 seconds later)
   ↓
6. Repeat indefinitely
```

### File Watcher (Real-time)
```
1. Initialize chokidar on space directories
   ↓
2. Watch for:
     - File additions
     - File modifications
     - File deletions
     - Folder changes
   ↓
3. On change detected:
     a. Update document metadata
     b. Refresh search index
     c. Emit event via WikiEventBus
     d. Broadcast to clients
   ↓
4. Continue watching for new changes
```

---

## Security Architecture

### Authentication
- Local strategy: bcrypt password hashing (10 rounds)
- Google OAuth 2.0: Delegate to Google
- Session-based: express-session with httpOnly cookies
- Protected routes: authMiddleware validates session

### Authorization
- Space-level permissions: read-write vs read-only
- User isolation: Only access own spaces and data
- Admin checks: Verify user can modify resource
- UI hiding: Read-only spaces hide edit controls

### Input Validation
- Body-parser limits: 100MB for file uploads
- Type validation: Routes validate input types
- Sanitization: HTML escaping in output
- CORS protection: Socket.IO configured with allowed origins

### Data Protection
- Passwords: Hashed with bcrypt
- Sessions: Secure httpOnly cookies
- Files: Stored on file system with user isolation
- API Keys: Stored encrypted in settings files

---

## Deployment Architecture

### Development
```
npm run dev:web
  ↓
Runs app.js with nodemon
  ↓
Auto-restarts on file changes
  ↓
Logs output to console
  ↓
Access at http://localhost:3002
```

### Production
```
npm start
  ↓
Runs app.js directly
  ↓
Single process (scale with process manager)
  ↓
PORT environment variable configurable
  ↓
Access at http://localhost:{PORT}
```

### Desktop (Electron)
```
npm run electron
  ↓
Runs app-electron.js
  ↓
Bundles wiki server with Electron
  ↓
Distributable with electron-builder
  ↓
Native app experience with file system access
```

### File Structure
```
.application/
  ├── wiki-data/           # JSON storage
  ├── wiki-files/          # Document content
  ├── aiSettings_*.json    # AI configuration
  ├── userActivity_*.json  # Activity logs
  └── chatHistory_*.json   # Chat history

documents/                 # Personal space files
documents-shared/          # Shared space files
documents-readonly/        # Read-only space files

public/                    # Static assets
  ├── css/
  ├── js/
  └── images/
```

---

## Scalability Considerations

### Current Limitations
- **JSON Storage**: Suitable for <10,000 documents
- **In-Memory Search**: Limited by available RAM
- **Single Server**: No horizontal scaling
- **Local File Storage**: Single machine deployment

### Future Enhancements
- **Database Migration**: Move to PostgreSQL/MongoDB
- **Distributed Caching**: Redis for multi-server cache
- **External Search**: Elasticsearch for large datasets
- **Message Queue**: RabbitMQ for distributed processing
- **Microservices**: Separate AI, file processing services
- **Cloud Storage**: S3 for file storage
- **CDN**: Static asset distribution

---

## Performance Optimization

### Current Techniques
- **In-memory caching**: Frequently accessed data
- **Search indexing**: O(1) search operations
- **Separate file storage**: Avoid loading large data in memory
- **5-second queue interval**: Batch processing
- **Event-driven updates**: Only update changed items
- **Lazy loading**: Load content on demand

### Metrics to Monitor
- **Search response time**: Target <100ms
- **Document load time**: Target <500ms
- **UI update latency**: Target <50ms
- **API response time**: Target <200ms
- **Memory usage**: Monitor for leaks
- **Queue depth**: Track pending tasks

---

## Troubleshooting Guide

### High Memory Usage
- Check for memory leaks in background services
- Monitor event history size in WikiEventBus
- Clear old chat history from storage
- Restart application periodically

### Slow Search Performance
- Limit search index rebuild frequency
- Optimize search query patterns
- Consider database migration

### Real-Time Updates Not Propagating
- Check Socket.IO connection in browser console
- Verify global.io and global.eventBus exist
- Check eventBusListener.js for errors
- Restart server and refresh clients

### File Watching Issues
- Verify file permissions on directories
- Check chokidar configuration
- Monitor file system limits (ulimit)
- Check for disk space issues

---

## References

- [NooblyJS Core Documentation](https://github.com/NooblyJS/nooblyjs-core)
- [Express.js Documentation](https://expressjs.com/)
- [Socket.IO Documentation](https://socket.io/)
- [Passport.js Documentation](http://www.passportjs.org/)
- [Bootstrap 5 Documentation](https://getbootstrap.com/)
