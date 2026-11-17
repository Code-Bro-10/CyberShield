# CyberShield Architecture & Distributed System Design

## 1. System Overview

**CyberShield** is an enterprise-grade distributed cyberattack detection and intrusion prevention platform designed for Security Operations Centers (SOCs). Multiple independent monitoring agents collect and inspect telemetry (local security events, Suricata EVE logs, Zeek logs), stream events into an event processing bus using **Redis Streams**, correlate threats using both heuristic rule modules and an unsupervised **Isolation Forest** machine learning model, store structured telemetry in **MongoDB**, and broadcast alerts to real-time React dashboard clients via **Socket.IO**.

---

## 2. Distributed Architecture Diagram

```mermaid
flowchart TD
    subgraph SENSORS["Distributed Monitoring Sensors (Edge & Cloud Nodes)"]
        N1["Node Alpha (US-East Edge)<br/>Suricata EVE + Agent"]
        N2["Node Beta (EU-DMZ Gateway)<br/>Zeek Conn/Notice Logs"]
        N3["Node Gamma (APAC Corporate)<br/>Local System Audit Events"]
        N_EXT["Remote Python Agent<br/>(Cross-Machine Endpoint)"]
    end

    subgraph INGESTION["Central Ingestion Layer"]
        AUTH["Agent Authentication<br/>(x-agent-key / x-agent-secret)"]
        DEDUP["Event Deduplication & Validation<br/>(EventId Key Store)"]
    end

    subgraph MESSAGING["Distributed Messaging Layer"]
        STREAM["Redis Streams<br/>(cybershield:events:stream)"]
        GROUP["Consumer Group<br/>(cybershield:processors)"]
    end

    subgraph PROCESSING["Event Correlation & Detection Engine"]
        RULES["Modular Rule Detectors<br/>- Brute Force Window<br/>- Port Scan Matrix<br/>- DoS Frequency<br/>- Malware SHA256<br/>- Suspicious IP"]
        ML_SVC["Python ML Service (Port 5001)<br/>- Isolation Forest (CIC-IDS2017)<br/>- Scaler & Anomaly Scorer"]
        THREAT_INTEL["Distributed IOC Catalog<br/>(Threat Intelligence Feed)"]
    end

    subgraph PERSISTENCE["Storage Layer"]
        MONGO["MongoDB Cluster / Mongoose<br/>- SecurityEvents<br/>- Alerts<br/>- Nodes<br/>- Incidents<br/>- SystemLogs"]
    end

    subgraph REALTIME["Real-Time Dispatch Layer"]
        SIO["Socket.IO Engine<br/>- new_alert<br/>- new_event<br/>- node_heartbeat"]
    end

    subgraph SOC["SOC Analyst Web Interface"]
        DASH["React + Vite Enterprise SOC<br/>- Live Telemetry Stream<br/>- Threat Intelligence<br/>- ML Sandbox<br/>- Incident Response"]
    end

    N1 -->|POST /api/events| AUTH
    N2 -->|POST /api/events| AUTH
    N3 -->|POST /api/events| AUTH
    N_EXT -->|POST /api/events| AUTH

    AUTH --> DEDUP
    DEDUP -->|XADD| STREAM
    STREAM -->|XREADGROUP| GROUP
    GROUP --> RULES
    RULES <--> THREAT_INTEL
    RULES -->|Flow Features| ML_SVC
    ML_SVC -->|Anomaly Score| RULES

    RULES -->|Persist Events & Alerts| MONGO
    RULES -->|Trigger Broadcast| SIO
    SIO <==>|WebSockets| DASH
```

---

## 3. Communication Breakdown

### A. Agent-to-Server Protocol
- **Transport**: HTTPS / REST with keepalive.
- **Authentication**: Each registered node holds a distinct 24-character cryptographic API key transmitted via header `x-agent-key`.
- **Fault-Tolerance & Buffering**: In the event of network disruption or server restarts, agents buffer security events in an in-memory queue. Once connection is re-established, the buffer flushes with exponential backoff.
- **Heartbeat Protocol**: Nodes issue heartbeats every 15 seconds to `/api/nodes/heartbeat`. If a heartbeat is overdue by >30 seconds (configurable), the central backend flags the node as `OFFLINE` and generates a system log and dashboard notification.

### B. Distributed Message Processing
- **Event Streaming**: Ingested events are not processed synchronously on the HTTP thread; they are appended immediately to `cybershield:events:stream` with `XADD`.
- **Consumer Group Semantics**: Multiple worker processes read from consumer group `cybershield:processors` via `XREADGROUP`, ensuring parallel scalability and at-least-once delivery.
- **Deduplication**: An event ID hash cache (`SET dedup:event:<id> 1 EX 120 NX`) prevents duplicate transmissions from multiple retrying agents.
- **Acknowledgements**: Once an event passes through correlation and database persistence, workers acknowledge with `XACK`.

### C. Detection Engine & ML Isolation
- **Rule Layer**: Evaluates events against threshold state caches (sliding window counters for failed authentications, unique target port sets for port scanning, and requests/sec counters for DoS).
- **ML Layer**: The Python service hosts a trained `IsolationForest` model on 10 flow dimensions normalized with `StandardScaler`. Predictions evaluate anomaly scores in $[0, 1]$ where scores $>0.65$ trigger High severity anomaly alerts.
