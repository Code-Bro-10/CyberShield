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
const securityDefenseRoutes = require('./routes/securityDefenseRoutes');

const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const env = require('./config/env');

const app = express();

// Security and utility middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global API rate limit
app.use('/api', apiLimiter);
app.use('/auth', apiLimiter);

// Root & Health check endpoints
app.head('/', (req, res) => res.status(200).end());
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    system: 'CyberShield Central SOC Server',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Root landing page
const fs = require('fs');
const path = require('path');
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

app.get('/', (req, res, next) => {
  if (fs.existsSync(path.join(frontendDistPath, 'index.html'))) {
    return res.sendFile(path.join(frontendDistPath, 'index.html'));
  }
  return res.json({
    status: 'HEALTHY',
    system: 'CyberShield Distributed Central SOC API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    message: 'Backend is active and accepting distributed telemetry.',
    endpoints: {
      health: '/health',
      auth: '/api/auth (or /auth)',
      nodes: '/api/nodes (or /nodes)',
      events: '/api/events (or /events)',
      alerts: '/api/alerts (or /alerts)',
      incidents: '/api/incidents (or /incidents)',
      threatIntel: '/api/threat-intelligence',
      analytics: '/api/analytics',
      security: '/api/security (or /security)',
      ml: '/api/ml',
      simulation: '/api/simulation',
      logs: '/api/logs',
    }
  });
});

// Mount modular REST routes (support both /api/* and direct /* prefixes)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/nodes', nodeRoutes);
app.use('/nodes', nodeRoutes);

app.use('/api/events', eventRoutes);
app.use('/events', eventRoutes);

app.use('/api/alerts', alertRoutes);
app.use('/alerts', alertRoutes);

app.use('/api/incidents', incidentRoutes);
app.use('/incidents', incidentRoutes);

app.use('/api/threat-intelligence', threatIntelRoutes);
app.use('/threat-intelligence', threatIntelRoutes);

app.use('/api/analytics', analyticsRoutes);
app.use('/analytics', analyticsRoutes);

app.use('/api/ml', mlRoutes);
app.use('/ml', mlRoutes);

app.use('/api/simulation', simulationRoutes);
app.use('/simulation', simulationRoutes);

app.use('/api/logs', systemLogRoutes);
app.use('/logs', systemLogRoutes);

app.use('/api/settings', settingsRoutes);
app.use('/settings', settingsRoutes);

app.use('/api/security', securityDefenseRoutes);
app.use('/security', securityDefenseRoutes);

// Serve frontend static build in production or when dist folder exists
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (
      req.originalUrl.startsWith('/api') ||
      req.originalUrl.startsWith('/auth') ||
      req.originalUrl.startsWith('/security') ||
      req.originalUrl.startsWith('/socket.io') ||
      req.originalUrl.startsWith('/health')
    ) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Error handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;
