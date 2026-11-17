const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  incidentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  severity: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low'],
    default: 'Medium',
    index: true,
  },
  status: {
    type: String,
    enum: ['New', 'Investigating', 'Contained', 'Resolved', 'Closed'],
    default: 'New',
    index: true,
  },
  assignedTo: {
    type: String,
    default: 'Unassigned',
  },
  relatedAlerts: [{
    type: String,
  }],
  investigationNotes: [{
    noteId: { type: String, required: true },
    author: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  resolvedAt: {
    type: Date,
  },
});

module.exports = mongoose.model('Incident', incidentSchema);
