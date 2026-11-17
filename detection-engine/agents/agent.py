"""
CyberShield Distributed Python Monitoring Agent
Independent endpoint and network security agent.
Can run locally or on remote machines, supporting Suricata EVE logs, Zeek logs,
local event detection, offline buffer storage, and automatic heartbeat.
"""
import os
import sys
import time
import socket
import platform
import argparse
import threading
import queue
import datetime
import uuid
import requests

from eve_parser import parse_eve_line
from zeek_parser import parse_zeek_line

AGENT_VERSION = "1.2.0"

class CyberShieldAgent:
    def __init__(self, server_url, node_id=None, api_key=None, watch_eve=None, watch_zeek=None, simulate=False):
        self.server_url = server_url.rstrip('/')
        self.node_id = node_id or f"py-agent-{socket.gethostname().lower()}-{int(time.time()) % 1000}"
        self.hostname = socket.gethostname()
        self.ip_address = self._resolve_local_ip()
        self.os_info = f"{platform.system()} {platform.release()} ({platform.machine()})"
        self.api_key = api_key or os.environ.get('CYBERSHIELD_AGENT_KEY')
        self.watch_eve = watch_eve
        self.watch_zeek = watch_zeek
        self.simulate = simulate

        self.start_time = time.time()
        self.is_running = False
        self.is_connected = False
        self.events_sent = 0
        self.events_buffered = 0

        # In-memory and disk-backed event buffer for offline resilience
        self.buffer = queue.Queue(maxsize=5000)

        # Threading
        self.heartbeat_thread = None
        self.sender_thread = None
        self.log_watcher_thread = None

    def _resolve_local_ip(self):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "127.0.0.1"

    def register(self):
        """Registers node with central server if API key is not yet assigned."""
        print(f"[*] Contacting central server at {self.server_url} to register node [{self.node_id}]...")
        reg_url = f"{self.server_url}/api/nodes/register"
        payload = {
            'nodeId': self.node_id,
            'hostname': self.hostname,
            'ipAddress': self.ip_address,
            'operatingSystem': self.os_info,
            'agentVersion': AGENT_VERSION,
        }

        try:
            resp = requests.post(reg_url, json=payload, timeout=5)
            if resp.status_code in [200, 201]:
                data = resp.json().get('node', {})
                self.api_key = data.get('apiKey', self.api_key or 'registered-agent')
                self.is_connected = True
                print(f"[+] Successfully registered node. API Key confirmed: {self.api_key[:8]}...")
                return True
            else:
                print(f"[-] Registration response {resp.status_code}: {resp.text}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"[!] Server connection failed during registration: {e}")
            print("[!] Agent will operate in offline buffer mode until server is reachable.")
            self.is_connected = False
            return False

    def send_heartbeat(self):
        """Sends periodic heartbeat to central server."""
        while self.is_running:
            try:
                uptime = int(time.time() - self.start_time)
                hb_url = f"{self.server_url}/api/nodes/heartbeat"
                payload = {
                    'nodeId': self.node_id,
                    'uptime': uptime,
                    'operatingSystem': self.os_info,
                    'agentVersion': AGENT_VERSION,
                }
                headers = {'x-agent-key': self.api_key or ''}
                resp = requests.post(hb_url, json=payload, headers=headers, timeout=4)
                if resp.status_code == 200:
                    if not self.is_connected:
                        print(f"[+] Reconnected to Central Server! Status: Online.")
                    self.is_connected = True
                else:
                    self.is_connected = False
            except Exception:
                if self.is_connected:
                    print("[!] Lost connection to Central Server. Node is buffering events offline...")
                self.is_connected = False

            time.sleep(15)

    def enqueue_event(self, event):
        """Adds a security event to transmission queue or buffer."""
        try:
            self.buffer.put_nowait(event)
            self.events_buffered = self.buffer.qsize()
        except queue.Full:
            print("[!] Offline event buffer full! Dropping oldest event.")
            try:
                self.buffer.get_nowait()
                self.buffer.put_nowait(event)
            except:
                pass

    def transmission_worker(self):
        """Transmits buffered events to server with automatic retry."""
        while self.is_running:
            try:
                # Get a batch of up to 10 events
                batch = []
                while len(batch) < 10:
                    try:
                        evt = self.buffer.get(timeout=1)
                        batch.append(evt)
                    except queue.Empty:
                        break

                if batch:
                    ingest_url = f"{self.server_url}/api/events"
                    headers = {
                        'x-agent-key': self.api_key or '',
                        'Content-Type': 'application/json'
                    }

                    try:
                        resp = requests.post(ingest_url, json=batch, headers=headers, timeout=5)
                        if resp.status_code in [200, 201, 202]:
                            self.events_sent += len(batch)
                            print(f"[+] Transmitted {len(batch)} event(s) to server. (Total sent: {self.events_sent}, Buffered: {self.buffer.qsize()})")
                        else:
                            # Re-enqueue failed batch
                            for item in batch:
                                self.buffer.put(item)
                            time.sleep(3)
                    except Exception as net_err:
                        # Network down; re-enqueue for retry
                        for item in batch:
                            self.buffer.put(item)
                        time.sleep(5)
            except Exception as e:
                time.sleep(1)

    def tail_log_file(self, filepath, parser_func):
        """Tails a log file continuously and generates security events."""
        print(f"[*] Watching security log file: {filepath}")
        if not os.path.exists(filepath):
            with open(filepath, 'w') as f:
                f.write("")

        with open(filepath, 'r') as f:
            f.seek(0, os.SEEK_END)
            while self.is_running:
                line = f.readline()
                if not line:
                    time.sleep(0.5)
                    continue
                parsed = parser_func(line, self.node_id)
                if parsed:
                    self.enqueue_event(parsed)

    def run_synthetic_generator(self):
        """Simulates periodic local events for demonstration."""
        print(f"[*] Agent synthetic event generator active on node [{self.node_id}].")
        import random
        while self.is_running:
            time.sleep(random.uniform(4.0, 9.0))
            event_id = f"AGNT-{uuid.uuid4()}"
            scenario = random.choice(['normal', 'ssh_probe', 'dns_query'])

            if scenario == 'ssh_probe':
                evt = {
                    'eventId': event_id,
                    'nodeId': self.node_id,
                    'eventType': 'SSH_AUTH_FAILURE',
                    'sourceIP': '203.0.113.55',
                    'destinationIP': self.ip_address,
                    'destinationPort': 22,
                    'protocol': 'TCP',
                    'severity': 'Medium',
                    'confidence': 0.85,
                    'detectionMethod': 'RULE_BASED',
                    'metadata': {'user': 'admin', 'attempt': 1}
                }
            elif scenario == 'dns_query':
                evt = {
                    'eventId': event_id,
                    'nodeId': self.node_id,
                    'eventType': 'DNS_LOOKUP',
                    'sourceIP': self.ip_address,
                    'destinationIP': '8.8.8.8',
                    'destinationPort': 53,
                    'protocol': 'UDP',
                    'severity': 'Informational',
                    'confidence': 0.5,
                    'detectionMethod': 'RULE_BASED',
                    'metadata': {'query': 'internal-corp.domain.local'}
                }
            else:
                evt = {
                    'eventId': event_id,
                    'nodeId': self.node_id,
                    'eventType': 'HTTP_TRAFFIC',
                    'sourceIP': self.ip_address,
                    'destinationIP': '104.16.132.229',
                    'destinationPort': 443,
                    'protocol': 'TCP',
                    'severity': 'Low',
                    'confidence': 0.2,
                    'detectionMethod': 'RULE_BASED',
                    'metadata': {'bytes': 1420}
                }
            self.enqueue_event(evt)

    def start(self):
        self.is_running = True
        print("\n" + "="*60)
        print(f" CyberShield Distributed Python Monitoring Agent v{AGENT_VERSION}")
        print(f" Node ID:   {self.node_id}")
        print(f" Hostname:  {self.hostname} ({self.ip_address})")
        print(f" Platform:  {self.os_info}")
        print(f" Server:    {self.server_url}")
        print("="*60 + "\n")

        self.register()

        # Start heartbeat thread
        self.heartbeat_thread = threading.Thread(target=self.send_heartbeat, daemon=True)
        self.heartbeat_thread.start()

        # Start transmission worker thread
        self.sender_thread = threading.Thread(target=self.transmission_worker, daemon=True)
        self.sender_thread.start()

        # Watch Suricata if specified
        if self.watch_eve:
            t = threading.Thread(target=self.tail_log_file, args=(self.watch_eve, parse_eve_line), daemon=True)
            t.start()

        # Watch Zeek if specified
        if self.watch_zeek:
            t = threading.Thread(target=self.tail_log_file, args=(self.watch_zeek, parse_zeek_line), daemon=True)
            t.start()

        # Run synthetic generator if enabled
        if self.simulate:
            t = threading.Thread(target=self.run_synthetic_generator, daemon=True)
            t.start()

        try:
            while self.is_running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n[*] Shutting down CyberShield agent...")
            self.is_running = False

def main():
    parser = argparse.ArgumentParser(description="CyberShield Distributed Security Monitoring Agent")
    parser.add_argument('--server', default='http://localhost:5000', help="Central server URL")
    parser.add_argument('--node-id', default=None, help="Unique node identifier")
    parser.add_argument('--api-key', default=None, help="Agent API key")
    parser.add_argument('--watch-eve', default=None, help="Path to Suricata eve.json file")
    parser.add_argument('--watch-zeek', default=None, help="Path to Zeek JSON log file")
    parser.add_argument('--simulate', action='store_true', help="Enable synthetic background traffic generation")
    args = parser.parse_args()

    agent = CyberShieldAgent(
        server_url=args.server,
        node_id=args.node_id,
        api_key=args.api_key,
        watch_eve=args.watch_eve,
        watch_zeek=args.watch_zeek,
        simulate=args.simulate
    )
    agent.start()

if __name__ == '__main__':
    main()
