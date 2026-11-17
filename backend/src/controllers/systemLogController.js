const SystemLog = require('../models/SystemLog');
const { getIsFallback } = require('../queues/redisClient');

// GET /api/logs
const getSystemLogs = async (req, res, next) => {
  try {
    const { logType, level, nodeId, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (logType) query.logType = logType;
    if (level) query.level = level;
    if (nodeId) query.nodeId = nodeId;

    if (search) {
      query.message = { $regex: search, $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await SystemLog.countDocuments(query);
    const logs = await SystemLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      redisStatus: getIsFallback() ? 'Embedded Stream Broker (Fallback)' : 'Redis Connected (Port 6379)',
      logs,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSystemLogs,
};
