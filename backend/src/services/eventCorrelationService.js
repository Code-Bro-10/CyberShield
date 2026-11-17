const SecurityEvent = require('../models/SecurityEvent');
const Node = require('../models/Node');
const SystemLog = require('../models/SystemLog');
const { isDuplicateEvent } = require('../queues/eventStreamQueue');
const { evaluateEvent } = require('../detection/ruleEngine');
const { createAlert } = require('./alertService');
const { getSocketIO } = require('../sockets/socketHandler');
const logger = require('../utils/logger');

const processEvent = async (eventData) => {
  try {
    const { eventId, nodeId, eventType, sourceIP } = eventData;

    if (!eventId || !nodeId || !eventType || !sourceIP) {
      logger.warn(`Rejected malformed security event: missing mandatory fields. Event: ${JSON.stringify(eventData)}`);
      return { status: 'rejected', reason: 'Missing mandatory fields' };
    }

    // 1. Deduplication check using Redis/In-Memory Cache
    const duplicate = await isDuplicateEvent(eventId);
    if (duplicate) {
      logger.debug(`Duplicate event ${eventId} dropped.`);
      return { status: 'duplicate_dropped', eventId };
    }

    // Check DB as well to guarantee idempotency
    const existingInDb = await SecurityEvent.findOne({ eventId });
    if (existingInDb) {
      logger.debug(`Event ${eventId} already exists in database. Skipped.`);
      return { status: 'duplicate_dropped', eventId };
    }

    // 2. Persist SecurityEvent
    const newEvent = await SecurityEvent.create({
      eventId,
      nodeId,
      eventType,
      sourceIP,
      destinationIP: eventData.destinationIP || '192.168.1.100',
      sourcePort: eventData.sourcePort,
      destinationPort: eventData.destinationPort,
      protocol: eventData.protocol || 'TCP',
      timestamp: eventData.timestamp ? new Date(eventData.timestamp) : new Date(),
      detectionMethod: eventData.detectionMethod || 'RULE_BASED',
      severity: eventData.severity || 'Low',
      confidence: eventData.confidence != null ? eventData.confidence : 0.5,
      rawPayload: eventData.rawPayload,
      metadata: eventData.metadata || {},
    });

    // 3. Update Node statistics and heartbeat
    await Node.updateOne(
      { nodeId },
      { 
        $inc: { eventsCount: 1 },
        $set: { lastHeartbeat: new Date(), status: 'Online' }
      }
    );

    // 4. Run Detection Engine
    const matches = await evaluateEvent(newEvent);
    const generatedAlerts = [];

    for (const match of matches) {
      const alert = await createAlert({ event: newEvent, match });
      generatedAlerts.push(alert);
    }

    // 5. Broadcast to Live Monitoring Stream via Socket.IO
    const io = getSocketIO();
    if (io) {
      io.emit('new_event', newEvent);
    }

    return {
      status: 'processed',
      eventId,
      alertsGenerated: generatedAlerts.length,
    };
  } catch (err) {
    logger.error('Error in event correlation service:', err.message);
    throw err;
  }
};

module.exports = {
  processEvent,
};
