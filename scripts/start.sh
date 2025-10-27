#!/bin/bash
# Start Database Watcher Platform

echo "🚀 Starting Database Watcher Platform..."
echo ""

# Check if node_modules exist
if [ ! -d "backend/node_modules" ]; then
  echo "📦 Installing backend dependencies..."
  cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  cd frontend && npm install && cd ..
fi

echo ""
echo "✓ Dependencies installed"
echo ""

# Start both servers
echo "🎯 Starting backend on http://localhost:3330"
echo "🎨 Starting frontend on http://localhost:5370"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

cd backend && npm start &
cd frontend && npm run dev &

# Wait for both processes
wait
