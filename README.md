# CyberShield – Distributed Cyberattack Detection and Alert System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B%20%7C%20v24-green.svg)](https://nodejs.org/)
[![Python Version](https://img.shields.io/badge/Python-3.10%2B%20%7C%203.13-blue.svg)](https://www.python.org/)
[![React Version](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev/)
[![Redis Streams](https://img.shields.io/badge/Redis-Streams%20%26%20PubSub-red.svg)](https://redis.io/)
[![Scikit-Learn](https://img.shields.io/badge/ML-Isolation%20Forest%20(94.4%25%20Acc)-orange.svg)](https://scikit-learn.org/)

**CyberShield** is an enterprise-grade distributed cyberattack detection and real-time security operations center (SOC) web application. Multiple independent monitoring agents collect authorized endpoint and network telemetry, process Suricata EVE and Zeek logs, stream structured events through **Redis Streams**, correlate threats using modular heuristic rules and an unsupervised **Isolation Forest** machine learning model, store structured threat data in **MongoDB**, and broadcast live security alerts to SOC analysts using **Socket.IO**.

---

## 🛡️ Key System Capabilities

- **Distributed Sensor Architecture**: Independent monitoring agents running on remote nodes with automatic registration, cryptographic API keys (`x-agent-key`), heartbeat monitoring, offline event buffering, and automatic reconnection.
- **Redis Streams & Consumer Groups**: High-throughput distributed event messaging layer using Redis Streams (`XADD`, `XREADGROUP`, `XACK`) with duplicate event prevention and consumer group scaling. Includes automatic in-memory stream fallback for zero-dependency local development.
- **Multi-Layer Cyberattack Detection Engine**:
  1. **Brute Force Detection**: Sliding-window tracking of failed authentications grouped by source and target host.
  2. **Port Scan Detection**: Matrix analysis identifying horizontal and vertical reconnaissance across unique destination ports.
  3. **DoS / DDoS Volumetric Detection**: Frequency rate analysis identifying request spikes and anomalous flooding.
  4. **Suspicious IP & IOC Feed Matching**: Local and shared threat intelligence database matching against malicious botnet C2s.
  5. **Malware Hash Identification**: SHA-256 signature cataloging and test threat correlation (safe metadata lookup).
  6. **Network Anomaly Detection**: Statistical flow variance and machine learning inference.
- **Machine Learning Detection Microservice**:
  - Unsupervised **Isolation Forest** anomaly detector trained on canonical network flow features from the **CIC-IDS2017** benchmark.
  - **Verified Holdout Evaluation**: 94.44% Accuracy, 88.73% Precision, 93.33% Recall, 90.97% F1-Score.
  - Interactive SOC flow prediction sandbox allowing operators to test and score arbitrary flow vectors.
- **Threat Intelligence Sharing**: Distributed IOC sharing across all monitoring nodes with confidence scoring and hit tracking without modifying host firewall rules.
- **Enterprise SOC Dashboard**: Dark charcoal / navy interface with real-time live event streaming, audio alert synthesis (Web Audio API), unread alert badges, interactive charts (Recharts), and incident triage center.
- **Safe Synthetic Attack Simulation**: Complete simulation engine generating 6 safe synthetic scenarios across 3 independent simulated nodes (`node-alpha-edge`, `node-beta-dmz`, `node-gamma-corp`).

---

## 🏗️ Architecture Overview

```
                      +------------------------------------------+
                      | Distributed Sensors & Monitoring Agents  |
                      | - Node Alpha (US-East Edge Sensor)       |
                      | - Node Beta (EU-Central DMZ Gateway)     |
                      | - Node Gamma (APAC Corporate Core)       |
                      | - Independent Cross-Host Python Agents   |
                      +--------------------+---------------------+
                                           | HTTP Ingestion (x-agent-key)
                                           v
                      +------------------------------------------+
                      | Central Ingestion & Deduplication Cache  |
                      +--------------------+---------------------+
                                           | XADD
                                           v
                      +------------------------------------------+
                      | Redis Stream: cybershield:events:stream  |
                      +--------------------+---------------------+
                                           | XREADGROUP
                                           v
                      +------------------------------------------+
                      | Distributed Correlation & Alert Engine   |
                      | - Sliding-Window Heuristic Rules         |
                      | - Python Isolation Forest (Port 5001)    |
                      | - Threat Intelligence IOC Catalog        |
                      +----------+-------------------+-----------+
                                 |                   |
            Persist Alerts/Events|                   | Broadcast (Socket.IO)
                                 v                   v
                      +------------------+   +-------------------+
                      | MongoDB Database |   | React 19 SOC App  |
                      | - SecurityEvents |   | - Real-Time Feed  |
                      | - Alerts         |   | - Attack Charts   |
                      | - Nodes          |   | - Incident Center |
                      | - Incidents      |   | - ML Sandbox      |
                      +------------------+   +-------------------+
```

---

## 💻 Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, Recharts, Socket.IO Client, Axios.
- **Backend**: Node.js v24, Express, Socket.IO, MongoDB / Mongoose, ioredis, bcryptjs, jsonwebtoken, express-rate-limit, helmet.
- **Detection & ML**: Python 3.13, Scikit-learn (Isolation Forest), Pandas, NumPy, StandardScaler, Flask.
- **Network Monitoring**: Suricata EVE JSON parser, Zeek (Bro) JSON parser, Python monitoring agents.

---

## 🚀 Quickstart Guide (Local Windows / Linux / macOS)

### 1. Prerequisites
- **Node.js** v18+ (tested on v24.11.1)
- **Python** 3.10+ (tested on Python 3.13.5)
- *Note: External MongoDB or Redis are NOT required for local development. CyberShield includes an embedded MongoMemoryServer and embedded Redis Stream broker fallback that start automatically if native services are absent!*

### 2. Installation

Clone and install dependencies:

```powershell
# 1. Environment configuration
Copy-Item .env.example .env

# 2. Backend dependencies
cd backend
npm install

# 3. Frontend dependencies
cd ../frontend
npm install

# 4. Python ML & Detection engine dependencies
cd ../detection-engine
pip install -r requirements.txt
```

### 3. Running the Platform

Run the three services in separate terminals:

#### Terminal 1: Backend Central Server (Port 5000)
```powershell
cd backend
npm start
```
*Initializes MongoDB, Redis Stream consumer groups, seeds default admin/analysts, and launches the 3 simulated monitoring nodes (`node-alpha-edge`, `node-beta-dmz`, `node-gamma-corp`).*

#### Terminal 2: Python ML Anomaly Detection Service (Port 5001)
```powershell
cd detection-engine
python run_detection_service.py
```
*Loads the trained Isolation Forest model and listens on http://127.0.0.1:5001.*

#### Terminal 3: React SOC Dashboard (Port 5173)
```powershell
cd frontend
npm run dev
```
*Access the SOC dashboard at **http://localhost:5173**.*

---

## 🔑 Default Credentials

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Chief Security Officer (Admin)** | `admin@cybershield.io` | `Admin@123456` | Full administrative access, threshold tuning, rule toggles |
| **Lead SOC Analyst** | `analyst@cybershield.io` | `Analyst@123456` | Triage alerts, investigate incidents, publish threat intel |

*(Quick-fill buttons are also available directly on the login screen).*

---

## 🤖 Running Independent Python Monitoring Agents

To run an autonomous agent locally or on a separate machine:

```powershell
cd detection-engine/agents
python agent.py --server http://localhost:5000 --node-id my-custom-sensor --simulate
```

### Watching Suricata EVE or Zeek Logs
If you run Suricata or Zeek on your machine:
```bash
python agent.py --server http://localhost:5000 --node-id edge-suricata-01 --watch-eve /var/log/suricata/eve.json
```

---

## 🧪 Safe Attack Simulation Mode

CyberShield includes a built-in simulation control panel accessible under **"Simulation & Demo"** in the sidebar. It generates safe, synthetic telemetry:

1. **Brute Force Auth Attack**: Repeated failed logins from `203.0.113.88` targeting SSH/Web.
2. **Port Scan Reconnaissance**: Sequential SYN probes across common ports from `198.51.100.114`.
3. **High-Traffic DoS**: High-frequency request spike from `192.0.2.77`.
4. **Suspicious IP**: Traffic from known Mirai Botnet C2 IP `198.51.100.45`.
5. **Network Anomaly**: Anomalous flow vector with high byte rate and abnormal duration.
6. **Normal Benign Traffic**: Standard HTTPS/DNS browsing flows.

Use the **"START SIMULATION"** button or click individual 1-click scenario injectors to watch real-time alert popups, audio chimes, and live graph updates.

---

## 📊 Machine Learning Model & Benchmark Evaluation

The Python ML service uses an unsupervised **Isolation Forest** trained on the **CIC-IDS2017** benchmark flow dataset.

### Actual Holdout Test Evaluation Metrics (450 Test Flows)
- **Accuracy**: 94.44%
- **Precision**: 88.73%
- **Recall**: 93.33%
- **F1-Score**: 90.97%
- **Confusion Matrix**:
  - True Negative (Benign): 299
  - False Positive (False Alarm): 16
  - False Negative (Missed Attack): 9
  - True Positive (Detected Attack): 126

To retrain the model on demand, run:
```powershell
python detection-engine/ml/train.py
```

---

## 🧪 Automated Testing

The backend includes comprehensive integration tests verifying authentication, node registration, Redis Stream deduplication, rule detectors, alert workflows, threat intelligence, and ML predictions.

Run all tests:
```powershell
cd backend
npm test
```

### Test Results
```
✔ 1. Health Check Endpoint (4895ms)
✔ 2. User Registration and Login (224ms)
✔ 3. Node Registration and Heartbeat (18ms)
✔ 4. Event Ingestion, Redis Stream Publishing & Duplicate Handling (12ms)
✔ 5. Rule-Based Threat Detection (Brute Force Detection) (665ms)
✔ 6. Alert Acknowledgement & Resolution Workflow (93ms)
✔ 7. Threat Intelligence Registration and Central Sharing (25ms)
✔ 8. Machine Learning Predict Endpoint (27ms)
✔ 9. Simulation Control & Scenario Triggering (13ms)
✔ 10. SOC Analytics Overview Data (12ms)

ℹ tests 10 | pass 10 | fail 0 | cancelled 0
```

---

## 🐳 Optional Docker Deployment

To run CyberShield with production MongoDB and Redis via Docker Compose:

```bash
docker-compose up -d
```

---

## 📁 Repository Structure

```
CyberShield/
├── backend/
│   ├── src/
│   │   ├── config/          # DB, Redis, Environment configuration
│   │   ├── controllers/     # REST controllers for all SOC resources
│   │   ├── detection/       # Modular detection rules & rule engine
│   │   ├── middleware/      # JWT auth, agent auth, rate limiter, error handler
│   │   ├── models/          # Mongoose data schemas (Events, Alerts, Nodes, etc.)
│   │   ├── queues/          # Redis Streams, consumer groups & dedup broker
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Alert, correlation, health & threat intel services
│   │   ├── simulation/      # Attack simulator & simulated node manager
│   │   ├── sockets/         # Socket.IO real-time engine
│   │   └── utils/           # JWT, logger
│   └── tests/               # Automated test suite (node:test + supertest)
├── frontend/
│   ├── src/
│   │   ├── components/      # Badges, StatCards, Header, Sidebar, Modal, Toast
│   │   ├── context/         # AuthContext, SocketContext
│   │   ├── pages/           # 10 SOC Dashboard Pages
│   │   ├── services/        # Axios API client, Socket.IO client
│   │   └── utils/           # Web Audio API alert sound, formatters
├── detection-engine/
│   ├── agents/              # Python monitoring agent, Suricata EVE & Zeek parsers
│   ├── datasets/            # CIC-IDS2017 benchmark dataset generator & CSV
│   ├── ml/                  # Isolation Forest training pipeline & Flask API
│   ├── models/              # Serialized joblib model & scaler artifacts
│   └── run_detection_service.py
├── docs/
│   ├── architecture.md      # Distributed architecture & sequence diagrams
│   ├── database-design.md   # Complete schema and indexing documentation
│   ├── api-documentation.md # Full REST API reference
│   └── setup-guide.md       # Local setup & agent instructions
├── docker-compose.yml       # Optional containerized stack
├── .env.example             # Template environment variables
└── README.md                # Master documentation
```

---

## 📄 License
This project is licensed under the MIT License.
