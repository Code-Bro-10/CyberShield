const { v4: uuidv4 } = require('uuid');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const SystemLog = require('../models/SystemLog');
const { getSocketIO } = require('../sockets/socketHandler');

// GET /api/incidents
const getIncidents = async (req, res, next) => {
  try {
    const { status, severity, assignedTo, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (assignedTo) query.assignedTo = assignedTo;

    if (search) {
      query.$or = [
        { incidentId: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Incident.countDocuments(query);
    const incidents = await Incident.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const activeCount = await Incident.countDocuments({ status: { $in: ['New', 'Investigating', 'Contained'] } });

    return res.json({
      success: true,
      total,
      activeCount,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      incidents,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/incidents
const createIncident = async (req, res, next) => {
  try {
    const { title, description, severity, relatedAlerts, assignedTo } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const incidentId = `INC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const incident = await Incident.create({
      incidentId,
      title,
      description: description || 'Operator created incident',
      severity: severity || 'Medium',
      status: 'New',
      assignedTo: assignedTo || 'Unassigned',
      relatedAlerts: Array.isArray(relatedAlerts) ? relatedAlerts : [],
      investigationNotes: [{
        noteId: uuidv4(),
        author: req.user?.name || 'SOC Operator',
        message: 'Incident manually created for triage.',
        timestamp: new Date(),
      }],
    });

    await SystemLog.create({
      logType: 'SERVER_INFO',
      message: `Incident created: ${incident.incidentId} - ${incident.title}`,
      level: 'INFO',
      details: { incidentId: incident.incidentId, severity: incident.severity }
    });

    const io = getSocketIO();
    if (io) {
      io.emit('new_incident', incident);
      io.emit('soc_stats_update');
    }

    return res.status(201).json({ success: true, incident });
  } catch (err) {
    next(err);
  }
};

// GET /api/incidents/:id
const getIncidentById = async (req, res, next) => {
  try {
    const incident = await Incident.findOne({
      $or: [{ incidentId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }]
    });

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    // Optionally populate related alerts
    let alertsDetails = [];
    if (incident.relatedAlerts && incident.relatedAlerts.length > 0) {
      alertsDetails = await Alert.find({ alertId: { $in: incident.relatedAlerts } });
    }

    return res.json({
      success: true,
      incident,
      alerts: alertsDetails,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/incidents/:id
const updateIncident = async (req, res, next) => {
  try {
    const { status, severity, assignedTo, title, description } = req.body;

    const incident = await Incident.findOne({
      $or: [{ incidentId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }]
    });

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    if (status) {
      incident.status = status;
      if (status === 'Resolved' || status === 'Closed') {
        incident.resolvedAt = new Date();
      }
    }
    if (severity) incident.severity = severity;
    if (assignedTo !== undefined) incident.assignedTo = assignedTo;
    if (title) incident.title = title;
    if (description) incident.description = description;

    incident.updatedAt = new Date();
    await incident.save();

    const io = getSocketIO();
    if (io) {
      io.emit('incident_updated', incident);
      io.emit('soc_stats_update');
    }

    return res.json({ success: true, message: 'Incident updated successfully', incident });
  } catch (err) {
    next(err);
  }
};

// POST /api/incidents/:id/notes
const addInvestigationNote = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Note message cannot be empty' });
    }

    const incident = await Incident.findOne({
      $or: [{ incidentId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }]
    });

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const note = {
      noteId: uuidv4(),
      author: req.user?.name || 'SOC Analyst',
      message: message.trim(),
      timestamp: new Date(),
    };

    incident.investigationNotes.push(note);
    incident.updatedAt = new Date();
    await incident.save();

    const io = getSocketIO();
    if (io) {
      io.emit('incident_updated', incident);
    }

    return res.json({ success: true, message: 'Investigation note appended', note, incident });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getIncidents,
  createIncident,
  getIncidentById,
  updateIncident,
  addInvestigationNote,
};
