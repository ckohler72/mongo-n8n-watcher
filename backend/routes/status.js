const express = require('express');
const router = express.Router();
const Watcher = require('../models/Watcher');
const Database = require('../models/Database');
const WatcherLog = require('../models/WatcherLog');

// Get system status
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const watcherService = req.app.locals.watcherService;
    
    // Get counts
    const watchers = await Watcher.findAll(db);
    const databases = await Database.findAll(db);
    
    // Calculate stats
    const activeWatchers = watchers.filter(w => w.enabled);
    const totalTriggers = watchers.reduce((sum, w) => sum + (w.triggerCount || 0), 0);
    
    // Get recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = await db.collection('watcher_logs')
      .find({ timestamp: { $gte: yesterday } })
      .count();
    
    // Get watcher service status
    const activeWatcherCount = watcherService ? watcherService.activeWatchers.size : 0;
    
    const status = {
      system: {
        status: 'operational',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      },
      services: {
        backend: 'running',
        frontend: 'unknown', // Could be checked if needed
        mongodb: 'connected'
      },
      watchers: {
        total: watchers.length,
        active: activeWatchers.length,
        inactive: watchers.length - activeWatchers.length,
        running: activeWatcherCount,
        totalTriggers: totalTriggers
      },
      databases: {
        total: databases.length,
        enabled: databases.filter(d => d.enabled).length,
        disabled: databases.filter(d => !d.enabled).length
      },
      activity: {
        last24Hours: recentLogs,
        recentLogsTimestamp: yesterday.toISOString()
      },
      watcherDetails: watchers.map(w => ({
        id: w._id,
        name: w.name,
        enabled: w.enabled,
        triggerCount: w.triggerCount || 0,
        database: w.database?.name || 'Unknown',
        collection: w.collection || w.table
      }))
    };
    
    res.json(status);
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ 
      system: { status: 'error', error: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

// Get watcher service status
router.get('/watchers', async (req, res) => {
  try {
    const watcherService = req.app.locals.watcherService;
    
    const status = {
      activeWatchers: watcherService ? watcherService.activeWatchers.size : 0,
      databaseConnections: watcherService ? watcherService.databaseClients.size : 0,
      watcherDetails: []
    };
    
    if (watcherService) {
      for (const [id, watcher] of watcherService.activeWatchers) {
        status.watcherDetails.push({
          id: watcher._id?.toString(),
          name: watcher.name,
          collection: watcher.collection,
          database: watcher.database?.name
        });
      }
    }
    
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

