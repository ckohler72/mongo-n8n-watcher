#!/bin/bash
# Stop the old mongodb-watcher service

echo "🛑 Stopping old mongodb-watcher service..."

sudo systemctl stop mongodb-watcher 2>/dev/null
sudo systemctl disable mongodb-watcher 2>/dev/null

echo "✓ Old service stopped and disabled"

echo ""
echo "Now you can start the new platform:"
echo "  ./scripts/start-platform.sh"
