// Sliding window state for failed login attempts
// key: `${sourceIP}->${target}`
const attemptsWindow = new Map();

const BRUTE_FORCE_WINDOW_MS = 60000; // 60 seconds
const THRESHOLD_ATTEMPTS = 5;

const bruteForceDetector = {
  name: 'Brute Force Detector',
  category: 'Brute Force',

  evaluate: async (event) => {
    // Check if event signifies authentication failure
    const isAuthFailure = 
      event.eventType === 'SSH_AUTH_FAILURE' ||
      event.eventType === 'LOGIN_FAILURE' ||
      event.eventType === 'AUTH_FAILED' ||
      (event.metadata && (event.metadata.authStatus === 'failed' || event.metadata.loginResult === 'FAIL'));

    if (!isAuthFailure) return null;

    const sourceIP = event.sourceIP;
    const target = event.destinationIP || 'system';
    const key = `${sourceIP}->${target}`;
    const now = Date.now();

    if (!attemptsWindow.has(key)) {
      attemptsWindow.set(key, []);
    }

    const window = attemptsWindow.get(key);
    // Push current attempt
    window.push(now);

    // Evict timestamps outside detection window
    const validTimestamps = window.filter(t => (now - t) <= BRUTE_FORCE_WINDOW_MS);
    attemptsWindow.set(key, validTimestamps);

    if (validTimestamps.length >= THRESHOLD_ATTEMPTS) {
      const count = validTimestamps.length;
      return {
        matched: true,
        category: 'Brute Force',
        severity: count >= 10 ? 'Critical' : 'High',
        confidenceScore: Math.min(0.99, 0.75 + (count * 0.02)),
        description: `Brute force authentication attack detected from ${sourceIP}. ${count} failed attempts within ${BRUTE_FORCE_WINDOW_MS / 1000}s targeting ${target}.`,
        metadata: {
          attemptCount: count,
          windowSeconds: BRUTE_FORCE_WINDOW_MS / 1000,
          target,
        }
      };
    }

    return null;
  },

  // Reset helper for testing
  reset: () => attemptsWindow.clear(),
};

module.exports = bruteForceDetector;
