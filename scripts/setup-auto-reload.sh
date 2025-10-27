#!/bin/bash
# Setup auto-reload system for systemd services

echo "🔧 Setting up auto-reload system for Database Watcher services..."

# Check if inotify-tools is installed
if ! command -v inotifywait &> /dev/null; then
  echo "📦 Installing inotify-tools..."
  sudo apt-get update
  sudo apt-get install -y inotify-tools
fi

# Copy service files
echo "📄 Installing service files..."
sudo cp database-watcher-backend.service /etc/systemd/system/
sudo cp database-watcher-frontend.service /etc/systemd/system/
sudo cp database-watcher-reload.service /etc/systemd/system/
sudo systemctl daemon-reload

echo "✅ Services installed"
echo ""
echo "To enable auto-reload on changes:"
echo "  sudo systemctl enable database-watcher-reload"
echo "  sudo systemctl start database-watcher-reload"
echo ""
echo "Or start manually to watch for changes:"
echo "  ./reload-watcher.sh"
echo ""
echo "To start the services:"
echo "  sudo systemctl start database-watcher-backend"
echo "  sudo systemctl start database-watcher-frontend"

