#!/bin/bash
# Stop all Database Watcher services

echo "🛑 Stopping Database Watcher services..."

# Stop systemd services if running
echo "Checking systemd services..."
sudo systemctl stop database-watcher-backend 2>/dev/null
sudo systemctl stop database-watcher-frontend 2>/dev/null

# Kill processes on ports 3330 and 5370
echo "Killing processes on ports 3330 and 5370..."

# Backend (port 3330)
PID_3330=$(lsof -ti:3330)
if [ ! -z "$PID_3330" ]; then
  echo "  Killing process on port 3330 (PID: $PID_3330)"
  kill -9 $PID_3330 2>/dev/null
fi

# Frontend (port 5370)
PID_5370=$(lsof -ti:5370)
if [ ! -z "$PID_5370" ]; then
  echo "  Killing process on port 5370 (PID: $PID_5370)"
  kill -9 $PID_5370 2>/dev/null
fi

# Kill any node processes in backend or frontend directories
echo "Stopping any node processes in backend/frontend..."
pkill -f "node.*backend" 2>/dev/null
pkill -f "vite.*frontend" 2>/dev/null
pkill -f "node.*frontend" 2>/dev/null

# Wait a moment
sleep 2

echo "✅ Services stopped"
echo ""
echo "Check if ports are free:"
lsof -ti:3330 && echo "  ⚠️  Port 3330 still in use" || echo "  ✅ Port 3330 is free"
lsof -ti:5370 && echo "  ⚠️  Port 5370 still in use" || echo "  ✅ Port 5370 is free"

