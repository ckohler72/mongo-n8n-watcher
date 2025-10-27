const express = require('express');
const router = express.Router();
const Database = require('../models/Database');
const { MongoClient } = require('mongodb');

// Get all databases
router.get('/', async (req, res) => {
  try {
    const databases = await Database.findAll(req.app.locals.db);
    res.json(databases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get database by ID
router.get('/:id', async (req, res) => {
  try {
    const database = await Database.findById(req.app.locals.db, req.params.id);
    if (!database) {
      return res.status(404).json({ error: 'Database not found' });
    }
    res.json(database);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to parse database name from connection string
function parseMongoDatabase(connectionString, config) {
  // Try config first
  if (config && config.database) {
    return config.database;
  }
  
  // Try to parse from URL
  try {
    const url = new URL(connectionString);
    const dbName = url.pathname.slice(1);
    if (dbName) return dbName;
    
    // Try query param
    const dbParam = url.searchParams.get('database');
    if (dbParam) return dbParam;
  } catch (e) {
    // Manual parsing fallback
    const match = connectionString.match(/mongodb:\/\/.+@[^\/]+\/([^?]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

// Get databases available in MongoDB
router.get('/:id/databases', async (req, res) => {
  try {
    const database = await Database.findById(req.app.locals.db, req.params.id);
    
    if (!database) {
      return res.status(404).json({ error: 'Database not found' });
    }

    if (database.type !== 'mongodb') {
      return res.json([]);
    }

    const client = new MongoClient(database.connectionString);
    await client.connect();
    console.log('Connected to MongoDB, listing databases...');
    
    try {
      // Use db().admin() to get admin instance
      const admin = client.db().admin();
      console.log('Admin object obtained');
      
      // List databases
      const result = await admin.listDatabases();
      console.log('Databases found:', result.databases.length);
      
      // Filter out system databases and return list
      const dbList = result.databases
        .filter(db => !['admin', 'local', 'config'].includes(db.name))
        .map(db => ({ name: db.name }));
      
      console.log('Returning databases:', dbList.map(d => d.name));
      
      await client.close();
      
      res.json(dbList);
    } catch (adminError) {
      console.error('Error accessing admin database:', adminError);
      await client.close();
      throw adminError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Error fetching databases:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get collections/tables for a database
// Query params: ?database=<dbName> to specify which MongoDB database
router.get('/:id/collections', async (req, res) => {
  try {
    const database = await Database.findById(req.app.locals.db, req.params.id);
    
    if (!database) {
      return res.status(404).json({ error: 'Database not found' });
    }

    let collections = [];
    
    if (database.type === 'mongodb') {
      // Fetch MongoDB collections
      try {
        const client = new MongoClient(database.connectionString);
        await client.connect();
        
        // Get database name from query param, config, or connection string
        const dbName = req.query.database || 
                      parseMongoDatabase(database.connectionString, database.config) || 
                      'admin';
        
        console.log(`Connecting to MongoDB database: ${dbName}`);
        const db = client.db(dbName);
        
        const cursor = db.listCollections();
        const allCollections = await cursor.toArray();
        
        collections = allCollections.map(col => ({
          name: col.name,
          type: 'collection'
        }));
        
        await client.close();
        
        console.log(`Found ${collections.length} collections in ${dbName}`);
      } catch (err) {
        console.error('MongoDB connection error:', err.message);
        throw err;
      }
    } else if (database.type === 'postgresql') {
      // TODO: Implement PostgreSQL table listing
      // Would use: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
      collections = [{ name: 'Not yet implemented', type: 'table' }];
    } else if (database.type === 'mysql') {
      // TODO: Implement MySQL table listing
      // Would use: SHOW TABLES
      collections = [{ name: 'Not yet implemented', type: 'table' }];
    }
    
    res.json(collections);
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create database
router.post('/', async (req, res) => {
  try {
    const database = await Database.create(req.app.locals.db, req.body);
    res.status(201).json(database);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update database
router.put('/:id', async (req, res) => {
  try {
    const result = await Database.update(
      req.app.locals.db, 
      req.params.id, 
      req.body
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Database not found' });
    }
    const database = await Database.findById(req.app.locals.db, req.params.id);
    res.json(database);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete database
router.delete('/:id', async (req, res) => {
  try {
    const result = await Database.delete(req.app.locals.db, req.params.id);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Database not found' });
    }
    res.json({ message: 'Database deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
