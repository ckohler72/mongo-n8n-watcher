# MongoDB Change Stream Watcher for n8n

This Node.js application watches multiple MongoDB collections and sends changes to different n8n webhooks in real-time. Each collection can have its own webhook endpoint and monitored operations.

## Features

- ✅ Real-time monitoring using MongoDB Change Streams
- ✅ **Support for multiple collections with different webhooks**
- ✅ Individual operation filtering per collection
- ✅ Easy to add new collections - just update the config array
- ✅ Enable/disable collections without removing configuration
- ✅ Automatic reconnection on connection failures
- ✅ Graceful shutdown handling
- ✅ Detailed logging with collection labels
- ✅ Production-ready error handling

## Prerequisites

- Linux system with systemd (for running as a service)
- Node.js (v14 or higher) - verify with `node --version`
- MongoDB running as a replica set (required for change streams)
- n8n workflow with webhook trigger

## Installation

1. **Navigate to the directory:**
```bash
cd /home/chris/services/mongo-watcher
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
# Copy the example .env file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

## Configuration

Configuration is now done through environment variables in the `.env` file. This keeps sensitive data secure and makes it safe for public repositories.

### Basic Configuration

Edit `.env` to configure your MongoDB connection and collections:

**For a single collection:**
```bash
# MongoDB Configuration
MONGO_URL=mongodb://admin:password@localhost:27017/?authSource=admin
MONGO_DATABASE=your_database
RECONNECT_INTERVAL=5000

# Single collection configuration
COLLECTION_NAME=agent_input
WEBHOOK_URL=http://localhost:5678/webhook/your-webhook-id
COLLECTION_OPERATIONS=insert,update
COLLECTION_ENABLED=true
```

**For multiple collections (recommended):**
```bash
# MongoDB Configuration
MONGO_URL=mongodb://admin:password@localhost:27017/?authSource=admin
MONGO_DATABASE=your_database
RECONNECT_INTERVAL=5000

# Multiple collections as JSON
COLLECTIONS_CONFIG=[{"name":"agent_input","webhookUrl":"http://localhost:5678/webhook/id1","operations":["insert"],"enabled":true},{"name":"agent_output","webhookUrl":"http://localhost:5678/webhook/id2","operations":["insert","update"],"enabled":true}]
```

### Adding a New Collection

To watch another collection, add it to the `COLLECTIONS_CONFIG` JSON array in your `.env` file:

```json
{
  "name": "your_collection_name",           // MongoDB collection name
  "webhookUrl": "http://your-webhook-url",  // n8n webhook URL
  "operations": ["insert", "update"],       // Which operations to monitor
  "enabled": true                           // Set to false to disable temporarily
}
```

### Configuration Options

**Environment Variables:**

**Per Collection (in JSON format):**
- `name` - The MongoDB collection to watch
- `webhookUrl` - The n8n webhook endpoint for this collection
- `operations` - Array of operations to monitor: `["insert", "update", "delete", "replace"]`
- `enabled` - Set to `false` to temporarily stop watching without removing config

**Global Settings:**
- `MONGO_URL` - MongoDB connection string with authentication
- `MONGO_DATABASE` - Database name
- `RECONNECT_INTERVAL` - Milliseconds to wait before reconnecting after failure

**Security Notes:**
- ⚠️ **Never commit the `.env` file** to version control - it contains sensitive credentials
- ✅ The `.gitignore` file already excludes `.env` from git
- ✅ Use `.env.example` as a template for sharing configuration structure
- ✅ For production, consider using a secrets management system

## Usage

### Run directly:
```bash
npm start
```

### Run with auto-restart during development:
```bash
npm run dev
```

### Stop the watcher:
Press `Ctrl+C`

## Running as a System Service (Linux)

To run the watcher automatically in the background as a systemd service on Linux:

1. **Copy the service file:**
```bash
sudo cp mongodb-watcher.service /etc/systemd/system/
```

2. **Verify the service file** (paths are already configured):
```bash
sudo nano /etc/systemd/system/mongodb-watcher.service
```

   The service file is already configured with:
   - WorkingDirectory: `/home/chris/services/mongo-watcher`
   - ExecStart: `/usr/bin/node /home/chris/services/mongo-watcher/mongodb-watcher.js`

3. **Enable and start the service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable mongodb-watcher
sudo systemctl start mongodb-watcher
```

4. **Check status:**
```bash
sudo systemctl status mongodb-watcher
```

5. **View logs:**
```bash
sudo journalctl -u mongodb-watcher -f
```

## Testing

1. **Start the watcher:**
```bash
npm start
```

You should see output showing all enabled collections:
```
✓ Connected to MongoDB
--- Setting up watchers for 1 collection(s) ---
✓ Watching: agent_input
  Operations: insert, update, delete, replace
  Webhook: http://0.0.0.0:5678/webhook-test/...
--- Listening for changes... ---
```

2. **Insert a test document in MongoDB:**
```javascript
// In mongosh or Compass:
use magnus_db
db.agent_input.insertOne({ 
  test: "Hello from MongoDB!", 
  timestamp: new Date() 
})
```

3. **Check the watcher console** - you should see:
```
→ [agent_input] Change detected: insert
✓ [agent_input] Sent insert event to n8n: [document_id]
```

4. **Check your n8n workflow** - it should have been triggered with the change data

**Testing Multiple Collections:**
If you've configured multiple collections, test each one separately to ensure webhooks are correctly routed:

```javascript
// Test collection 1
db.agent_input.insertOne({ test: "Collection 1" })

// Test collection 2
db.agent_output.insertOne({ test: "Collection 2" })
```

Each should trigger its respective webhook.

## Webhook Payload

The webhook receives the following data:
```json
{
  "collection": "agent_input",
  "operationType": "insert|update|delete|replace",
  "documentId": "ObjectId",
  "fullDocument": { /* complete document */ },
  "updateDescription": { /* for updates only */ },
  "timestamp": "ISO date string",
  "ns": {
    "db": "magnus_db",
    "coll": "agent_input"
  }
}
```

The `collection` field makes it easy to route different collections to different logic in your n8n workflow.

## Troubleshooting

**Service not starting:**
- Check service status: `sudo systemctl status mongodb-watcher`
- View service logs: `sudo journalctl -u mongodb-watcher -n 50`
- Check for path issues and verify node is available: `which node` and `node --version`

**Connection refused:**
- Check MongoDB is running: `sudo systemctl status mongod`
- Verify credentials in CONFIG.mongoUrl
- Ensure MongoDB is running as a replica set (required for change streams)

**Webhook errors:**
- Verify n8n is running
- Check the webhook URL is correct
- Ensure the webhook workflow is activated in n8n
- View service logs for webhook errors: `sudo journalctl -u mongodb-watcher -f`

**No changes detected:**
- Verify MongoDB is running as a replica set: `rs.status()` in mongosh
- Check you're inserting into the correct database/collection
- Verify the collection is enabled in the configuration (`enabled: true`)

## Production Recommendations

1. **Use environment variables** for sensitive data:
   ```javascript
   const CONFIG = {
     mongoUrl: process.env.MONGO_URL,
     webhookUrl: process.env.WEBHOOK_URL,
     // ...
   };
   ```

2. **Add more robust error handling** for your specific use case

3. **Consider adding a retry mechanism** for webhook failures

4. **Set up monitoring/alerting** if the watcher stops

5. **Use PM2 or systemd** to keep the process running

## Git Repository

This project is ready for version control:

```bash
# Initialize git (already done)
git init

# Add remote repository
git remote add origin https://github.com/your-username/mongodb-watcher.git

# Create and push to main branch
git checkout -b main
git push -u origin main
```

**Security Reminder:** The `.env` file is automatically excluded from git via `.gitignore`. Only share `.env.example` publicly.

## License

MIT
