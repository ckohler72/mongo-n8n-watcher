const express = require('express');
const router = express.Router();
const Watcher = require('../models/Watcher');
const WatcherService = require('../services/watcherService');

// Get all watchers
router.get('/', async (req, res) => {
  try {
    const watchers = await Watcher.findAll(req.app.locals.db);
    res.json(watchers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get watcher by ID
router.get('/:id', async (req, res) => {
  try {
    const watcher = await Watcher.findById(req.app.locals.db, req.params.id);
    if (!watcher) {
      return res.status(404).json({ error: 'Watcher not found' });
    }
    res.json(watcher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get watchers by database
router.get('/database/:databaseId', async (req, res) => {
  try {
    const watchers = await Watcher.findByDatabase(
      req.app.locals.db, 
      req.params.databaseId
    );
    res.json(watchers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create watcher
router.post('/', async (req, res) => {
  try {
    const watcher = await Watcher.create(req.app.locals.db, req.body);
    
    // Start the watcher if enabled
    if (watcher.enabled) {
      await req.app.locals.watcherService.startWatcher(watcher);
    }
    
    res.status(201).json(watcher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update watcher
router.put('/:id', async (req, res) => {
  try {
    const watcherService = req.app.locals.watcherService;
    
    console.log('Updating watcher:', req.params.id, req.body);
    
    // Stop existing watcher if running
    try {
      await watcherService.stopWatcher(req.params.id);
    } catch (stopError) {
      console.log('Watcher may not be running:', stopError.message);
    }
    
    // Filter out fields that shouldn't be updated directly
    const updateData = { ...req.body };
    delete updateData._id; // Don't update the ID
    delete updateData.createdAt; // Don't update creation date
    delete updateData.triggerCount; // Don't update trigger count (handled separately)
    
    console.log('Update data:', updateData);
    
    // Update in database
    const result = await Watcher.update(
      req.app.locals.db, 
      req.params.id, 
      updateData
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Watcher not found' });
    }
    
    // Get updated watcher
    let watcher = await Watcher.findById(req.app.locals.db, req.params.id);
    
    // Clean the watcher object before returning (remove any circular refs)
    const cleanWatcher = {
      _id: watcher._id,
      name: watcher.name,
      databaseId: watcher.databaseId,
      collection: watcher.collection,
      table: watcher.table,
      webhookUrl: watcher.webhookUrl,
      webhookMethod: watcher.webhookMethod,
      operations: watcher.operations,
      enabled: watcher.enabled,
      triggerCount: watcher.triggerCount || 0,
      config: watcher.config,
      createdAt: watcher.createdAt,
      updatedAt: watcher.updatedAt
    };
    
    // Restart watcher if enabled
    if (watcher && watcher.enabled) {
      try {
        await watcherService.startWatcher(watcher);
      } catch (startError) {
        console.error('Error restarting watcher:', startError.message);
      }
    }
    
    res.json(cleanWatcher);
  } catch (error) {
    console.error('Error updating watcher:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete watcher
router.delete('/:id', async (req, res) => {
  try {
    const watcherService = req.app.locals.watcherService;
    
    // Stop the watcher
    await watcherService.stopWatcher(req.params.id);
    
    const result = await Watcher.delete(req.app.locals.db, req.params.id);
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Watcher not found' });
    }
    
    res.json({ message: 'Watcher deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

