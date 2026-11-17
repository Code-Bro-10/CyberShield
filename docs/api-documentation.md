# CyberShield REST API Documentation

All endpoints return JSON responses with standard envelope `{ success: true, ... }` or `{ success: false, message: "..." }`.

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/register`
Creates a new SOC operator account.
- **Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@cybershield.io",
    "password": "Password@123",
    "role": "analyst"
  }
  ```
- **Response (201)**:
  ```json
  { "success": true, "token": "<JWT_STRING>", "user": { ... } }
  ```

### `POST /api/auth/login`
Authenticates existing operator.
- **Body**:
  ```json
  { "email": "admin@cybershield.io", "password": "Admin@123456" }
  ```
- **Response (200)**:
  ```json
  { "success": true, "token": "<JWT_STRING>", "user": { ... } }
  ```

### `GET /api/auth/me`
Retrieves current session identity.
- **Headers**: `Authorization: Bearer <token>`

---

## 2. Nodes (`/api/nodes`)

### `GET /api/nodes`
List all registered monitoring nodes.
- **Headers**: `Authorization: Bearer <token>`

### `POST /api/nodes/register`
Agent registration endpoint.
- **Body**:
  ```json
  {
    "nodeId": "sensor-west-01",
    "hostname": "edge-router-01",
    "ipAddress": "10.0.10.15",
    "operatingSystem": "Linux Ubuntu 22.04",
    "agentVersion": "1.2.0"
  }
  ```
- **Response (201)**:
  ```json
  { "success": true, "node": { "nodeId": "sensor-west-01", "apiKey": "key-..." } }
  ```

### `POST /api/nodes/heartbeat`
Agent heartbeat keepalive.
- **Headers**: `x-agent-key: <node_api_key>`
- **Body**:
  ```json
  { "nodeId": "sensor-west-01", "uptime": 3600 }
  ```

---

## 3. Events (`/api/events`)

### `POST /api/events`
Ingest security events from monitoring agents into Redis Stream.
- **Headers**: `x-agent-key: <node_api_key>` or `x-agent-secret: <shared_secret>`
- **Body**: Single event object or array of events:
  ```json
  {
    "eventId": "EVT-9921",
    "nodeId": "sensor-west-01",
    "eventType": "SSH_AUTH_FAILURE",
    "sourceIP": "203.0.113.88",
    "destinationIP": "10.0.10.15",
    "destinationPort": 22,
    "severity": "Medium",
    "metadata": { "user": "root" }
  }
  ```
- **Response (202 Accepted)**:
  ```json
  { "success": true, "message": "Enqueued 1 event(s) to Redis distributed stream" }
  ```

### `GET /api/events`
Query paginated events with filters.
- **Query Params**: `page`, `limit`, `nodeId`, `severity`, `eventType`, `sourceIP`, `search`.

---

## 4. Alerts (`/api/alerts`)

### `GET /api/alerts`
Query correlated alerts.
- **Query Params**: `status`, `severity`, `category`, `nodeId`, `search`.

### `PATCH /api/alerts/:id/acknowledge`
Mark alert as acknowledged.

### `PATCH /api/alerts/:id/resolve`
Resolve alert with analyst notes.
- **Body**: `{ "resolutionNotes": "Investigated and verified as test scan." }`

---

## 5. Machine Learning (`/api/ml`)

### `GET /api/ml/status`
Returns Isolation Forest model status, hyperparameters, and holdout test evaluation metrics (Accuracy, Precision, Recall, F1, Confusion Matrix).

### `POST /api/ml/predict`
Run inference on network flow features.
- **Body**:
  ```json
  {
    "destination_port": 80,
    "flow_duration": 1500,
    "total_fwd_packets": 25,
    "total_bwd_packets": 18,
    "flow_bytes_per_sec": 45000,
    "flow_packets_per_sec": 350,
    "syn_flag_count": 0,
    "ack_flag_count": 1
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "anomaly_score": 0.214,
    "classification": "Normal",
    "is_anomaly": false,
    "confidence": 0.88
  }
  ```

---

## 6. Simulation & Attack Scenarios (`/api/simulation`)

### `GET /api/simulation/status`
Current state of the synthetic attack simulation generator.

### `POST /api/simulation/start`
Starts continuous simulation with configurable frequency and scenario mixture.
- **Body**: `{ "targetNode": "all", "scenario": "all", "frequencySec": 2 }`

### `POST /api/simulation/stop`
Stops simulation generator.

### `POST /api/simulation/trigger`
Triggers immediate one-click injection of a specific scenario:
- `brute_force`
- `port_scan`
- `high_traffic_dos`
- `suspicious_ip`
- `network_anomaly`
- `normal_traffic`
