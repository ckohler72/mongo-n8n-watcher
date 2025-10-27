const { ObjectId } = require('mongodb');

class Watcher {
  constructor(data) {
    this._id = data._id;
    this.name = data.name;
    this.databaseId = data.databaseId;
    this.collection = data.collection;
    this.table = data.table; // for SQL databases
    this.webhookUrl = data.webhookUrl;
    this.webhookMethod = data.webhookMethod || 'POST'; // HTTP method for webhook
    this.operations = data.operations || ['insert'];
    this.enabled = data.enabled !== false;
    this.triggerCount = data.triggerCount || 0;
    this.config = data.config || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
  
  static async create(db, data) {
    const watcher = {
      name: data.name,
      databaseId: typeof data.databaseId === 'string' ? new ObjectId(data.databaseId) : data.databaseId,
      collection: data.collection,
      table: data.table,
      webhookUrl: data.webhookUrl,
      webhookMethod: data.webhookMethod || 'POST',
      operations: data.operations || ['insert'],
      enabled: data.enabled !== false,
      triggerCount: 0,
      config: data.config || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('watchers').insertOne(watcher);
    return { ...watcher, _id: result.insertedId };
  }
  
  static async findAll(db) {
    const watchers = await db.collection('watchers').find({}).toArray();
    // Populate database info
    for (const watcher of watchers) {
      if (watcher.databaseId) {
        watcher.database = await db.collection('databases').findOne({ _id: watcher.databaseId });
      }
    }
    return watchers;
  }
  
  static async findById(db, id) {
    const watcher = await db.collection('watchers').findOne({ _id: new ObjectId(id) });
    if (watcher) {
      watcher.database = await db.collection('databases').findOne({ _id: new ObjectId(watcher.databaseId) });
    }
    return watcher;
  }
  
  static async findByDatabase(db, databaseId) {
    return await db.collection('watchers').find({ databaseId: new ObjectId(databaseId) }).toArray();
  }
  
  static async update(db, id, data) {
    // Prepare update data, converting databaseId if needed
    const updateData = { ...data, updatedAt: new Date() };
    
    // Convert databaseId to ObjectId if it's a string and not already an ObjectId
    if (updateData.databaseId && typeof updateData.databaseId === 'string') {
      try {
        updateData.databaseId = new ObjectId(updateData.databaseId);
      } catch (e) {
        // If conversion fails, keep as is
      }
    }
    
    return await db.collection('watchers').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
  }
  
  static async delete(db, id) {
    return await db.collection('watchers').deleteOne({ _id: new ObjectId(id) });
  }
}

module.exports = Watcher;

