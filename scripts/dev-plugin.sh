#!/bin/bash

echo "Starting build process..."
dotnet build 

PLUGIN_FOLDER="game/counterstrike/game/csgo/addons/counterstrikesharp/plugins/TerrorLink/"
OUTPUT_FOLDER="projects/terrorlink-plugin/bin/Debug/net8.0/"

echo "Updating plugin folder: $PLUGIN_FOLDER"
mkdir -p "$PLUGIN_FOLDER"

echo "Copying files to plugin folder..."
cp "$OUTPUT_FOLDER/TerrorLink.deps.json" "$PLUGIN_FOLDER" && echo "Updated TerrorLink.deps.json"
cp "$OUTPUT_FOLDER/TerrorLink.dll" "$PLUGIN_FOLDER" && echo "Updated TerrorLink.dll"
cp "$OUTPUT_FOLDER/TerrorLink.pdb" "$PLUGIN_FOLDER" && echo "Updated TerrorLink.pdb"

echo "Build and copy process completed."