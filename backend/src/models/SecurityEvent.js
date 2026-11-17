const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  nodeId: {
    type: String,
    required: true,
    index: true,
  },
  eventType: {
    type: String,
    required: true,
    index: true,
  },
  sourceIP: {
    type: String,
    required: true,
    index: true,
  },
  destinationIP: {
    type: String,
    default: '192.168.1.100',
  },
  sourcePort: {
    type: Number,
  },
  destinationPort: {
    type: Number,
  },
  protocol: {
    type: String,
    default: 'TCP',
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  detectionMethod: {
    type: String,
    enum: ['RULE_BASED', 'MACHINE_LEARNING', 'SURICATA_EVE', 'ZEEK_LOG', 'THREAT_INTEL', 'HEURISTIC'],
    default: 'RULE_BASED',
  },
  severity: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low', 'Informational'],
    default: 'Low',
    index: true,
  },
  confidence: {
    type: Number,
    default: 0.5,
    min: 0,
    max: 1,
  },
  rawPayload: {
    type: mongoose.Schema.Types.Mixed,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

// Compound indexes for fast SOC queries
securityEventSchema.index({ timestamp: -1, severity: 1 });
securityEventSchema.index({ sourceIP: 1, timestamp: -1 });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
