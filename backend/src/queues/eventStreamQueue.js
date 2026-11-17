const { getRedisClient, getIsFallback, fallbackBroker } = require('./redisClient');
const logger = require('../utils/logger');

const STREAM_NAME = 'cybershield:events:stream';
const CONSUMER_GROUP = 'cybershield:processors';
const CONSUMER_NAME = `processor-${process.pid}`;

let isRunning = false;
let eventHandlerCallback = null;

// Initialize Stream and Consumer Group
const setupEventStream = async () => {
  const client = getRedisClient();
  const isFallback = getIsFallback();

  try {
    if (isFallback) {
      await fallbackBroker.xgroup('CREATE', STREAM_NAME, CONSUMER_GROUP);
    } else {
      try {
        await client.xgroup('CREATE', STREAM_NAME, CONSUMER_GROUP, '$', 'MKSTREAM');
        logger.info(`Redis Stream consumer group '${CONSUMER_GROUP}' created.`);
      } catch (err) {
        if (!err.message.includes('BUSYGROUP')) {
          logger.warn(`Redis xgroup setup warning: ${err.message}`);
        }
      }
    }
  } catch (err) {
    logger.error('Failed to setup Redis event stream:', err.message);
  }
};

// Publish an incoming event into Redis Stream
const publishSecurityEvent = async (event) => {
  const client = getRedisClient();
  const isFallback = getIsFallback();

  try {
    const serializedPayload = JSON.stringify(event);

    if (isFallback) {
      const msgId = await fallbackBroker.xadd(STREAM_NAME, '*', 'eventId', event.eventId, 'payload', serializedPayload);
      return msgId;
    } else {
      const msgId = await client.xadd(STREAM_NAME, '*', 'eventId', event.eventId, 'payload', serializedPayload);
      return msgId;
    }
  } catch (err) {
    logger.error(`Failed to publish event ${event.eventId} to Redis stream:`, err.message);
    throw err;
  }
};

// Check for event deduplication
const isDuplicateEvent = async (eventId, ttlSeconds = 120) => {
  const client = getRedisClient();
  const isFallback = getIsFallback();
  const dedupKey = `dedup:event:${eventId}`;

  try {
    if (isFallback) {
      const isNew = await fallbackBroker.checkAndSetDedup(dedupKey, ttlSeconds);
      return !isNew;
    } else {
      // SET key val EX ttl NX returns 'OK' if key did not exist, null if it existed
      const result = await client.set(dedupKey, '1', 'EX', ttlSeconds, 'NX');
      return result === null; // True if already existed (duplicate)
    }
  } catch (err) {
    logger.warn(`Deduplication check error: ${err.message}`);
    return false;
  }
};

// Start Stream Consumer Worker
const startStreamConsumer = async (onEventReceived) => {
  if (isRunning) return;
  isRunning = true;
  eventHandlerCallback = onEventReceived;

  await setupEventStream();
  logger.success(`Redis Stream Consumer started on '${STREAM_NAME}' as '${CONSUMER_NAME}'`);

  const pollLoop = async () => {
    while (isRunning) {
      try {
        const client = getRedisClient();
        const isFallback = getIsFallback();

        let entries = null;
        if (isFallback) {
          entries = await fallbackBroker.xreadgroup(
            'GROUP', CONSUMER_GROUP, CONSUMER_NAME,
            'BLOCK', 1000,
            'STREAMS', STREAM_NAME, '>'
          );
        } else {
          entries = await client.xreadgroup(
            'GROUP', CONSUMER_GROUP, CONSUMER_NAME,
            'BLOCK', 1000,
            'COUNT', 10,
            'STREAMS', STREAM_NAME, '>'
          );
        }

        if (entries && entries.length > 0) {
          for (const streamEntry of entries) {
            const [stream, messages] = streamEntry;
            for (const msg of messages) {
              const [id, fields] = msg;
              let eventData = null;

              try {
                // Parse fields
                for (let i = 0; i < fields.length; i += 2) {
                  if (fields[i] === 'payload') {
                    eventData = typeof fields[i + 1] === 'string' ? JSON.parse(fields[i + 1]) : fields[i + 1];
                  }
                }

                if (eventData && eventHandlerCallback) {
                  // Process the event
                  await eventHandlerCallback(eventData);
                }

                // Acknowledge the message
                if (isFallback) {
                  await fallbackBroker.xack(STREAM_NAME, CONSUMER_GROUP, id);
                } else {
                  await client.xack(STREAM_NAME, CONSUMER_GROUP, id);
                }
              } catch (msgErr) {
                logger.error(`Error processing stream message ${id}:`, msgErr.message);
              }
            }
          }
        }
      } catch (loopErr) {
        if (isRunning) {
          logger.error('Stream consumer loop error:', loopErr.message);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      // Small pause to prevent CPU pegging
      await new Promise((r) => setTimeout(r, 100));
    }
  };

  pollLoop().catch((err) => {
    logger.error('Fatal stream consumer crash:', err.message);
  });
};

const stopStreamConsumer = () => {
  isRunning = false;
};

module.exports = {
  STREAM_NAME,
  CONSUMER_GROUP,
  publishSecurityEvent,
  isDuplicateEvent,
  startStreamConsumer,
  stopStreamConsumer,
};
