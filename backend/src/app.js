const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const nodeRoutes = require('./routes/nodeRoutes');
const eventRoutes = require('./routes/eventRoutes');
const alertRoutes = require('./routes/alertRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const threatIntelRoutes = require('./routes/threatIntelRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const mlRoutes = require('./routes/mlRoutes');
const simulationRoutes = require('./routes/simulationRoutes');
const systemLogRoutes = require('./routes/systemLogRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const env = require('./config/env');

const app = express();

// Security and utility middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global API rate limit
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    system: 'CyberShield Central SOC Server',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount modular REST routes
app.use('/api/auth', authRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/threat-intelligence', threatIntelRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/logs', systemLogRoutes);
app.use('/api/settings', settingsRoutes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;
