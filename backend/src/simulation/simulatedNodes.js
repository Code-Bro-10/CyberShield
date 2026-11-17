const { v4: uuidv4 } = require('uuid');
const Node = require('../models/Node');
const logger = require('../utils/logger');
const { getSocketIO } = require('../sockets/socketHandler');

const SIMULATED_NODES_CONFIG = [
  {
    nodeId: 'node-alpha-edge',
    hostname: 'soc-edge-us-east',
    ipAddress: '10.0.10.15',
    operatingSystem: 'Ubuntu 22.04 LTS (x86_64)',
    agentVersion: '1.2.0',
    apiKey: 'key-alpha-9901',
  },
  {
    nodeId: 'node-beta-dmz',
    hostname: 'soc-dmz-gateway-eu',
    ipAddress: '10.0.20.22',
    operatingSystem: 'Debian 12 (Kernel 6.1)',
    agentVersion: '1.2.0',
    apiKey: 'key-beta-9902',
  },
  {
    nodeId: 'node-gamma-corp',
    hostname: 'soc-internal-core-ap',
    ipAddress: '10.0.30.8',
    operatingSystem: 'Red Hat Enterprise Linux 9',
    agentVersion: '1.2.0',
    apiKey: 'key-gamma-9903',
  }
];

class SimulatedNodeManager {
  constructor() {
    this.nodes = new Map();
    this.heartbeatInterval = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    for (const conf of SIMULATED_NODES_CONFIG) {
      let node = await Node.findOne({ nodeId: conf.nodeId });
      if (!node) {
        node = await Node.create({
          ...conf,
          status: 'Online',
          lastHeartbeat: new Date(),
          uptime: Math.floor(Math.random() * 50000 + 10000),
        });
      } else {
        node.status = 'Online';
        node.lastHeartbeat = new Date();
        await node.save();
      }
      this.nodes.set(conf.nodeId, {
        ...conf,
        uptime: node.uptime,
        status: 'Online',
        bufferedEvents: [],
      });
    }

    this.startHeartbeatLoop();
    this.isInitialized = true;
    logger.info(`Simulated node cluster initialized with ${this.nodes.size} nodes.`);
  }

  startHeartbeatLoop() {
    if (this.heartbeatInterval) return;

    // Send simulated node heartbeats every 15 seconds
    this.heartbeatInterval = setInterval(async () => {
      try {
        const now = new Date();
        const io = getSocketIO();

        for (const [nodeId, state] of this.nodes.entries()) {
          state.uptime += 15;
          await Node.updateOne(
            { nodeId },
            { 
              $set: { 
                status: 'Online', 
                lastHeartbeat: now,
                uptime: state.uptime 
              } 
            }
          );

          if (io) {
            io.emit('node_heartbeat', {
              nodeId,
              lastHeartbeat: now,
              uptime: state.uptime,
              status: 'Online',
            });
          }
        }
      } catch (err) {
        logger.error('Error in simulated nodes heartbeat loop:', err.message);
      }
    }, 15000);
  }

  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  getRegisteredNodes() {
    return Array.from(this.nodes.values());
  }

  getRandomNodeId() {
    const keys = Array.from(this.nodes.keys());
    return keys[Math.floor(Math.random() * keys.length)];
  }
}

const simulatedNodeManager = new SimulatedNodeManager();

module.exports = {
  simulatedNodeManager,
  SIMULATED_NODES_CONFIG,
};
