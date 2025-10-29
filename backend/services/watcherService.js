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
    
    console.log(`Found ${watchers.length} watcher(s) in database`);
    
    for (const watcher of watchers) {
      console.log(`Watcher "${watcher.name}": enabled=${watcher.enabled}, mongoDatabase="${watcher.mongoDatabase || '(not set)'}", hasDatabase=${!!watcher.database}`);
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
      // Return client without specific db - will be set per watcher
      return { type, client };
    }
    
    // TODO: Add PostgreSQL and MySQL connections
    throw new Error(`Database type ${type} not yet implemented`);
  }
  
  async watchMongoCollection(connection, watcher) {
    // Get the correct database for this watcher
    let dbName = watcher.mongoDatabase;
    
    console.log(`[${watcher.name}] mongoDatabase field: "${dbName}"`);
    
    // Fallback: try to parse from connection string if not specified
    if (!dbName || dbName.trim() === '') {
      console.log(`[${watcher.name}] No mongoDatabase specified, trying to parse from connection string...`);
      const database = watcher.database;
      try {
        const url = new URL(database.connectionString);
        dbName = url.pathname.slice(1);
        if (!dbName) {
          dbName = url.searchParams.get('database');
        }
        if (dbName) {
          console.log(`[${watcher.name}] Parsed database from connection string: "${dbName}"`);
        }
      } catch (e) {
        // Manual parsing fallback
        const match = database.connectionString.match(/mongodb:\/\/.+@[^\/]+\/([^?]+)/);
        if (match && match[1]) {
          dbName = match[1];
          console.log(`[${watcher.name}] Parsed database from connection string (regex): "${dbName}"`);
        }
      }
    }
    
    // Don't use admin database - it doesn't support change streams
    if (!dbName || dbName === 'admin' || dbName === 'local' || dbName === 'config' || dbName.trim() === '') {
      console.log(`[${watcher.name}] Database "${dbName}" is invalid, attempting to find available database...`);
      // Try to find the database from available databases
      const adminDb = connection.client.db().admin();
      try {
        const result = await adminDb.listDatabases();
        const databases = result.databases
          .filter(db => !['admin', 'local', 'config'].includes(db.name));
        
        if (databases.length > 0) {
          // Use first non-system database
          dbName = databases[0].name;
          console.log(`⚠️  [${watcher.name}] Database not specified, using first available: ${dbName}`);
          console.log(`⚠️  [${watcher.name}] WARNING: This may not be the correct database! Please edit watcher and select the correct MongoDB database.`);
        } else {
          throw new Error(`No valid database found. Please specify MongoDB database for watcher "${watcher.name}"`);
        }
      } catch (err) {
        throw new Error(`Cannot determine MongoDB database for watcher "${watcher.name}". Please edit the watcher and select a database. Error: ${err.message}`);
      }
    }
    
    console.log(`[${watcher.name}] ✓ Using MongoDB database: "${dbName}"`);
    console.log(`[${watcher.name}] ✓ Watching collection: "${watcher.collection}"`);
    const db = connection.client.db(dbName);
    const collection = db.collection(watcher.collection);
    
    // Verify collection exists
    const collections = await db.listCollections({ name: watcher.collection }).toArray();
    if (collections.length === 0) {
      console.warn(`⚠️  [${watcher.name}] Collection "${watcher.collection}" not found in database "${dbName}"`);
    } else {
      console.log(`✓ [${watcher.name}] Collection "${watcher.collection}" exists in database "${dbName}"`);
    }
    
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

