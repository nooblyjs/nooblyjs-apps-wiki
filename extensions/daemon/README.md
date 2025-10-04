# NooblyJS Wiki Daemon

A folder monitoring daemon that automatically syncs local markdown files with your NooblyJS Wiki shared space. The daemon provides bidirectional sync - changes to local files are uploaded to the wiki, and changes in the wiki are downloaded to your local folder.

## Features

- **Bidirectional Sync**: Automatically sync files between local folder and wiki space
- **Real-time Monitoring**: Watch for file changes and upload immediately
- **Periodic Sync**: Pull updates from wiki space at regular intervals
- **State Management**: Track file-document mappings and detect changes using file hashes
- **Conflict Handling**: Smart sync with last-modified timestamps
- **Auto-Recovery**: Persistent state that survives daemon restarts

## Installation

1. Navigate to the daemon directory:
```bash
cd extensions/daemon
```

2. Install dependencies:
```bash
npm install
```

3. Create your `.env` file from the example:
```bash
cp .env.example .env
```

4. Edit `.env` with your credentials:
```env
WIKI_URL=http://localhost:3002
WIKI_USERNAME=your-username
WIKI_PASSWORD=your-password
WATCH_FOLDER=./watch
SHARED_SPACE_ID=2
SYNC_INTERVAL=5000
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WIKI_URL` | URL of your wiki instance | `http://localhost:3002` |
| `WIKI_USERNAME` | Your wiki username | *required* |
| `WIKI_PASSWORD` | Your wiki password | *required* |
| `WATCH_FOLDER` | Local folder to monitor | `./watch` |
| `SHARED_SPACE_ID` | Wiki space ID to sync with | `2` |
| `SYNC_INTERVAL` | How often to sync from wiki (ms) | `5000` |

### Space IDs

Default space IDs in NooblyJS Wiki:
- `1` - Personal Space
- `2` - Shared Space (recommended for daemon sync)
- `3` - Read-Only Space

## Usage

### Start the Daemon

```bash
npm start
```

Or in development mode with auto-restart:

```bash
npm run dev
```

### First Run

On first run, the daemon will:
1. Create the watch folder if it doesn't exist
2. Download all existing documents from the configured space
3. Start monitoring the folder for changes
4. Begin periodic syncing from the wiki

### Working with Files

**Create a new document:**
1. Create a new `.md` file in the watch folder
2. The daemon will automatically upload it to the wiki

**Edit a document:**
1. Modify any `.md` file in the watch folder
2. Changes are automatically uploaded to the wiki

**Delete a document:**
1. Delete a `.md` file from the watch folder
2. The corresponding wiki document will be deleted

**Sync from wiki:**
- New documents created in the wiki are automatically downloaded
- Updates to documents in the wiki are pulled periodically
- Deleted documents in the wiki are removed from local folder

### Stopping the Daemon

Press `Ctrl+C` to gracefully stop the daemon.

## How It Works

### Architecture

```
┌─────────────────┐
│  Local Folder   │
│   (watched)     │
└────────┬────────┘
         │
         │ Chokidar
         │ (file watcher)
         │
┌────────▼────────┐         ┌──────────────┐
│  Folder Watcher │────────▶│  File Sync   │
└─────────────────┘         └──────┬───────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
            ┌───────▼──────┐  ┌────▼─────┐  ┌────▼────────┐
            │ State Manager│  │API Client│  │ Periodic    │
            │   (.json)    │  │          │  │ Sync Timer  │
            └──────────────┘  └────┬─────┘  └─────────────┘
                                   │
                            ┌──────▼──────┐
                            │  Wiki API   │
                            │  (HTTP)     │
                            └─────────────┘
```

### Components

1. **API Client** (`lib/api-client.js`)
   - Handles all communication with the wiki API
   - Uses basic authentication
   - Provides methods for CRUD operations on documents

2. **State Manager** (`lib/state-manager.js`)
   - Tracks file-to-document mappings
   - Stores file hashes to detect changes
   - Persists state to `.daemon-state.json`

3. **File Sync** (`lib/file-sync.js`)
   - Handles upload/download logic
   - Manages bidirectional synchronization
   - Handles file naming and sanitization

4. **Folder Watcher** (`lib/folder-watcher.js`)
   - Monitors local folder using chokidar
   - Triggers uploads on file changes
   - Handles file deletion events

5. **Main Daemon** (`index.js`)
   - Orchestrates all components
   - Manages lifecycle and configuration
   - Handles graceful shutdown

### Sync Strategy

**Local → Wiki (Upload)**
- File created/modified → Upload to wiki
- File hash compared to detect actual changes
- Existing documents are updated, new ones are created

**Wiki → Local (Download)**
- Periodic polling of wiki space
- Documents compared by last modified timestamp
- New/updated documents downloaded to local folder
- Deleted documents removed from local folder

### State Persistence

The daemon maintains a `.daemon-state.json` file that tracks:
```json
{
  "files": {
    "path/to/file.md": {
      "hash": "sha256-hash",
      "documentId": 123,
      "lastSync": "2025-01-15T10:30:00.000Z"
    }
  },
  "documents": {
    "123": {
      "filePath": "path/to/file.md",
      "hash": "sha256-hash",
      "lastSync": "2025-01-15T10:30:00.000Z"
    }
  }
}
```

This allows the daemon to:
- Resume sync after restart
- Detect file changes efficiently
- Map between files and documents
- Avoid unnecessary uploads

## Troubleshooting

### Authentication Failed

**Problem**: `Failed to get space documents: Request failed with status code 401`

**Solution**:
- Verify your username and password in `.env`
- Ensure your user has access to the configured space
- Check that the wiki server is running

### Files Not Syncing

**Problem**: Changes to files aren't appearing in the wiki

**Solution**:
- Check daemon logs for errors
- Verify file is a `.md` or `.markdown` file
- Ensure file is in the watched folder
- Check `.daemon-state.json` for correct mappings

### Duplicate Documents

**Problem**: Multiple documents created for the same file

**Solution**:
- Delete `.daemon-state.json` and restart
- Manually clean up duplicates in the wiki
- The daemon will re-establish correct mappings

### Port Already in Use

**Problem**: Wiki server not accessible

**Solution**:
```bash
# Check if wiki is running
curl http://localhost:3002/api/spaces

# Start the wiki if needed
cd /path/to/wiki
npm start
```

## Development

### Project Structure

```
extensions/daemon/
├── index.js              # Main entry point
├── lib/
│   ├── api-client.js     # Wiki API client
│   ├── state-manager.js  # State persistence
│   ├── file-sync.js      # Sync logic
│   └── folder-watcher.js # File monitoring
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

### Running Tests

Currently no automated tests. To manually test:

1. Start the wiki server
2. Configure `.env` with test credentials
3. Run `npm start`
4. Create/edit/delete test files in watch folder
5. Verify changes in wiki UI

### Adding Features

The daemon is modular and extensible:

- Add new API methods in `api-client.js`
- Extend state tracking in `state-manager.js`
- Modify sync behavior in `file-sync.js`
- Add file filters in `folder-watcher.js`

## Security Notes

- The `.env` file contains sensitive credentials - never commit it
- Basic authentication is used - consider HTTPS in production
- Files are stored locally - ensure proper file permissions
- State file may contain file paths - review before sharing

## License

ISC
