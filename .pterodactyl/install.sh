#!/bin/bash

# GIT_REPOSITORY string with the value [user]/[repo]
# GIT_BRANCH string with the branchname

# Update package list and install necessary packages
apt update
apt install -y git curl jq file unzip make gcc g++ python python-dev libtool

# Create directory and navigate to it
mkdir -p /mnt/server
cd /mnt/server

# Configure the safe directory
git config --global --add safe.directory /mnt/server

# Check if there is already a git repository
if [ -d ".git" ]; then
  echo "Git repository found. Switching branch..."
  git fetch
  git checkout $GIT_BRANCH
else
  echo "No git repository found. Cloning repository..."
  git clone https://github.com/$GIT_REPOSITORY.git .
  git checkout $GIT_BRANCH
fi

## install end
echo "-----------------------------------------"
echo "Installation completed..."
echo "-----------------------------------------"