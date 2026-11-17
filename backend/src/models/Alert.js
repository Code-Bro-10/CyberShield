const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  alertId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  eventId: {
    type: String,
    required: true,
    index: true,
  },
  nodeId: {
    type: String,
    required: true,
    index: true,
  },
  category: {
    type: String,
    required: true,
    index: true,
  },
  severity: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low', 'Informational'],
    required: true,
    index: true,
  },
  confidenceScore: {
    type: Number,
    default: 0.8,
  },
  detectionMethod: {
    type: String,
    default: 'RULE_BASED',
  },
  sourceIP: {
    type: String,
    index: true,
  },
  destinationIP: {
    type: String,
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Open', 'Acknowledged', 'Resolved', 'False Positive'],
    default: 'Open',
    index: true,
  },
  acknowledgedBy: {
    type: String,
  },
  acknowledgedAt: {
    type: Date,
  },
  resolvedBy: {
    type: String,
  },
  resolvedAt: {
    type: Date,
  },
  resolutionNotes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

alertSchema.index({ status: 1, severity: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
