const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const { initRedis } = require('../src/queues/redisClient');
const { startStreamConsumer, stopStreamConsumer } = require('../src/queues/eventStreamQueue');
const { processEvent } = require('../src/services/eventCorrelationService');
const { simulatedNodeManager } = require('../src/simulation/simulatedNodes');

let authToken = '';
let testNodeKey = '';

test.before(async () => {
  process.env.NODE_ENV = 'test';
  await connectDB();
  await initRedis();
  await startStreamConsumer(processEvent);
  await simulatedNodeManager.initialize();
});

test.after(async () => {
  stopStreamConsumer();
  simulatedNodeManager.stop();
  await disconnectDB();
});

test('1. Health Check Endpoint', async () => {
  const res = await request(app).get('/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'HEALTHY');
});

test('2. User Registration and Login', async () => {
  const uniqueEmail = `test_soc_${Date.now()}@cybershield.io`;
  const regRes = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Security Test Operator',
      email: uniqueEmail,
      password: 'Password@123',
      role: 'analyst',
    });

  assert.strictEqual(regRes.status, 201);
  assert.ok(regRes.body.token);

  // Login
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: uniqueEmail,
      password: 'Password@123',
    });

  assert.strictEqual(loginRes.status, 200);
  assert.ok(loginRes.body.token);
  authToken = loginRes.body.token;

  // Me
  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${authToken}`);

  assert.strictEqual(meRes.status, 200);
  assert.strictEqual(meRes.body.user.email, uniqueEmail);
});

test('3. Node Registration and Heartbeat', async () => {
  const regRes = await request(app)
    .post('/api/nodes/register')
    .send({
      nodeId: 'test-node-testrunner',
      hostname: 'test-runner-box',
      ipAddress: '192.168.10.99',
      operatingSystem: 'Linux TestOS',
      agentVersion: '1.2.0',
    });

  assert.strictEqual(regRes.status, 201);
  assert.ok(regRes.body.node.apiKey);
  testNodeKey = regRes.body.node.apiKey;

  // Heartbeat
  const hbRes = await request(app)
    .post('/api/nodes/heartbeat')
    .set('x-agent-key', testNodeKey)
    .send({
      nodeId: 'test-node-testrunner',
      uptime: 120,
    });

  assert.strictEqual(hbRes.status, 200);
  assert.strictEqual(hbRes.body.status, 'acknowledged');
});

test('4. Event Ingestion, Redis Stream Publishing & Duplicate Handling', async () => {
  const eventId = `EVT-TEST-${Date.now()}`;
  const eventPayload = {
    eventId,
    nodeId: 'test-node-testrunner',
    eventType: 'NORMAL_HTTP_FLOW',
    sourceIP: '10.0.0.5',
    destinationIP: '192.168.1.1',
    destinationPort: 80,
    severity: 'Informational',
  };

  // Ingest first time
  const res1 = await request(app)
    .post('/api/events')
    .set('x-agent-key', testNodeKey)
    .send(eventPayload);

  assert.strictEqual(res1.status, 202);
  assert.strictEqual(res1.body.success, true);

  // Ingest duplicate event
  const res2 = await request(app)
    .post('/api/events')
    .set('x-agent-key', testNodeKey)
    .send(eventPayload);

  assert.strictEqual(res2.status, 202);
});

test('5. Rule-Based Threat Detection (Brute Force Detection)', async () => {
  const attackerIp = '198.51.100.99';
  const targetIp = '10.0.0.10';

  // Send 6 rapid failed logins
  for (let i = 0; i < 6; i++) {
    await request(app)
      .post('/api/events')
      .set('x-agent-key', testNodeKey)
      .send({
        eventId: `EVT-BF-${Date.now()}-${i}`,
        nodeId: 'test-node-testrunner',
        eventType: 'SSH_AUTH_FAILURE',
        sourceIP: attackerIp,
        destinationIP: targetIp,
        destinationPort: 22,
        metadata: { authStatus: 'failed', user: 'root' },
      });
  }

  // Allow short moment for async stream consumer to process
  await new Promise((r) => setTimeout(r, 600));

  const alertsRes = await request(app)
    .get('/api/alerts?category=Brute Force')
    .set('Authorization', `Bearer ${authToken}`);

  assert.strictEqual(alertsRes.status, 200);
  assert.ok(alertsRes.body.count > 0);
  const foundAlert = alertsRes.body.alerts.find(a => a.sourceIP === attackerIp);
  assert.ok(foundAlert);
  assert.strictEqual(foundAlert.category, 'Brute Force');
});

test('6. Alert Acknowledgement & Resolution Workflow', async () => {
  const alertsRes = await request(app)
    .get('/api/alerts?limit=1')
    .set('Authorization', `Bearer ${authToken}`);

  assert.strictEqual(alertsRes.status, 200);
  assert.ok(alertsRes.body.alerts.length > 0);
  const alertId = alertsRes.body.alerts[0].alertId;

  // Acknowledge
  const ackRes = await request(app)
    .patch(`/api/alerts/${alertId}/acknowledge`)
    .set('Authorization', `Bearer ${authToken}`);

  assert.strictEqual(ackRes.status, 200);
  assert.strictEqual(ackRes.body.alert.status, 'Acknowledged');

  // Resolve
  const resRes = await request(app)
    .patch(`/api/alerts/${alertId}/resolve`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ resolutionNotes: 'Test validation confirmed' });

  assert.strictEqual(resRes.status, 200);
  assert.strictEqual(resRes.body.alert.status, 'Resolved');
});

test('7. Threat Intelligence Registration and Central Sharing', async () => {
  const testIp = `203.0.113.${Math.floor(Math.random() * 200 + 10)}`;
  const postRes = await request(app)
    .post('/api/threat-intelligence')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      indicatorType: 'IP',
      indicatorValue: testIp,
      confidence: 90,
      severity: 'Critical',
      source: 'Automated Test Feed',
      description: 'Confirmed Command and Control Botnet',
    });

  assert.strictEqual(postRes.status, 201);
  assert.strictEqual(postRes.body.indicator.indicatorValue, testIp);

  // Retrieve
  const getRes = await request(app)
    .get(`/api/threat-intelligence?search=${testIp}`)
    .set('Authorization', `Bearer ${authToken}`);

  assert.strictEqual(getRes.status, 200);
  assert.strictEqual(getRes.body.indicators.length, 1);
});

test('8. Machine Learning Predict Endpoint', async () => {
  const mlRes = await request(app)
    .post('/api/ml/predict')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      destination_port: 80,
      flow_duration: 100,
      total_fwd_packets: 1500,
      total_bwd_packets: 0,
      flow_bytes_per_sec: 900000,
      flow_packets_per_sec: 25000,
      packet_length_mean: 1100,
      packet_length_std: 400,
      syn_flag_count: 1,
      ack_flag_count: 0
    });

  assert.strictEqual(mlRes.status, 200);
  assert.ok(mlRes.body.anomaly_score != null);
  assert.ok(mlRes.body.classification);
});

test('9. Simulation Control & Scenario Triggering', async () => {
  // Trigger single scenario
  const trigRes = await request(app)
    .post('/api/simulation/trigger')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ scenario: 'port_scan' });

  assert.strictEqual(trigRes.status, 200);
  assert.strictEqual(trigRes.body.success, true);

  // Status
  const statusRes = await request(app)
    .get('/api/simulation/status')
    .set('Authorization', `Bearer ${authToken}`);

  assert.strictEqual(statusRes.status, 200);
  assert.ok(statusRes.body.simulatedNodes.length >= 3);
});

test('10. SOC Analytics Overview Data', async () => {
  const statsRes = await request(app)
    .get('/api/analytics/overview')
    .set('Authorization', `Bearer ${authToken}`);

  assert.strictEqual(statsRes.status, 200);
  assert.ok(statsRes.body.stats.totalNodes >= 3);
  assert.ok(statsRes.body.stats.totalEvents >= 1);
});
