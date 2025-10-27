#!/bin/bash
echo "🔍 Checking Database Watcher services..."
echo ""

# Check if ports are in use
echo "📡 Checking ports 3330 and 5370..."
if lsof -ti:3330 > /dev/null 2>&1; then
  echo "  ✅ Port 3330 is in use (Backend)"
  lsof -ti:3330 | xargs ps -p
else
  echo "  ❌ Port 3330 is NOT in use"
fi

if lsof -ti:5370 > /dev/null 2>&1; then
  echo "  ✅ Port 5370 is in use (Frontend)"
  lsof -ti:5370 | xargs ps -p
else
  echo "  ❌ Port 5370 is NOT in use"
fi

echo ""
echo "To start services:"
echo "  sudo systemctl start database-watcher-backend"
echo "  sudo systemctl start database-watcher-frontend"
echo ""
echo "Or start manually for development:"
echo "  cd backend && npm start &"
echo "  cd frontend && npm run dev &"
