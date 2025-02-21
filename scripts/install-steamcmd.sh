#!/bin/bash

# Define variables
STEAMCMD_URL="https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip"
DEST_DIR="./game/steamcmd"
ZIP_FILE="steamcmd.zip"

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Download steamcmd
curl -o "$ZIP_FILE" "$STEAMCMD_URL"

# Extract the zip file to the destination directory
unzip "$ZIP_FILE" -d "$DEST_DIR"

# Remove the zip file
rm "$ZIP_FILE"

echo "SteamCMD has been downloaded and extracted to $DEST_DIR"