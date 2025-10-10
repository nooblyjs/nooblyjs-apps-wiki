# Electron Build Guide - No Console Window

## Changes Made

To ensure your Windows Electron application starts without showing a command prompt window, the following changes have been made:

### 1. Updated `app-electron.js`

Added the following options to the `spawn` command in the `startServer()` function:
- `windowsHide: true` - Hides the console window on Windows
- `stdio: 'pipe'` - Pipes output to prevent console from showing

### 2. Updated `package.json`

Enhanced the `build.win` configuration to properly configure the Windows installer:
- Set NSIS installer configuration
- Configured for better user experience during installation

## Building Your Application

To build your Windows application without the console window:

### Step 1: Build the Application

```bash
npm run electron:build:win
```

This will create a Windows installer in the `dist` folder.

### Step 2: Install and Run

1. Navigate to the `dist` folder
2. Run the `.exe` installer file (e.g., `NooblyJS Wiki Setup 1.0.1.exe`)
3. Follow the installation wizard
4. Launch the application from the Start Menu or Desktop shortcut

The application will now start **without showing any command prompt window**.

## How It Works

1. **windowsHide**: When the Electron app spawns the Node.js server process, this flag tells Windows to hide the console window that would normally appear
2. **stdio: 'pipe'**: This pipes the server output to the Electron process instead of showing it in a console
3. **NSIS Installer**: Creates a proper Windows installer that registers the application correctly

## Troubleshooting

### If the console still appears:

1. Make sure you're running the **installed version** of the app, not the development version (`npm run electron`)
2. Rebuild the application: `npm run electron:build:win`
3. Reinstall from the new installer in the `dist` folder

### Development vs Production

- **Development** (`npm run electron`): May still show console for debugging
- **Production** (Built installer): Will hide console window

## Additional Configuration

If you want to customize the installer further, you can modify the `nsis` section in `package.json`:

```json
"nsis": {
  "oneClick": false,              // Allow users to customize installation
  "perMachine": false,            // Install for current user only
  "allowToChangeInstallationDirectory": true,  // Let users choose install location
  "deleteAppDataOnUninstall": false  // Keep user data on uninstall
}
```

## Platform-Specific Builds

- **Windows**: `npm run electron:build:win`
- **macOS**: `npm run electron:build:mac`
- **Linux**: `npm run electron:build:linux`
- **All platforms**: `npm run electron:build`

---

**Note**: After building, the executable will be in the `dist` folder. The installer will create a proper Windows application that starts cleanly without any console windows.
