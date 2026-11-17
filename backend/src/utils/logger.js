const formatTime = () => new Date().toISOString();

const logger = {
  info: (msg, meta = '') => {
    console.log(`\x1b[36m[INFO]\x1b[0m [${formatTime()}] ${msg}`, meta ? meta : '');
  },
  warn: (msg, meta = '') => {
    console.warn(`\x1b[33m[WARN]\x1b[0m [${formatTime()}] ${msg}`, meta ? meta : '');
  },
  error: (msg, meta = '') => {
    console.error(`\x1b[31m[ERROR]\x1b[0m [${formatTime()}] ${msg}`, meta ? meta : '');
  },
  success: (msg, meta = '') => {
    console.log(`\x1b[32m[SUCCESS]\x1b[0m [${formatTime()}] ${msg}`, meta ? meta : '');
  },
  debug: (msg, meta = '') => {
    if (process.env.DEBUG || process.env.NODE_ENV !== 'production') {
      console.log(`\x1b[35m[DEBUG]\x1b[0m [${formatTime()}] ${msg}`, meta ? meta : '');
    }
  },
  node: (nodeId, msg) => {
    console.log(`\x1b[34m[NODE:${nodeId}]\x1b[0m [${formatTime()}] ${msg}`);
  },
  alert: (level, msg) => {
    const color = level === 'Critical' ? '\x1b[41m\x1b[37m' : '\x1b[31m';
    console.log(`${color}[ALERT:${level.toUpperCase()}]\x1b[0m [${formatTime()}] ${msg}`);
  }
};

module.exports = logger;
