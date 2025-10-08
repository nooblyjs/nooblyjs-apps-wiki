# Gemini's Understanding of the NooblyJS Wiki Application

This document outlines my understanding of the `nooblyjs-apps-wiki` application, its architecture, and its key features.

## Application Overview

The `nooblyjs-apps-wiki` is a collaborative documentation and knowledge management platform. It enables users to create, organize, and search for documentation within a system of "spaces." This structure facilitates both individual work and team collaboration.

## Core Technology: NooblyJS Framework

The application is built upon `noobly-core`, a Node.js framework that utilizes a service registry pattern. This promotes a modular and maintainable architecture by separating different functionalities into distinct services. Key services include:

- **AI:** Integration with large language models.
- **Authentication:** User authentication and authorization.
- **Caching:** In-memory and distributed caching.
- **Data Storage:** JSON-based data persistence.
- **File Management:** Handling of file uploads and storage.

## Key Features

- **Multi-Space Organization:** The application supports three types of spaces for flexible content organization:
    - **Personal Spaces:** For individual notes and drafts.
    - **Shared Spaces:** For team collaboration with read-write access.
    - **Read-Only Spaces:** For official documentation and reference materials.
- **Rich Document Management:** The platform supports a variety of file types, including Markdown, PDFs, images, and code. It also provides full-text search, tagging, and hierarchical folder structures.
- **Dynamic Content with `wiki-code`:** A standout feature is the ability to execute JavaScript code directly within Markdown documents using `wiki-code` blocks. This allows for the creation of dynamic and interactive content.
- **Extensibility:** The application is designed with extensibility in mind, featuring a well-defined project structure and a comprehensive set of APIs for further development.

## Technical Stack

- **Backend:** Node.js with the Express framework.
- **Frontend:** Vanilla JavaScript and Bootstrap 5.
- **Core Framework:** `noobly-core`.
- **Authentication:** Passport.js, supporting both local authentication and Google OAuth.
- **Data Storage:** Metadata is stored in JSON files, while document content is stored directly on the file system.
- **Search:** An in-memory search index provides fast and efficient search capabilities.

## My Role and Capabilities

As a large language model integrated into this project, my primary role is to assist with the development and maintenance of the application. My capabilities include:

- **Code Comprehension:** Answering detailed questions about the codebase and architecture.
- **Feature Development:** Assisting in the implementation of new features and functionalities.
- **Bug Fixes:** Identifying and resolving bugs within the application.
- **Documentation:** Improving and generating documentation for the project.
- **Code Generation:** Creating code snippets and boilerplate code to accelerate development.
