# Electron Distribution Guide

## Overview

The NooblyJS Wiki Application has been configured for Electron distribution, allowing it to run as a standalone desktop application on Windows, macOS, and Linux.

## Build Scripts

The following npm scripts are available:

### Development
```bash
npm run electron          # Run in Electron (requires GUI environment)
```

### Production Builds
```bash
npm run electron:build           # Build for current platform
npm run electron:build:linux     # Build Linux AppImage
npm run electron:build:win       # Build Windows installer (NSIS)
npm run electron:build:mac       # Build macOS DMG
```

## Distribution Files

After building, find the distributables in the `dist/` directory:

- **Linux**: `NooblyJS Wiki-{version}.AppImage`
- **Windows**: `NooblyJS Wiki Setup {version}.exe`
- **macOS**: `NooblyJS Wiki-{version}.dmg`

## How It Works

The Electron build includes:

1. **Main Process** (`electron-main.js`):
   - Starts the Express server on port 3002
   - Creates the Electron browser window
   - Manages application lifecycle

2. **Renderer Process**:
   - Loads the web application from `http://localhost:3002`
   - Displays the full wiki interface

3. **Bundled Resources**:
   - Complete Node.js server and dependencies
   - Application data directory (`.application/`)
   - Public assets and views

## Running the Built Application

### Linux (AppImage)
```bash
chmod +x "NooblyJS Wiki-1.0.0.AppImage"
./NooblyJS\ Wiki-1.0.0.AppImage
```

### Windows
Double-click the installer `.exe` file to install, then launch from Start Menu or Desktop.

### macOS
Open the `.dmg` file, drag the app to Applications folder, then launch.

## System Requirements

- **OS**: Windows 10+, macOS 10.13+, or modern Linux distribution
- **RAM**: 512MB minimum
- **Disk**: 500MB for installation
- **Display**: GUI environment required

## Headless/Container Environments

Electron requires a display server (X11, Wayland, etc.) and cannot run in headless environments like:
- Docker containers without X11 forwarding
- CI/CD pipelines without virtual displays
- SSH sessions without display forwarding
- GitHub Codespaces (current environment)

For headless environments, use the web version instead:
```bash
npm start              # Runs on http://localhost:3002
```

## Customization

### Application Icon
Update the icon in `package.json` build configuration:
```json
"build": {
  "win": {
    "icon": "path/to/icon.ico"
  },
  "mac": {
    "icon": "path/to/icon.icns"
  }
}
```

### Window Settings
Modify `electron-main.js` to change window size, title, or behavior:
```javascript
mainWindow = new BrowserWindow({
  width: 1200,      // Window width
  height: 800,      // Window height
  title: "My Wiki", // Window title
  // ... other options
});
```

### Port Configuration
The server runs on port 3002 by default. To change:
1. Update `electron-main.js` line 27: `env: { ...process.env, PORT: '3002' }`
2. Update the loadURL call on line 18: `mainWindow.loadURL('http://localhost:3002');`

## Troubleshooting

### Build Issues

**Missing dependencies**: Install build tools
```bash
# Linux
sudo apt-get install -y build-essential

# macOS
xcode-select --install

# Windows
npm install --global windows-build-tools
```

**ENOSPC errors**: Increase file watchers (Linux)
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Runtime Issues

**Port already in use**: Another process is using port 3002
- Kill the process: `lsof -ti:3002 | xargs kill -9`
- Or change the port in `electron-main.js`

**White screen on startup**: Server needs more time to initialize
- Increase the timeout in `electron-main.js` line 17: `setTimeout(() => { ... }, 3000);`

**Application won't start**: Check logs
- Windows: `%APPDATA%\NooblyJS Wiki\logs\`
- macOS: `~/Library/Logs/NooblyJS Wiki/`
- Linux: `~/.config/NooblyJS Wiki/logs/`

## Development Workflow

1. **Make changes** to your code
2. **Test locally** with `npm run dev:web`
3. **Build for distribution** with `npm run electron:build:linux` (or your platform)
4. **Test the built app** by running the executable in `dist/`
5. **Distribute** the built package to users

## Security Notes

- The built application bundles your entire Node.js server
- Credentials and secrets in `.env` files will be included
- Review `package.json` `build.files` to control what gets bundled
- Consider using electron-builder's `asarUnpack` for sensitive files

## Additional Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder Documentation](https://www.electron.build/)
- [NooblyJS Documentation](https://nooblyjs.com/docs)
