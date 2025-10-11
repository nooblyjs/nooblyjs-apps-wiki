# Wiki-Code Feature Demo

This document demonstrates the new custom code injection features for the NooblyJS Wiki Application.

## Feature 1: Inline Code Execution

The `wiki-code` language tag allows you to execute JavaScript code inline and inject the results into the markdown.

### Example 1: Simple Text Output

```wiki-code
function() {
  return "Hello World from wiki-code!";
}
```

### Example 2: Dynamic Date

```wiki-code
function() {
  const now = new Date();
  return `<p>Current date and time: <strong>${now.toLocaleString()}</strong></p>`;
}
```

### Example 3: Dynamic List

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

## Feature 2: Access to Document Structure

The platform now provides access to document and folder information through global variables:
- `window.documents` - Full tree structure of all documents and folders
- `window.currentDocuments` - Documents in the current folder

### Example 4: List Current Folder Contents

```wiki-code
function() {
  if (!window.currentDocuments || window.currentDocuments.length === 0) {
    return '<p><em>No documents in current folder</em></p>';
  }

  let html = '<div class="alert alert-info"><h5>Current Folder Contents:</h5><ul>';
  for (let i = 0; i < window.currentDocuments.length; i++) {
    const doc = window.currentDocuments[i];
    const icon = doc.type === 'folder' ? '📁' : '📄';
    html += '<li>' + icon + ' ' + doc.name + ' (' + doc.type + ')</li>';
  }
  html += '</ul></div>';
  return html;
}
```

### Example 5: Count Documents and Folders

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

  return '<div class="card"><div class="card-body">' +
         '<h5 class="card-title">Document Statistics</h5>' +
         '<p>Total Folders: <strong>' + folderCount + '</strong></p>' +
         '<p>Total Files: <strong>' + fileCount + '</strong></p>' +
         '</div></div>';
}
```

### Example 6: Recent Files Table

```wiki-code
function() {
  if (!window.currentDocuments || window.currentDocuments.length === 0) {
    return '<p>No documents to display</p>';
  }

  let html = '<table class="table table-striped"><thead><tr>' +
             '<th>Name</th><th>Type</th><th>Path</th>' +
             '</tr></thead><tbody>';

  for (let i = 0; i < Math.min(window.currentDocuments.length, 5); i++) {
    const doc = window.currentDocuments[i];
    html += '<tr>' +
            '<td>' + doc.name + '</td>' +
            '<td><span class="badge badge-' + (doc.type === 'folder' ? 'primary' : 'secondary') + '">' + doc.type + '</span></td>' +
            '<td><code>' + doc.path + '</code></td>' +
            '</tr>';
  }

  html += '</tbody></table>';
  return html;
}
```

## Use Cases

This feature enables powerful custom behaviors:

1. **Dynamic Navigation** - Generate custom navigation menus based on folder structure
2. **Document Statistics** - Display live statistics about your wiki content
3. **Custom Dashboards** - Create personalized overview pages
4. **Interactive Content** - Generate dynamic lists, tables, and visualizations
5. **Automated TOC** - Build custom table of contents from folder structure

## Security Note

Code execution happens in the browser context with access to the global `window` object. Be careful about what code you execute, as it has access to the current user session.
