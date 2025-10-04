#!/bin/bash
# Script to create icon files for the Chrome extension
# Requires ImageMagick

if ! command -v convert &> /dev/null; then
    echo "ImageMagick is not installed. Please install it first:"
    echo "  Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "  macOS: brew install imagemagick"
    echo "  Windows: Download from https://imagemagick.org/script/download.php"
    exit 1
fi

# Create 128x128 icon
convert -size 128x128 xc:"#0052cc" \
    -gravity center \
    -pointsize 80 \
    -font "Arial-Bold" \
    -fill white \
    -annotate +0+0 "W" \
    -draw "roundrectangle 0,0 127,127 20,20" \
    icon128.png

# Create 48x48 icon
convert icon128.png -resize 48x48 icon48.png

# Create 16x16 icon
convert icon128.png -resize 16x16 icon16.png

echo "Icons created successfully!"
ls -lh icon*.png
