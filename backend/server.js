require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const watcherRoutes = require('./routes/watchers');
const databaseRoutes = require('./routes/databases');
const webhookRoutes = require('./routes/webhooks');
const logRoutes = require('./routes/logs');
const statusRoutes = require('./routes/status');
const WatcherService = require('./services/watcherService');

const app = express();
const PORT = process.env.PORT || 3330;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection for configuration storage
let db;

async function connectToMongo() {
  try {
    const client = new MongoClient(process.env.MONGO_URL || 'mongodb://localhost:27017');
    await client.connect();
    console.log('✓ Connected to MongoDB for configuration storage');
    
    db = client.db(process.env.MONGO_DATABASE || 'watcher_config');
    app.locals.db = db;
    
    // Create indexes
    await db.collection('watchers').createIndex({ name: 1 });
    await db.collection('databases').createIndex({ name: 1 });
    await db.collection('watcher_logs').createIndex({ watcherId: 1, timestamp: -1 });
    
    return client;
  } catch (error) {
    console.error('✗ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

// Initialize Watcher Service
let watcherService;
let mongoClient;

// Routes
app.use('/api/watchers', watcherRoutes);
app.use('/api/databases', databaseRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/status', statusRoutes);

// Health check (simple)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
async function start() {
  try {
    mongoClient = await connectToMongo();
    
    // Initialize watcher service
    watcherService = new WatcherService(db);
    await watcherService.initialize();
    app.locals.watcherService = watcherService;
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ Database Watcher API running on http://0.0.0.0:${PORT}`);
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\nShutting down gracefully...');
      if (watcherService) {
        await watcherService.shutdown();
      }
      if (mongoClient) {
        await mongoClient.close();
      }
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

