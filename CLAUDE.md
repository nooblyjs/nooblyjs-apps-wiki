# NooblyJS Content Manager - Claude Code Guide

This document provides specific guidance for working with the NooblyJS Content Manager application using Claude Code.

## Project Overview

The NooblyJS Content Manager is a comprehensive content management platform that combines three main applications:

1. **Blog Platform** (`src/blog/`) - Medium-style blogging with analytics
2. **Wiki System** (`src/wiki/`) - Collaborative documentation platform
3. **CMS Builder** (`src/cms/`) - Visual website builder and publisher

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
- **Port**: 3002 (configurable via PORT env var)
- **Authentication**: Passport.js with Google OAuth and local strategy
- **Data Storage**: JSON files in `./data/` directory
- **File Storage**: Local filesystem with dedicated folders per module

### Service Registry Integration
The application heavily relies on NooblyJS Core services:
- `serviceRegistry.logger('console')` - Logging
- `serviceRegistry.cache('memory')` - Caching
- `serviceRegistry.dataServe('memory')` - Data management
- `serviceRegistry.filing('local')` - File operations
- `serviceRegistry.queue('memory')` - Background tasks
- `serviceRegistry.searching('memory')` - Search functionality

## Key Files & Directories

### Application Modules
- `src/blog/index.js` - Blog application factory
- `src/wiki/index.js` - Wiki application factory
- `src/cms/index.js` - CMS application factory
- `src/auth/` - Shared authentication system

### Data Management
- `src/*/components/dataManager.js` - JSON file data persistence
- `data/` - JSON data files for each module
- `*-files/` - Module-specific file storage directories

### Routes & Views
- `src/*/routes/` - API endpoints for each module
- `src/*/views/` - Frontend views and client-side JavaScript

## Development Guidelines

### Code Conventions
- **Style**: Standard Node.js/Express patterns
- **Dependencies**: Check `package.json` for available libraries
- **Error Handling**: Use NooblyJS logger service
- **File Operations**: Use NooblyJS filing service, not direct fs calls

### Common Patterns
1. **Module Structure**: Each app follows the same pattern:
   ```
   src/[app]/
   ├── index.js          # Factory function
   ├── routes/           # API endpoints
   ├── views/            # Frontend
   ├── components/       # Core functionality
   └── activities/       # Background tasks
   ```

2. **Service Injection**: All modules receive:
   ```javascript
   module.exports = (app, eventEmitter, serviceRegistry) => {
     // Initialize services
     const logger = serviceRegistry.logger('console');
     const filing = serviceRegistry.filing('local');
     // ...
   }
   ```

3. **Data Management**: Use DataManager for JSON persistence:
   ```javascript
   const dataManager = new DataManager('./data');
   await dataManager.read('collection');
   await dataManager.write('collection', data);
   ```

## Common Tasks

### Adding New Features
1. Identify which module (blog/wiki/cms) the feature belongs to
2. Add API routes in `src/[module]/routes/`
3. Add frontend views in `src/[module]/views/`
4. Update data schemas if needed
5. Test with `npm run dev:web`

### Debugging
- Check browser console for frontend errors
- Server logs appear in terminal when using `npm run dev:web`
- JSON data files in `./data/` can be inspected directly

### Authentication
- Google OAuth configured in `src/auth/passport-config.js`
- Routes protected with `authMiddleware.js`
- User sessions managed by express-session

## Data Schema

### Blog Data
- `posts.json` - Blog posts with metadata
- `categories.json` - Post categories
- `authors.json` - Author profiles
- `comments.json` - Post comments
- `analytics.json` - View and engagement stats

### Wiki Data
- `documents.json` - Wiki documents
- `spaces.json` - Document organization

### CMS Data
- `sites.json` - Website configurations
- `pages.json` - Individual pages
- `components.json` - Reusable components
- `templates.json` - Page templates
- `assets.json` - Media assets

## Environment Setup

### Required Environment Variables
- `PORT` - Server port (default: 3002)
- Google OAuth credentials for authentication

### File System Requirements
- Write access to `./data/` directory
- Write access to module-specific file directories
- Public asset serving from `./public/`

## Troubleshooting

### Common Issues
1. **Port 3002 in use**: Run `npm run kill` or `lsof -ti:3002 | xargs kill -9`
2. **Missing data files**: Application auto-creates default data on first run
3. **Authentication issues**: Check Google OAuth configuration
4. **File permissions**: Ensure write access to data and file directories

### Log Analysis
- Server startup logs indicate successful module initialization
- Each module logs initialization status and data loading
- Queue workers log background task processing

## Extension Points

### Adding New Content Types
1. Create new data collection in appropriate module
2. Add CRUD routes for the content type
3. Create frontend interface
4. Update search indexing if needed

### Integrating External Services
- Use NooblyJS service registry pattern
- Add service configuration to module initialization
- Implement background queue processing for async operations

## Performance Considerations

- JSON file storage is suitable for small to medium datasets
- Consider database migration for larger deployments
- Static asset optimization available in CMS module
- Memory caching used throughout for performance