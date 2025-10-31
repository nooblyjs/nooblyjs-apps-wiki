# NooblyJS Wiki Application - Product Requirements Document

**Version:** 1.0.14
**Last Updated:** October 2025
**Status:** Production Ready

## Executive Summary

The NooblyJS Wiki Application is a modern, real-time collaborative documentation and knowledge management platform that enables teams to create, organize, search, and manage documentation across multiple workspaces. Built on the NooblyJS framework, it combines traditional wiki functionality with contemporary web technologies including real-time updates via Socket.IO, AI-powered context generation, and dynamic content capabilities.

**Key Value Propositions:**
- Instant real-time collaboration with automatic UI synchronization
- Powerful full-text search across all documents
- AI-powered automatic context generation for folders and files
- Support for multiple file formats (Markdown, PDF, Word, Excel, PowerPoint)
- Dynamic content generation through wiki-code execution
- Multi-workspace organization with granular permission controls

## Product Vision & Objectives

### Vision Statement
To provide teams with an intelligent, real-time documentation platform that breaks down silos between different forms of organizational knowledge, enabling faster decision-making and better collaboration through automatic context generation and instant updates.

### Objectives
1. **Enable seamless real-time collaboration** on documentation
2. **Reduce time to find information** through powerful search and AI context
3. **Support multiple documentation formats** without conversion overhead
4. **Automate documentation** through AI-powered context generation
5. **Maintain document consistency** through permission controls and templates
6. **Provide extensibility** through custom code execution in documents

## Target Users

### Primary Users
- **Knowledge Workers** - Need to access and update documentation
- **Team Leads** - Manage documentation across teams
- **Technical Writers** - Create and maintain technical documentation
- **Developers** - Reference architecture and implementation docs
- **Project Managers** - Track project-specific documentation

### Use Cases
1. **Technical Documentation** - API docs, architecture, code examples
2. **Knowledge Base** - FAQs, troubleshooting, best practices
3. **Project Documentation** - Requirements, designs, status
4. **Team Wikis** - Internal procedures, policies, standards
5. **Decision Records** - Architecture Decision Records (ADRs)

## Functional Requirements

### 1. Document Management

#### 1.1 Rich Document Editing
- **Requirement:** Users must be able to create and edit documents in Markdown format
- **Acceptance Criteria:**
  - Live preview of Markdown rendering
  - Syntax highlighting for code blocks
  - Auto-save functionality
  - Edit history tracking
  - Undo/redo support

#### 1.2 Multiple File Type Support
- **Requirement:** System must support viewing multiple file types
- **Supported Formats:**
  - Markdown (.md)
  - Plain text (.txt)
  - Code files (.js, .py, .java, .ts, etc.)
  - PDF files
  - Images (JPG, PNG, GIF)
  - Word documents (.docx)
  - Excel spreadsheets (.xlsx)
  - PowerPoint presentations (.pptx)
- **Acceptance Criteria:**
  - Each file type has appropriate viewer
  - Syntax highlighting for code
  - Embedded previews for images
  - Full-page viewers for complex types

#### 1.3 Document Templates
- **Requirement:** Users must be able to create and use document templates
- **Acceptance Criteria:**
  - Create templates from existing documents
  - Apply templates to new documents
  - Variable substitution in templates
  - Custom template fields
  - Template library management

#### 1.4 Document Properties
- **Requirement:** Documents must maintain metadata
- **Properties Required:**
  - Title
  - Creation date
  - Last modified date
  - Author
  - Tags
  - Excerpt/summary
  - Space and folder location
- **Acceptance Criteria:**
  - Metadata visible in document properties
  - Editable metadata
  - Searchable metadata fields

### 2. Space & Organization

#### 2.1 Multi-Space Architecture
- **Requirement:** Support multiple documentation spaces with different purposes
- **Space Types:**
  - Personal Space - Private, individual documentation
  - Shared Space - Team collaboration space
  - Read-Only Space - Reference materials
  - Custom Spaces - User-defined spaces
- **Acceptance Criteria:**
  - Each space has independent permission model
  - Visual distinction between space types
  - Separate file systems per space
  - Independent search across spaces

#### 2.2 Folder Organization
- **Requirement:** Support hierarchical folder structure within spaces
- **Acceptance Criteria:**
  - Create nested folders
  - Move documents between folders
  - Rename folders
  - Delete folders and contents
  - Breadcrumb navigation
  - Tree view of folder structure

#### 2.3 Permission Controls
- **Requirement:** Implement granular permission controls
- **Permission Levels:**
  - Read-Write: Create, edit, delete documents
  - Read-Only: View documents only
  - Space-level: Inherit by all documents
- **Acceptance Criteria:**
  - UI adapts based on permissions
  - Edit controls hidden in read-only spaces
  - Context menus disabled for restricted users
  - Permission errors handled gracefully

### 3. Search & Discovery

#### 3.1 Full-Text Search
- **Requirement:** Users must be able to search all documents
- **Features:**
  - Search across document title, content, tags
  - Real-time search results
  - Relevance ranking
  - Result preview snippets
  - Search within specific space
- **Acceptance Criteria:**
  - Sub-100ms search response
  - Minimum 95% accuracy
  - Handleup to 10,000 documents

#### 3.2 Tag-Based Organization
- **Requirement:** Support tagging for document organization
- **Acceptance Criteria:**
  - Add multiple tags to document
  - Filter documents by tag
  - Tag autocomplete
  - Tag cloud visualization
  - Tag management interface

#### 3.3 Recent & Starred Documents
- **Requirement:** Quick access to frequently used documents
- **Acceptance Criteria:**
  - Automatic recent documents list
  - Star/favorite documents
  - Recent documents list in sidebar
  - Quick search for starred items

### 4. Real-Time Collaboration

#### 4.1 Real-Time Updates
- **Requirement:** Changes must be visible to all connected users instantly
- **Acceptance Criteria:**
  - WebSocket connection established
  - File/folder changes broadcast within 1 second
  - UI updates automatically
  - Connection status displayed
  - Graceful reconnection on disconnect

#### 4.2 Change Notifications
- **Requirement:** Users must be aware of changes made by others
- **Acceptance Criteria:**
  - Real-time notification of changes
  - Event history log
  - Change indicators in UI
  - Optional desktop notifications

#### 4.3 File Watching
- **Requirement:** Automatic detection of file system changes
- **Acceptance Criteria:**
  - Monitor space directories
  - Detect external file changes
  - Update metadata automatically
  - Refresh search index
  - Broadcast changes to clients

### 5. Dynamic Content & Extensibility

#### 5.1 Wiki-Code Execution
- **Requirement:** Support dynamic content generation via wiki-code blocks
- **Features:**
  - Execute JavaScript in Markdown
  - Access document structure API
  - Generate dynamic content
  - Error handling and display
- **Acceptance Criteria:**
  - Code blocks execute in browser context
  - Global `window.documents` array available
  - Global `window.currentDocuments` array available
  - Errors caught and displayed
  - Support in both view and edit modes

#### 5.2 Document APIs
- **Requirement:** Provide programmatic access to document structure
- **APIs:**
  - `window.documents` - Full document tree
  - `window.currentDocuments` - Current folder contents
- **Acceptance Criteria:**
  - APIs populated on document load
  - Updated when navigating folders
  - Accessible in wiki-code blocks
  - Include all necessary metadata

#### 5.3 Custom Code Examples
- **Use Cases:**
  - Dynamic navigation menus
  - Document statistics
  - Table of contents
  - Dashboard widgets
  - Custom formatting
- **Acceptance Criteria:**
  - Example document provided
  - Basic examples working
  - Advanced examples functional

### 6. AI-Powered Features

#### 6.1 AI Context Generation
- **Requirement:** Automatically generate context for folders and files
- **Features:**
  - Analyze folder structures
  - Summarize file contents
  - Generate meaningful descriptions
  - Store in .aicontext directories
  - Run on schedule
- **Acceptance Criteria:**
  - Generation runs every 60 seconds
  - Initial run within 3 seconds of startup
  - Never regenerates existing contexts
  - Skips hidden files and .aicontext directories
  - Handles all text file types

#### 6.2 AI Chat Integration
- **Requirement:** Support AI-assisted documentation creation
- **Features:**
  - Ask questions about documentation
  - Get AI suggestions for content
  - AI-powered search enhancement
- **Acceptance Criteria:**
  - Chat interface functional
  - Support multiple AI providers
  - Store chat history
  - User-configurable settings

#### 6.3 AI Provider Support
- **Supported Providers:**
  - Claude (Anthropic)
  - ChatGPT (OpenAI)
  - Ollama (Local)
  - Gemini (Google)
- **Acceptance Criteria:**
  - Multiple providers configurable
  - API key management
  - Model selection
  - Token counting
  - Rate limiting

### 7. Authentication & User Management

#### 7.1 Authentication Methods
- **Local Authentication:**
  - Email/password registration
  - Secure password storage (bcrypt)
  - Password reset capability
- **Social Authentication:**
  - Google OAuth 2.0
  - Single sign-on
  - Profile auto-population
- **Acceptance Criteria:**
  - Registration flow working
  - Login/logout functional
  - Session management
  - Account security

#### 7.2 User Profiles
- **Profile Information:**
  - Name
  - Email
  - Avatar
  - Preferences
  - Activity log
- **Acceptance Criteria:**
  - Profile visible
  - Editable settings
  - Activity history
  - Privacy controls

#### 7.3 Setup Wizard
- **Requirement:** Guide new users through initial setup
- **Steps:**
  1. Collect user profile information
  2. Create default spaces
  3. Create sample documents
  4. Configure preferences
- **Acceptance Criteria:**
  - Wizard triggered for new users
  - All steps complete successfully
  - Data created correctly
  - Users ready to use system

### 8. File Processing

#### 8.1 PDF Support
- **Requirement:** Extract and display PDF content
- **Features:**
  - Text extraction
  - Image preview generation
  - Metadata extraction
  - Multi-page support
- **Acceptance Criteria:**
  - PDFs viewable in wiki
  - Text searchable
  - Images displayable

#### 8.2 Office Document Support
- **Word Documents:**
  - Convert to Markdown
  - Preserve formatting
  - Extract tables and lists
- **Excel Spreadsheets:**
  - Convert to viewable format
  - Preserve cell formatting
  - Support formulas display
- **PowerPoint Presentations:**
  - Convert to slide views
  - Extract text content
  - Generate slide previews
- **Acceptance Criteria:**
  - All formats viewable
  - Content extraction accurate
  - Formatting preserved
  - Embedded content handled

### 9. User Interface & Experience

#### 9.1 Responsive Design
- **Requirement:** Support multiple screen sizes
- **Breakpoints:**
  - Desktop (1024px+)
  - Tablet (768px - 1024px)
  - Mobile (< 768px)
- **Acceptance Criteria:**
  - Mobile-responsive layout
  - Touch-friendly controls
  - Optimized for each size
  - No horizontal scrolling

#### 9.2 Navigation
- **Components:**
  - Collapsible sidebar with file tree
  - Breadcrumb navigation
  - Space switcher
  - Search bar
  - Quick actions menu
- **Acceptance Criteria:**
  - Navigation intuitive
  - File tree responsive
  - Quick actions accessible
  - Search easily reachable

#### 9.3 Dark Mode Support
- **Requirement:** Provide dark mode option
- **Acceptance Criteria:**
  - Toggle between light/dark
  - Persisted preference
  - All components styled
  - Reading experience optimized

### 10. Performance & Reliability

#### 10.1 Performance Targets
- **Search Response:** < 100ms
- **Document Load:** < 500ms
- **API Response:** < 200ms
- **UI Update:** < 50ms
- **Memory Usage:** < 500MB baseline

#### 10.2 Availability
- **Target Uptime:** 99.9%
- **Graceful Degradation:** Offline support planned
- **Error Handling:** User-friendly error messages
- **Data Backup:** Regular backup strategy

#### 10.3 Scalability
- **Current Support:**
  - Up to 10,000 documents
  - 100 concurrent users
  - 1GB average data
- **Growth Path:**
  - Database migration for 100k+ documents
  - Distributed caching for scaling
  - External search for large datasets

## Non-Functional Requirements

### 1. Security
- Passwords hashed with bcrypt
- Session-based authentication
- OAuth 2.0 for social login
- HTTPS recommended for deployment
- CORS protection
- Input validation and sanitization
- XSS protection
- SQL injection prevention (N/A for JSON)

### 2. Accessibility
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Color contrast standards
- Alt text for images
- Form labels and error messages

### 3. Data Integrity
- Atomic file writes
- Consistent state management
- Transaction logging
- Backup procedures
- Data validation

### 4. Maintainability
- Modular code structure
- Clear API contracts
- Comprehensive logging
- Error tracking
- Code documentation

### 5. Compatibility
- Node.js 14+
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Electron 38+ for desktop
- Windows, macOS, Linux support

## System Requirements

### Server Requirements
- **OS:** Linux, macOS, Windows
- **Runtime:** Node.js v14 or higher
- **RAM:** 512MB minimum, 2GB recommended
- **Disk:** 1GB minimum
- **Port:** 3002 (configurable)

### Client Requirements
- **Browsers:** Chrome, Firefox, Safari, Edge (latest versions)
- **JavaScript:** ES6+ support required
- **Network:** HTTPS recommended

### Optional Requirements
- **AI Integration:** API key for chosen AI provider
- **Google OAuth:** OAuth credentials for Google
- **Desktop App:** Electron support for platform

## Implementation Status

### Completed Features ✅
- Multi-space organization (Personal, Shared, Read-Only)
- Rich document editing with Markdown
- Full-text search
- Tag-based organization
- Real-time updates via Socket.IO
- Event bus for change tracking
- File watching and detection
- AI context generation
- PDF, Word, Excel, PowerPoint support
- Wiki-code execution
- Document APIs (window.documents, window.currentDocuments)
- Authentication (Local + Google OAuth)
- User management
- Setup wizard
- AI chat integration
- Responsive UI with Bootstrap 5
- File processors (PDF, DOCX, XLSX, PPTX)

### In Development 🔄
- Advanced search filters
- Document versioning and rollback
- Collaborative editing (real-time cursor positions)
- Comment and annotation system
- Webhook integrations

### Planned Features 📋
- Dark mode UI
- Export to PDF/HTML
- Advanced metrics and analytics
- Team management and roles
- Approval workflows
- Scheduled tasks
- Database migration support
- Mobile app
- Browser extensions

## Success Metrics

### User Adoption
- 80%+ of target users actively using platform within 6 months
- Average 5+ documents created per user
- 90% retention rate after first month

### Performance
- 95%+ of searches < 100ms
- 99% of API calls < 200ms
- <1 second real-time update propagation
- < 500MB memory usage

### Quality
- <1% error rate in document operations
- >95% uptime
- Zero data loss
- <5 minute MTTR for outages

### User Satisfaction
- >4.0/5 user satisfaction rating
- <2% abandon rate during setup
- >90% task completion rate
- <1% data corruption issues

## Dependencies

### External Libraries
- express.js
- socket.io
- passport.js
- bootstrap
- chokidar
- pdf-parse
- mammoth
- xlsx
- pptx-parser
- nooblyjs-core

### Services
- Google OAuth (optional)
- AI providers (Claude, ChatGPT, Ollama, Gemini)

## Constraints & Limitations

### Technical Constraints
- JSON file storage limited to <10,000 documents
- In-memory search limited by available RAM
- Single server deployment (no horizontal scaling)
- File system based storage

### User Constraints
- Permissions at space level only (no document-level)
- Real-time collaboration at document level only
- No offline-first support

### Business Constraints
- Open-source MIT license
- Community-supported (no SLA)
- Resource-limited development team

## Rollout Plan

### Phase 1: Internal Testing
- Deploy to test environment
- User acceptance testing
- Performance validation
- Security audit

### Phase 2: Limited Release
- Beta access to select users
- Gather feedback
- Performance monitoring
- Bug fixes

### Phase 3: General Availability
- Public release
- Documentation finalization
- Community support setup
- Feature roadmap communication

## Future Considerations

### Potential Enhancements
1. Real-time collaborative editing with operational transformation
2. Document versioning with diff viewing
3. Comment and mention system
4. Team roles and permissions
5. Content approval workflows
6. Advanced analytics and metrics
7. Webhook integrations
8. API for external tools
9. Mobile applications
10. Dark mode UI

### Scalability Path
1. Database migration (PostgreSQL/MongoDB)
2. Distributed caching (Redis)
3. External search (Elasticsearch)
4. Message queues (RabbitMQ)
5. Microservices architecture
6. Cloud deployment (AWS, GCP, Azure)

---

## Appendix

### A. Glossary
- **Space**: A documentation workspace with independent content and permissions
- **Document**: A single file (Markdown, PDF, etc.) within a space
- **Folder**: A directory-like container for organizing documents
- **Wiki-Code**: Custom JavaScript code executed in Markdown documents
- **AI Context**: Auto-generated documentation describing content
- **Event Bus**: Centralized system for broadcasting real-time changes
- **Search Index**: In-memory data structure for fast full-text search

### B. References
- [NooblyJS Core Documentation](https://github.com/NooblyJS/nooblyjs-core)
- [Express.js Documentation](https://expressjs.com/)
- [Socket.IO Documentation](https://socket.io/)
- [Bootstrap 5 Documentation](https://getbootstrap.com/)

### C. Contact & Support
For questions or issues:
- Check GitHub Issues
- Review documentation
- Contact development team
