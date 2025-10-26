require('dotenv').config();
const { MongoClient } = require('mongodb');
const axios = require('axios');

// Parse collections from environment variable (JSON format)
function parseCollections() {
  try {
    if (process.env.COLLECTIONS_CONFIG) {
      return JSON.parse(process.env.COLLECTIONS_CONFIG);
    }
  } catch (error) {
    console.error('Error parsing COLLECTIONS_CONFIG:', error.message);
    console.error('Make sure COLLECTIONS_CONFIG in .env is valid JSON');
  }
  
  // Fallback to single collection if COLLECTIONS_CONFIG not provided
  return [
    {
      name: process.env.COLLECTION_NAME || 'agent_input',
      webhookUrl: process.env.WEBHOOK_URL || '',
      operations: (process.env.COLLECTION_OPERATIONS || 'insert').split(',').map(op => op.trim()),
      enabled: process.env.COLLECTION_ENABLED !== 'false',
    },
  ];
}

// Configuration from environment variables
const CONFIG = {
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017',
  database: process.env.MONGO_DATABASE || 'magnus_db',
  reconnectInterval: parseInt(process.env.RECONNECT_INTERVAL || '5000'),
  collections: parseCollections(),
};

// Validate configuration
if (!CONFIG.mongoUrl) {
  console.error('✗ MONGO_URL is required in .env file');
  process.exit(1);
}

if (CONFIG.collections.length === 0) {
  console.error('✗ No collections configured. Please set up COLLECTIONS_CONFIG or individual collection variables in .env');
  process.exit(1);
}

if (CONFIG.collections.some(c => !c.webhookUrl)) {
  console.error('✗ WEBHOOK_URL is required. Please check your .env file');
  process.exit(1);
}

let client;
let changeStreams = [];

// Send change to n8n webhook
async function sendToWebhook(changeData, webhookUrl, collectionName) {
  try {
    const response = await axios.post(webhookUrl, {
      collection: collectionName,
      operationType: changeData.operationType,
      documentId: changeData.documentKey?._id,
      fullDocument: changeData.fullDocument,
      updateDescription: changeData.updateDescription,
      timestamp: new Date().toISOString(),
      ns: changeData.ns,
    });
    
    console.log(`✓ [${collectionName}] Sent ${changeData.operationType} event to n8n:`, changeData.documentKey?._id);
    return response.data;
  } catch (error) {
    console.error(`✗ [${collectionName}] Error sending to webhook:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Watch a single collection
function watchSingleCollection(db, collectionConfig) {
  const collection = db.collection(collectionConfig.name);

  // Create change stream with pipeline to filter operations
  const pipeline = [
    {
      $match: {
        operationType: { $in: collectionConfig.operations }
      }
    }
  ];

  const changeStream = collection.watch(pipeline, { fullDocument: 'updateLookup' });
  console.log(`✓ Watching: ${collectionConfig.name}`);
  console.log(`  Operations: ${collectionConfig.operations.join(', ')}`);
  console.log(`  Webhook: ${collectionConfig.webhookUrl}`);

  // Listen for changes
  changeStream.on('change', async (change) => {
    console.log(`\n→ [${collectionConfig.name}] Change detected: ${change.operationType}`);
    await sendToWebhook(change, collectionConfig.webhookUrl, collectionConfig.name);
  });

  // Handle errors
  changeStream.on('error', (error) => {
    console.error(`✗ [${collectionConfig.name}] Change stream error:`, error.message);
    reconnect();
  });

  // Handle close
  changeStream.on('close', () => {
    console.log(`[${collectionConfig.name}] Change stream closed`);
    reconnect();
  });

  return changeStream;
}

// Watch all configured collections
async function watchCollections() {
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(CONFIG.mongoUrl);
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db(CONFIG.database);

    // Filter enabled collections
    const enabledCollections = CONFIG.collections.filter(c => c.enabled);
    
    if (enabledCollections.length === 0) {
      console.error('✗ No collections enabled in configuration');
      return;
    }

    console.log(`\n--- Setting up watchers for ${enabledCollections.length} collection(s) ---\n`);

    // Create change stream for each enabled collection
    changeStreams = [];
    for (const collectionConfig of enabledCollections) {
      const stream = watchSingleCollection(db, collectionConfig);
      changeStreams.push(stream);
    }

    console.log('\n--- Listening for changes... ---\n');

  } catch (error) {
    console.error('✗ Error connecting to MongoDB:', error.message);
    reconnect();
  }
}

// Reconnect logic
function reconnect() {
  console.log(`Reconnecting in ${CONFIG.reconnectInterval / 1000} seconds...`);
  
  // Close existing connections
  if (changeStreams.length > 0) {
    changeStreams.forEach(stream => {
      try {
        stream.close();
      } catch (e) {
        // Ignore errors on close
      }
    });
    changeStreams = [];
  }
  
  if (client) {
    client.close();
  }

  // Attempt reconnection
  setTimeout(() => {
    watchCollections();
  }, CONFIG.reconnectInterval);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...');
  
  if (changeStreams.length > 0) {
    console.log(`Closing ${changeStreams.length} change stream(s)...`);
    for (const stream of changeStreams) {
      try {
        await stream.close();
      } catch (e) {
        // Ignore errors on close
      }
    }
  }
  
  if (client) {
    await client.close();
  }
  
  console.log('✓ All connections closed');
  process.exit(0);
});

// Start watching
console.log('=== MongoDB Change Stream Watcher ===\n');
watchCollections();
