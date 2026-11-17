const { v4: uuidv4 } = require('uuid');
const SecurityEvent = require('../models/SecurityEvent');
const { publishSecurityEvent } = require('../queues/eventStreamQueue');
const logger = require('../utils/logger');

// POST /api/events (Ingest from monitoring nodes)
const ingestEvents = async (req, res, next) => {
  try {
    const rawData = req.body;
    const eventsArray = Array.isArray(rawData) ? rawData : [rawData];

    if (eventsArray.length === 0) {
      return res.status(400).json({ success: false, message: 'No events provided in request body' });
    }

    const publishedIds = [];
    const nodeIdFromAuth = req.node?.nodeId;

    for (const raw of eventsArray) {
      const eventId = raw.eventId || `EVT-${uuidv4()}`;
      const eventToPublish = {
        eventId,
        nodeId: raw.nodeId || nodeIdFromAuth || 'unassigned-node',
        eventType: raw.eventType || 'UNKNOWN_EVENT',
        sourceIP: raw.sourceIP || '127.0.0.1',
        destinationIP: raw.destinationIP || '192.168.1.100',
        sourcePort: raw.sourcePort != null ? Number(raw.sourcePort) : undefined,
        destinationPort: raw.destinationPort != null ? Number(raw.destinationPort) : undefined,
        protocol: raw.protocol || 'TCP',
        timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date(),
        detectionMethod: raw.detectionMethod || 'RULE_BASED',
        severity: raw.severity || 'Low',
        confidence: raw.confidence != null ? Number(raw.confidence) : 0.5,
        rawPayload: raw.rawPayload || raw.payload || null,
        metadata: raw.metadata || {},
      };

      // Publish to distributed Redis Stream
      const streamMsgId = await publishSecurityEvent(eventToPublish);
      publishedIds.push({ eventId, streamMsgId });
    }

    return res.status(202).json({
      success: true,
      message: `Enqueued ${publishedIds.length} event(s) to Redis distributed stream`,
      events: publishedIds,
    });
  } catch (err) {
    logger.error('Failed to ingest security events:', err.message);
    next(err);
  }
};

// GET /api/events (SOC query)
const getEvents = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      nodeId,
      severity,
      eventType,
      sourceIP,
      search,
      detectionMethod,
    } = req.query;

    const query = {};

    if (nodeId) query.nodeId = nodeId;
    if (severity) query.severity = severity;
    if (eventType) query.eventType = eventType;
    if (sourceIP) query.sourceIP = sourceIP;
    if (detectionMethod) query.detectionMethod = detectionMethod;

    if (search) {
      query.$or = [
        { eventId: { $regex: search, $options: 'i' } },
        { sourceIP: { $regex: search, $options: 'i' } },
        { destinationIP: { $regex: search, $options: 'i' } },
        { eventType: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await SecurityEvent.countDocuments(query);
    const events = await SecurityEvent.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      count: events.length,
      events,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/events/:id
const getEventById = async (req, res, next) => {
  try {
    const event = await SecurityEvent.findOne({
      $or: [{ eventId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }]
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    return res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  ingestEvents,
  getEvents,
  getEventById,
};
