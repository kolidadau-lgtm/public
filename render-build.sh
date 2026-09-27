#!/usr/bin/env bash
# Henti jika ada ralat
set -o errexit

npm install

# Muat turun binari yt-dlp secara automatik ke pelayan Render
mkdir -p bin
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp
chmod a+rx bin/yt-dlp
export PATH=$PATH:$(pwd)/bin