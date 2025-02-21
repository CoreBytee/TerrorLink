#!/bin/bash

# Define URLs
METAMOD_URL="https://mms.alliedmods.net/mmsdrop/2.0/mmsource-2.0.0-git1332-windows.zip"
CSSHARP_URL="https://github.com/roflmuffin/CounterStrikeSharp/releases/download/v305/counterstrikesharp-with-runtime-build-305-windows-e99d27c.zip"

# Define directories
DOWNLOAD_DIR="./.dl"
CSGO_DIR="./game/counterstrike/game/csgo"

# Create download directory if it doesn't exist
mkdir -p "$DOWNLOAD_DIR"

# Download Metamod
echo "Downloading Metamod..."
curl -L "$METAMOD_URL" -o "$DOWNLOAD_DIR/metamod.zip"

# Download CSSHARP
echo "Downloading CSSHARP..."
curl -L "$CSSHARP_URL" -o "$DOWNLOAD_DIR/cssharp.zip"

# Unzip Metamod
echo "Unzipping Metamod..."
unzip -o "$DOWNLOAD_DIR/metamod.zip" -d "$DOWNLOAD_DIR/metamod"

# Unzip CSSHARP
echo "Unzipping CSSHARP..."
unzip -o "$DOWNLOAD_DIR/cssharp.zip" -d "$DOWNLOAD_DIR/cssharp"

# Copy Metamod addons to CSGO directory
echo "Copying Metamod addons to CSGO directory..."
cp -r "$DOWNLOAD_DIR/metamod/addons" "$CSGO_DIR/"

# Modify gameinfo.gi
GAMEINFO_FILE="$CSGO_DIR/gameinfo.gi"
if grep -q "Game_LowViolence csgo_lv" "$GAMEINFO_FILE"; then
    echo "Modifying gameinfo.gi..."
    sed -i '/Game_LowViolence csgo_lv/a Game csgo/addons/metamod' "$GAMEINFO_FILE"
else
    echo "Game_LowViolence csgo_lv not found in gameinfo.gi. Please add 'Game csgo/addons/metamod' manually."
fi

# Copy CSSHARP addons to CSGO directory
echo "Copying CSSHARP addons to CSGO directory..."
cp -r "$DOWNLOAD_DIR/cssharp/addons" "$CSGO_DIR/"

# Instructions for further steps
echo "Metamod and CounterStrikeSharp have been installed. Please restart your game server."
echo "Type 'meta list' in your server console to see if Metamod is loaded."