import React, { useEffect, useState } from 'react';
import {
  Terminal,
  Search,
  Filter,
  RefreshCw,
  Server,
  AlertCircle,
  CheckCircle,
  Database,
} from 'lucide-react';
import api from '../services/api';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { formatDateTime } from '../utils/formatters';

export const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redisStatus, setRedisStatus] = useState('Connecting...');
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');

  const fetchLogs = async () => {
    try {
      const query = new URLSearchParams();
      if (selectedType) query.append('logType', selectedType);
      if (selectedLevel) query.append('level', selectedLevel);
      if (search) query.append('search', search);

      const res = await api.get(`/logs?${query.toString()}`);
      if (res.success && res.logs) {
        setLogs(res.logs);
        if (res.redisStatus) setRedisStatus(res.redisStatus);
      }
    } catch (err) {
      console.error('Failed to load system logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedType, selectedLevel]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const getLevelBadge = (level) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-950/80 text-red-300 border-red-500/50';
      case 'ERROR':
        return 'bg-red-950/40 text-red-400 border-red-500/30';
      case 'WARN':
        return 'bg-amber-950/40 text-amber-400 border-amber-500/30';
      case 'DEBUG':
        return 'bg-purple-950/40 text-purple-400 border-purple-500/30';
      default:
        return 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d1424] border border-[#1e293b] p-5 rounded-xl">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            Distributed Cluster System Logs
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time audit log of agent handshakes, authentication, Redis stream transactions, and detector triggers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-[#111a2e] border border-[#1e293b] text-xs font-mono flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Queue:</span>
            <span className="text-emerald-400 font-bold">{redisStatus}</span>
          </div>
          <button
            onClick={fetchLogs}
            className="p-2 bg-[#17233d] border border-[#1e293b] hover:border-cyan-500/30 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#0d1424] border border-[#1e293b] p-3 rounded-xl">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search log messages or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="">All Log Categories</option>
            <option value="NODE_CONNECTION">Node Connections</option>
            <option value="SERVER_INFO">Server Operations</option>
            <option value="DETECTION_TRIGGER">Detection Triggers</option>
            <option value="AUTH_EVENT">Authentication</option>
            <option value="REDIS_MESSAGE">Redis Messaging</option>
            <option value="PROCESSING_FAILURE">Processing Failures</option>
          </select>
        </div>

        <div>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="">All Severity Levels</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
      </form>

      {/* Logs Table */}
      <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={5} />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={Terminal}
            title="No system logs found"
            description="System events and node heartbeats will appear here automatically."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#111a2e] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1e293b]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Origin Node</th>
                  <th className="py-3 px-4">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/50">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-[#111a2e]/50 transition-colors">
                    <td className="py-2.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getLevelBadge(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-cyan-300">
                      {log.logType}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-medium">
                      {log.nodeId}
                    </td>
                    <td className="py-2.5 px-4 text-slate-200">
                      {log.message}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <span className="block text-[10px] text-slate-500 font-mono truncate max-w-xl">
                          {JSON.stringify(log.details)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
