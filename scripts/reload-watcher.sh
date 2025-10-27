#!/bin/bash
# Watches for file changes and reloads systemd services

BACKEND_PATH="/home/chris/services/mongo-watcher/backend"
FRONTEND_PATH="/home/chris/services/mongo-watcher/frontend"

echo "🔍 Watching for file changes..."
echo "📂 Watching: backend/"
echo "📂 Watching: frontend/"
echo ""
echo "Services will auto-reload when files change"
echo ""

# Function to reload services
reload_services() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - 🔄 File changed, reloading services..."
  
  # Restart backend
  systemctl restart database-watcher-backend
  
  # Restart frontend
  systemctl restart database-watcher-frontend
  
  echo "$(date '+%Y-%m-%d %H:%M:%S') - ✅ Services reloaded"
}

# Watch directories for changes
inotifywait -m -r -e modify,create,delete,move \
  --include '.*\.(js|json)$' \
  "$BACKEND_PATH" \
  "$FRONTEND_PATH" \
  2>/dev/null | while read path action file; do
    echo "$(date '+%H:%M:%S') - Change: $path$file"
    reload_services
  done
