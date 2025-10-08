#!/bin/bash
# Verification script for Chrome Extension installation

echo "========================================"
echo "NooblyJS Wiki Extension - Verification"
echo "========================================"
echo ""

# Check required files
echo "Checking required files..."
errors=0

check_file() {
    if [ -f "$1" ]; then
        echo "✓ $1"
    else
        echo "✗ $1 - MISSING"
        ((errors++))
    fi
}

check_file "manifest.json"
check_file "popup.html"
check_file "background.js"
check_file "css/style.css"
check_file "js/api.js"
check_file "js/popup.js"
check_file "js/settings.js"
check_file "icons/icon16.png"
check_file "icons/icon48.png"
check_file "icons/icon128.png"

echo ""

if [ $errors -eq 0 ]; then
    echo "✓ All required files present!"
    echo ""
    echo "Installation Steps:"
    echo "1. Open Chrome and go to: chrome://extensions/"
    echo "2. Enable 'Developer mode' (toggle in top right)"
    echo "3. Click 'Load unpacked'"
    echo "4. Select this directory: $(pwd)"
    echo "5. Extension should appear in your toolbar"
    echo ""
    echo "First Use:"
    echo "1. Click the extension icon"
    echo "2. Enter server URL: http://localhost:3002"
    echo "3. Enter your wiki credentials"
    echo "4. Select a space and start browsing!"
    echo ""
else
    echo "✗ $errors file(s) missing - installation may fail"
    echo "Please ensure all files are present before loading the extension."
fi

echo "========================================"
