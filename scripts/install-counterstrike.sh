#!/bin/bash

# Define paths
STEAMCMD_PATH="$(realpath ./game/steamcmd/steamcmd.exe)"
CS2_INSTALL_PATH="$(realpath ./game/counterstrike/)"

# Check if steamcmd is downloaded
if [ ! -f "$STEAMCMD_PATH" ]; then
    echo "steamcmd.exe not found at $STEAMCMD_PATH"
    exit 1
fi

# Create the Counter-Strike install directory if it doesn't exist
mkdir -p "$CS2_INSTALL_PATH"

# Download Counter-Strike 2 using steamcmd
"$STEAMCMD_PATH" +login anonymous +force_install_dir "$CS2_INSTALL_PATH" +app_update 730 validate +quit

echo "Counter-Strike 2 has been downloaded to $CS2_INSTALL_PATH"