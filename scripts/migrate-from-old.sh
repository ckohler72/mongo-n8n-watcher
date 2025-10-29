#!/bin/bash
# Migrate from old mongodb-watcher to new Database Watcher Platform

echo "🔄 Migrating from old mongodb-watcher to new platform..."
echo ""

# Stop old service
echo "⏹️  Stopping old service..."
sudo systemctl stop mongodb-watcher 2>/dev/null
sudo systemctl disable mongodb-watcher 2>/dev/null
echo "✓ Old service stopped"

# Install dependencies for new platform
echo ""
echo "📦 Installing new platform dependencies..."
npm install
npm run install-all

# Configure backend
echo ""
echo "⚙️  Configuring backend..."
if [ ! -f "backend/.env" ]; then
  cp .env.backend backend/.env
  echo "✓ Created backend/.env from .env.backend"
else
  echo "✓ backend/.env already exists"
fi

echo ""
echo "✅ Migration complete!"
echo ""
echo "📝 Next steps:"
echo "1. Review backend/.env configuration"
echo "2. Start the new platform:"
echo "   ./scripts/start-platform.sh"
echo ""
echo "Or use systemd:"
echo "   sudo cp scripts/database-watcher-backend.service /etc/systemd/system/"
echo "   sudo systemctl enable database-watcher-backend"
echo "   sudo systemctl start database-watcher-backend"
