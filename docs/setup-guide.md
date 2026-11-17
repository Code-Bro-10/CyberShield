# CyberShield Local Setup & Quickstart Guide

This guide walks you through setting up and running **CyberShield** on a local development machine (Windows, Linux, or macOS).

---

## 1. Prerequisites
- **Node.js**: v18.0 or newer (Tested on v24.11.1)
- **Python**: 3.10+ (Tested on Python 3.13.5)
- **Git**: Installed
- *Optional*: MongoDB and Redis services (If not running, CyberShield automatically boots an embedded in-memory MongoDB server and an embedded in-memory Redis Streams broker so you can run the entire platform immediately with zero external dependencies!).

---

## 2. Quickstart Step-by-Step

### Step 1: Clone and Configure Environment
```bash
git clone <repository_url> cybershield
cd cybershield
cp .env.example .env
```

### Step 2: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 3: Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### Step 4: Install Python Detection Engine Dependencies
```bash
cd ../detection-engine
pip install -r requirements.txt
```

---

## 3. Launching the Services

Open 3 terminal windows to run all services concurrently:

### Terminal 1: Backend Central Server (Port 5000)
```bash
cd backend
npm start
```
*The server will initialize MongoDB, setup Redis Streams, and start the 3 simulated monitoring nodes (`node-alpha-edge`, `node-beta-dmz`, `node-gamma-corp`).*

### Terminal 2: Python ML Microservice (Port 5001)
```bash
cd detection-engine
python run_detection_service.py
```
*Loads the trained Isolation Forest model and listens on http://127.0.0.1:5001.*

### Terminal 3: React SOC Frontend (Port 5173)
```bash
cd frontend
npm run dev
```
*Open http://localhost:5173 in your browser.*

---

## 4. Default Login Credentials
- **Admin (CSO)**:
  - Email: `admin@cybershield.io`
  - Password: `Admin@123456`
- **Lead Analyst**:
  - Email: `analyst@cybershield.io`
  - Password: `Analyst@123456`
- *(Or click the "Quick Fill Demo Credentials" buttons on the login screen).*

---

## 5. Running Independent External Python Agents

You can run independent Python monitoring agents on other machines or locally in another terminal:

```bash
cd detection-engine/agents
python agent.py --server http://localhost:5000 --node-id sensor-host-01 --simulate
```

### Watching Suricata EVE or Zeek Logs
If you have Suricata or Zeek running on your host or VM:
```bash
python agent.py --server http://localhost:5000 --node-id suricata-edge-01 --watch-eve /var/log/suricata/eve.json
```

---

## 6. Demonstrating Distributed Communication & Attack Detection

1. Log into the SOC Dashboard at http://localhost:5173.
2. Navigate to **Simulation & Demo** in the sidebar.
3. Click **"START SIMULATION"** or click individual 1-click scenario injectors (e.g., **Brute-Force Auth Attack**, **Port Scan**, **DDoS Volumetric**).
4. Watch the real-time indicators:
   - Notice alerts appearing in the bottom-right corner with audio chimes.
   - Switch to **Live Monitoring** to inspect raw JSON payloads of incoming events.
   - Switch to **Network Nodes** to see telemetry counters updating on `node-alpha`, `node-beta`, and `node-gamma`.
   - Switch to **ML Detection** to run custom network flow metrics through the Isolation Forest model.
