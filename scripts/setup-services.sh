#!/bin/bash
# Setup Database Watcher services

echo "🔧 Setting up Database Watcher services..."

# Copy service files
sudo cp database-watcher-backend.service /etc/systemd/system/
sudo cp database-watcher-frontend.service /etc/systemd/system/

# Enable backend to start on boot
sudo systemctl enable database-watcher-backend

# Optionally enable frontend (you may not want this always running)
# sudo systemctl enable database-watcher-frontend

echo "✓ Service files copied"
echo ""
echo "To start the services:"
echo "  sudo systemctl start database-watcher-backend"
echo "  sudo systemctl start database-watcher-frontend"
echo ""
echo "To view status:"
echo "  sudo systemctl status database-watcher-backend"
echo "  sudo systemctl status database-watcher-frontend"
echo ""
echo "To view logs:"
echo "  sudo journalctl -u database-watcher-backend -f"
echo "  sudo journalctl -u database-watcher-frontend -f"
