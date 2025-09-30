# Wiki Application Refactoring Plan

## Completed (Phase 1)

### ✅ Extracted Utilities
1. **utils/fileHelpers.js** - File type detection, icons, formatting
2. **utils/validation.js** - Input validation for folders, files, spaces
3. **modules/apiClient.js** - Centralized API client

## Remaining Work (Phase 2)

### Routes Refactoring

Split `routes/index.js` (1,942 lines) into:

#### routes/modules/authRoutes.js
- POST `/login`
- POST `/logout`
- GET `/api/auth/check`

#### routes/modules/userRoutes.js
- GET `/api/profile`
- PUT `/api/profile`
- GET `/api/user/activity`
- POST `/api/user/star`
- POST `/api/user/visit`

#### routes/modules/spaceRoutes.js
- GET `/api/spaces`
- POST `/api/spaces`
- GET `/api/spaces/:id/documents`
- GET `/api/spaces/:spaceId/folders`
- GET `/api/spaces/:spaceId/templates`

#### routes/modules/folderRoutes.js
- POST `/api/folders`
- PUT `/api/folders/rename`
- DELETE `/api/folders/:path`

#### routes/modules/documentRoutes.js
- GET `/api/documents`
- GET `/api/documents/:id`
- POST `/api/documents`
- PUT `/api/documents`
- DELETE `/api/documents/:path`
- GET `/api/documents/content`
- POST `/api/documents/content`
- PUT `/api/documents/content`
- PUT `/api/documents/:id/move`
- GET `/api/documents/recent`
- GET `/api/documents/popular`

#### routes/modules/searchRoutes.js
- GET `/api/search`
- GET `/api/search/suggestions`
- GET `/api/search/stats`
- POST `/api/search/rebuild`

#### routes/modules/activityRoutes.js
- GET `/api/activity`
- PUT `/api/activity`
- GET `/api/recent`

### App.js Refactoring

Currently: 4,694 lines, 156 methods

Recommended splits:

#### Keep in app.js (Main Class)
- Constructor
- Init methods
- Core state management
- View switching logic

#### Extract to modules/treeManager.js
- renderFileTree
- renderTreeNodes
- bindFileTreeEvents
- updateTreeNode
- findNodeInTree
- toggleFolder
- All tree-related methods (~800 lines)

#### Extract to modules/modalManager.js
- showCreateFolderModal
- showCreateFileModal
- showRenameModal
- showUploadDialog
- All modal show/hide logic (~600 lines)

#### Extract to modules/viewRenderer.js
- showHome
- showSpaceView
- showFolderView
- showEditorView
- All view rendering methods (~1000 lines)

## Integration Plan

### Step 1: Update index.html
Add module imports:
```html
<script type="module" src="js/utils/fileHelpers.js"></script>
<script type="module" src="js/utils/validation.js"></script>
<script type="module" src="js/modules/apiClient.js"></script>
<script type="module" src="js/app.js"></script>
```

### Step 2: Update app.js
Import and use the new modules:
```javascript
import { FileHelpers } from './utils/fileHelpers.js';
import { Validator } from './utils/validation.js';
import { WikiAPI } from './modules/apiClient.js';
```

### Step 3: Update routes/index.js
```javascript
const authRoutes = require('./modules/authRoutes');
const userRoutes = require('./modules/userRoutes');
const spaceRoutes = require('./modules/spaceRoutes');
// ... etc

module.exports = (app, eventEmitter, serviceRegistry) => {
  authRoutes(app, serviceRegistry);
  userRoutes(app, serviceRegistry);
  spaceRoutes(app, serviceRegistry);
  // ... etc
};
```

## Benefits

1. **Maintainability**: Smaller, focused files
2. **Reusability**: Shared utilities
3. **Testing**: Easier to unit test
4. **Collaboration**: Multiple developers can work on different modules
5. **Performance**: Better code splitting opportunities

## Risk Mitigation

1. Test each module extraction independently
2. Keep git commits granular
3. Maintain backwards compatibility during transition
4. Document all API changes

## Timeline

- Phase 1 (Completed): Utility extraction
- Phase 2 (2-3 hours): Routes refactoring
- Phase 3 (3-4 hours): App.js refactoring
- Phase 4 (1-2 hours): Testing & integration
