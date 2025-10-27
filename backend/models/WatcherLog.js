const { ObjectId } = require('mongodb');

class WatcherLog {
  constructor(data) {
    this._id = data._id;
    this.watcherId = data.watcherId;
    this.operationType = data.operationType;
    this.status = data.status; // success, error
    this.message = data.message;
    this.response = data.response;
    this.error = data.error;
    this.timestamp = data.timestamp || new Date();
  }
  
  static async create(db, data) {
    const log = {
      watcherId: typeof data.watcherId === 'string' ? new ObjectId(data.watcherId) : data.watcherId,
      operationType: data.operationType,
      status: data.status,
      message: data.message,
      response: data.response,
      error: data.error,
      timestamp: new Date()
    };
    
    const result = await db.collection('watcher_logs').insertOne(log);
    return { ...log, _id: result.insertedId };
  }
  
  static async findByWatcher(db, watcherId, limit = 100) {
    return await db.collection('watcher_logs')
      .find({ watcherId: new ObjectId(watcherId) })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }
  
  static async getStats(db, watcherId) {
    const logs = await db.collection('watcher_logs').find({ 
      watcherId: new ObjectId(watcherId) 
    }).toArray();
    
    return {
      total: logs.length,
      success: logs.filter(l => l.status === 'success').length,
      errors: logs.filter(l => l.status === 'error').length,
      lastTrigger: logs.length > 0 ? logs[0].timestamp : null
    };
  }
  
  static async clearLogs(db, watcherId) {
    return await db.collection('watcher_logs').deleteMany({ 
      watcherId: new ObjectId(watcherId) 
    });
  }
}

module.exports = WatcherLog;

