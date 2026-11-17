// Sliding window for DoS / High Rate Traffic
const trafficRateTracker = new Map(); // key: sourceIP -> array of timestamps

const DOS_WINDOW_MS = 10000; // 10 seconds
const DOS_THRESHOLD_EVENTS = 25; // 25+ requests in 10s from single IP (2.5 req/sec threshold for test simulation)

const dosDetector = {
  name: 'DoS Traffic Detector',
  category: 'DDoS / Traffic Anomaly',

  evaluate: async (event) => {
    const isTrafficEvent =
      event.eventType === 'TRAFFIC_SPIKE' ||
      event.eventType === 'HTTP_REQUEST_FLOOD' ||
      event.eventType === 'SYN_FLOOD' ||
      event.eventType === 'UDP_FLOOD' ||
      event.eventType === 'HIGH_RATE_CONNECTION';

    const sourceIP = event.sourceIP;
    const now = Date.now();

    if (!trafficRateTracker.has(sourceIP)) {
      trafficRateTracker.set(sourceIP, []);
    }

    const timestamps = trafficRateTracker.get(sourceIP);
    timestamps.push(now);

    const validTimestamps = timestamps.filter(t => (now - t) <= DOS_WINDOW_MS);
    trafficRateTracker.set(sourceIP, validTimestamps);

    const count = validTimestamps.length;
    const ratePerSec = (count / (DOS_WINDOW_MS / 1000)).toFixed(1);

    if (isTrafficEvent || count >= DOS_THRESHOLD_EVENTS) {
      if (count >= DOS_THRESHOLD_EVENTS) {
        return {
          matched: true,
          category: 'DDoS / Traffic Anomaly',
          severity: count >= 60 ? 'Critical' : 'High',
          confidenceScore: Math.min(0.96, 0.80 + (count * 0.005)),
          description: `Volumetric Traffic Anomaly / DoS pattern detected from ${sourceIP}. Rate: ${ratePerSec} pkts/sec (${count} events in ${DOS_WINDOW_MS / 1000}s).`,
          metadata: {
            eventCount: count,
            ratePerSec: parseFloat(ratePerSec),
            windowSeconds: DOS_WINDOW_MS / 1000,
          }
        };
      }
    }

    return null;
  },

  reset: () => trafficRateTracker.clear(),
};

module.exports = dosDetector;
