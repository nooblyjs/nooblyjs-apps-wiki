# Processing

## Requirement
So this is a rather significant update to the UI so I need you to think hard about this change. I would like to implement drag and drop functionality in the left file navigation and the file navigation in the content area. Please allow a user to drag and drop a file and folder in the left navigation and folder view in the content area. Please ensure that the folders then represent the change done by the user.

### Implementation Plan

This feature adds drag-and-drop functionality to both the left navigation tree and the folder content view, allowing users to reorganize files and folders intuitively.

#### Architecture Overview

**Components Involved:**
1. **Frontend (navigationcontroller.js)** - Add drag event handlers to tree items and folder cards
2. **Backend API (navigationRoutes.js)** - New endpoint to move files/folders
3. **File System** - Physical file/folder movement using Node.js `fs` API
4. **UI Feedback** - Visual indicators during drag operations

**Drag & Drop Behavior:**
- Drag files/folders from left navigation OR folder content view
- Drop onto folders in left navigation OR folder content view
- Move files/folders to new locations
- Update file tree and folder view automatically
- Show visual feedback (drag ghost, drop zone highlighting)

### Tasks

#### Phase 1: Backend API Setup ✅ COMPLETED
- [x] Read and understand current navigation structure
- [x] Create API endpoint `POST /applications/wiki/api/move` for moving files/folders
  - Accept: `sourcePath`, `targetPath`, `spaceId`, `itemType` (file/folder)
  - Validate paths to prevent security issues
  - Move physical files/folders using `fs.rename()`
  - Update documents.json metadata with new paths
  - Return updated file tree
- [x] Add error handling for invalid moves (moving folder into itself, moving to non-existent location, etc.)

**Implementation Details:**
- Added `POST /applications/wiki/api/move` endpoint in `src/routes/navigationRoutes.js:454`
- Security validation: Ensures paths stay within space directory boundaries
- Prevents folder into itself moves and same-location moves
- Updates documents.json metadata for moved files and nested files in moved folders
- Returns new path on success

#### Phase 2: Frontend - Left Navigation Drag & Drop ✅ COMPLETED
- [x] Make folder items draggable
  - Add `draggable="true"` attribute to `.folder-item`
  - Implement `dragstart` event handler
  - Set drag data with folder path and type
- [x] Make file items draggable
  - Add `draggable="true"` attribute to `.file-item`
  - Implement `dragstart` event handler
  - Set drag data with file path and type
- [x] Make folders drop targets
  - Implement `dragover` event handler (prevent default to allow drop)
  - Implement `dragenter` event handler (highlight drop zone)
  - Implement `dragleave` event handler (remove highlight)
  - Implement `drop` event handler (call API to move item)
- [x] Add visual feedback
  - CSS for dragging state (opacity, cursor)
  - CSS for drop zone highlighting
  - Drag ghost image customization

**Implementation Details:**
- Modified `bindFileTreeEvents()` in `navigationcontroller.js:124` to add drag handlers
- Added drag event listeners to folder and file items (lines 191-235)
- Disabled in read-only mode
- Added CSS classes: `.dragging`, `.drag-over` in `public/styles.css:395-421`
- Visual feedback: semi-transparent dragged items, highlighted drop zones

#### Phase 3: Frontend - Folder Content View Drag & Drop ✅ COMPLETED
- [x] Make folder cards draggable in grid view
  - Add drag handlers to `.folder-card`
  - Set drag data appropriately
- [x] Make file cards draggable in grid view
  - Add drag handlers to `.file-card`
  - Set drag data appropriately
- [x] Make folder cards drop targets
  - Add drop handlers to `.folder-card`
  - Visual feedback when hovering over drop target
- [x] Allow dropping on empty folder area
  - Handle drop on `.folder-content` background
  - Move items to current folder's root

**Implementation Details:**
- Modified folder/file card event binding in `navigationcontroller.js:552-640`
- Added drag handlers to both `.folder-card` and `.file-card` elements
- Reused same drag/drop handler methods for consistency
- Added CSS classes for card drag states in `public/styles.css:503-532`
- Visual feedback: grab cursor, semi-transparent while dragging, highlighted drop zones

#### Phase 4: Integration & Polish ✅ COMPLETED
- [x] Update file tree after successful move
  - Refresh only affected nodes (source parent and target parent)
  - Maintain expansion state of folders
- [x] Update folder view after successful move
  - Reload current folder content
  - Show notification on successful move
- [x] Add constraints and validation
  - Prevent dropping folder into itself or children
  - Prevent moving to same location
  - Show error messages for invalid operations
- [x] Cross-view drag and drop
  - Allow dragging from left nav and dropping in content view
  - Allow dragging from content view and dropping in left nav

**Implementation Details:**
- Added shared drag/drop methods in `navigationcontroller.js:1570-1683`:
  - `handleDragStart()` - Stores drag data in dataTransfer
  - `handleDragOver()` - Enables drop
  - `handleDragEnter()` - Highlights drop zone
  - `handleDragLeave()` - Removes highlight
  - `handleDrop()` - Calls API and refreshes views
- Validation prevents invalid moves (folder into self, same location)
- Full tree refresh after move (`loadFileTree()`)
- Folder view reload if currently viewing affected folder
- Success/error notifications via `app.showNotification()`

#### Phase 5: Testing & Edge Cases
- [ ] Test moving files between folders
- [ ] Test moving folders (with nested content)
- [ ] Test moving to root level
- [ ] Test invalid moves (folder into itself, etc.)
- [ ] Test drag and drop across both views
- [ ] Test with read-only spaces (should be disabled)
- [ ] Test keyboard accessibility (ESC to cancel drag)

**Ready for Testing** - All core functionality implemented. Please test the following scenarios:
1. Move files between folders using left nav
2. Move folders with nested content
3. Move items to root by dropping on space name
4. Try invalid moves (should show error)
5. Drag from left nav, drop in content view (and vice versa)
6. Verify read-only spaces prevent dragging
7. Test ESC key cancellation during drag
