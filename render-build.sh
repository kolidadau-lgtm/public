#!/usr/bin/env bash
# exit on error
set -o errexit

npm install

# Muat turun executable yt-dlp secara automatik di pelayan Render
mkdir -p bin
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp
chmod a+rx bin/yt-dlp
export PATH=$PATH:$(pwd)/bin