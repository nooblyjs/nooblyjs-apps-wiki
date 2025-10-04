# Quick Start Guide

## Prerequisites

1. NooblyJS Wiki application running (default: http://localhost:3002)
2. Valid user credentials for the wiki
3. Google Chrome browser

## Installation Steps

### 1. Create Icon Files

The extension needs three icon files. Choose one method:

**Method A: Using ImageMagick (Recommended)**
```bash
cd icons
./create-icons.sh
```

**Method B: Using Online Converter**
1. Upload `icons/icon.svg` to https://cloudconvert.com/svg-to-png
2. Convert to PNG at 128x128, 48x48, and 16x16
3. Save as `icon128.png`, `icon48.png`, and `icon16.png` in `icons/` folder

**Method C: Use Any PNG Images**
- Just ensure they're named correctly and are square
- Recommended: Use a "W" logo or wiki icon

### 2. Load Extension

1. Open Chrome: `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Navigate to and select: `extensions/chrome/`
5. Extension loads successfully ✓

### 3. First Use

1. Click extension icon in Chrome toolbar
2. Login screen appears
3. Enter:
   - Server URL: `http://localhost:3002` (or your server)
   - Username: (your wiki username)
   - Password: (your wiki password)
4. Click "Sign In"

### 4. Select a Space

After login, choose from available spaces:
- Personal Space
- Shared Space
- Read-Only Space
- (or any custom spaces)

### 5. Start Browsing

Use the four tabs:
- **Files**: Browse folder structure
- **Recent**: Your recently viewed files
- **Starred**: Files you've marked as favorites
- **Search**: Find documents quickly

## Common Issues

**Can't load extension**
- Check that all files are in `extensions/chrome/` folder
- Ensure `manifest.json` is present
- Look for errors in Chrome extensions page

**Login fails**
- Verify server URL is correct
- Check wiki application is running
- Ensure credentials are correct
- Check browser console for errors

**Files not displaying**
- Verify space has documents
- Check network tab for API errors
- Ensure you have read permissions

**Icons missing**
- Create icon files using methods above
- Or temporarily comment out icon references in `manifest.json`

## Testing the Extension

1. **Login Test**: Can you successfully authenticate?
2. **Space Test**: Do all spaces appear?
3. **Navigation Test**: Can you browse folders?
4. **View Test**: Do files render correctly (md, txt, code, images)?
5. **Search Test**: Does search find documents?
6. **Recent Test**: Do visited files appear in Recent tab?
7. **Star Test**: Can you star/unstar documents?

## Development Tips

- Open Chrome DevTools on the popup: Right-click extension icon → "Inspect popup"
- Check background script: `chrome://extensions/` → Extension details → "Inspect views: background page"
- View console logs for debugging
- After code changes: Click refresh icon on extension card

## What's Next?

- Star important documents for quick access
- Use search to find documentation quickly
- Check Recent tab to continue where you left off
- The extension automatically syncs with the main wiki application

## Need Help?

See the full [README.md](./README.md) for detailed documentation.
