const ThreatIntelligence = require('../models/ThreatIntelligence');
const { shareThreatIndicator } = require('../services/threatIntelService');
const suspiciousIpDetector = require('../detection/rules/suspiciousIpDetector');

// GET /api/threat-intelligence
const getThreatIntelligence = async (req, res, next) => {
  try {
    const { indicatorType, severity, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (indicatorType) query.indicatorType = indicatorType;
    if (severity) query.severity = severity;

    if (search) {
      query.$or = [
        { indicatorValue: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { source: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await ThreatIntelligence.countDocuments(query);
    const indicators = await ThreatIntelligence.find(query)
      .sort({ lastSeen: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      indicators,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/threat-intelligence
const addThreatIndicator = async (req, res, next) => {
  try {
    const { indicatorType, indicatorValue, confidence, severity, source, description } = req.body;

    if (!indicatorType || !indicatorValue) {
      return res.status(400).json({ success: false, message: 'indicatorType and indicatorValue are required' });
    }

    const result = await shareThreatIndicator({
      indicatorType,
      indicatorValue,
      confidence: confidence ? Number(confidence) : 85,
      severity: severity || 'High',
      source: source || req.user?.name || 'SOC Analyst Manual Entry',
      description: description || 'Manually cataloged IOC',
      nodeId: 'central-console',
    });

    return res.status(201).json({
      success: true,
      message: `Threat indicator ${result.action} successfully`,
      indicator: result.record,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/threat-intelligence/:id
const deleteThreatIndicator = async (req, res, next) => {
  try {
    const deleted = await ThreatIntelligence.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Indicator not found' });
    }

    suspiciousIpDetector.invalidateCache();
    return res.json({ success: true, message: 'Indicator deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getThreatIntelligence,
  addThreatIndicator,
  deleteThreatIndicator,
};
