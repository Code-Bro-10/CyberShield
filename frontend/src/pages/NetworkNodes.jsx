import React, { useEffect, useState } from 'react';
import {
  Server,
  Plus,
  RefreshCw,
  Cpu,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Copy,
  Terminal,
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { StatusBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { formatDateTime, formatTimeAgo, formatUptime } from '../utils/formatters';

export const NetworkNodes = () => {
  const { socket } = useSocket();
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newHostname, setNewHostname] = useState('');
  const [newIp, setNewIp] = useState('10.0.50.12');
  const [newOs, setNewOs] = useState('Ubuntu 22.04 LTS (x86_64)');
  const [registeredResult, setRegisteredResult] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const fetchNodes = async () => {
    try {
      const res = await api.get('/nodes');
      if (res.success && res.nodes) {
        setNodes(res.nodes);
      }
    } catch (err) {
      console.error('Error fetching nodes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();

    if (!socket) return;

    const onStatusChange = (data) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.nodeId === data.nodeId
            ? { ...n, status: data.status, lastHeartbeat: data.lastHeartbeat }
            : n
        )
      );
    };

    const onHeartbeat = (data) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.nodeId === data.nodeId
            ? { ...n, lastHeartbeat: data.lastHeartbeat, uptime: data.uptime, status: 'Online' }
            : n
        )
      );
    };

    socket.on('node_status_change', onStatusChange);
    socket.on('node_heartbeat', onHeartbeat);

    return () => {
      socket.off('node_status_change', onStatusChange);
      socket.off('node_heartbeat', onHeartbeat);
    };
  }, [socket]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!newHostname) return;

    try {
      const res = await api.post('/nodes/register', {
        hostname: newHostname,
        ipAddress: newIp,
        operatingSystem: newOs,
        agentVersion: '1.2.0',
      });

      if (res.success && res.node) {
        setRegisteredResult(res.node);
        fetchNodes();
      }
    } catch (err) {
      alert(err.message || 'Failed to register node');
    }
  };

  const copyApiKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d1424] border border-[#1e293b] p-5 rounded-xl">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            Distributed Monitoring Nodes Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Centrally register, authenticate, and monitor edge agents, cloud gateways, and internal sensors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchNodes()}
            className="p-2 bg-[#17233d] border border-[#1e293b] hover:border-cyan-500/30 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setRegisteredResult(null);
              setNewHostname('');
              setIsRegisterOpen(true);
            }}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Node</span>
          </button>
        </div>
      </div>

      {/* Nodes Table */}
      <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={4} cols={7} />
          </div>
        ) : nodes.length === 0 ? (
          <EmptyState
            icon={Server}
            title="No monitoring nodes registered"
            description="Register a new sensor node to begin telemetry collection."
            actionLabel="Register Sensor Node"
            onAction={() => setIsRegisterOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111a2e] text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-[#1e293b]">
                <tr>
                  <th className="py-3 px-4">Node ID</th>
                  <th className="py-3 px-4">Hostname / OS</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Heartbeat</th>
                  <th className="py-3 px-4">Uptime</th>
                  <th className="py-3 px-4">Events Handled</th>
                  <th className="py-3 px-4">Alerts Raised</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/50 font-mono">
                {nodes.map((n) => (
                  <tr key={n.nodeId} className="hover:bg-[#111a2e]/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-cyan-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-500" />
                      {n.nodeId}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-semibold">{n.hostname}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{n.operatingSystem}</div>
                    </td>
                    <td className="py-3.5 px-4 text-amber-300 font-mono">{n.ipAddress}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={n.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 text-[11px]">
                      <div>{formatTimeAgo(n.lastHeartbeat)}</div>
                      <div className="text-[10px] text-slate-500">{formatDateTime(n.lastHeartbeat)}</div>
                    </td>
                    <td className="py-3.5 px-4 text-emerald-400 font-mono">
                      {formatUptime(n.uptime)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-200 font-bold">
                      {n.eventsCount?.toLocaleString() || 0}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-bold ${
                          (n.alertsCount || 0) > 0 ? 'text-red-400' : 'text-slate-500'
                        }`}
                      >
                        {n.alertsCount || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Node Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Provision Monitoring Node"
        maxWidth="max-w-lg"
      >
        {!registeredResult ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <p className="text-xs text-slate-400">
              Register a new remote or local monitoring agent. Once registered, an agent-specific API key will be issued for authenticated communication.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Hostname / Sensor Label *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. edge-router-01, internal-db-sensor"
                value={newHostname}
                onChange={(e) => setNewHostname(e.target.value)}
                className="w-full px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                IP Address
              </label>
              <input
                type="text"
                placeholder="10.0.x.x"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                className="w-full px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Operating System
              </label>
              <select
                value={newOs}
                onChange={(e) => setNewOs(e.target.value)}
                className="w-full px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="Ubuntu 22.04 LTS (x86_64)">Ubuntu 22.04 LTS (x86_64)</option>
                <option value="Debian 12 (Kernel 6.1)">Debian 12 (Kernel 6.1)</option>
                <option value="Red Hat Enterprise Linux 9">Red Hat Enterprise Linux 9</option>
                <option value="Windows Server 2022">Windows Server 2022</option>
                <option value="Alpine Linux 3.19 (Edge Container)">Alpine Linux 3.19</option>
              </select>
            </div>

            <div className="pt-3 border-t border-[#1e293b] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Generate Credentials
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-emerald-300">Node Registered Successfully</h4>
                <p className="text-[11px] text-slate-300">
                  Node ID: <strong className="font-mono text-white">{registeredResult.nodeId}</strong>
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Assigned Agent API Key:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={registeredResult.apiKey}
                  className="w-full px-3 py-2 bg-[#070b14] border border-[#1e293b] rounded-lg text-xs text-amber-400 font-mono"
                />
                <button
                  onClick={() => copyApiKey(registeredResult.apiKey)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedKey ? 'COPIED!' : 'COPY'}</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#070b14] border border-[#1e293b] rounded-lg">
              <div className="text-[11px] text-slate-400 font-mono mb-2 flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Command to start Python Agent on node:</span>
              </div>
              <pre className="text-[11px] text-cyan-300 font-mono overflow-x-auto whitespace-pre-wrap select-all">
                {`python detection-engine/agents/agent.py --server http://localhost:5000 --node-id ${registeredResult.nodeId} --api-key ${registeredResult.apiKey} --simulate`}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
