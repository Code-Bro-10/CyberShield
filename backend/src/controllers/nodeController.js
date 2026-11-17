const { v4: uuidv4 } = require('uuid');
const Node = require('../models/Node');
const SystemLog = require('../models/SystemLog');
const logger = require('../utils/logger');
const { getSocketIO } = require('../sockets/socketHandler');

// GET /api/nodes
const getNodes = async (req, res, next) => {
  try {
    const nodes = await Node.find().sort({ lastHeartbeat: -1 });
    return res.json({
      success: true,
      count: nodes.length,
      nodes,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/nodes/:id
const getNodeById = async (req, res, next) => {
  try {
    const node = await Node.findOne({
      $or: [{ nodeId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }]
    });

    if (!node) {
      return res.status(404).json({ success: false, message: 'Node not found' });
    }

    return res.json({ success: true, node });
  } catch (err) {
    next(err);
  }
};

// POST /api/nodes/register
const registerNode = async (req, res, next) => {
  try {
    const { nodeId, hostname, ipAddress, operatingSystem, agentVersion } = req.body;

    if (!hostname) {
      return res.status(400).json({ success: false, message: 'Hostname is required' });
    }

    const assignedNodeId = nodeId || `node-${hostname.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.floor(Math.random() * 900 + 100)}`;
    const apiKey = `key-${uuidv4().replace(/-/g, '').substring(0, 24)}`;

    let node = await Node.findOne({ nodeId: assignedNodeId });

    if (node) {
      // Re-register / Update existing
      node.hostname = hostname;
      node.ipAddress = ipAddress || node.ipAddress;
      node.operatingSystem = operatingSystem || node.operatingSystem;
      node.agentVersion = agentVersion || node.agentVersion;
      node.status = 'Online';
      node.lastHeartbeat = new Date();
      await node.save();
    } else {
      node = await Node.create({
        nodeId: assignedNodeId,
        hostname,
        ipAddress: ipAddress || '127.0.0.1',
        operatingSystem: operatingSystem || 'Linux',
        agentVersion: agentVersion || '1.0.0',
        apiKey,
        status: 'Online',
        lastHeartbeat: new Date(),
        uptime: 0,
      });
    }

    await SystemLog.create({
      logType: 'NODE_CONNECTION',
      nodeId: assignedNodeId,
      message: `Node registered successfully: ${assignedNodeId} (${hostname} @ ${node.ipAddress})`,
      level: 'INFO',
      details: { agentVersion: node.agentVersion, os: node.operatingSystem }
    });

    logger.node(assignedNodeId, `Node registered/authenticated. Key issued.`);

    const io = getSocketIO();
    if (io) {
      io.emit('node_status_change', {
        nodeId: assignedNodeId,
        status: 'Online',
        lastHeartbeat: node.lastHeartbeat,
      });
      io.emit('soc_stats_update');
    }

    return res.status(201).json({
      success: true,
      message: 'Monitoring node registered successfully',
      node: {
        nodeId: node.nodeId,
        hostname: node.hostname,
        ipAddress: node.ipAddress,
        apiKey: node.apiKey,
        status: node.status,
      }
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/nodes/heartbeat
const sendHeartbeat = async (req, res, next) => {
  try {
    const { nodeId, uptime, operatingSystem, agentVersion } = req.body;

    if (!nodeId) {
      return res.status(400).json({ success: false, message: 'NodeId is required in heartbeat payload' });
    }

    const node = await Node.findOne({ nodeId });
    if (!node) {
      return res.status(404).json({ success: false, message: 'Node not registered. Please register first.' });
    }

    const previousStatus = node.status;
    node.lastHeartbeat = new Date();
    node.status = 'Online';
    if (uptime != null) node.uptime = Number(uptime);
    if (operatingSystem) node.operatingSystem = operatingSystem;
    if (agentVersion) node.agentVersion = agentVersion;

    await node.save();

    const io = getSocketIO();
    if (io) {
      if (previousStatus !== 'Online') {
        io.emit('node_status_change', {
          nodeId: node.nodeId,
          status: 'Online',
          lastHeartbeat: node.lastHeartbeat,
        });
      }
      io.emit('node_heartbeat', {
        nodeId: node.nodeId,
        lastHeartbeat: node.lastHeartbeat,
        uptime: node.uptime,
      });
    }

    return res.json({
      success: true,
      status: 'acknowledged',
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/nodes/:id
const deleteNode = async (req, res, next) => {
  try {
    const node = await Node.findOneAndDelete({ nodeId: req.params.id });
    if (!node) {
      return res.status(404).json({ success: false, message: 'Node not found' });
    }

    const io = getSocketIO();
    if (io) {
      io.emit('node_deleted', { nodeId: req.params.id });
      io.emit('soc_stats_update');
    }

    return res.json({ success: true, message: `Node ${req.params.id} deregistered successfully` });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNodes,
  getNodeById,
  registerNode,
  sendHeartbeat,
  deleteNode,
};
