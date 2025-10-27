#!/bin/bash
# Reload and restart MongoDB Watcher service

echo "🔄 Reloading mongodb-watcher service..."

# Copy service file
sudo cp mongodb-watcher.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Restart the service
sudo systemctl restart mongodb-watcher

# Wait a moment for startup
sleep 2

# Check status
echo ""
echo "📊 Service Status:"
sudo systemctl status mongodb-watcher --no-pager -l

echo ""
echo "✅ Service reloaded!"
echo ""
echo "To view logs: sudo journalctl -u mongodb-watcher -f"

