const { ObjectId } = require('mongodb');

class Database {
  constructor(data) {
    this._id = data._id;
    this.name = data.name;
    this.type = data.type; // mongodb, postgresql, mysql, etc.
    this.connectionString = data.connectionString;
    this.config = data.config || {};
    this.enabled = data.enabled !== false;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
  
  static async create(db, data) {
    const database = {
      name: data.name,
      type: data.type,
      connectionString: data.connectionString,
      config: data.config || {},
      enabled: data.enabled !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('databases').insertOne(database);
    return { ...database, _id: result.insertedId };
  }
  
  static async findAll(db) {
    return await db.collection('databases').find({}).toArray();
  }
  
  static async findById(db, id) {
    return await db.collection('databases').findOne({ _id: new ObjectId(id) });
  }
  
  static async update(db, id, data) {
    return await db.collection('databases').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } }
    );
  }
  
  static async delete(db, id) {
    return await db.collection('databases').deleteOne({ _id: new ObjectId(id) });
  }
}

module.exports = Database;

