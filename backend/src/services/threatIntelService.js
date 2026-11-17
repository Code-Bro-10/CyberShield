const ThreatIntelligence = require('../models/ThreatIntelligence');
const SystemLog = require('../models/SystemLog');
const logger = require('../utils/logger');
const { getSocketIO } = require('../sockets/socketHandler');
const suspiciousIpDetector = require('../detection/rules/suspiciousIpDetector');

const shareThreatIndicator = async ({ indicatorType, indicatorValue, confidence = 85, severity = 'High', source = 'Node Distributed Detection', description = 'Automated node detection', nodeId = 'local-agent', incidentId = null }) => {
  try {
    const cleanValue = indicatorValue.trim();

    // Check if indicator already exists centrally
    let existing = await ThreatIntelligence.findOne({
      indicatorType,
      indicatorValue: cleanValue,
    });

    if (existing) {
      existing.detectionCount += 1;
      existing.lastSeen = new Date();
      if (nodeId && !existing.associatedNodes.includes(nodeId)) {
        existing.associatedNodes.push(nodeId);
      }
      if (incidentId && !existing.associatedIncidents.includes(incidentId)) {
        existing.associatedIncidents.push(incidentId);
      }
      // Update confidence dynamically if verified by multiple independent nodes
      if (existing.associatedNodes.length >= 2) {
        existing.confidence = Math.min(100, Math.max(existing.confidence, 90));
      }
      await existing.save();

      // Invalidate memory cache so detectors get fresh data
      suspiciousIpDetector.invalidateCache();

      logger.info(`Updated existing threat intelligence indicator: ${indicatorType} ${cleanValue} (seen ${existing.detectionCount} times across ${existing.associatedNodes.length} nodes)`);
      return { action: 'updated', record: existing };
    }

    // Create new threat intelligence record
    const newRecord = await ThreatIntelligence.create({
      indicatorType,
      indicatorValue: cleanValue,
      confidence,
      severity,
      source,
      description,
      firstSeen: new Date(),
      lastSeen: new Date(),
      detectionCount: 1,
      associatedNodes: nodeId ? [nodeId] : [],
      associatedIncidents: incidentId ? [incidentId] : [],
    });

    // Invalidate local detector cache
    suspiciousIpDetector.invalidateCache();

    // Log the event
    await SystemLog.create({
      logType: 'SERVER_INFO',
      nodeId: nodeId || 'CENTRAL_SERVER',
      message: `New threat intelligence registered and shared to all nodes: [${indicatorType}] ${cleanValue}`,
      level: 'INFO',
      details: { indicatorId: newRecord._id, confidence, severity }
    });

    // Broadcast update to SOC dashboards and distributed monitoring nodes
    const io = getSocketIO();
    if (io) {
      io.emit('new_threat_intel', newRecord);
    }

    logger.success(`Shared new threat indicator to cluster: ${indicatorType} ${cleanValue}`);
    return { action: 'created', record: newRecord };
  } catch (err) {
    logger.error('Error sharing threat intelligence:', err.message);
    throw err;
  }
};

module.exports = {
  shareThreatIndicator,
};
