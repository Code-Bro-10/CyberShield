const Alert = require('../models/Alert');
const SystemLog = require('../models/SystemLog');
const { getSocketIO } = require('../sockets/socketHandler');
const logger = require('../utils/logger');

// GET /api/alerts
const getAlerts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      severity,
      category,
      nodeId,
      search,
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (category) query.category = category;
    if (nodeId) query.nodeId = nodeId;

    if (search) {
      query.$or = [
        { alertId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sourceIP: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Alert.countDocuments(query);
    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Calculate unread/open count for badge
    const openCount = await Alert.countDocuments({ status: 'Open' });

    return res.json({
      success: true,
      total,
      openCount,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      count: alerts.length,
      alerts,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/alerts/:id
const getAlertById = async (req, res, next) => {
  try {
    const alert = await Alert.findOne({
      $or: [{ alertId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }]
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    return res.json({ success: true, alert });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/alerts/:id/acknowledge
const acknowledgeAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findOne({
      $or: [{ alertId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }]
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alert.status = 'Acknowledged';
    alert.acknowledgedBy = req.user?.name || 'SOC Operator';
    alert.acknowledgedAt = new Date();
    await alert.save();

    await SystemLog.create({
      logType: 'DETECTION_TRIGGER',
      nodeId: alert.nodeId,
      message: `Alert ${alert.alertId} acknowledged by ${alert.acknowledgedBy}`,
      level: 'INFO',
      details: { alertId: alert.alertId, category: alert.category }
    });

    const io = getSocketIO();
    if (io) {
      io.emit('alert_updated', alert);
      io.emit('soc_stats_update');
    }

    return res.json({
      success: true,
      message: `Alert ${alert.alertId} acknowledged`,
      alert,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/alerts/:id/resolve
const resolveAlert = async (req, res, next) => {
  try {
    const { resolutionNotes } = req.body;

    const alert = await Alert.findOne({
      $or: [{ alertId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }]
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alert.status = 'Resolved';
    alert.resolvedBy = req.user?.name || 'SOC Operator';
    alert.resolvedAt = new Date();
    if (resolutionNotes) alert.resolutionNotes = resolutionNotes;
    await alert.save();

    await SystemLog.create({
      logType: 'DETECTION_TRIGGER',
      nodeId: alert.nodeId,
      message: `Alert ${alert.alertId} marked RESOLVED by ${alert.resolvedBy}. Notes: ${resolutionNotes || 'None'}`,
      level: 'INFO',
      details: { alertId: alert.alertId }
    });

    const io = getSocketIO();
    if (io) {
      io.emit('alert_updated', alert);
      io.emit('soc_stats_update');
    }

    return res.json({
      success: true,
      message: `Alert ${alert.alertId} resolved`,
      alert,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
};
