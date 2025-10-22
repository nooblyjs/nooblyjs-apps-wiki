# Gemini's Understanding of the NooblyJS Wiki Application

This document outlines my understanding of the `nooblyjs-apps-wiki` application, its architecture, and its key features.

## Application Overview

The `nooblyjs-apps-wiki` is a collaborative documentation and knowledge management platform built with the NooblyJS framework. It enables users to create, organize, and search for documentation within a system of "spaces." This structure facilitates both individual work and team collaboration. The application features a rich document management system, dynamic content rendering, and robust permission controls.

## Core Technology: NooblyJS Framework

The application is built upon `noobly-core`, a Node.js framework that utilizes a service registry pattern. This promotes a modular and maintainable architecture by separating different functionalities into distinct services. Key services include:

- **AI:** Integration with large language models.
- **Authentication:** User authentication and authorization.
- **Caching:** In-memory and distributed caching.
- **Data Storage:** JSON-based data persistence.
- **File Management:** Handling of file uploads and storage.
- **Logging:** Configurable logging for monitoring and debugging.
- **Queue:** In-memory queue for background task processing.
- **Searching:** In-memory full-text search indexing.

## Key Features

- **Multi-Space Organization:** The application supports three types of spaces for flexible content organization:
    - **Personal Spaces:** For individual notes and drafts.
    - **Shared Spaces:** For team collaboration with read-write access.
    - **Read-Only Spaces:** For official documentation and reference materials.
- **Rich Document Management:** The platform supports a variety of file types, including Markdown, PDFs, images, and code. It also provides full-text search, tagging, and hierarchical folder structures.
- **Dynamic Content with `wiki-code`:** A standout feature is the ability to execute JavaScript code directly within Markdown documents using `wiki-code` blocks. This allows for the creation of dynamic and interactive content.
- **Extensibility:** The application is designed with extensibility in mind, featuring a well-defined project structure and a comprehensive set of APIs for further development.
- **Electron App:** The application can be packaged as a desktop application for Windows, macOS, and Linux.

## Technical Stack

- **Backend:** Node.js with the Express framework.
- **Frontend:** Vanilla JavaScript and Bootstrap 5.
- **Core Framework:** `noobly-core`.
- **Authentication:** Passport.js, supporting both local authentication and Google OAuth.
- **Data Storage:** Metadata is stored in JSON files, while document content is stored directly on the file system.
- **Search:** An in-memory search index provides fast and efficient search capabilities.
- **Desktop:** Electron for cross-platform desktop application development.

## Project Structure

```
nooblyjs-apps-wiki/
├── app.js                          # Express server entry point
├── app-electron.js                 # Electron application entry point
├── src/
│   ├── index.js                    # Wiki application factory
│   ├── auth/                       # Authentication system
│   ├── routes/                     # API endpoints
│   ├── views/                      # Frontend
│   ├── components/                 # Core components
│   ├── activities/                 # Background tasks
│   └── initialisation/             # Setup configuration
├── .application/                   # Application data
│   ├── wiki-data/                  # JSON data files
│   └── wiki-files/                 # Document content files
├── documents/                      # Personal space (default)
├── documents-shared/               # Shared space (default)
└── documents-readonly/             # Read-only space (default)
```

## Available Scripts

- `npm start`: Starts the application in production mode.
- `npm run dev:web`: Starts the application in development mode with auto-reload.
- `npm run kill`: Stops the server on port 3002.
- `npm run electron`: Starts the Electron application.
- `npm run electron:build`: Builds the Electron application for the current platform.
- `npm run electron:build:win`: Builds the Electron application for Windows.
- `npm run electron:build:mac`: Builds the Electron application for macOS.
- `npm run electron:build:linux`: Builds the Electron application for Linux.

## Configuration

- **`package.json`**: Defines the project's dependencies, scripts, and metadata.
- **`src/initialisation/spaces-template.json`**: Configures the default spaces created during the setup wizard.
- **`.env`**: Environment variables for configuring the application (e.g., port, database credentials).

## My Role and Capabilities

As a large language model integrated into this project, my primary role is to assist with the development and maintenance of the application. My capabilities include:

- **Code Comprehension:** Answering detailed questions about the codebase and architecture.
- **Feature Development:** Assisting in the implementation of new features and functionalities.
- **Bug Fixes:** Identifying and resolving bugs within the application.
- **Documentation:** Improving and generating documentation for the project.
- **Code Generation:** Creating code snippets and boilerplate code to accelerate development.