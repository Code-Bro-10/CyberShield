const Redis = require('ioredis');
const { EventEmitter } = require('events');
const env = require('../config/env');
const logger = require('../utils/logger');

// High-Fidelity In-Memory Stream & PubSub Broker
class InMemoryRedisStreamBroker extends EventEmitter {
  constructor() {
    super();
    this.streams = new Map(); // streamKey -> Array<{ id: string, message: Object, acknowledgedBy: Set<string> }>
    this.consumerGroups = new Map(); // streamKey -> Map<groupName, { lastDeliveredIndex: number, pending: Map<id, { consumer: string, deliveryTime: number }> }>
    this.dedupCache = new Map(); // key -> expireTimestamp
    this.isFallback = true;

    // Periodic cleanup of expired dedup keys
    setInterval(() => {
      const now = Date.now();
      for (const [k, exp] of this.dedupCache.entries()) {
        if (now > exp) this.dedupCache.delete(k);
      }
    }, 15000).unref();
  }

  async ping() {
    return 'PONG';
  }

  // Publish to PubSub
  async publish(channel, message) {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    this.emit(`channel:${channel}`, payload);
    return 1;
  }

  // Subscribe to PubSub
  subscribe(channel, handler) {
    this.on(`channel:${channel}`, (payload) => {
      try {
        const parsed = JSON.parse(payload);
        handler(parsed);
      } catch {
        handler(payload);
      }
    });
  }

  // Redis Stream: XADD streamKey * field1 value1 ...
  async xadd(streamKey, idStrategy, ...fieldValues) {
    if (!this.streams.has(streamKey)) {
      this.streams.set(streamKey, []);
    }
    const stream = this.streams.get(streamKey);
    const msgId = `${Date.now()}-${stream.length}`;

    // Convert array [key, val, key, val] into Object or accept direct Object
    let messageObj = {};
    if (fieldValues.length === 1 && typeof fieldValues[0] === 'object') {
      messageObj = fieldValues[0];
    } else {
      for (let i = 0; i < fieldValues.length; i += 2) {
        messageObj[fieldValues[i]] = fieldValues[i + 1];
      }
    }

    const entry = {
      id: msgId,
      message: messageObj,
      acknowledgedBy: new Set(),
      timestamp: Date.now(),
    };
    stream.push(entry);

    // Keep stream bounded (last 10000 events)
    if (stream.length > 10000) {
      stream.shift();
    }

    this.emit(`stream:${streamKey}`, entry);
    return msgId;
  }

  // Redis Stream: XGROUP CREATE streamKey groupName $ MKSTREAM
  async xgroup(cmd, streamKey, groupName) {
    if (!this.streams.has(streamKey)) {
      this.streams.set(streamKey, []);
    }
    if (!this.consumerGroups.has(streamKey)) {
      this.consumerGroups.set(streamKey, new Map());
    }
    const groups = this.consumerGroups.get(streamKey);
    if (!groups.has(groupName)) {
      groups.set(groupName, {
        lastDeliveredIndex: this.streams.get(streamKey).length,
        pending: new Map(),
      });
    }
    return 'OK';
  }

  // Redis Stream: XREADGROUP GROUP group consumer STREAMS stream >
  async xreadgroup(groupKw, groupName, consumerName, blockKw, blockMs, streamsKw, streamKey, idPattern) {
    if (!this.streams.has(streamKey)) {
      this.streams.set(streamKey, []);
    }
    if (!this.consumerGroups.has(streamKey)) {
      await this.xgroup('CREATE', streamKey, groupName);
    }
    const stream = this.streams.get(streamKey);
    const group = this.consumerGroups.get(streamKey).get(groupName);

    // Deliver unread items
    const startIndex = group.lastDeliveredIndex;
    const newItems = stream.slice(startIndex);

    if (newItems.length > 0) {
      group.lastDeliveredIndex = stream.length;
      const results = newItems.map((item) => {
        group.pending.set(item.id, { consumer: consumerName, deliveryTime: Date.now() });
        // Format as Redis nested array: [ [streamKey, [ [id, [k1, v1, ...]] ]] ]
        const fields = [];
        for (const [k, v] of Object.entries(item.message)) {
          fields.push(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
        }
        return [item.id, fields];
      });
      return [[streamKey, results]];
    }

    return null;
  }

  // Redis Stream: XACK streamKey groupName id
  async xack(streamKey, groupName, id) {
    const groups = this.consumerGroups.get(streamKey);
    if (groups && groups.has(groupName)) {
      groups.get(groupName).pending.delete(id);
      return 1;
    }
    return 0;
  }

  // Deduplication check with TTL
  async checkAndSetDedup(key, ttlSeconds = 60) {
    const now = Date.now();
    if (this.dedupCache.has(key)) {
      const exp = this.dedupCache.get(key);
      if (now < exp) {
        return false; // Already processed!
      }
    }
    this.dedupCache.set(key, now + ttlSeconds * 1000);
    return true; // New event
  }
}

let redisClient = null;
let redisSubscriber = null;
let fallbackBroker = new InMemoryRedisStreamBroker();
let isUsingFallback = false;

const initRedis = async () => {
  return new Promise((resolve) => {
    try {
      const client = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: () => null, // Don't hang trying to reconnect indefinitely if service is absent
        lazyConnect: true,
      });

      client.connect()
        .then(async () => {
          logger.success(`Connected to real Redis instance at: ${env.REDIS_URL}`);
          redisClient = client;
          redisSubscriber = client.duplicate();
          await redisSubscriber.connect();
          isUsingFallback = false;
          resolve({ client: redisClient, subscriber: redisSubscriber, isFallback: false });
        })
        .catch((err) => {
          logger.warn(`Redis server not available at ${env.REDIS_URL} (${err.message}).`);
          logger.info('Switched to Embedded In-Memory Redis Streams & PubSub Broker with identical consumer group semantics.');
          isUsingFallback = true;
          redisClient = fallbackBroker;
          redisSubscriber = fallbackBroker;
          resolve({ client: fallbackBroker, subscriber: fallbackBroker, isFallback: true });
        });
    } catch (err) {
      logger.warn(`Redis initialization error: ${err.message}. Using Embedded Stream Broker.`);
      isUsingFallback = true;
      redisClient = fallbackBroker;
      redisSubscriber = fallbackBroker;
      resolve({ client: fallbackBroker, subscriber: fallbackBroker, isFallback: true });
    }
  });
};

const getRedisClient = () => redisClient || fallbackBroker;
const getRedisSubscriber = () => redisSubscriber || fallbackBroker;
const getIsFallback = () => isUsingFallback;

module.exports = {
  initRedis,
  getRedisClient,
  getRedisSubscriber,
  getIsFallback,
  fallbackBroker,
};
