const ThreatIntelligence = require('../../models/ThreatIntelligence');

// In-memory cache for fast lookup with TTL
const ipThreatCache = new Map();
let lastCacheRefresh = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

const refreshCacheIfNeeded = async () => {
  const now = Date.now();
  if (now - lastCacheRefresh > CACHE_TTL_MS || ipThreatCache.size === 0) {
    try {
      const records = await ThreatIntelligence.find({ indicatorType: 'IP' }).lean();
      ipThreatCache.clear();
      for (const rec of records) {
        ipThreatCache.set(rec.indicatorValue, rec);
      }
      lastCacheRefresh = now;
    } catch {
      // ignore
    }
  }
};

const suspiciousIpDetector = {
  name: 'Threat Intel IP Detector',
  category: 'Suspicious IP',

  evaluate: async (event) => {
    const sourceIP = event.sourceIP;
    if (!sourceIP) return null;

    await refreshCacheIfNeeded();

    let matchedIntel = ipThreatCache.get(sourceIP);

    // If not in cache, fallback to direct DB lookup
    if (!matchedIntel) {
      try {
        matchedIntel = await ThreatIntelligence.findOne({ indicatorType: 'IP', indicatorValue: sourceIP }).lean();
        if (matchedIntel) {
          ipThreatCache.set(sourceIP, matchedIntel);
        }
      } catch {
        // ignore
      }
    }

    if (matchedIntel) {
      // Increment detection count in background
      ThreatIntelligence.updateOne(
        { indicatorType: 'IP', indicatorValue: sourceIP },
        { 
          $inc: { detectionCount: 1 }, 
          $set: { lastSeen: new Date() },
          $addToSet: { associatedNodes: event.nodeId }
        }
      ).exec().catch(() => {});

      return {
        matched: true,
        category: 'Suspicious IP',
        severity: matchedIntel.severity || 'High',
        confidenceScore: (matchedIntel.confidence || 85) / 100,
        description: `Traffic originating from known malicious IP (${sourceIP}). Source: ${matchedIntel.source}. Details: ${matchedIntel.description}`,
        metadata: {
          indicatorType: 'IP',
          source: matchedIntel.source,
          feedConfidence: matchedIntel.confidence,
          threatIntelId: matchedIntel._id,
        }
      };
    }

    return null;
  },

  // Manual cache invalidate
  invalidateCache: () => {
    lastCacheRefresh = 0;
    ipThreatCache.clear();
  }
};

module.exports = suspiciousIpDetector;
