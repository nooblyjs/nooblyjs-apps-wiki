# AI Context Generation - Debugging Guide

I've added comprehensive logging to the AI Context Generator. Follow these steps to diagnose why `folder-context.md` files aren't being created or are empty.

## Step 1: Check Server Logs

When you start the wiki application, look for these log messages in order:

### First: Scheduler Startup
```
AI Context generation scheduler started
Starting AI Context generation...
```

### Then: Processing Status
```
[PROCESS ALL SPACES] Starting AI Context generation for all spaces
[PROCESS ALL SPACES] Checking if AI service is ready
[PROCESS ALL SPACES] AI service ready: true/false
[PROCESS ALL SPACES] Reading spaces from data manager
[PROCESS ALL SPACES] Found X spaces to process
```

**If you see `AI service ready: false`**, stop here - AI is not configured. You need to:
1. Open the wiki in browser
2. Go to AI Settings
3. Configure your AI provider (Claude, ChatGPT, etc.)
4. Add your API key
5. Test the connection
6. Restart the wiki

### Then: Directory Processing
```
[DIRECTORY] Processing directory: /path/to/directory in space: Personal Space
[DIRECTORY] Created .aicontext directory at: /path/to/.aicontext
```

### Then: Folder Context Generation
```
[FOLDER CONTEXT] Starting generation for folder: foldername
[FOLDER CONTEXT] Folder stats - Files: 5, Folders: 2, Samples: file1.md, file2.js, ...
[FOLDER CONTEXT] Calling AI service for folder: foldername
[FOLDER CONTEXT] AI response received. Type: object, Keys: success, content, usage, model, provider
[FOLDER CONTEXT] Result object: {"success":true,"content":"This is a description...","usage":{"inputTokens":45,...
[FOLDER CONTEXT] Content length: 145, Content preview: This is a description of the folder...
[FOLDER CONTEXT] Writing context file to: /path/to/.aicontext/folder-context.md
[FOLDER CONTEXT] Successfully generated folder context for: foldername
```

## Step 2: Identify the Problem

### Problem: "AI service ready: false"
**Solution:** Configure AI settings in the wiki:
1. Click your profile icon (top right)
2. Select "AI Settings"
3. Choose an AI provider
4. Enter API key
5. Test connection
6. Save and restart wiki

### Problem: Logs stop at "Checking if AI service is ready"
**Solution:** AI Service failed to initialize. Check:
1. AI settings are saved properly
2. API key is valid
3. Check browser console for errors
4. Restart wiki

### Problem: "Found 0 spaces to process"
**Solution:** No spaces exist or can't be read. Check:
1. Wiki has been initialized properly
2. `.application/wiki-data/spaces.json` exists and contains spaces
3. File permissions are correct

### Problem: Logs show "[DIRECTORY] Processing directory" but no folder context logs
**Solution:** Folder scanning works but context generation doesn't start. This means:
1. AI call might be failing
2. Check next log message for AI errors

### Problem: "[FOLDER CONTEXT] AI response received" but then "Content length: 0"
**Solution:** AI returned an empty response. Check:
1. Look at the `Result object` log
2. If it shows `"content":""`  - AI service returned empty content
3. Check your AI API limits/quota
4. Try manually calling the AI to test

### Problem: File written but is empty
**Solution:** The file exists but has no content. This could mean:
1. `folder-context.md` created but context writing failed
2. Check the log for file write errors
3. Verify disk space and file permissions

## Step 3: Manual Testing

### Manually trigger context generation:
```bash
curl -X POST http://localhost:3002/applications/wiki/api/ai/generate-contexts
```

Then watch server logs for the output.

### Check AI Context status:
```bash
curl http://localhost:3002/applications/wiki/api/ai/context-status
```

Response should look like:
```json
{
  "success": true,
  "isAIReady": true,
  "isProcessing": false,
  "lastProcessedTime": "2025-10-19T10:30:45.123Z"
}
```

## Step 4: Verify Files Were Created

Check if files exist:
```bash
find documents -name "folder-context.md" -type f
find documents -path "*/.aicontext/*" -type f
```

View file contents:
```bash
cat documents/.aicontext/folder-context.md
```

## Step 5: Common Messages and Their Meanings

| Log Message | Meaning | Action |
|---|---|---|
| `AI service ready: false` | AI not configured | Configure AI settings |
| `Found 0 spaces to process` | No spaces in database | Initialize wiki properly |
| `AI response received. Type: object` | AI call succeeded | Check content length next |
| `Content length: 0, Content preview:` | AI returned empty | Check AI quota/limits |
| `AI service error for folder` | AI call failed | Check API key and limits |
| `Successfully generated folder context` | ✅ Success | Check `.aicontext` folder |
| `Could not create .aicontext directory` | Permission issue | Check folder permissions |

## Collect Debug Information

If none of this works, collect these logs:

1. Full server output from startup through context generation (copy entire terminal)
2. Result of checking `.aicontext` folder exists: `ls -la documents/.aicontext/`
3. Contents of a generated file: `cat documents/.aicontext/folder-context.md`
4. AI status: `curl http://localhost:3002/applications/wiki/api/ai/context-status`

Share these and we can diagnose the exact issue!
