const mongoose = require('mongoose');

const threatIntelSchema = new mongoose.Schema({
  indicatorType: {
    type: String,
    enum: ['IP', 'DOMAIN', 'HASH_SHA256', 'URL'],
    required: true,
    index: true,
  },
  indicatorValue: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  confidence: {
    type: Number,
    default: 80,
    min: 0,
    max: 100,
  },
  severity: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low'],
    default: 'High',
  },
  source: {
    type: String,
    default: 'Internal Threat Feeds',
  },
  description: {
    type: String,
    default: 'Identified malicious indicator',
  },
  firstSeen: {
    type: Date,
    default: Date.now,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
    index: true,
  },
  detectionCount: {
    type: Number,
    default: 1,
  },
  associatedNodes: [{
    type: String,
  }],
  associatedIncidents: [{
    type: String,
  }],
});

module.exports = mongoose.model('ThreatIntelligence', threatIntelSchema);
