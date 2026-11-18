const mongoose = require('mongoose');

const securityDefenseSchema = new mongoose.Schema({
  defenseId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  alertId: {
    type: String,
    index: true,
  },
  nodeId: {
    type: String,
    default: 'cluster-wide',
    index: true,
  },
  category: {
    type: String,
    required: true,
    index: true,
  },
  target: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
  defenseType: {
    type: String,
    enum: [
      'BLOCK_IP',
      'RATE_LIMIT',
      'QUARANTINE_HASH',
      'ISOLATE_HOST',
      'ENABLE_SYN_COOKIES',
      'PROPAGATE_IOC',
      'DROP_PORT',
      'CUSTOM_COUNTERMEASURE',
    ],
    required: true,
    index: true,
  },
  actionTaken: {
    type: String,
    required: true,
  },
  firewallRule: {
    iptables: { type: String },
    ufw: { type: String },
    powershell: { type: String },
    fail2ban: { type: String },
  },
  status: {
    type: String,
    enum: ['Active', 'Revoked', 'Expired'],
    default: 'Active',
    index: true,
  },
  appliedBy: {
    type: String,
    default: 'SOC Analyst',
  },
  appliedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  revokedAt: {
    type: Date,
  },
  revokedBy: {
    type: String,
  },
  notes: {
    type: String,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('SecurityDefense', securityDefenseSchema);
