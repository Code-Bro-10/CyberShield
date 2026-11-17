const Node = require('../models/Node');
const env = require('../config/env');

const requireAgentAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-agent-key'] || req.headers['x-api-key'];
    const clusterSecret = req.headers['x-agent-secret'];
    const nodeId = req.body?.nodeId || req.query?.nodeId;

    // Cluster admin/shared secret bypass (e.g. for registration / simulation)
    if (clusterSecret && clusterSecret === env.AGENT_SHARED_SECRET) {
      req.agentAuthorized = true;
      return next();
    }

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'Agent authentication failed. Missing x-agent-key or x-agent-secret header.'
      });
    }

    // Lookup node by API key
    const node = await Node.findOne({ apiKey });
    if (!node) {
      return res.status(401).json({
        success: false,
        message: 'Invalid agent credentials. API key not recognized.'
      });
    }

    if (nodeId && node.nodeId !== nodeId) {
      return res.status(403).json({
        success: false,
        message: `Mismatched node identity. Provided nodeId [${nodeId}] does not match API key owner [${node.nodeId}].`
      });
    }

    req.node = node;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Agent authorization check error', error: err.message });
  }
};

module.exports = {
  requireAgentAuth,
};
