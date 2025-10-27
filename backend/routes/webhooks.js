const express = require('express');
const router = express.Router();
const axios = require('axios');

// Test webhook
router.post('/test', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }
    
    const testPayload = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Test webhook from Database Watcher'
    };
    
    const response = await axios.post(url, testPayload);
    
    res.json({
      success: true,
      status: response.status,
      data: response.data
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
});

// Discover n8n webhooks (placeholder - would need n8n API)
router.get('/discover', async (req, res) => {
  // TODO: Implement n8n API integration to discover available webhooks
  res.json({ 
    message: 'n8n webhook discovery not yet implemented',
    hint: 'Use the webhook URL from your n8n workflow'
  });
});

module.exports = router;

