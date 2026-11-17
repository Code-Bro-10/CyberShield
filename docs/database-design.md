# CyberShield Database Schema & Data Models

CyberShield uses MongoDB with Mongoose for persistent telemetry, incident tracking, threat intelligence cataloging, and node state management.

---

## Collections & Schemas

### 1. `Users`
Stores authorized SOC operators, analysts, and administrators.
- `_id`: ObjectId
- `name`: String (Required)
- `email`: String (Unique, Indexed, Lowercase)
- `passwordHash`: String (bcrypt hashed with salt factor 10)
- `role`: String (`admin`, `analyst`, `operator`, default: `analyst`)
- `createdAt`: Date

### 2. `Nodes`
Represents registered distributed sensors and monitoring agents.
- `_id`: ObjectId
- `nodeId`: String (Unique, Indexed)
- `hostname`: String (Required)
- `ipAddress`: String
- `operatingSystem`: String
- `agentVersion`: String
- `apiKey`: String (Unique, Indexed)
- `status`: String (`Online`, `Offline`, `Reconnecting`, `Degraded`)
- `lastHeartbeat`: Date (Indexed)
- `uptime`: Number (seconds)
- `eventsCount`: Number (cumulative counter)
- `alertsCount`: Number (cumulative counter)
- `registeredAt`: Date
- `createdAt`: Date

### 3. `SecurityEvents`
Raw and normalized telemetry from Suricata, Zeek, Python agents, and synthetic injectors.
- `_id`: ObjectId
- `eventId`: String (Unique, Indexed)
- `nodeId`: String (Indexed)
- `eventType`: String (e.g. `SSH_AUTH_FAILURE`, `PORT_SCAN_PROBE`, `TRAFFIC_SPIKE`, `SURICATA_ALERT`)
- `sourceIP`: String (Indexed)
- `destinationIP`: String
- `sourcePort`: Number
- `destinationPort`: Number
- `protocol`: String (`TCP`, `UDP`, `ICMP`)
- `timestamp`: Date (Indexed)
- `detectionMethod`: String (`RULE_BASED`, `MACHINE_LEARNING`, `SURICATA_EVE`, `ZEEK_LOG`, `THREAT_INTEL`, `HEURISTIC`)
- `severity`: String (`Critical`, `High`, `Medium`, `Low`, `Informational`, Indexed)
- `confidence`: Number (0.0 to 1.0)
- `rawPayload`: Mixed Object
- `metadata`: Mixed Object (holds flow stats, signatures, banners)

**Indexes**:
- `{ timestamp: -1, severity: 1 }`
- `{ sourceIP: 1, timestamp: -1 }`

### 4. `Alerts`
Correlated security incidents requiring triage.
- `_id`: ObjectId
- `alertId`: String (Unique, Indexed)
- `eventId`: String (Indexed)
- `nodeId`: String (Indexed)
- `category`: String (`Brute Force`, `Port Scan`, `DDoS / Traffic Anomaly`, `Suspicious IP`, `Malware Indicator`, `Network Anomaly`)
- `severity`: String (`Critical`, `High`, `Medium`, `Low`, `Informational`, Indexed)
- `confidenceScore`: Number
- `detectionMethod`: String
- `sourceIP`: String (Indexed)
- `destinationIP`: String
- `description`: String
- `status`: String (`Open`, `Acknowledged`, `Resolved`, `False Positive`, Indexed)
- `acknowledgedBy`: String
- `acknowledgedAt`: Date
- `resolvedBy`: String
- `resolvedAt`: Date
- `resolutionNotes`: String
- `createdAt`: Date (Indexed)

**Indexes**:
- `{ status: 1, severity: 1, createdAt: -1 }`

### 5. `ThreatIntelligence`
Central repository of malicious indicators shared cluster-wide.
- `_id`: ObjectId
- `indicatorType`: String (`IP`, `DOMAIN`, `HASH_SHA256`, `URL`, Indexed)
- `indicatorValue`: String (Unique, Indexed)
- `confidence`: Number (0 to 100)
- `severity`: String (`Critical`, `High`, `Medium`, `Low`)
- `source`: String
- `description`: String
- `firstSeen`: Date
- `lastSeen`: Date (Indexed)
- `detectionCount`: Number
- `associatedNodes`: [String]
- `associatedIncidents`: [String]

### 6. `Incidents`
Case investigations grouping related alerts.
- `_id`: ObjectId
- `incidentId`: String (Unique, Indexed)
- `title`: String
- `description`: String
- `severity`: String (`Critical`, `High`, `Medium`, `Low`, Indexed)
- `status`: String (`New`, `Investigating`, `Contained`, `Resolved`, `Closed`, Indexed)
- `assignedTo`: String
- `relatedAlerts`: [String] (Array of `alertId` references)
- `investigationNotes`: Array of `{ noteId, author, message, timestamp }`
- `createdAt`: Date
- `updatedAt`: Date
- `resolvedAt`: Date

### 7. `SystemLogs`
Audit and health logs for backend, nodes, and Redis streams.
- `_id`: ObjectId
- `logType`: String (`NODE_CONNECTION`, `SERVER_INFO`, `AUTH_EVENT`, `PROCESSING_FAILURE`, `REDIS_MESSAGE`, `DETECTION_TRIGGER`)
- `nodeId`: String (Indexed)
- `message`: String
- `level`: String (`INFO`, `WARN`, `ERROR`, `CRITICAL`, Indexed)
- `details`: Mixed Object
- `timestamp`: Date (Indexed)
