# Processing

## Requirement
I would like to implement a extension that runs seperatly and monitors a folder and then uploads the data to a space e.g the shared space. In addition this process should monitor the space sync files back to the folder its monitoring. The extension code should be created in the @extensions/daemon folder and should have its own package.json. I think it should use basic authenticaion so I put the username and password of the user in an env file in the @extensions/daemon folder as it should use the wiki api's to work. Lets write something cool 

### Tasks

1. **Setup Extension Structure**
   - [ ] Create `extensions/daemon` directory
   - [ ] Create `package.json` with dependencies (chokidar, axios, dotenv)
   - [ ] Create `.env.example` template for configuration
   - [ ] Create `.env` file for user credentials (gitignored)

2. **Core Daemon Implementation**
   - [ ] Create `index.js` - Main daemon entry point
   - [ ] Implement folder monitoring with chokidar
   - [ ] Implement file change detection (create, update, delete)
   - [ ] Create API client module for wiki API communication

3. **Upload Functionality (Folder → Space)**
   - [ ] Detect new/modified files in monitored folder
   - [ ] Read file content and extract metadata
   - [ ] Upload documents to shared space via POST /api/documents
   - [ ] Handle upload errors and retry logic
   - [ ] Track uploaded file mappings (local path ↔ document ID)

4. **Download/Sync Functionality (Space → Folder)**
   - [ ] Poll shared space for document changes via GET /api/spaces/:id/documents
   - [ ] Detect new/updated documents in space
   - [ ] Download document content via GET /api/documents/:id
   - [ ] Write files to monitored folder
   - [ ] Handle file conflicts and versioning

5. **State Management**
   - [ ] Create local state file to track sync status
   - [ ] Store file hashes to detect changes
   - [ ] Store document ID mappings
   - [ ] Implement state persistence and recovery

6. **Configuration & Authentication**
   - [ ] Load credentials from .env (WIKI_USERNAME, WIKI_PASSWORD, WIKI_URL)
   - [ ] Implement basic authentication headers
   - [ ] Configure monitored folder path
   - [ ] Configure sync interval

7. **Error Handling & Logging**
   - [ ] Add comprehensive error handling
   - [ ] Implement logging system
   - [ ] Add retry logic for network failures
   - [ ] Handle authentication failures

8. **Documentation**
   - [ ] Create README.md with setup instructions
   - [ ] Document environment variables
   - [ ] Add usage examples
   - [ ] Add troubleshooting guide

9. **Testing & Validation**
   - [ ] Test file upload to shared space
   - [ ] Test file download from shared space
   - [ ] Test bidirectional sync
   - [ ] Test conflict resolution
   - [ ] Test daemon restart recovery

