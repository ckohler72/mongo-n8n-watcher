#!/bin/bash
# Development reload script - watches for changes and auto-reloads services

echo "🔄 Starting Database Watcher in Development Mode..."
echo ""
echo "This will start both backend and frontend with auto-reload"
echo "Changes to any file will automatically restart the servers"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Stopping services..."
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  exit 0
}

trap cleanup INT TERM

# Start backend with nodemon (auto-reload on changes)
echo "📦 Starting backend with auto-reload on port 3330..."
cd backend
if [ ! -f "node_modules/.bin/nodemon" ]; then
  echo "Installing nodemon..."
  npm install nodemon --save-dev
fi
./node_modules/.bin/nodemon server.js &
BACKEND_PID=$!
cd ..

# Start frontend with Vite (auto-reload on changes)
echo "🎨 Starting frontend with auto-reload on port 5370..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Both services running in development mode"
echo ""
echo "   Backend API:  http://localhost:3330"
echo "   Frontend UI:  http://localhost:5370"
echo "   Network:      http://192.168.0.64:5370"
echo ""
echo "📝 Watching for changes..."
echo "   - Edit backend files → Backend will reload"
echo "   - Edit frontend files → Frontend will reload (HMR)"
echo ""

# Wait for both processes
wait
