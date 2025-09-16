# Gemini Code Understanding

This document provides an overview of the NooblyJS Content Manager application, as understood by the Gemini model.

## Application Overview

The NooblyJS Content Manager is a web-based application built with Node.js and Express. It serves as a multi-purpose content management system, offering three primary functionalities: a blog platform, a wiki-style knowledge base, and a content management system (CMS). The application uses a modular architecture, with each core feature encapsulated in its own module. Data is stored in JSON files within the `/data` directory, and the application leverages a custom core library, `nooblyjs-core`, for common services like logging, caching, and file management.

## Core Modules

The application is divided into three main modules:

### 1. Blog

The blog module provides a complete blogging platform with the following features:

- **Content Creation:** Users can create, edit, and delete blog posts.
- **Organization:** Posts can be organized into categories.
- **Authors:** The system supports multiple authors.
- **Community Features:** The application includes support for comments and subscribers.
- **Data Storage:** Blog data, including posts, categories, authors, comments, and subscribers, is stored in JSON files.
- **Background Processing:** A queue worker is used to process background tasks.

### 2. Wiki

The wiki module provides a knowledge base system with the following features:

- **Spaces and Documents:** Content is organized into "spaces," which contain individual documents.
- **Data Storage:** Wiki data, including spaces and documents, is stored in JSON files.
- **Background Processing:** A queue worker is used to process background tasks.
- **Search:** The wiki content is indexed for searching.

### 3. CMS (Content Management System)

The CMS module appears to be the core of the wiki functionality. The code within the `src/cms` directory is responsible for initializing the wiki's data, routes, and views. The naming is slightly confusing, as it seems to be the backend for the wiki rather than a separate, standalone CMS.

## Technology Stack

- **Backend:** Node.js, Express.js
- **Authentication:** Passport.js (with local and Google OAuth strategies)
- **Data Storage:** JSON files
- **Core Framework:** `nooblyjs-core`
- **Frontend:** The views are rendered on the server-side, likely using a templating engine, and sent as HTML to the client. The frontend uses CSS for styling and JavaScript for client-side interactions.

## How to Run the Application

To run the application, you can use the following command:

```bash
npm start
```

This will start the Express server on port 3002 by default.
