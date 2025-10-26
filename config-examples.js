// Example configuration showing multiple collections
// Copy this into mongodb-watcher.js CONFIG section

const CONFIG = {
  mongoUrl: 'mongodb://admin:Mayflower1@localhost:27017/?authSource=admin',
  database: 'magnus_db',
  reconnectInterval: 5000,
  
  collections: [
    // Example 1: Watch all operations on agent_input
    {
      name: 'agent_input',
      webhookUrl: 'http://0.0.0.0:5678/webhook-test/4fc235f1-2cb9-4d68-b8f0-7f4052b7d7d1',
      operations: ['insert', 'update', 'delete', 'replace'],
      enabled: true,
    },
    
    // Example 2: Only watch inserts and updates on agent_output
    {
      name: 'agent_output',
      webhookUrl: 'http://0.0.0.0:5678/webhook/agent-output-handler',
      operations: ['insert', 'update'],
      enabled: true,
    },
    
    // Example 3: Watch user activity logs (only inserts)
    {
      name: 'user_logs',
      webhookUrl: 'http://0.0.0.0:5678/webhook/log-processor',
      operations: ['insert'],
      enabled: true,
    },
    
    // Example 4: Disabled collection (kept for future use)
    {
      name: 'archived_data',
      webhookUrl: 'http://0.0.0.0:5678/webhook/archive-handler',
      operations: ['insert', 'delete'],
      enabled: false, // Not currently active
    },
    
    // Example 5: Critical alerts collection with all operations
    {
      name: 'system_alerts',
      webhookUrl: 'http://0.0.0.0:5678/webhook/alert-handler',
      operations: ['insert', 'update', 'delete', 'replace'],
      enabled: true,
    },
  ],
};

// Tips:
// - Each collection can have a unique webhook URL
// - Operations can be customized per collection
// - Set enabled: false to temporarily disable without removing config
// - Add new collections by copying an existing block and modifying it
// - The watcher will create separate change streams for each enabled collection
