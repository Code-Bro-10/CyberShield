const User = require('../models/User');
const env = require('../config/env');

let runtimeSettings = {
  heartbeatTimeoutSeconds: env.NODE_HEARTBEAT_TIMEOUT_MS / 1000,
  bruteForceThreshold: 5,
  bruteForceWindowSeconds: 60,
  portScanUniquePortsThreshold: 8,
  portScanWindowSeconds: 30,
  dosThresholdEvents: 25,
  dosWindowSeconds: 10,
  mlAnomalyScoreThreshold: 0.65,
  autoIncidentCreation: true,
  alertSoundEnabled: true,
  ruleToggles: {
    bruteForce: true,
    portScan: true,
    dosTraffic: true,
    suspiciousIp: true,
    malwareHash: true,
    networkAnomaly: true,
  }
};

const getSettings = async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });

    return res.json({
      success: true,
      settings: runtimeSettings,
      users,
      environment: {
        nodeEnv: env.NODE_ENV,
        port: env.PORT,
        mongoUri: env.MONGO_URI ? env.MONGO_URI.replace(/\/\/.*@/, '//***@') : 'embedded',
        redisUrl: env.REDIS_URL,
        mlServiceUrl: env.ML_SERVICE_URL,
      }
    });
  } catch (err) {
    next(err);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const updates = req.body;
    runtimeSettings = {
      ...runtimeSettings,
      ...updates,
      ruleToggles: {
        ...runtimeSettings.ruleToggles,
        ...(updates.ruleToggles || {}),
      }
    };

    if (updates.heartbeatTimeoutSeconds) {
      env.NODE_HEARTBEAT_TIMEOUT_MS = updates.heartbeatTimeoutSeconds * 1000;
    }

    return res.json({
      success: true,
      message: 'Runtime SOC settings updated successfully',
      settings: runtimeSettings,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getRuntimeSettings: () => runtimeSettings,
};
