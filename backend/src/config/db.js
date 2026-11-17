const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('./env');
const logger = require('../utils/logger');

let memoryServer = null;

const seedInitialData = async () => {
  try {
    const User = require('../models/User');
    const Node = require('../models/Node');
    const ThreatIntelligence = require('../models/ThreatIntelligence');
    const SystemLog = require('../models/SystemLog');

    // 1. Seed Users
    const adminExists = await User.findOne({ email: 'admin@cybershield.io' });
    if (!adminExists) {
      const adminHash = await bcrypt.hash('Admin@123456', 10);
      await User.create({
        name: 'Chief Security Officer',
        email: 'admin@cybershield.io',
        passwordHash: adminHash,
        role: 'admin',
      });
      const analystHash = await bcrypt.hash('Analyst@123456', 10);
      await User.create({
        name: 'SOC Lead Analyst',
        email: 'analyst@cybershield.io',
        passwordHash: analystHash,
        role: 'analyst',
      });
      logger.info('Default SOC users initialized (admin@cybershield.io / Admin@123456)');
    }

    // 2. Seed Baseline Threat Intelligence
    const countTI = await ThreatIntelligence.countDocuments();
    if (countTI === 0) {
      const initialIOCs = [
        {
          indicatorType: 'IP',
          indicatorValue: '198.51.100.45',
          confidence: 95,
          severity: 'Critical',
          source: 'EmergingThreats Blacklist',
          description: 'Active Mirai Botnet C2 Controller',
          detectionCount: 12,
        },
        {
          indicatorType: 'IP',
          indicatorValue: '203.0.113.19',
          confidence: 88,
          severity: 'High',
          source: 'AbuseIPDB Feed',
          description: 'High-frequency aggressive SSH brute force scanner',
          detectionCount: 28,
        },
        {
          indicatorType: 'IP',
          indicatorValue: '185.220.101.5',
          confidence: 75,
          severity: 'Medium',
          source: 'Tor Exit Node Feed',
          description: 'Public Tor Exit Node utilized for anonymized reconnaissance',
          detectionCount: 5,
        },
        {
          indicatorType: 'HASH_SHA256',
          indicatorValue: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          confidence: 90,
          severity: 'High',
          source: 'VirusTotal Test Hash',
          description: 'Known EICAR / Test Ransomware Payload signature',
          detectionCount: 2,
        },
        {
          indicatorType: 'DOMAIN',
          indicatorValue: 'c2-beacon-malicious.org',
          confidence: 92,
          severity: 'Critical',
          source: 'PhishTank Feed',
          description: 'Credential Harvesting & Exfiltration Endpoint',
          detectionCount: 4,
        }
      ];
      await ThreatIntelligence.insertMany(initialIOCs);
      logger.info('Baseline threat intelligence IOCs seeded successfully');
    }

    // 3. Seed Monitoring Nodes if empty
    const nodeCount = await Node.countDocuments();
    if (nodeCount === 0) {
      const initialNodes = [
        {
          nodeId: 'node-alpha-edge',
          hostname: 'soc-edge-us-east',
          ipAddress: '10.0.10.15',
          operatingSystem: 'Ubuntu 22.04 LTS (x86_64)',
          agentVersion: '1.2.0',
          apiKey: 'key-alpha-9901',
          status: 'Online',
          lastHeartbeat: new Date(),
          uptime: 86400,
          eventsCount: 42,
          alertsCount: 3,
        },
        {
          nodeId: 'node-beta-dmz',
          hostname: 'soc-dmz-gateway-eu',
          ipAddress: '10.0.20.22',
          operatingSystem: 'Debian 12 (Kernel 6.1)',
          agentVersion: '1.2.0',
          apiKey: 'key-beta-9902',
          status: 'Online',
          lastHeartbeat: new Date(),
          uptime: 172800,
          eventsCount: 95,
          alertsCount: 7,
        },
        {
          nodeId: 'node-gamma-corp',
          hostname: 'soc-internal-core-ap',
          ipAddress: '10.0.30.8',
          operatingSystem: 'Red Hat Enterprise Linux 9',
          agentVersion: '1.2.0',
          apiKey: 'key-gamma-9903',
          status: 'Online',
          lastHeartbeat: new Date(),
          uptime: 43200,
          eventsCount: 18,
          alertsCount: 1,
        }
      ];
      await Node.insertMany(initialNodes);
      logger.info('Default monitoring nodes registered');
    }

    // 4. Initial System Log
    await SystemLog.create({
      logType: 'SERVER_INFO',
      nodeId: 'CENTRAL_SERVER',
      message: 'CyberShield Central Backend initialized and database connected',
      level: 'INFO',
      details: { environment: env.NODE_ENV, port: env.PORT },
    });

  } catch (err) {
    logger.error('Error seeding initial data:', err.message);
  }
};

const connectDB = async () => {
  // First attempt: Connect to configured external MONGO_URI with 3s timeout
  try {
    logger.info(`Attempting connection to MongoDB at: ${env.MONGO_URI}`);
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    logger.success('Connected to external MongoDB database');
    await seedInitialData();
    return;
  } catch (err) {
    logger.warn(`External MongoDB not available (${err.message}). Starting embedded high-performance MongoMemoryServer...`);
  }

  // Fallback: Start MongoMemoryServer
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const uri = memoryServer.getUri();
    await mongoose.connect(uri);
    logger.success(`Connected to Embedded MongoMemoryServer at: ${uri}`);
    await seedInitialData();
  } catch (memErr) {
    logger.error('Failed to start MongoMemoryServer fallback:', memErr.message);
    throw memErr;
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
};

module.exports = { connectDB, disconnectDB };
