const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cybershield',
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'cybershield_super_secret_jwt_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  AGENT_SHARED_SECRET: process.env.AGENT_SHARED_SECRET || 'cybershield-agent-key-secret-999',
  NODE_HEARTBEAT_TIMEOUT_MS: parseInt(process.env.NODE_HEARTBEAT_TIMEOUT_MS || '30000', 10),
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  DEMO_MODE: process.env.DEMO_MODE !== 'false',
};
