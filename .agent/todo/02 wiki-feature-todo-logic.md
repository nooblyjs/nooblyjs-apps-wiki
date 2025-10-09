# Todo feature

## Background: Create context layout
So I would like to make a cool feature regarding the TODO (" -[x]") concept in markdown. I would like to break this down into two features. The ability to mark something as done and it updates the markdown and secondarily to be able to find all the TODO's accross all markdown files and be able to display them using our  "WIKI-CODE" concept.

## Feature 1: Todo updates 
Ok, so when the markdown is in the view content area, the user should be able to click on a todo check box and it should become checked. But as this needs to update the underlying markdown file, it would be great if we could unobtrusevly upate the underlying file. Note that this should raise an event to the document change event so that the search index runs and a window.todo context can be updated.  

## Feature 2: Client side todo object for "wiki-code" 
 I would love a feature like the window.documents object that can be used by the wiki-code blocks But in this case it should be for Todo items. A periodic client side activity should walk through the folders and files and check for any files, with todo markdown, that have been updated since the last check and create a js object called window.todos that holds the todo items. 
 
This object could look like this:

window.todos[
    {
        created: "2025-10-09T08:28:13.114Z"
        created: "2025-10-09T08:28:13.114Z"
        name: "markdown-guide.md"
        path: "Getting Started/markdown-guide.md",
        space: "1",
        todos: [
            {
                text: "Update this file",
                status: unchecked,
                line: 35
            },
            {
                text: "Update this item",
                status: checked
                line: 36
            }
        ]
        children : [{

            ... child files
        }]
    },
]

The one key think here is that if I click on a checkbox where this has been presented then it should find the underling markdown file and update the check value from "[ ]" to "[x]" and if checked "[x]" to "[ ]".

## Implementation Action List

### Phase 1: Backend API for TODO Updates
- [x] Create POST endpoint `/applications/wiki/api/documents/toggle-todo` to update TODO checkboxes
- [x] Parse markdown content to locate specific TODO by line number
- [x] Toggle TODO status between `[ ]` and `[x]`
- [x] Save updated markdown back to file
- [x] Emit document change event for search indexing
- [x] Return updated content to frontend

### Phase 2: Frontend TODO Click Handler
- [x] Add click event listener to all checkboxes in markdown-rendered content
- [x] Detect checkbox clicks and prevent default behavior
- [x] Extract file path, space name, and line number from context
- [x] Call API to toggle TODO status
- [x] Update UI to reflect new TODO status
- [x] Show loading state during update

### Phase 3: Background TODO Scanner
- [x] Create `todoScanner.js` activity to periodically scan markdown files
- [x] Walk through all spaces and folders recursively
- [x] Extract TODO items from markdown using regex
- [x] Track line numbers for each TODO
- [x] Build `window.todos` array with proper structure
- [x] Store last scan timestamp to optimize subsequent scans
- [x] Only rescan files modified since last scan

### Phase 4: Window.todos Object Structure
- [x] Populate `window.todos` on page load and after updates
- [x] Include file metadata (name, path, space, created date)
- [x] Include todos array with text, status, and line number
- [x] Support hierarchical structure for folders
- [x] Expose to wiki-code blocks for dynamic rendering

### Phase 5: Wiki-Code TODO Integration
- [x] Create TODO click handler for dynamically rendered checkboxes
- [x] Support data attributes for path, space, and line tracking
- [x] Handle delegated events for dynamically added content
- [x] Update window.todos after successful toggle

### Phase 6: Example Content & Documentation
- [x] Create comprehensive example in "Getting Started/markdown-guide-advanced.md"
- [x] Add multiple TODO examples with different states
- [x] Create wiki-code examples showing TODO list rendering
- [x] Add filtering examples (by status, by space, etc.)
- [x] Create dashboard example with TODO statistics
- [x] Add interactive TODO board example

## Implementation Status
✅ All phases completed successfully!

### Key Features Delivered:
1. ✅ Click-to-toggle TODO checkboxes in markdown views
2. ✅ Real-time markdown file updates
3. ✅ Background scanning of all markdown files
4. ✅ `window.todos` global object for wiki-code
5. ✅ Comprehensive examples and documentation
6. ✅ Event-driven search index updates
7. ✅ Optimized scanning with incremental updates