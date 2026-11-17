// Sliding window state for port scan detection
// key: `${sourceIP}->${destinationIP}`
const portScanTracker = new Map();

const SCAN_WINDOW_MS = 30000; // 30 seconds
const UNIQUE_PORTS_THRESHOLD = 8;

const portScanDetector = {
  name: 'Port Scan Detector',
  category: 'Port Scan',

  evaluate: async (event) => {
    const isConnAttempt =
      event.eventType === 'PORT_SCAN_PROBE' ||
      event.eventType === 'SYN_PACKET' ||
      event.eventType === 'CONNECTION_ATTEMPT' ||
      event.destinationPort != null;

    if (!isConnAttempt || !event.destinationPort) return null;

    const sourceIP = event.sourceIP;
    const destIP = event.destinationIP || 'broadcast';
    const key = `${sourceIP}->${destIP}`;
    const now = Date.now();
    const port = Number(event.destinationPort);

    if (!portScanTracker.has(key)) {
      portScanTracker.set(key, []);
    }

    const records = portScanTracker.get(key);
    records.push({ port, timestamp: now });

    // Filter window
    const activeRecords = records.filter(r => (now - r.timestamp) <= SCAN_WINDOW_MS);
    portScanTracker.set(key, activeRecords);

    // Compute unique ports
    const uniquePorts = new Set(activeRecords.map(r => r.port));

    if (uniquePorts.size >= UNIQUE_PORTS_THRESHOLD) {
      const portCount = uniquePorts.size;
      return {
        matched: true,
        category: 'Port Scan',
        severity: portCount >= 20 ? 'Critical' : 'High',
        confidenceScore: Math.min(0.98, 0.70 + (portCount * 0.02)),
        description: `Horizontal/Vertical Port Scan detected from ${sourceIP}. Probed ${portCount} unique ports on ${destIP} within ${SCAN_WINDOW_MS / 1000}s.`,
        metadata: {
          uniquePortsCount: portCount,
          probedPortsSample: Array.from(uniquePorts).slice(0, 10),
          windowSeconds: SCAN_WINDOW_MS / 1000,
        }
      };
    }

    return null;
  },

  reset: () => portScanTracker.clear(),
};

module.exports = portScanDetector;
