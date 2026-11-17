const { v4: uuidv4 } = require('uuid');
const Alert = require('../models/Alert');
const Node = require('../models/Node');
const Incident = require('../models/Incident');
const SystemLog = require('../models/SystemLog');
const logger = require('../utils/logger');
const { getSocketIO } = require('../sockets/socketHandler');

const createAlert = async ({ event, match, autoIncident = true }) => {
  try {
    const alertId = `ALT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newAlert = await Alert.create({
      alertId,
      eventId: event.eventId,
      nodeId: event.nodeId,
      category: match.category,
      severity: match.severity,
      confidenceScore: match.confidenceScore || 0.8,
      detectionMethod: match.detectorName || event.detectionMethod || 'RULE_BASED',
      sourceIP: event.sourceIP,
      destinationIP: event.destinationIP,
      description: match.description,
      status: 'Open',
    });

    // Update node's alert count
    await Node.updateOne(
      { nodeId: event.nodeId },
      { $inc: { alertsCount: 1 } }
    );

    // Auto-correlate into Incident for High/Critical alerts
    let incident = null;
    if (autoIncident && (match.severity === 'Critical' || match.severity === 'High')) {
      const activeIncident = await Incident.findOne({
        status: { $in: ['New', 'Investigating'] },
        $or: [
          { 'relatedAlerts': { $exists: true, $ne: [] } },
          { title: { $regex: match.category, $options: 'i' } }
        ]
      });

      if (activeIncident) {
        activeIncident.relatedAlerts.push(alertId);
        activeIncident.updatedAt = new Date();
        if (match.severity === 'Critical') activeIncident.severity = 'Critical';
        await activeIncident.save();
        incident = activeIncident;
      } else {
        const incidentId = `INC-${Date.now().toString(36).toUpperCase()}`;
        incident = await Incident.create({
          incidentId,
          title: `${match.category} Investigation [${event.nodeId}]`,
          description: `Automatic incident opened due to ${match.severity} severity detection: ${match.description}`,
          severity: match.severity,
          status: 'New',
          relatedAlerts: [alertId],
          investigationNotes: [{
            noteId: uuidv4(),
            author: 'CyberShield Engine',
            message: `Incident initialized from alert ${alertId}. Source: ${event.sourceIP}`,
            timestamp: new Date(),
          }]
        });
      }
    }

    // Log alert creation
    await SystemLog.create({
      logType: 'DETECTION_TRIGGER',
      nodeId: event.nodeId,
      message: `Alert generated [${match.severity}] - ${match.category}: ${match.description}`,
      level: match.severity === 'Critical' ? 'CRITICAL' : 'WARN',
      details: { alertId, eventId: event.eventId, incidentId: incident?.incidentId }
    });

    logger.alert(match.severity, `Alert ${alertId} created for ${event.nodeId}: ${match.description}`);

    // Broadcast to connected SOC dashboards via Socket.IO
    const io = getSocketIO();
    if (io) {
      io.emit('new_alert', {
        alert: newAlert,
        incidentId: incident?.incidentId || null,
      });
      io.emit('soc_stats_update');
    }

    return newAlert;
  } catch (err) {
    logger.error('Failed to create alert:', err.message);
    throw err;
  }
};

module.exports = {
  createAlert,
};
