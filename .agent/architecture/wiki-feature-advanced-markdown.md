# Advanced Markdown Guide: Wiki-Code Feature

Welcome to the advanced markdown guide for the NooblyJS Wiki Application! This guide will teach you how to leverage the powerful **wiki-code** feature to create dynamic, data-driven documents that go far beyond traditional static markdown.

## Table of Contents

1. [Introduction to Wiki-Code](#introduction-to-wiki-code)
2. [Global Variables Available](#global-variables-available)
3. [Basic Wiki-Code Examples](#basic-wiki-code-examples)
4. [Working with window.documents](#working-with-windowdocuments)
5. [Working with window.currentDocuments](#working-with-windowcurrentdocuments)
6. [Working with window.todos](#working-with-windowtodos)
7. [Advanced Use Cases](#advanced-use-cases)
8. [Best Practices](#best-practices)
9. [Error Handling](#error-handling)
10. [Security Considerations](#security-considerations)

---

## Introduction to Wiki-Code

Wiki-code is a powerful feature that allows you to execute JavaScript functions directly within your markdown documents. The code executes in the browser context and the returned HTML/text replaces the code block in the rendered output.

### Syntax

````markdown
```wiki-code
function() {
  // Your JavaScript code here
  return "HTML or text to display";
}
```
````

### How It Works

1. You write a JavaScript function inside a `wiki-code` code block
2. When the document is rendered, the function is executed
3. The returned value (HTML or text) replaces the code block
4. The code has access to special global variables like `window.documents`, `window.currentDocuments`, and `window.todos`

---

## Global Variables Available

The wiki application provides three powerful global variables that you can access from your wiki-code blocks:

### 1. `window.documents`

**Type:** `Array<DocumentNode>`

**Description:** Contains the complete hierarchical tree of ALL documents and folders across all spaces.

**Structure:**
```javascript
[
  {
    name: "filename.md",           // File or folder name
    type: "document" | "folder",   // Type of node
    created: "2025-01-01T...",     // ISO date string
    path: "folder/filename.md",    // Relative path
    space: "1",                    // Space ID (string)
    icon: "bg-1 file",             // Icon class
    children: []                   // Array of child nodes (for folders)
  }
]
```

**Use Cases:**
- Generate site-wide navigation menus
- Create document statistics dashboards
- Build cross-space document indexes
- Visualize document relationships

### 2. `window.currentDocuments`

**Type:** `Array<DocumentNode>`

**Description:** Contains only the documents and folders in the currently viewed folder.

**Structure:** Same as `window.documents` but filtered to current location

**Use Cases:**
- Display current folder contents
- Create folder-specific indexes
- Build breadcrumb navigation
- Show recently modified files in current location

### 3. `window.todos`

**Type:** `Array<TodoFile>`

**Description:** Contains all files with TODO items and their associated tasks, automatically scanned and updated every 30 seconds.

**Structure:**
```javascript
[
  {
    name: "Project Plan.md",        // File name
    path: "projects/plan.md",       // File path
    space: "1",                     // Space ID
    spaceName: "Personal Space",    // Space name
    created: "2025-01-01T...",      // File creation date
    modified: "2025-01-02T...",     // Last modified date
    todos: [                        // Array of TODO items
      {
        text: "Complete feature",   // TODO text
        status: "unchecked",        // "checked" or "unchecked"
        line: 42                    // Line number in file
      }
    ]
  }
]
```

**Use Cases:**
- Create TODO dashboards across all documents
- Track project progress
- Generate task lists by space or folder
- Build personal task management views

---

## Basic Wiki-Code Examples

### Example 1: Simple Text Output

````markdown
```wiki-code
function() {
  return "Hello World from wiki-code!";
}
```
````

**Output:** Hello World from wiki-code!

### Example 2: Current Date and Time

````markdown
```wiki-code
function() {
  const now = new Date();
  return '<p>Current date and time: <strong>' + now.toLocaleString() + '</strong></p>';
}
```
````

### Example 3: Dynamic List

````markdown
```wiki-code
function() {
  const items = ['Feature A', 'Feature B', 'Feature C'];
  let html = '<ul>';
  for (let i = 0; i < items.length; i++) {
    html += '<li>' + items[i] + '</li>';
  }
  html += '</ul>';
  return html;
}
```
````

---

## Working with window.documents

### Example 1: Count Total Documents and Folders

````markdown
```wiki-code
function() {
  if (!window.documents) {
    return '<p>No documents available</p>';
  }

  let folderCount = 0;
  let fileCount = 0;

  function countItems(items) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].type === 'folder') {
        folderCount++;
        if (items[i].children && items[i].children.length > 0) {
          countItems(items[i].children);
        }
      } else {
        fileCount++;
      }
    }
  }

  countItems(window.documents);

  return '<div class="alert alert-info">' +
         '<h5>📊 Document Statistics</h5>' +
         '<p>Total Folders: <strong>' + folderCount + '</strong></p>' +
         '<p>Total Files: <strong>' + fileCount + '</strong></p>' +
         '</div>';
}
```
````

### Example 2: Generate Site Map

````markdown
```wiki-code
function() {
  if (!window.documents || window.documents.length === 0) {
    return '<p>No documents to display</p>';
  }

  function renderTree(nodes, depth) {
    let html = '<ul style="margin-left: ' + (depth * 20) + 'px;">';

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const icon = node.type === 'folder' ? '📁' : '📄';

      html += '<li>' + icon + ' <strong>' + node.name + '</strong>';

      if (node.type === 'folder' && node.children && node.children.length > 0) {
        html += renderTree(node.children, depth + 1);
      }

      html += '</li>';
    }

    html += '</ul>';
    return html;
  }

  return '<div class="card">' +
         '<div class="card-body">' +
         '<h5 class="card-title">📚 Site Map</h5>' +
         renderTree(window.documents, 0) +
         '</div></div>';
}
```
````

### Example 3: Find Recently Created Documents

````markdown
```wiki-code
function() {
  if (!window.documents) return '<p>No documents available</p>';

  const allDocs = [];

  function collectDocs(nodes) {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].type === 'document') {
        allDocs.push(nodes[i]);
      }
      if (nodes[i].children) {
        collectDocs(nodes[i].children);
      }
    }
  }

  collectDocs(window.documents);

  // Sort by created date (newest first)
  allDocs.sort(function(a, b) {
    return new Date(b.created) - new Date(a.created);
  });

  const recent = allDocs.slice(0, 5);

  let html = '<div class="card">' +
             '<div class="card-body">' +
             '<h5 class="card-title">🆕 Recently Created Documents</h5>' +
             '<ul class="list-group list-group-flush">';

  for (let i = 0; i < recent.length; i++) {
    const doc = recent[i];
    const date = new Date(doc.created).toLocaleDateString();
    html += '<li class="list-group-item">' +
            '<strong>' + doc.name + '</strong><br>' +
            '<small class="text-muted">' + doc.path + ' · ' + date + '</small>' +
            '</li>';
  }

  html += '</ul></div></div>';
  return html;
}
```
````

---

## Working with window.currentDocuments

### Example 1: Display Current Folder Contents

````markdown
```wiki-code
function() {
  if (!window.currentDocuments || window.currentDocuments.length === 0) {
    return '<p><em>No documents in current folder</em></p>';
  }

  let html = '<div class="alert alert-info">' +
             '<h5>📂 Current Folder Contents:</h5>' +
             '<ul>';

  for (let i = 0; i < window.currentDocuments.length; i++) {
    const doc = window.currentDocuments[i];
    const icon = doc.type === 'folder' ? '📁' : '📄';
    html += '<li>' + icon + ' ' + doc.name + ' (' + doc.type + ')</li>';
  }

  html += '</ul></div>';
  return html;
}
```
````

### Example 2: Create Document Table

````markdown
```wiki-code
function() {
  if (!window.currentDocuments || window.currentDocuments.length === 0) {
    return '<p>No documents to display</p>';
  }

  let html = '<table class="table table-striped table-hover">' +
             '<thead class="table-dark">' +
             '<tr><th>Name</th><th>Type</th><th>Path</th><th>Created</th></tr>' +
             '</thead><tbody>';

  for (let i = 0; i < window.currentDocuments.length; i++) {
    const doc = window.currentDocuments[i];
    const date = new Date(doc.created).toLocaleDateString();
    const badge = doc.type === 'folder' ? 'primary' : 'secondary';

    html += '<tr>' +
            '<td><strong>' + doc.name + '</strong></td>' +
            '<td><span class="badge bg-' + badge + '">' + doc.type + '</span></td>' +
            '<td><code>' + doc.path + '</code></td>' +
            '<td>' + date + '</td>' +
            '</tr>';
  }

  html += '</tbody></table>';
  return html;
}
```
````

### Example 3: Folder Statistics Card

````markdown
```wiki-code
function() {
  if (!window.currentDocuments) {
    return '<p>No folder data available</p>';
  }

  let folderCount = 0;
  let fileCount = 0;

  for (let i = 0; i < window.currentDocuments.length; i++) {
    if (window.currentDocuments[i].type === 'folder') {
      folderCount++;
    } else {
      fileCount++;
    }
  }

  return '<div class="card text-white bg-primary mb-3">' +
         '<div class="card-header"><strong>📊 Folder Statistics</strong></div>' +
         '<div class="card-body">' +
         '<div class="row">' +
         '<div class="col-6 text-center">' +
         '<h2>' + folderCount + '</h2>' +
         '<p>Folders</p>' +
         '</div>' +
         '<div class="col-6 text-center">' +
         '<h2>' + fileCount + '</h2>' +
         '<p>Files</p>' +
         '</div>' +
         '</div>' +
         '</div></div>';
}
```
````

---

## Working with window.todos

### Example 1: Display All TODOs Across All Files

````markdown
```wiki-code
function() {
  if (!window.todos || window.todos.length === 0) {
    return '<div class="alert alert-warning">No TODOs found across all documents</div>';
  }

  let html = '<div class="card">' +
             '<div class="card-header bg-primary text-white">' +
             '<h5>✅ All TODO Items</h5>' +
             '</div>' +
             '<div class="card-body">';

  for (let i = 0; i < window.todos.length; i++) {
    const file = window.todos[i];

    html += '<h6>📄 ' + file.name + ' (' + file.spaceName + ')</h6>' +
            '<ul class="list-group mb-3">';

    for (let j = 0; j < file.todos.length; j++) {
      const todo = file.todos[j];
      const status = todo.status === 'checked' ? '✅' : '⬜';
      const textStyle = todo.status === 'checked' ? 'text-decoration: line-through; opacity: 0.6;' : '';

      html += '<li class="list-group-item">' +
              '<input type="checkbox" ' +
              (todo.status === 'checked' ? 'checked' : '') +
              ' disabled> ' +
              '<span style="' + textStyle + '">' + todo.text + '</span>' +
              ' <small class="text-muted">(Line ' + todo.line + ')</small>' +
              '</li>';
    }

    html += '</ul>';
  }

  html += '</div></div>';
  return html;
}
```
````

### Example 2: TODO Progress Dashboard

````markdown
```wiki-code
function() {
  if (!window.todos || window.todos.length === 0) {
    return '<div class="alert alert-info">No TODOs tracked yet!</div>';
  }

  let totalTodos = 0;
  let completedTodos = 0;

  for (let i = 0; i < window.todos.length; i++) {
    for (let j = 0; j < window.todos[i].todos.length; j++) {
      totalTodos++;
      if (window.todos[i].todos[j].status === 'checked') {
        completedTodos++;
      }
    }
  }

  const percentage = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;
  const remaining = totalTodos - completedTodos;

  return '<div class="card border-primary">' +
         '<div class="card-header bg-primary text-white">' +
         '<h5>📊 TODO Progress Dashboard</h5>' +
         '</div>' +
         '<div class="card-body">' +
         '<div class="progress mb-3" style="height: 30px;">' +
         '<div class="progress-bar bg-success" role="progressbar" ' +
         'style="width: ' + percentage + '%;" ' +
         'aria-valuenow="' + percentage + '" aria-valuemin="0" aria-valuemax="100">' +
         percentage + '%' +
         '</div>' +
         '</div>' +
         '<div class="row text-center">' +
         '<div class="col-4">' +
         '<h3>' + totalTodos + '</h3>' +
         '<p class="text-muted">Total Tasks</p>' +
         '</div>' +
         '<div class="col-4">' +
         '<h3 class="text-success">' + completedTodos + '</h3>' +
         '<p class="text-muted">Completed</p>' +
         '</div>' +
         '<div class="col-4">' +
         '<h3 class="text-warning">' + remaining + '</h3>' +
         '<p class="text-muted">Remaining</p>' +
         '</div>' +
         '</div>' +
         '</div></div>';
}
```
````

### Example 3: TODOs By Space

````markdown
```wiki-code
function() {
  if (!window.todos || window.todos.length === 0) {
    return '<div class="alert alert-warning">No TODOs found</div>';
  }

  // Group TODOs by space
  const bySpace = {};

  for (let i = 0; i < window.todos.length; i++) {
    const file = window.todos[i];
    const spaceName = file.spaceName;

    if (!bySpace[spaceName]) {
      bySpace[spaceName] = {
        files: [],
        totalTodos: 0,
        completedTodos: 0
      };
    }

    bySpace[spaceName].files.push(file);

    for (let j = 0; j < file.todos.length; j++) {
      bySpace[spaceName].totalTodos++;
      if (file.todos[j].status === 'checked') {
        bySpace[spaceName].completedTodos++;
      }
    }
  }

  let html = '<div class="accordion" id="todosBySpace">';
  let accordionIndex = 0;

  for (const spaceName in bySpace) {
    const space = bySpace[spaceName];
    const percentage = space.totalTodos > 0
      ? Math.round((space.completedTodos / space.totalTodos) * 100)
      : 0;

    html += '<div class="accordion-item">' +
            '<h2 class="accordion-header" id="heading' + accordionIndex + '">' +
            '<button class="accordion-button collapsed" type="button" ' +
            'data-bs-toggle="collapse" data-bs-target="#collapse' + accordionIndex + '">' +
            '<strong>' + spaceName + '</strong> ' +
            '<span class="badge bg-primary ms-2">' + space.totalTodos + ' tasks</span> ' +
            '<span class="badge bg-success ms-1">' + percentage + '% complete</span>' +
            '</button>' +
            '</h2>' +
            '<div id="collapse' + accordionIndex + '" class="accordion-collapse collapse" ' +
            'data-bs-parent="#todosBySpace">' +
            '<div class="accordion-body">';

    for (let i = 0; i < space.files.length; i++) {
      const file = space.files[i];
      html += '<p><strong>📄 ' + file.name + '</strong></p><ul>';

      for (let j = 0; j < file.todos.length; j++) {
        const todo = file.todos[j];
        const checked = todo.status === 'checked' ? 'checked' : '';
        html += '<li>' +
                '<input type="checkbox" ' + checked + ' disabled> ' +
                todo.text +
                '</li>';
      }

      html += '</ul>';
    }

    html += '</div></div></div>';
    accordionIndex++;
  }

  html += '</div>';
  return html;
}
```
````

### Example 4: Interactive TODO List with Real Checkboxes

````markdown
```wiki-code
function() {
  if (!window.todos || window.todos.length === 0) {
    return '<div class="alert alert-info">No TODOs to display</div>';
  }

  let html = '<div class="card">' +
             '<div class="card-header bg-dark text-white">' +
             '<h5>✅ Interactive TODO List</h5>' +
             '</div>' +
             '<div class="card-body">';

  for (let i = 0; i < window.todos.length; i++) {
    const file = window.todos[i];

    html += '<h6 class="mt-3">📄 ' + file.name + '</h6>' +
            '<small class="text-muted">' + file.path + ' (' + file.spaceName + ')</small>' +
            '<ul class="list-group mt-2">';

    for (let j = 0; j < file.todos.length; j++) {
      const todo = file.todos[j];
      const isChecked = todo.status === 'checked';

      // Create clickable checkbox with data attributes for the API
      html += '<li class="list-group-item">' +
              '<input type="checkbox" ' +
              'class="form-check-input me-2" ' +
              (isChecked ? 'checked ' : '') +
              'data-todo-path="' + file.path + '" ' +
              'data-todo-space="' + file.spaceName + '" ' +
              'data-todo-line="' + todo.line + '"> ' +
              '<span style="' + (isChecked ? 'text-decoration: line-through; opacity: 0.6;' : '') + '">' +
              todo.text +
              '</span>' +
              '</li>';
    }

    html += '</ul>';
  }

  html += '</div></div>';
  return html;
}
```
````

> **Note:** The interactive checkboxes in Example 4 are automatically wired up by the document controller to call the TODO toggle API when clicked!

---

## Advanced Use Cases

### 1. Custom Navigation Menu

Create a smart navigation menu that adapts to the current folder structure:

````markdown
```wiki-code
function() {
  if (!window.documents) return '<p>Loading...</p>';

  function buildNav(nodes, depth) {
    if (!nodes || nodes.length === 0) return '';

    let html = '<ul class="nav flex-column">';

    for (let i = 0; i < Math.min(nodes.length, 10); i++) {
      const node = nodes[i];

      if (node.type === 'folder') {
        html += '<li class="nav-item">' +
                '<a class="nav-link" href="#" style="padding-left: ' + (depth * 15) + 'px;">' +
                '📁 ' + node.name +
                '</a>';

        if (node.children && depth < 2) {
          html += buildNav(node.children, depth + 1);
        }

        html += '</li>';
      }
    }

    html += '</ul>';
    return html;
  }

  return '<div class="card">' +
         '<div class="card-header bg-dark text-white">Navigation</div>' +
         '<div class="card-body">' + buildNav(window.documents, 0) + '</div>' +
         '</div>';
}
```
````

### 2. Document Type Analyzer

Analyze and visualize the distribution of file types:

````markdown
```wiki-code
function() {
  if (!window.documents) return '<p>No data</p>';

  const types = {};

  function analyzeTypes(nodes) {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].type === 'document') {
        const ext = nodes[i].name.split('.').pop().toLowerCase();
        types[ext] = (types[ext] || 0) + 1;
      }
      if (nodes[i].children) {
        analyzeTypes(nodes[i].children);
      }
    }
  }

  analyzeTypes(window.documents);

  let html = '<div class="card">' +
             '<div class="card-header">📊 File Type Distribution</div>' +
             '<div class="card-body">' +
             '<table class="table">' +
             '<thead><tr><th>Extension</th><th>Count</th></tr></thead>' +
             '<tbody>';

  for (const ext in types) {
    html += '<tr><td><code>.' + ext + '</code></td><td>' + types[ext] + '</td></tr>';
  }

  html += '</tbody></table></div></div>';
  return html;
}
```
````

### 3. Task Deadline Tracker

If you follow a convention of adding dates to TODOs, parse and track them:

````markdown
```wiki-code
function() {
  if (!window.todos) return '<p>No TODOs</p>';

  const today = new Date();
  const upcoming = [];
  const overdue = [];

  for (let i = 0; i < window.todos.length; i++) {
    for (let j = 0; j < window.todos[i].todos.length; j++) {
      const todo = window.todos[i].todos[j];

      // Look for dates in format [2025-01-15]
      const dateMatch = todo.text.match(/\[(\d{4}-\d{2}-\d{2})\]/);

      if (dateMatch && todo.status !== 'checked') {
        const dueDate = new Date(dateMatch[1]);
        const item = {
          text: todo.text,
          file: window.todos[i].name,
          date: dueDate
        };

        if (dueDate < today) {
          overdue.push(item);
        } else {
          upcoming.push(item);
        }
      }
    }
  }

  let html = '<div class="row">';

  // Overdue tasks
  html += '<div class="col-md-6">' +
          '<div class="card border-danger">' +
          '<div class="card-header bg-danger text-white">⚠️ Overdue Tasks</div>' +
          '<div class="card-body"><ul>';

  if (overdue.length === 0) {
    html += '<li>No overdue tasks!</li>';
  } else {
    for (let i = 0; i < overdue.length; i++) {
      html += '<li><strong>' + overdue[i].text + '</strong><br>' +
              '<small>' + overdue[i].file + '</small></li>';
    }
  }

  html += '</ul></div></div></div>';

  // Upcoming tasks
  html += '<div class="col-md-6">' +
          '<div class="card border-success">' +
          '<div class="card-header bg-success text-white">📅 Upcoming Tasks</div>' +
          '<div class="card-body"><ul>';

  if (upcoming.length === 0) {
    html += '<li>No upcoming tasks</li>';
  } else {
    for (let i = 0; i < upcoming.length; i++) {
      html += '<li>' + upcoming[i].text + '<br>' +
              '<small>' + upcoming[i].file + '</small></li>';
    }
  }

  html += '</ul></div></div></div></div>';
  return html;
}
```
````

---

## Best Practices

### 1. Always Check for Existence

Always verify that global variables exist before using them:

```javascript
function() {
  if (!window.documents) {
    return '<p>Data not available</p>';
  }
  // ... rest of code
}
```

### 2. Use Bootstrap Classes

The wiki uses Bootstrap 5, so leverage its CSS classes for consistent styling:

- Cards: `card`, `card-header`, `card-body`
- Alerts: `alert`, `alert-info`, `alert-warning`, `alert-danger`
- Tables: `table`, `table-striped`, `table-hover`
- Badges: `badge`, `bg-primary`, `bg-success`

### 3. Escape User Input

If displaying user-generated content, be cautious about XSS:

```javascript
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### 4. Keep Code Readable

Use clear variable names and add comments for complex logic:

```javascript
function() {
  // Count documents by type
  let mdFiles = 0;
  let pdfFiles = 0;

  // ... rest of code
}
```

### 5. Handle Empty States

Always provide helpful messages when no data is available:

```javascript
if (array.length === 0) {
  return '<div class="alert alert-info">No items to display</div>';
}
```

### 6. Performance Considerations

For large datasets, consider limiting results:

```javascript
const recentDocs = allDocs.slice(0, 10); // Only show first 10
```

---

## Error Handling

### What Happens When Code Fails

If your wiki-code throws an error, the system displays a user-friendly error message:

```html
<div class="alert alert-danger">
  <strong>Wiki-code execution error:</strong> [error message]
</div>
```

### Common Errors and Solutions

**1. ReferenceError: window.documents is not defined**
- **Cause:** Data hasn't loaded yet
- **Solution:** Add existence check: `if (!window.documents) return '...';`

**2. Cannot read property 'length' of undefined**
- **Cause:** Accessing a property on undefined
- **Solution:** Use optional chaining or existence checks

**3. Unexpected token**
- **Cause:** Syntax error in JavaScript
- **Solution:** Review code for missing brackets, quotes, or semicolons

### Debugging Tips

1. Use `console.log()` to inspect variables (check browser console)
2. Test complex logic outside wiki-code first
3. Build incrementally - start simple, add complexity
4. Use the preview mode to test without saving

---

## Security Considerations

### Execution Context

Wiki-code executes in the **browser context** with access to:
- Global `window` object
- Current user session
- All client-side APIs

### Security Best Practices

1. **Never include sensitive data** in wiki-code (passwords, API keys, etc.)
2. **Don't make external API calls** without proper authentication
3. **Be cautious with user input** - validate and sanitize
4. **Limit access to sensitive documents** using space permissions
5. **Review code in shared spaces** - others can see and execute your code

### What You Cannot Do

- Access server-side files or databases directly
- Execute system commands
- Access other users' private data
- Bypass permission controls

### What You Can Do Safely

- Display public data from `window.documents`, `window.currentDocuments`, `window.todos`
- Create dashboards and visualizations
- Build navigation and index pages
- Generate reports and statistics

---

## Conclusion

The wiki-code feature transforms your markdown documents from static pages into dynamic, data-driven applications. With access to `window.documents`, `window.currentDocuments`, and `window.todos`, you can create powerful dashboards, navigation systems, task trackers, and much more.

**Key Takeaways:**

1. ✅ Use wiki-code for dynamic content generation
2. ✅ Leverage global variables for real-time data
3. ✅ Always check for data existence
4. ✅ Use Bootstrap classes for consistent styling
5. ✅ Handle errors gracefully
6. ✅ Follow security best practices

**Next Steps:**

- Experiment with the examples in this guide
- Check out `.agent/architecture/wiki-code-feature-demo.md` for more examples
- Build your own custom dashboards
- Share your creative use cases with the team!

---

**Happy coding! 🚀**
