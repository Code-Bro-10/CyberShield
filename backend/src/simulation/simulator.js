const { v4: uuidv4 } = require('uuid');
const { publishSecurityEvent } = require('../queues/eventStreamQueue');
const { simulatedNodeManager } = require('./simulatedNodes');
const logger = require('../utils/logger');
const { getSocketIO } = require('../sockets/socketHandler');

const COMMON_PORTS = [21, 22, 23, 25, 53, 80, 110, 135, 139, 443, 445, 1433, 3306, 3389, 8080];

class AttackSimulator {
  constructor() {
    this.status = 'STOPPED'; // 'RUNNING', 'PAUSED', 'STOPPED'
    this.intervalId = null;
    this.config = {
      targetNode: 'all', // 'all' or specific nodeId
      scenario: 'all', // 'all' or 'brute_force', 'port_scan', 'high_traffic_dos', 'suspicious_ip', 'network_anomaly', 'normal_traffic'
      frequencySec: 2, // Every 2 seconds
    };
    this.generatedCount = 0;
    this.recentEvents = [];

    // State counters for realistic sequences
    this.portScanCounter = 0;
    this.bruteForceCounter = 0;
  }

  getStatus() {
    return {
      status: this.status,
      config: this.config,
      generatedCount: this.generatedCount,
      recentEvents: this.recentEvents.slice(0, 15),
    };
  }

  start(options = {}) {
    if (this.status === 'RUNNING') return this.getStatus();

    this.config = { ...this.config, ...options };
    this.status = 'RUNNING';

    const intervalMs = Math.max(500, (this.config.frequencySec || 2) * 1000);

    if (this.intervalId) clearInterval(this.intervalId);

    this.intervalId = setInterval(() => {
      if (this.status === 'RUNNING') {
        this.generateTick();
      }
    }, intervalMs);

    logger.info(`Synthetic attack simulation started (Frequency: ${intervalMs}ms, Node: ${this.config.targetNode}, Scenario: ${this.config.scenario})`);
    this.broadcastStatus();
    return this.getStatus();
  }

  pause() {
    if (this.status === 'RUNNING') {
      this.status = 'PAUSED';
      logger.info('Synthetic attack simulation paused.');
      this.broadcastStatus();
    }
    return this.getStatus();
  }

  resume() {
    if (this.status === 'PAUSED') {
      this.status = 'RUNNING';
      logger.info('Synthetic attack simulation resumed.');
      this.broadcastStatus();
    }
    return this.getStatus();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.status = 'STOPPED';
    logger.info('Synthetic attack simulation stopped.');
    this.broadcastStatus();
    return this.getStatus();
  }

  broadcastStatus() {
    const io = getSocketIO();
    if (io) {
      io.emit('simulation_status', this.getStatus());
    }
  }

  async generateTick() {
    try {
      const scenario = this.config.scenario === 'all'
        ? this.pickRandomScenario()
        : this.config.scenario;

      const event = await this.createSyntheticEvent(scenario);
      if (event) {
        await publishSecurityEvent(event);
        this.generatedCount += 1;
        this.recentEvents.unshift({
          eventId: event.eventId,
          nodeId: event.nodeId,
          eventType: event.eventType,
          sourceIP: event.sourceIP,
          destinationPort: event.destinationPort,
          severity: event.severity,
          scenario,
          timestamp: new Date(),
        });
        if (this.recentEvents.length > 50) this.recentEvents.pop();
        this.broadcastStatus();
      }
    } catch (err) {
      logger.error('Error generating simulation event:', err.message);
    }
  }

  // Trigger one-off synthetic event immediately (for UI quick-test buttons)
  async triggerScenario(scenarioName, targetNode = null) {
    const event = await this.createSyntheticEvent(scenarioName, targetNode);
    if (event) {
      await publishSecurityEvent(event);
      this.generatedCount += 1;
      this.recentEvents.unshift({
        eventId: event.eventId,
        nodeId: event.nodeId,
        eventType: event.eventType,
        sourceIP: event.sourceIP,
        destinationPort: event.destinationPort,
        severity: event.severity,
        scenario: scenarioName,
        timestamp: new Date(),
      });
      this.broadcastStatus();
    }
    return event;
  }

  pickRandomScenario() {
    const scenarios = [
      'normal_traffic',
      'normal_traffic',
      'brute_force',
      'port_scan',
      'high_traffic_dos',
      'suspicious_ip',
      'network_anomaly'
    ];
    return scenarios[Math.floor(Math.random() * scenarios.length)];
  }

  getNodeId(overrideNode = null) {
    if (overrideNode) return overrideNode;
    if (this.config.targetNode && this.config.targetNode !== 'all') {
      return this.config.targetNode;
    }
    return simulatedNodeManager.getRandomNodeId();
  }

  async createSyntheticEvent(scenario, overrideNode = null) {
    const nodeId = this.getNodeId(overrideNode);
    const eventId = `SIM-${uuidv4()}`;

    switch (scenario) {
      case 'brute_force': {
        this.bruteForceCounter += 1;
        return {
          eventId,
          nodeId,
          eventType: 'SSH_AUTH_FAILURE',
          sourceIP: '203.0.113.88',
          destinationIP: '10.0.10.15',
          destinationPort: 22,
          protocol: 'TCP',
          severity: 'Medium',
          confidence: 0.85,
          detectionMethod: 'RULE_BASED',
          rawPayload: { user: 'root', method: 'password', attempt: this.bruteForceCounter },
          metadata: {
            authStatus: 'failed',
            service: 'sshd',
            targetUser: 'root',
            clientBanner: 'SSH-2.0-libssh_0.9.0'
          }
        };
      }

      case 'port_scan': {
        this.portScanCounter = (this.portScanCounter + 1) % COMMON_PORTS.length;
        const targetPort = COMMON_PORTS[this.portScanCounter];
        return {
          eventId,
          nodeId,
          eventType: 'PORT_SCAN_PROBE',
          sourceIP: '198.51.100.114',
          destinationIP: '10.0.20.22',
          destinationPort: targetPort,
          protocol: 'TCP',
          severity: 'Low',
          confidence: 0.70,
          detectionMethod: 'RULE_BASED',
          metadata: {
            flags: 'SYN',
            windowSize: 1024,
            ttl: 54,
            probedPort: targetPort,
          }
        };
      }

      case 'high_traffic_dos': {
        return {
          eventId,
          nodeId,
          eventType: 'TRAFFIC_SPIKE',
          sourceIP: '192.0.2.77',
          destinationIP: '10.0.10.15',
          destinationPort: 80,
          protocol: 'TCP',
          severity: 'High',
          confidence: 0.90,
          detectionMethod: 'RULE_BASED',
          metadata: {
            requestRate: 85,
            httpMethod: 'GET',
            uri: '/api/v1/search?q=query_flood',
            userAgent: 'Mozilla/5.0 (Hydra-Flooder/2.4)'
          }
        };
      }

      case 'suspicious_ip': {
        return {
          eventId,
          nodeId,
          eventType: 'SUSPICIOUS_IP_CONN',
          sourceIP: '198.51.100.45', // Mirai Botnet C2 from baseline Threat Intel
          destinationIP: '10.0.30.8',
          destinationPort: 443,
          protocol: 'TCP',
          severity: 'Critical',
          confidence: 0.95,
          detectionMethod: 'THREAT_INTEL',
          metadata: {
            matchedFeed: 'EmergingThreats Blacklist',
            c2Indicator: 'Active Mirai Botnet C2 Controller'
          }
        };
      }

      case 'network_anomaly': {
        return {
          eventId,
          nodeId,
          eventType: 'NETWORK_ANOMALY',
          sourceIP: '172.16.4.89',
          destinationIP: '10.0.10.15',
          destinationPort: 8443,
          protocol: 'TCP',
          severity: 'High',
          confidence: 0.88,
          detectionMethod: 'MACHINE_LEARNING',
          metadata: {
            isAnomaly: true,
            anomalyScore: 0.842,
            flowDuration: 120,
            packetsPerSec: 6400,
            bytesPerSec: 850000,
            synFlag: 1,
            mlAlgorithm: 'IsolationForest'
          }
        };
      }

      case 'normal_traffic':
      default: {
        const destPort = [80, 443, 53][Math.floor(Math.random() * 3)];
        return {
          eventId,
          nodeId,
          eventType: 'NORMAL_HTTP_FLOW',
          sourceIP: `10.0.1.${Math.floor(Math.random() * 80 + 10)}`,
          destinationIP: '1.1.1.1',
          destinationPort: destPort,
          protocol: destPort === 53 ? 'UDP' : 'TCP',
          severity: 'Informational',
          confidence: 0.1,
          detectionMethod: 'RULE_BASED',
          metadata: {
            status: 'established',
            bytesTransferred: Math.floor(Math.random() * 5000 + 400),
            direction: 'outbound'
          }
        };
      }
    }
  }
}

const simulator = new AttackSimulator();

module.exports = {
  simulator,
  AttackSimulator,
};
