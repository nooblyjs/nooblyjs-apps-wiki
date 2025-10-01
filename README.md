# NooblyJS Wiki Application

A collaborative documentation and knowledge management platform built with the NooblyJS framework. Create, organize, and share documentation across multiple workspaces with powerful search and version control capabilities.

## Overview

The NooblyJS Wiki Application is a flexible documentation platform that allows teams to create and maintain knowledge bases, technical documentation, and collaborative notes in organized spaces.

## Features

### 📚 Document Management
- Create and edit documents with rich text and markdown support
- Organize documents into customizable spaces (Personal, Shared, Read-Only)
- Full-text search across all documents and spaces
- Document versioning and change tracking
- File attachments and media embedding
- Cross-document linking and references
- Tag-based organization and categorization

### 🏗️ Workspace Organization
- **Personal Space**: Private documents and notes
- **Shared Space**: Team collaboration and shared documentation
- **Read-Only Space**: Reference materials and published resources
- Customizable permissions per space
- Organized folder structures with absolute path support


## Technology Stack

- **Backend**: Node.js with Express
- **Framework**: NooblyJS Core Services
- **Authentication**: Passport.js with Google OAuth
- **Data Storage**: JSON file-based with memory caching
- **File Management**: Local file system with multer
- **Session Management**: Express sessions
- **View Engine**: EJS templates

## Installation

1. Clone the repository:
```bash
git clone https://github.com/nooblyjs/nooblyjs-apps-wiki.git
cd nooblyjs-apps-wiki
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev:web
```

4. Open your browser and navigate to `http://localhost:3002`

## Scripts

- `npm start` - Start the production server
- `npm run dev:web` - Start development server with nodemon
- `npm run kill` - Kill any processes running on port 3002

## Project Structure

```
src/
├── index.js        # Wiki application factory
├── components/     # Core functionality
│   └── dataManager.js  # JSON data persistence
├── routes/         # API endpoints
│   ├── index.js    # Route registration
│   ├── documents.js    # Document CRUD operations
│   ├── spaces.js       # Space management
│   └── search.js       # Search functionality
├── views/          # Frontend views and client-side JavaScript
│   ├── index.js    # View registration
│   ├── main.ejs    # Main dashboard
│   └── public/     # Static assets
├── activities/     # Background tasks
│   ├── documentContent.js  # Document file operations
│   └── taskProcessor.js    # Queue task processing
└── auth/           # Authentication system
    ├── components/ # User management
    ├── middleware/ # Auth middleware
    ├── passport-config.js  # OAuth configuration
    └── routes/     # Auth endpoints
```

## Configuration

The application uses environment variables and configuration options:

- `PORT` - Server port (default: 3002)
- `dataDirectory` - JSON data storage location (default: `./.application/wiki-data`)
- `filesDir` - Document file storage location (default: `./.application/wiki-files`)
- Google OAuth credentials for authentication

## NooblyJS Core Integration

This application leverages the NooblyJS Core service registry for:

- **Logging**: Console-based logging system
- **Caching**: In-memory caching for performance
- **File Storage**: Local file system management
- **Queue Processing**: Background task management
- **Search**: Full-text search across content
- **Data Persistence**: JSON-based data storage

## Getting Started

1. After installation, access the application at `http://localhost:3002`
2. Log in using Google OAuth or create a local account
3. Start creating documentation:
   - Browse existing spaces and documents
   - Create new documents in Personal, Shared, or Read-Only spaces
   - Use the search functionality to find content across all documents
   - Organize with tags and cross-references
   - Collaborate with team members in shared spaces

## Contributing

This project is part of the NooblyJS ecosystem. Please refer to the main NooblyJS documentation for contribution guidelines.

## License

Licensed under the terms specified in the LICENSE file.