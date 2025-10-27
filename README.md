# Database Watcher - Web-Managed Platform

A full-stack web application for monitoring database changes and forwarding them to n8n webhooks with real-time tracking, logging, and management.

## 🎯 Features

- **Multi-Database Support**: Monitor MongoDB (PostgreSQL & MySQL coming soon)
- **Web UI**: React-based interface for managing watchers
- **n8n Integration**: Direct webhook integration with multiple HTTP methods
- **Real-time Monitoring**: Live change streams using database-native features
- **RESTful API**: Full API for programmatic access
- **Activity Logging**: Track all webhook triggers with success/error logs
- **Trigger Counting**: See how many times each watcher has fired
- **Edit & Manage**: Update watcher configurations on the fly
- **Auto-Reload**: Automatic reload on code changes (development mode)
- **Network Access**: Access from any device on your LAN

## 📋 Prerequisites

- Linux system with systemd
- Node.js 18+
- MongoDB (for configuration storage)

## 🚀 Quick Start

### 1. Installation

```bash
# Install root dependencies
npm install

# Install all dependencies (backend + frontend)
npm run install-all

# Configure backend environment
cp .env.backend backend/.env
# Edit backend/.env with your MongoDB connection
```

### 2. Start Services

```bash
# Start both backend and frontend
npm start
```

This starts:
- **Backend API**: http://localhost:3330
- **Frontend UI**: http://localhost:5370

Access from network: http://YOUR_IP:5370

### 3. First Steps

1. **Add a Database**: Click "Databases" → "+ Add Database"
2. **Create a Watcher**: Click "Watchers" → "+ Add Watcher"
3. **Select Database** → Choose from MongoDB databases → Choose collection
4. **Set Webhook** → Configure n8n webhook URL and HTTP method
5. **Enable** → Toggle the switch to start monitoring

## 📖 Usage Guide

### Adding a Database

1. Click "Databases" tab
2. Click "+ Add Database"
3. Fill in:
   - **Name**: Your database name
   - **Type**: MongoDB (PostgreSQL/MySQL coming soon)
   - **Connection String**: Your MongoDB connection string
4. Click "Add"
5. Toggle the switch to enable/disable

### Creating a Watcher

1. Click "Watchers" tab
2. Click "+ Add Watcher"
3. Configure:
   - **Watcher Name**: Descriptive name
   - **Database Connection**: Select from dropdown
   - **MongoDB Database**: Auto-populated (if MongoDB)
   - **Collection**: Select from dropdown
   - **HTTP Method**: POST, GET, PUT, or PATCH
   - **Webhook URL**: Your n8n webhook URL
   - **Operations**: Select to monitor (insert, update, delete, replace)
4. Click "Add"

### Managing Watchers

- **Edit**: Click "✏️ Edit" to modify settings
- **Toggle**: Use the switch to enable/disable
- **View Logs**: Click "📋 Logs" for activity history (coming soon)
- **Trigger Count**: Shows how many times the watcher has fired

### MongoDB Collection Dropdown

The UI automatically:
1. Lists available MongoDB databases when you select a connection
2. Shows collections in the selected database
3. Populates dropdown menus for easy selection

## 🔌 API Reference

### Base URL
- Local: `http://localhost:3330/api`
- Network: `http://YOUR_IP:3330/api`

### Databases

**List all databases:**
```bash
GET /api/databases
```

**Get database by ID:**
```bash
GET /api/databases/:id
```

**List MongoDB databases (in connection):**
```bash
GET /api/databases/:id/databases
```

**List collections in a MongoDB database:**
```bash
GET /api/databases/:id/collections?database=dbname
```

**Create database:**
```bash
POST /api/databases
Body: { "name": "...", "type": "mongodb", "connectionString": "..." }
```

**Update database:**
```bash
PUT /api/databases/:id
```

**Delete database:**
```bash
DELETE /api/databases/:id
```

### Watchers

**List all watchers:**
```bash
GET /api/watchers
```

**Get watcher by ID:**
```bash
GET /api/watchers/:id
```

**Create watcher:**
```bash
POST /api/watchers
Body: {
  "name": "Watcher Name",
  "databaseId": "database_id",
  "collection": "collection_name",
  "webhookUrl": "http://...",
  "webhookMethod": "POST",
  "operations": ["insert", "update"],
  "enabled": true
}
```

**Update watcher:**
```bash
PUT /api/watchers/:id
Body: { "name": "New Name", ... }
```

**Delete watcher:**
```bash
DELETE /api/watchers/:id
```

### Logs & Stats

**Get watcher logs:**
```bash
GET /api/logs/watcher/:watcherId
GET /api/logs/watcher/:watcherId?limit=100
```

**Get watcher statistics:**
```bash
GET /api/logs/watcher/:watcherId/stats
Response: { "total": 10, "success": 9, "errors": 1, "lastTrigger": "..." }
```

**Clear logs:**
```bash
DELETE /api/logs/watcher/:watcherId
```

### Webhooks

**Test webhook:**
```bash
POST /api/webhooks/test
Body: { "url": "http://..." }
```

## 📡 Webhook Payload Format

When a change is detected, n8n receives:

```json
{
  "watcher": "watcher_name",
  "collection": "collection_name",
  "operationType": "insert|update|delete|replace",
  "documentId": "ObjectId",
  "fullDocument": {
    "field": "value",
    "_id": "ObjectId"
  },
  "updateDescription": {
    "updatedFields": { "field": "newValue" },
    "removedFields": []
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "ns": {
    "db": "database_name",
    "coll": "collection_name"
  }
}
```

## 🔧 Configuration

### Backend Environment

Create `backend/.env`:

```bash
PORT=3330
MONGO_URL=mongodb://admin:password@localhost:27017/?authSource=admin
MONGO_DATABASE=watcher_config
```

### MongoDB Connection String Formats

**With authentication:**
```
mongodb://username:password@host:port/database?authSource=admin
```

**Examples:**
```
mongodb://admin:secret123@localhost:27017/magnus_db?authSource=admin
mongodb://admin:secret123@localhost:27017/?authSource=admin
```

## 🛠️ Development Mode

### Auto-Reload on File Changes

```bash
# Start with auto-reload for both services
npm run dev
# or
./scripts/dev-reload.sh
```

This watches for changes in `backend/` and `frontend/` directories and automatically restarts services.

### Running Individual Services

```bash
# Backend only
npm run dev-backend
cd backend && npm run dev

# Frontend only
npm run dev-frontend  
cd frontend && npm run dev
```

### Manual Start

```bash
# Start both manually
./scripts/start-platform.sh
```

## 📦 Systemd Services (Production)

### Install Services

```bash
# Install and start backend
sudo cp scripts/database-watcher-backend.service /etc/systemd/system/
sudo systemctl enable database-watcher-backend
sudo systemctl start database-watcher-backend

# Install and start frontend
sudo cp scripts/database-watcher-frontend.service /etc/systemd/system/
sudo systemctl enable database-watcher-frontend
sudo systemctl start database-watcher-frontend

# Install auto-reload service
sudo cp scripts/database-watcher-reload.service /etc/systemd/system/
sudo systemctl enable database-watcher-reload
sudo systemctl start database-watcher-reload
```

### Service Management

```bash
# Check status
sudo systemctl status database-watcher-backend
sudo systemctl status database-watcher-frontend

# View logs
sudo journalctl -u database-watcher-backend -f
sudo journalctl -u database-watcher-frontend -f

# Restart services
sudo systemctl restart database-watcher-backend
sudo systemctl restart database-watcher-frontend

# Stop services
sudo systemctl stop database-watcher-backend
sudo systemctl stop database-watcher-frontend
```

## 🧪 Testing

### Test Backend API

```bash
# Health check
curl http://localhost:3330/health

# List databases
curl http://localhost:3330/api/databases

# Get watchers
curl http://localhost:3330/api/watchers

# Create a watcher
curl -X POST http://localhost:3330/api/watchers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Watcher",
    "databaseId": "your_database_id",
    "collection": "test_collection",
    "webhookUrl": "http://localhost:5678/webhook/test",
    "operations": ["insert"],
    "enabled": true
  }'
```

### Test Webhook

```bash
# Test webhook URL
curl -X POST http://localhost:3330/api/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:5678/webhook/test"}'
```

## 🚨 Troubleshooting

### Watchers Not Starting

**Check MongoDB connection:**
```bash
# View backend logs
tail -f backend.log
# or if running as service
sudo journalctl -u database-watcher-backend -f
```

**Common issues:**
- MongoDB not running: `sudo systemctl status mongod`
- Wrong credentials in `.env`
- Network/firewall blocking port

### Collections Dropdown Empty

**Debug steps:**
1. Open browser console (F12)
2. Check for API errors
3. Test manually: `curl http://localhost:3330/api/databases/YOUR_ID/collections?database=dbname`

**Check logs:**
- Backend console shows MongoDB connection status
- Frontend console shows API call details

### Webhook Errors

**Check n8n:**
- Verify workflow is activated (not in test mode)
- Check webhook URL is correct
- Test webhook manually in Postman

**View watcher logs:**
```bash
curl http://localhost:3330/api/logs/watcher/WATCHER_ID
```

### Backend 500 Errors

**Most common causes:**
- Missing dependencies: `cd backend && npm install`
- MongoDB connection issue: Check `.env` file
- Circular reference: Already fixed in latest code

**Debug:**
- Check backend terminal for detailed error
- Restart backend to see fresh logs

## 📝 Project Structure

```
.
├── backend/              # Express API (Port 3330)
│   ├── models/          # Database models (Watcher, Database, WatcherLog)
│   ├── routes/          # API routes (watchers, databases, logs, webhooks)
│   ├── services/        # Watcher service (monitors databases)
│   ├── server.js        # Main server file
│   └── package.json
│
├── frontend/            # React UI (Port 5370)
│   ├── src/
│   │   ├── App.jsx     # Main application component
│   │   ├── App.css     # Styles
│   │   └── main.jsx
│   ├── vite.config.js  # Vite configuration
│   └── package.json
│
├── scripts/             # Management scripts
│   ├── start-platform.sh
│   ├── dev-reload.sh
│   ├── setup-services.sh
│   └── *.service files
│
├── docs/                # Additional documentation
│   ├── DEV-MODE.md
│   └── POSTMAN-TEST.md
│
└── README.md           # This file
```

## 🎓 How It Works

### Architecture Overview

1. **Backend API** stores configuration in MongoDB
2. **Watcher Service** monitors databases using native change streams
3. **Webhook Sender** forwards detected changes to n8n
4. **Activity Logger** records all triggers with stats
5. **Frontend UI** provides web interface for management

### Data Flow

```
Database Change → Watcher Service → Log Event → Send to n8n → Update UI Stats
```

### Watcher Lifecycle

1. Watcher is enabled via UI toggle
2. Backend starts change stream on collection
3. Database change detected
4. Event logged with timestamp
5. Payload sent to n8n webhook
6. Success/error recorded
7. Trigger count incremented
8. Stats updated in UI

## 🔐 Security Notes

- ⚠️ **No authentication** - This is a development version
- ✅ `.env` file is in `.gitignore` - credentials are safe
- ✅ Only expose on trusted networks
- ✅ Use HTTPS in production
- ✅ Consider adding authentication layer

## 🚀 Next Steps / Roadmap

### Coming Soon
- PostgreSQL logical replication support
- MySQL binlog watching
- Log viewer UI with filters
- Webhook history dashboard
- Email notifications on errors
- Authentication system
- User permissions
- Webhook templates
- Scheduled watchers

### Contributing

Features to add:
1. Implement PostgreSQL support
2. Implement MySQL support
3. Add log viewer component
4. Build dashboard UI
5. Add authentication

## 📄 License

MIT

## 📞 Support

For issues, check:
1. Backend console logs
2. Browser console (F12)
3. `docs/DEBUG-COLLECTIONS.md` for common issues

---

**Made with ❤️ for n8n automation**
