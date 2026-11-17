const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema({
  nodeId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  hostname: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    default: '127.0.0.1',
  },
  operatingSystem: {
    type: String,
    default: 'Linux',
  },
  agentVersion: {
    type: String,
    default: '1.0.0',
  },
  apiKey: {
    type: String,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['Online', 'Offline', 'Reconnecting', 'Degraded'],
    default: 'Online',
    index: true,
  },
  lastHeartbeat: {
    type: Date,
    default: Date.now,
    index: true,
  },
  uptime: {
    type: Number,
    default: 0, // seconds
  },
  eventsCount: {
    type: Number,
    default: 0,
  },
  alertsCount: {
    type: Number,
    default: 0,
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Node', nodeSchema);
