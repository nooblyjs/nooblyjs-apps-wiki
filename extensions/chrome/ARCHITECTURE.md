# Chrome Extension Architecture

## Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Extension                          │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  popup.html │  │background.js│ │ manifest.json│           │
│  │  (UI Layer) │  │  (Service  │  │  (Config)   │           │
│  │             │  │   Worker)   │  │             │           │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘           │
│         │                │                                   │
│         │                │                                   │
│  ┌──────▼────────────────▼──────┐                           │
│  │     JavaScript Modules        │                           │
│  │  ┌──────────┐  ┌────────────┐│                           │
│  │  │ popup.js │  │   api.js   ││                           │
│  │  │(Main Logic) │(API Client)││                           │
│  │  └──────┬────┘  └─────┬──────┘│                           │
│  │         │             │       │                           │
│  │  ┌──────▼─────────────▼─────┐ │                           │
│  │  │   settings.js            │ │                           │
│  │  │  (Storage Management)     │ │                           │
│  │  └──────────────────────────┘ │                           │
│  └───────────────────────────────┘                           │
│                                                              │
│  ┌───────────────────────────────┐                           │
│  │      CSS (style.css)          │                           │
│  │   - Matching Wiki Styles      │                           │
│  │   - 400px Width               │                           │
│  └───────────────────────────────┘                           │
└──────────────────┬────────────────────────────────────────────┘
                   │
                   │ HTTP Requests
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              NooblyJS Wiki Application                       │
│                (http://localhost:3002)                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Endpoints                            │   │
│  │                                                       │   │
│  │  • POST /applications/wiki/login                     │   │
│  │  • GET  /applications/wiki/api/auth/check            │   │
│  │  • GET  /applications/wiki/api/spaces                │   │
│  │  • GET  /applications/wiki/api/spaces/:id/folders    │   │
│  │  • GET  /applications/wiki/api/documents/content     │   │
│  │  • GET  /applications/wiki/api/search                │   │
│  │  • GET  /applications/wiki/api/user/activity         │   │
│  │  • POST /applications/wiki/api/user/star             │   │
│  │  • POST /applications/wiki/api/user/visit            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Authentication Flow

```
User Input (popup.html)
    │
    ▼
Login Form Submit (popup.js)
    │
    ▼
API Call (api.js) → POST /wiki/login
    │
    ▼
Session ID Received
    │
    ▼
Save to Chrome Storage (settings.js)
    │
    ▼
Redirect to Space Selection
```

### 2. Navigation Flow

```
Space Selection
    │
    ▼
Load Folders → GET /api/spaces/:id/folders
    │
    ├─→ Display Folders (clickable)
    │
    └─→ Display Files (clickable)
        │
        ▼
    File Click
        │
        ▼
    Load Content → GET /api/documents/content
        │
        ▼
    Render Based on Type:
        ├─→ Markdown → marked.js
        ├─→ Code → Syntax display
        ├─→ Text → Plain text
        ├─→ Image → <img> tag
        └─→ PDF → <iframe>
```

### 3. Search Flow

```
User Types in Search Box
    │
    ▼
Debounce (300ms)
    │
    ▼
API Call → GET /api/search?q=query
    │
    ▼
Display Results
    │
    ▼
Click Result → Load Document
```

### 4. Recent/Starred Flow

```
Document Opened
    │
    ▼
Record Visit → POST /api/user/visit
    │
    ▼
Update Local Cache
    │
    ▼
Display in Recent Tab

Star Button Clicked
    │
    ▼
Toggle Star → POST /api/user/star
    │
    ▼
Update Local Cache
    │
    ▼
Display in Starred Tab
```

## State Management

### Chrome Storage

```javascript
{
  sessionId: "connect.sid cookie value",
  serverUrl: "http://localhost:3002",
  currentSpace: {
    id: 1,
    name: "Personal Space",
    description: "...",
    // ... space object
  }
}
```

### In-Memory State (popup.js)

```javascript
{
  currentSpace: Object,      // Selected space
  currentPath: String,       // Current folder path
  breadcrumbPath: Array,     // Path segments for breadcrumb
  userActivity: {
    recent: Array,          // Recently viewed files
    starred: Array          // Starred files
  }
}
```

## View States

The extension has 4 main views:

1. **Login View** (`#loginView`)
   - Server URL input
   - Username/password form
   - Login button with loading state

2. **Space View** (`#spaceView`)
   - List of available spaces
   - Logout button
   - Click space → Main View

3. **Main View** (`#mainView`)
   - 4 tabs: Files, Recent, Starred, Search
   - Breadcrumb navigation
   - Back to spaces button
   - Dynamic content based on active tab

4. **Viewer View** (`#viewerView`)
   - Document title
   - Back button
   - Star button
   - Rendered content (varies by file type)

## File Type Routing

```javascript
Document Metadata → viewer type
    │
    ├─→ "markdown" → marked.parse() → HTML
    │
    ├─→ "code" → <pre><code> with highlighting
    │
    ├─→ "text" → <pre> plain text
    │
    ├─→ "image" → <img src="api_url">
    │
    ├─→ "pdf" → <iframe src="api_url">
    │
    └─→ "default" → File info display
```

## Event Handling

### Global Events
- `DOMContentLoaded` → Initialize extension
- Tab clicks → Switch active tab
- Logout → Clear session and redirect

### Form Events
- Login submit → Authenticate
- Search input → Debounced search

### Navigation Events
- Space click → Select space
- Folder click → Navigate into folder
- Breadcrumb click → Navigate to path
- File click → Open document

### Document Events
- Star button → Toggle star status
- Back button → Return to file list

## Security Considerations

1. **Session Management**
   - Session ID stored in Chrome storage (local only)
   - Session validated on each API call
   - Cleared on logout

2. **CORS Handling**
   - Extension needs `host_permissions` in manifest
   - Server must allow extension origin (if different)

3. **XSS Protection**
   - All user content escaped with `escapeHtml()`
   - Markdown rendered with trusted library (marked.js)
   - No eval() or innerHTML with user data

4. **Authentication**
   - Credentials sent only over configured server URL
   - No credential storage (only session ID)
   - Session expires according to server settings

## Performance Optimizations

1. **Debouncing**
   - Search input debounced (300ms)
   - Prevents excessive API calls

2. **Caching**
   - User activity cached in memory
   - Space selection cached in storage
   - Reduces redundant API calls

3. **Lazy Loading**
   - Documents loaded only when clicked
   - Folder contents loaded on navigation
   - Images/PDFs loaded on demand

4. **Efficient DOM Updates**
   - Use `innerHTML` for batch updates
   - Event delegation where possible
   - Minimal re-renders

## Extension Lifecycle

```
Extension Installed
    │
    ▼
background.js initializes
    │
    ▼
Set default settings
    │
    ▼
Extension Icon Clicked
    │
    ▼
popup.html loads
    │
    ▼
popup.js initializes
    │
    ▼
Check for session
    │
    ├─→ Has session → Load last view
    │
    └─→ No session → Show login
```

## Error Handling

```
API Call
    │
    ├─→ Success → Process response
    │
    └─→ Error
        │
        ├─→ 401 Unauthorized → Redirect to login
        │
        ├─→ 404 Not Found → Show empty state
        │
        ├─→ 500 Server Error → Show error message
        │
        └─→ Network Error → Show connection error
```

## Dependencies

- **marked.js**: Markdown to HTML conversion
- **Chrome APIs**:
  - `chrome.storage.local`: State persistence
  - `chrome.runtime`: Message passing
- **Fetch API**: HTTP requests
- **ES6 Modules**: Code organization

## Browser Compatibility

- **Chrome**: Manifest V3 (Chrome 88+)
- **Edge**: Compatible (Chromium-based)
- **Firefox**: Not compatible (requires Manifest V2 port)
- **Safari**: Not compatible (different extension format)
