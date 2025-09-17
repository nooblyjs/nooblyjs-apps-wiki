# NooblyJS Content Manager

A comprehensive content management application built with the NooblyJS framework, providing integrated blog, wiki, and CMS capabilities for creating and managing digital content.

## Overview

This application combines three powerful content management systems into a unified platform:

- **Blog Application**: Medium.com-style blogging platform with analytics and community features
- **Wiki Application**: Collaborative knowledge base for documentation and information sharing
- **CMS Application**: Visual website builder with template management and publishing capabilities

## Features

### 🚀 Blog Platform
- Medium-style content creation and editing
- Category and tag management
- Comment system with moderation
- Author profiles and social links
- Analytics and engagement tracking
- SEO optimization tools
- Content scheduling and publishing

### 📚 Wiki System
- Collaborative document creation
- Organized spaces for different topics
- Full-text search across all documents
- Version history and change tracking
- Rich text editing with markdown support
- Document linking and cross-references

### 🎨 CMS Builder
- Visual drag-and-drop site builder
- Pre-built components and templates
- Theme management system
- Asset optimization and management
- Multi-site support with custom domains
- SEO tools and meta management
- Static site generation and publishing

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
git clone https://github.com/nooblyjs/nooblyjs-apps-contentmanager.git
cd nooblyjs-apps-contentmanager
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
├── auth/           # Authentication system
│   ├── components/ # User management
│   ├── middleware/ # Auth middleware
│   └── routes/     # Auth routes
├── blog/           # Blog application
│   ├── components/ # Data management, notifications, comments
│   ├── routes/     # Blog API endpoints
│   ├── views/      # Blog frontend
│   └── activities/ # Background tasks
├── wiki/           # Wiki application
│   ├── components/ # Document management
│   ├── routes/     # Wiki API endpoints
│   ├── views/      # Wiki frontend
│   └── activities/ # Document processing
└── cms/            # CMS application
    ├── components/ # Site builder, templates, assets
    ├── routes/     # CMS API endpoints
    └── views/      # CMS frontend
```

## Configuration

The application uses environment variables for configuration:

- `PORT` - Server port (default: 3002)
- Google OAuth credentials for authentication
- File storage paths for different modules

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
3. Explore the three main sections:
   - `/blog` - Create and manage blog posts
   - `/wiki` - Build collaborative documentation
   - `/cms` - Design and publish websites

## Contributing

This project is part of the NooblyJS ecosystem. Please refer to the main NooblyJS documentation for contribution guidelines.

## License

Licensed under the terms specified in the LICENSE file.