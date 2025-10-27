#!/bin/bash
echo "🔄 Switching to new Database Watcher Platform..."

# 1. Stop old service
echo "⏹️  Stopping old service..."
sudo systemctl stop mongodb-watcher

# 2. Install dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install
cd ..

echo "📦 Installing frontend dependencies..."
cd frontend && npm install
cd ..

# 3. Configure backend
echo "⚙️  Configuring backend..."
cp .env.backend backend/.env

# 4. Install new services
echo "🔧 Installing new systemd services..."
sudo cp database-watcher-backend.service /etc/systemd/system/
sudo cp database-watcher-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload

# 5. Enable and start backend
echo "🚀 Starting backend..."
sudo systemctl enable database-watcher-backend
sudo systemctl start database-watcher-backend

echo ""
echo "✅ Setup complete!"
echo ""
echo "Backend running at: http://0.0.0.0:3330"
echo ""
echo "To start frontend:"
echo "  cd frontend && npm run dev"
echo ""
echo "Or run as service:"
echo "  sudo systemctl start database-watcher-frontend"
echo ""
echo "View status:"
echo "  sudo systemctl status database-watcher-backend"
echo ""
echo "View logs:"
echo "  sudo journalctl -u database-watcher-backend -f"
