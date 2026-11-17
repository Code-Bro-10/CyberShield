"""
Zeek (Bro) JSON Log Parser for CyberShield Monitoring Agent
Parses structured Zeek notice and conn JSON records.
"""
import json
import uuid
import datetime

def parse_zeek_line(line_str, node_id="zeek-sensor"):
    """
    Parses a single line from Zeek conn.log or notice.log (JSON format).
    """
    try:
        data = json.loads(line_str.strip())
        
        # Zeek notice log vs conn log
        is_notice = 'note' in data or 'msg' in data
        
        src_ip = data.get('id.orig_h', data.get('orig_h', '127.0.0.1'))
        dest_ip = data.get('id.resp_h', data.get('resp_h', '192.168.1.1'))
        src_port = data.get('id.orig_p', data.get('orig_p'))
        dest_port = data.get('id.resp_p', data.get('resp_p'))
        proto = data.get('proto', 'TCP').upper()

        ts_epoch = data.get('ts')
        if ts_epoch:
            timestamp = datetime.datetime.fromtimestamp(float(ts_epoch), datetime.timezone.utc).isoformat()
        else:
            timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if is_notice:
            note_type = data.get('note', 'Notice')
            msg = data.get('msg', 'Zeek Notice Triggered')
            severity = 'High' if 'Scan' in note_type or 'Attack' in note_type else 'Medium'
            return {
                'eventId': f"ZEEK-{uuid.uuid4()}",
                'nodeId': node_id,
                'eventType': f"ZEEK_NOTICE_{note_type.replace('::', '_')}",
                'sourceIP': src_ip,
                'destinationIP': dest_ip,
                'sourcePort': src_port,
                'destinationPort': dest_port,
                'protocol': proto,
                'timestamp': timestamp,
                'detectionMethod': 'ZEEK_LOG',
                'severity': severity,
                'confidence': 0.85,
                'metadata': {
                    'note': note_type,
                    'message': msg,
                    'sub': data.get('sub'),
                    'rawZeek': data
                }
            }
        else:
            # Standard conn log
            duration = data.get('duration', 0.0)
            orig_bytes = data.get('orig_bytes', 0)
            resp_bytes = data.get('resp_bytes', 0)

            return {
                'eventId': f"ZEEK-CONN-{uuid.uuid4()}",
                'nodeId': node_id,
                'eventType': 'ZEEK_CONN',
                'sourceIP': src_ip,
                'destinationIP': dest_ip,
                'sourcePort': src_port,
                'destinationPort': dest_port,
                'protocol': proto,
                'timestamp': timestamp,
                'detectionMethod': 'ZEEK_LOG',
                'severity': 'Informational',
                'confidence': 0.5,
                'metadata': {
                    'duration': duration,
                    'origBytes': orig_bytes,
                    'respBytes': resp_bytes,
                    'connState': data.get('conn_state')
                }
            }
    except Exception:
        return None
