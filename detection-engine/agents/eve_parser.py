"""
Suricata EVE JSON Log Parser for CyberShield Monitoring Agent
Parses structured Suricata events and normalizes them into CyberShield SecurityEvents.
"""
import json
import uuid
import datetime

SURICATA_SEVERITY_MAP = {
    1: 'Critical',
    2: 'High',
    3: 'Medium',
    4: 'Low'
}

def parse_eve_line(line_str, node_id="suricata-sensor"):
    """
    Parses a single line from Suricata eve.json.
    Returns normalized CyberShield event dictionary or None if unparseable.
    """
    try:
        data = json.loads(line_str.strip())
        event_type = data.get('event_type', 'unknown').upper()
        
        src_ip = data.get('src_ip', '0.0.0.0')
        dest_ip = data.get('dest_ip', '127.0.0.1')
        src_port = data.get('src_port')
        dest_port = data.get('dest_port')
        proto = data.get('proto', 'TCP')
        timestamp = data.get('timestamp', datetime.datetime.now(datetime.timezone.utc).isoformat())

        severity = 'Low'
        confidence = 0.70
        category = 'Network Traffic'
        alert_desc = None

        if event_type == 'ALERT':
            alert_info = data.get('alert', {})
            raw_sev = alert_info.get('severity', 3)
            severity = SURICATA_SEVERITY_MAP.get(raw_sev, 'Medium')
            alert_desc = alert_info.get('signature', 'Suricata Signature Alert')
            category = alert_info.get('category', 'Suricata Alert')
            confidence = 0.90 if severity in ['Critical', 'High'] else 0.75

        event_id = f"EVE-{uuid.uuid4()}"
        return {
            'eventId': event_id,
            'nodeId': node_id,
            'eventType': f"SURICATA_{event_type}",
            'sourceIP': src_ip,
            'destinationIP': dest_ip,
            'sourcePort': src_port,
            'destinationPort': dest_port,
            'protocol': proto,
            'timestamp': timestamp,
            'detectionMethod': 'SURICATA_EVE',
            'severity': severity,
            'confidence': confidence,
            'metadata': {
                'suricataCategory': category,
                'signature': alert_desc,
                'flowId': data.get('flow_id'),
                'inIfCode': data.get('in_iface'),
                'rawSuricata': data
            }
        }
    except Exception as e:
        return None
