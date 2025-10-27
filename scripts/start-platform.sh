#!/bin/bash
echo "🚀 Starting Database Watcher Platform..."
echo ""

# Check if dependencies are installed
if [ ! -d "backend/node_modules" ]; then
  echo "📦 Installing backend dependencies..."
  cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  cd frontend && npm install && cd ..
fi

# Start backend
echo "📦 Starting backend on port 3330..."
cd backend
cp ../.env.backend .env 2>/dev/null
PORT=3330 node server.js > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 2

# Start frontend
echo "🎨 Starting frontend on port 5370..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Services started!"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "📍 Access URLs:"
echo "   Local:   http://localhost:5370"
echo "   Network: http://192.168.0.64:5370"
echo ""
echo "📝 View logs:"
echo "   tail -f backend.log frontend.log"
echo ""
echo "🛑 To stop:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
