# Text-Based File Caching Implementation

## Overview

This document describes the caching implementation for text-based files in the NooblyJS Wiki application. The caching system improves performance by storing frequently accessed file contents in memory, reducing file system I/O operations.

## Cache Key Format

All text-based files are cached using the following key format:

```
{space}-{filepath}
```

**Example:**
- Space: `Personal`
- File path: `docs/readme.md`
- Cache key: `Personal-docs/readme.md`

## Supported File Types

The following text-based file extensions are automatically cached:

### Markdown
- `.md`, `.markdown`

### Plain Text
- `.txt`, `.csv`, `.dat`, `.log`, `.ini`, `.cfg`, `.conf`

### Programming Languages
- `.js`, `.ts`, `.jsx`, `.tsx`, `.vue`
- `.py`, `.java`, `.c`, `.cpp`, `.h`, `.hpp`, `.cs`
- `.php`, `.rb`, `.go`, `.rs`, `.swift`, `.kt`, `.scala`
- `.r`, `.m`, `.mm`, `.pl`, `.sh`, `.bash`, `.ps1`, `.bat`, `.cmd`

### Web Files
- `.html`, `.htm`, `.css`, `.scss`, `.sass`, `.less`

### Data/Configuration
- `.json`, `.xml`, `.yaml`, `.yml`, `.toml`, `.properties`

## Implementation Details

### 1. File Read Operations

When a text-based file is requested via the API:

**Location:** `src/routes/documentRoutes.js`

#### GET `/applications/wiki/api/documents/content`
1. Checks if the file is text-based
2. Generates cache key: `{spaceName}-{documentPath}`
3. Attempts to retrieve content from cache
4. If cache miss, reads from file system and caches for 30 minutes (1800 seconds)
5. Returns content to client

#### POST `/applications/wiki/api/documents/content`
1. Same caching logic as GET endpoint
2. Reads from cache first, falls back to file system
3. Caches content for 30 minutes on cache miss

**Code Reference:** `src/routes/documentRoutes.js:258-278` (GET) and `src/routes/documentRoutes.js:836-849` (POST)

### 2. File Save Operations

When a text-based file is saved:

**Location:** `src/routes/documentRoutes.js`

#### PUT `/applications/wiki/api/documents/content`
1. Writes content to physical file system
2. Immediately updates cache with new content
3. Cache TTL: 30 minutes (1800 seconds)
4. Updates search index asynchronously

**Code Reference:** `src/routes/documentRoutes.js:617-625`

#### POST `/applications/wiki/api/documents/toggle-todo`
1. Updates TODO checkbox in markdown file
2. Writes updated content to file system
3. Updates cache with new content
4. Updates search index asynchronously

**Code Reference:** `src/routes/documentRoutes.js:1060-1063`

### 3. File System Monitoring

The file watcher monitors all space directories for changes:

**Location:** `src/activities/fileWatcher.js`

#### File Added Event
1. Detects when a new text-based file is created
2. Reads file content
3. Pre-caches the content for 30 minutes
4. Emits Socket.IO event for UI updates

**Code Reference:** `src/activities/fileWatcher.js:177-187`

#### File Changed Event
1. Detects when a text-based file is modified externally
2. Reads updated file content
3. Updates cache with new content
4. Emits Socket.IO event for UI updates

**Code Reference:** `src/activities/fileWatcher.js:262-272`

#### File Deleted Event
1. Detects when a text-based file is deleted
2. Invalidates (removes) cache entry
3. Emits Socket.IO event for UI updates

**Code Reference:** `src/activities/fileWatcher.js:303-312`

## Utility Functions

### File Type Detection

**Location:** `src/utils/fileTypeUtils.js`

#### `isTextFile(filePath)`
Determines if a file is text-based by checking its extension.

**Returns:** `boolean`

#### `generateCacheKey(spaceName, filePath)`
Generates a standardized cache key for a file.

**Returns:** `string` in format `{spaceName}-{filePath}`

#### `getTextExtensions()`
Returns array of all supported text file extensions.

**Returns:** `Array<string>`

## Cache Configuration

- **Provider:** Memory-based cache (NooblyJS Core)
- **TTL (Time To Live):** 30 minutes (1800 seconds)
- **Storage:** In-memory (cleared on application restart)
- **Eviction Policy:** Automatic based on TTL

## Performance Benefits

1. **Reduced I/O:** Frequently accessed files are served from memory
2. **Faster Response Times:** Cache hits eliminate file system latency
3. **Scalability:** Reduces file system load under high traffic
4. **Consistency:** Cache is updated immediately on file changes

## Cache Flow Diagram

```
┌─────────────────┐
│  Client Request │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check if Text   │
│   File Type     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     Cache Hit      ┌─────────────┐
│  Check Cache    │─────────────────────▶│ Return Data │
│  Key: {space}-  │                      └─────────────┘
│    {filepath}   │
└────────┬────────┘
         │ Cache Miss
         ▼
┌─────────────────┐
│  Read from File │
│     System      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Cache Content  │
│   (30 minutes)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Return Data    │
└─────────────────┘
```

## File Watcher Flow

```
┌─────────────────┐
│ External File   │
│    Change       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Chokidar      │
│   Detects       │
│   Change        │
└────────┬────────┘
         │
         ├─────────────────┬─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  File Added   │  │ File Changed  │  │ File Deleted  │
├───────────────┤  ├───────────────┤  ├───────────────┤
│ 1. Read file  │  │ 1. Read file  │  │ 1. Generate   │
│ 2. Cache      │  │ 2. Update     │  │    cache key  │
│    content    │  │    cache      │  │ 2. Delete     │
│ 3. Emit event │  │ 3. Emit event │  │    from cache │
└───────────────┘  └───────────────┘  │ 3. Emit event │
                                      └───────────────┘
```

## Testing the Implementation

### Manual Testing Steps

1. **Test Cache on Read:**
   ```bash
   # First request (cache miss)
   curl "http://localhost:3002/applications/wiki/api/documents/content?spaceName=Personal&path=test.md"
   # Check logs for "Cached file content: Personal-test.md"

   # Second request (cache hit)
   curl "http://localhost:3002/applications/wiki/api/documents/content?spaceName=Personal&path=test.md"
   # Check logs for "Loaded file content from cache: Personal-test.md"
   ```

2. **Test Cache on Save:**
   ```bash
   # Save file
   curl -X PUT "http://localhost:3002/applications/wiki/api/documents/content" \
     -H "Content-Type: application/json" \
     -d '{"spaceName":"Personal","path":"test.md","content":"# Updated Content"}'
   # Check logs for "Updated cache after save: Personal-test.md"
   ```

3. **Test File Watcher:**
   ```bash
   # Modify a file externally
   echo "# New Content" > documents/Personal/test.md
   # Check logs for "Updated cache for changed file: Personal-test.md"

   # Delete a file externally
   rm documents/Personal/test.md
   # Check logs for "Invalidated cache for deleted file: Personal-test.md"
   ```

## Monitoring and Debugging

### Log Messages

- **Cache Hit:** `Loaded file content from cache: {cacheKey}`
- **Cache Miss & Set:** `Cached file content: {cacheKey}`
- **Cache Update on Save:** `Updated cache after save: {cacheKey}`
- **Cache Update on Change:** `Updated cache for changed file: {cacheKey}`
- **Cache Invalidation:** `Invalidated cache for deleted file: {cacheKey}`
- **Pre-cache on Add:** `Pre-cached new file: {cacheKey}`

### Troubleshooting

**Issue:** Files not being cached
- Check if file extension is in the supported list
- Verify `isTextFile()` returns true for the file
- Check cache service is initialized properly

**Issue:** Stale cache entries
- TTL is set to 30 minutes
- Restart application to clear all cache
- File watcher should update cache on external changes

**Issue:** Cache not updating on file changes
- Verify file watcher is running
- Check that `cache` service is passed to file watcher
- Review file watcher logs for errors

## Future Enhancements

1. **Configurable TTL:** Allow per-file or per-space cache duration
2. **Cache Warming:** Pre-cache frequently accessed files on startup
3. **Cache Statistics:** Track hit/miss ratios and performance metrics
4. **Selective Caching:** Allow disabling cache for specific spaces or file types
5. **Cache Size Limits:** Implement LRU eviction for memory management
6. **Distributed Caching:** Support Redis or Memcached for multi-instance deployments

## Related Files

- `/src/routes/documentRoutes.js` - Document API endpoints with caching
- `/src/activities/fileWatcher.js` - File system monitoring and cache updates
- `/src/utils/fileTypeUtils.js` - File type detection utilities
- `/index.js` - Service initialization and wiring

## Version History

- **v1.0.0** (2025-10-11): Initial implementation of text-based file caching
  - Cache on read with 30-minute TTL
  - Cache update on save
  - File watcher integration for external changes
  - Utility functions for file type detection
