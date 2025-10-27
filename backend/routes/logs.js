const express = require('express');
const router = express.Router();
const WatcherLog = require('../models/WatcherLog');

// Get logs for a watcher
router.get('/watcher/:watcherId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await WatcherLog.findByWatcher(
      req.app.locals.db, 
      req.params.watcherId,
      limit
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stats for a watcher
router.get('/watcher/:watcherId/stats', async (req, res) => {
  try {
    const stats = await WatcherLog.getStats(
      req.app.locals.db, 
      req.params.watcherId
    );
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear logs for a watcher
router.delete('/watcher/:watcherId', async (req, res) => {
  try {
    const result = await WatcherLog.clearLogs(
      req.app.locals.db, 
      req.params.watcherId
    );
    res.json({ deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

