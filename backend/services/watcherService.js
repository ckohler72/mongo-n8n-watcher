const { MongoClient } = require('mongodb');
const axios = require('axios');
const Watcher = require('../models/Watcher');
const Database = require('../models/Database');
const WatcherLog = require('../models/WatcherLog');

class WatcherService {
  constructor(db) {
    this.db = db;
    this.activeWatchers = new Map();
    this.databaseClients = new Map();
  }
  
  // Track trigger count
  async incrementTriggerCount(watcherId) {
    try {
      await this.db.collection('watchers').updateOne(
        { _id: watcherId },
        { $inc: { triggerCount: 1 } }
      );
    } catch (error) {
      console.error('Error incrementing trigger count:', error);
    }
  }
  
  async initialize() {
    console.log('Initializing Watcher Service...');
    
    // Load all enabled watchers
    const watchers = await Watcher.findAll(this.db);
    
    for (const watcher of watchers) {
      if (watcher.enabled && watcher.database) {
        await this.startWatcher(watcher);
      }
    }
    
    console.log(`✓ Started ${this.activeWatchers.size} watcher(s)`);
  }
  
  async startWatcher(watcher) {
    try {
      console.log(`Starting watcher: ${watcher.name}`);
      
      const database = watcher.database;
      let client;
      
      // Get or create database connection
      if (!this.databaseClients.has(watcher.databaseId)) {
        client = await this.connectToDatabase(database);
        this.databaseClients.set(watcher.databaseId, client);
      } else {
        client = this.databaseClients.get(watcher.databaseId);
      }
      
      // Start watching based on database type
      switch (database.type) {
        case 'mongodb':
          await this.watchMongoCollection(client, watcher);
          break;
        case 'postgresql':
          await this.watchPostgresTable(client, watcher);
          break;
        case 'mysql':
          await this.watchMysqlTable(client, watcher);
          break;
        default:
          console.warn(`Unsupported database type: ${database.type}`);
      }
      
      this.activeWatchers.set(watcher._id.toString(), watcher);
      console.log(`✓ Watcher ${watcher.name} started`);
      
    } catch (error) {
      console.error(`Error starting watcher ${watcher.name}:`, error.message);
    }
  }
  
  async connectToDatabase(database) {
    const { type, connectionString } = database;
    
    if (type === 'mongodb') {
      const client = new MongoClient(connectionString);
      await client.connect();
      console.log(`✓ Connected to MongoDB: ${database.name}`);
      return { type, client, db: client.db() };
    }
    
    // TODO: Add PostgreSQL and MySQL connections
    throw new Error(`Database type ${type} not yet implemented`);
  }
  
  async watchMongoCollection(connection, watcher) {
    const { db } = connection;
    const collection = db.collection(watcher.collection);
    
    // Create change stream pipeline
    const pipeline = [
      {
        $match: {
          operationType: { $in: watcher.operations }
        }
      }
    ];
    
    const changeStream = collection.watch(pipeline, { 
      fullDocument: 'updateLookup' 
    });
    
    changeStream.on('change', async (change) => {
      console.log(`\n→ [${watcher.name}] Change detected: ${change.operationType}`);
      await this.sendToWebhook(change, watcher);
    });
    
    changeStream.on('error', (error) => {
      console.error(`✗ [${watcher.name}] Change stream error:`, error.message);
    });
    
    changeStream.on('close', () => {
      console.log(`[${watcher.name}] Change stream closed`);
      this.activeWatchers.delete(watcher._id.toString());
    });
    
    watcher.changeStream = changeStream;
    console.log(`✓ Watching MongoDB collection: ${watcher.collection}`);
  }
  
  async watchPostgresTable(connection, watcher) {
    // TODO: Implement PostgreSQL logical replication
    console.log('PostgreSQL watching not yet implemented');
  }
  
  async watchMysqlTable(connection, watcher) {
    // TODO: Implement MySQL binlog watching
    console.log('MySQL watching not yet implemented');
  }
  
  async stopWatcher(watcherId) {
    const watcherIdStr = watcherId.toString();
    
    if (this.activeWatchers.has(watcherIdStr)) {
      const watcher = this.activeWatchers.get(watcherIdStr);
      
      if (watcher.changeStream) {
        await watcher.changeStream.close();
      }
      
      this.activeWatchers.delete(watcherIdStr);
      console.log(`✓ Stopped watcher: ${watcher.name}`);
    } else {
      console.log(`Watcher ${watcherIdStr} not found in active watchers`);
    }
  }
  
  async sendToWebhook(changeData, watcher) {
    const watcherId = watcher._id;
    const operationType = changeData.operationType;
    
    try {
      const payload = {
        watcher: watcher.name,
        collection: watcher.collection,
        table: watcher.table,
        operationType: changeData.operationType,
        documentId: changeData.documentKey?._id,
        fullDocument: changeData.fullDocument,
        updateDescription: changeData.updateDescription,
        timestamp: new Date().toISOString(),
        ns: changeData.ns
      };
      
      // Use the configured HTTP method (default POST)
      const method = watcher.webhookMethod?.toLowerCase() || 'post';
      const config = {
        method,
        url: watcher.webhookUrl,
        [method === 'get' ? 'params' : 'data']: payload
      };
      
      const response = await axios(config);
      
      // Log success
      await WatcherLog.create(this.db, {
        watcherId,
        operationType,
        status: 'success',
        message: `Sent ${operationType} via ${method.toUpperCase()}`,
        response: { status: response.status }
      });
      
      // Increment trigger count
      await this.incrementTriggerCount(watcherId);
      
      console.log(`✓ [${watcher.name}] Sent ${operationType} to n8n via ${method.toUpperCase()}`);
      return response.data;
      
    } catch (error) {
      console.error(`✗ [${watcher.name}] Webhook error:`, error.message);
      
      // Log error
      await WatcherLog.create(this.db, {
        watcherId,
        operationType,
        status: 'error',
        message: error.message,
        error: {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        }
      });
      
      // Still increment trigger count (attempt made)
      await this.incrementTriggerCount(watcherId);
      
      if (error.response) {
        console.error('Response:', error.response.status, error.response.data);
      }
    }
  }
  
  async shutdown() {
    console.log('\nShutting down watchers...');
    
    for (const [id, watcher] of this.activeWatchers) {
      if (watcher.changeStream) {
        await watcher.changeStream.close();
      }
    }
    
    // Close all database connections
    for (const [id, connection] of this.databaseClients) {
      if (connection.type === 'mongodb' && connection.client) {
        await connection.client.close();
      }
    }
    
    this.activeWatchers.clear();
    this.databaseClients.clear();
    
    console.log('✓ All watchers stopped');
  }
}

module.exports = WatcherService;

