const Node = require('../models/Node');
const SecurityEvent = require('../models/SecurityEvent');
const Alert = require('../models/Alert');
const Incident = require('../models/Incident');

// GET /api/analytics/overview
const getOverviewStats = async (req, res, next) => {
  try {
    const [
      totalNodes,
      onlineNodes,
      offlineNodes,
      totalEvents,
      totalAlerts,
      criticalAlerts,
      activeIncidents,
      openAlerts,
    ] = await Promise.all([
      Node.countDocuments(),
      Node.countDocuments({ status: 'Online' }),
      Node.countDocuments({ status: { $ne: 'Online' } }),
      SecurityEvent.countDocuments(),
      Alert.countDocuments(),
      Alert.countDocuments({ severity: 'Critical' }),
      Incident.countDocuments({ status: { $in: ['New', 'Investigating', 'Contained'] } }),
      Alert.countDocuments({ status: 'Open' }),
    ]);

    return res.json({
      success: true,
      stats: {
        totalNodes,
        onlineNodes,
        offlineNodes,
        totalEvents,
        totalAlerts,
        criticalAlerts,
        activeIncidents,
        openAlerts,
        systemHealth: offlineNodes === 0 ? 'HEALTHY' : (onlineNodes > 0 ? 'DEGRADED' : 'CRITICAL'),
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/analytics/attacks
const getAttackAnalytics = async (req, res, next) => {
  try {
    // 1. Category distribution
    const categoryAgg = await Alert.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // 2. Severity distribution
    const severityAgg = await Alert.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    // 3. Attacks over time (last 24 hours or grouped by hour)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const timelineAgg = await Alert.aggregate([
      { $match: { createdAt: { $gte: twentyFourHoursAgo } } },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            category: '$category',
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.hour': 1 } }
    ]);

    // 4. Top source IPs
    const topIpsAgg = await Alert.aggregate([
      { $match: { sourceIP: { $exists: true, $ne: '' } } },
      { $group: { _id: '$sourceIP', count: { $sum: 1 }, maxSeverity: { $first: '$severity' } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // 5. Detection methods breakdown
    const detectionMethodsAgg = await Alert.aggregate([
      { $group: { _id: '$detectionMethod', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    return res.json({
      success: true,
      categories: categoryAgg.map(c => ({ category: c._id || 'Unknown', count: c.count })),
      severities: severityAgg.map(s => ({ severity: s._id || 'Unknown', count: s.count })),
      timeline: timelineAgg,
      topSourceIPs: topIpsAgg.map(t => ({ ip: t._id, count: t.count, severity: t.maxSeverity })),
      detectionMethods: detectionMethodsAgg.map(d => ({ method: d._id || 'Standard Rule', count: d.count })),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/analytics/nodes
const getNodeAnalytics = async (req, res, next) => {
  try {
    const nodes = await Node.find().sort({ eventsCount: -1 });

    const nodeStats = nodes.map(n => ({
      nodeId: n.nodeId,
      hostname: n.hostname,
      status: n.status,
      eventsCount: n.eventsCount,
      alertsCount: n.alertsCount,
      uptime: n.uptime,
      lastHeartbeat: n.lastHeartbeat,
    }));

    return res.json({
      success: true,
      nodes: nodeStats,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverviewStats,
  getAttackAnalytics,
  getNodeAnalytics,
};
