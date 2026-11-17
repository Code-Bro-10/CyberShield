import React, { useEffect, useState } from 'react';
import {
  Server,
  Activity,
  ShieldAlert,
  AlertTriangle,
  Radio,
  Flame,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { StatCard } from '../components/StatCard';
import { SeverityBadge, StatusBadge } from '../components/Badge';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { formatDateTime, formatTimeAgo } from '../utils/formatters';

const SEVERITY_COLORS = {
  Critical: '#ef4444',
  High: '#f59e0b',
  Medium: '#eab308',
  Low: '#06b6d4',
  Informational: '#64748b',
};

export const Overview = ({ onNavigate }) => {
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [attackData, setAttackData] = useState({ categories: [], severities: [], topSourceIPs: [] });
  const [recentEvents, setRecentEvents] = useState([]);
  const [nodes, setNodes] = useState([]);

  const fetchData = async () => {
    try {
      const [overviewRes, attacksRes, eventsRes, nodesRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/attacks'),
        api.get('/events?limit=8'),
        api.get('/nodes'),
      ]);

      if (overviewRes.success) setStats(overviewRes.stats);
      if (attacksRes.success) setAttackData(attacksRes);
      if (eventsRes.success) setRecentEvents(eventsRes.events || []);
      if (nodesRes.success) setNodes(nodesRes.nodes || []);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (!socket) return;

    const onSocUpdate = () => fetchData();
    const onNewEvent = (event) => {
      setRecentEvents((prev) => [event, ...prev.slice(0, 7)]);
      setStats((prev) => prev ? { ...prev, totalEvents: (prev.totalEvents || 0) + 1 } : prev);
    };

    socket.on('soc_stats_update', onSocUpdate);
    socket.on('new_event', onNewEvent);

    return () => {
      socket.off('soc_stats_update', onSocUpdate);
      socket.off('new_event', onNewEvent);
    };
  }, [socket]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0d1424] to-[#111a2e] border border-[#1e293b] p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Cluster Defense Grid Active
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Monitoring distributed network nodes and streaming detection events across Redis Streams.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData()}
            className="p-2 bg-[#17233d] border border-[#1e293b] hover:border-cyan-500/30 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
          <button
            onClick={() => onNavigate('simulation')}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-lg text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all"
          >
            <Flame className="w-4 h-4 text-amber-300" />
            <span>Launch Attack Simulation</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monitored Nodes"
          value={stats ? `${stats.onlineNodes} / ${stats.totalNodes}` : '0'}
          subtext={`${stats?.offlineNodes || 0} nodes offline`}
          icon={Server}
          accentColor="cyan"
          loading={loading}
          onClick={() => onNavigate('nodes')}
        />
        <StatCard
          title="Security Events"
          value={stats?.totalEvents?.toLocaleString() || '0'}
          subtext="Processed in Redis Stream"
          icon={Activity}
          accentColor="emerald"
          loading={loading}
          onClick={() => onNavigate('monitoring')}
        />
        <StatCard
          title="Detected Attacks"
          value={stats?.totalAlerts?.toLocaleString() || '0'}
          subtext={`${stats?.criticalAlerts || 0} Critical Severity`}
          icon={ShieldAlert}
          accentColor="red"
          loading={loading}
          onClick={() => onNavigate('incidents')}
        />
        <StatCard
          title="Active Incidents"
          value={stats?.activeIncidents || '0'}
          subtext={`${stats?.openAlerts || 0} alerts awaiting triage`}
          icon={AlertTriangle}
          accentColor="amber"
          loading={loading}
          onClick={() => onNavigate('incidents')}
        />
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attack Categories Breakdown */}
        <div className="lg:col-span-2 bg-[#0d1424] border border-[#1e293b] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Detected Attack Categories
              </h3>
              <p className="text-xs text-slate-400">Distribution across active monitoring nodes</p>
            </div>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono"
            >
              Full Analytics <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            {attackData.categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attackData.categories} layout="vertical" margin={{ left: 30, right: 20 }}>
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis type="category" dataKey="category" stroke="#cbd5e1" fontSize={11} width={130} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#070b14', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                No attack categories recorded yet. Trigger simulation to generate events.
              </div>
            )}
          </div>
        </div>

        {/* Severity Distribution Donut */}
        <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-white tracking-wide mb-1">
            Severity Breakdown
          </h3>
          <p className="text-xs text-slate-400 mb-4">Threat classification levels</p>

          <div className="h-52 w-full flex items-center justify-center">
            {attackData.severities.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attackData.severities}
                    dataKey="count"
                    nameKey="severity"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {attackData.severities.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={SEVERITY_COLORS[entry.severity] || '#64748b'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#070b14', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500 font-mono">No severity telemetry yet.</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-[#1e293b]/60">
            {attackData.severities.map((item) => (
              <div key={item.severity} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: SEVERITY_COLORS[item.severity] || '#64748b' }}
                  />
                  <span className="text-slate-300">{item.severity}</span>
                </div>
                <span className="font-mono font-semibold text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Connected Nodes & Recent Events Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Node Health Matrix */}
        <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Monitoring Sensors
            </h3>
            <span className="text-xs font-mono text-cyan-400">{nodes.length} Registered</span>
          </div>

          <div className="space-y-3">
            {nodes.slice(0, 4).map((node) => (
              <div
                key={node.nodeId}
                className="p-3 bg-[#111a2e]/60 border border-[#1e293b] rounded-lg flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-slate-200">
                      {node.nodeId}
                    </span>
                    <StatusBadge status={node.status} />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    {node.ipAddress} • {node.operatingSystem.split(' ')[0]}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-cyan-400">
                    {node.eventsCount || 0} evts
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {formatTimeAgo(node.lastHeartbeat)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Security Events Stream */}
        <div className="lg:col-span-2 bg-[#0d1424] border border-[#1e293b] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Live Ingested Security Events
              </h3>
            </div>
            <button
              onClick={() => onNavigate('monitoring')}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono"
            >
              Open Live Monitor <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111a2e] text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-[#1e293b]">
                <tr>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Node</th>
                  <th className="py-2.5 px-3">Source IP</th>
                  <th className="py-2.5 px-3">Target</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/50">
                {recentEvents.length > 0 ? (
                  recentEvents.map((evt) => (
                    <tr key={evt.eventId} className="hover:bg-[#111a2e]/50 font-mono transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-cyan-300">
                        {evt.eventType}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{evt.nodeId}</td>
                      <td className="py-2.5 px-3 text-amber-300 font-mono">{evt.sourceIP}</td>
                      <td className="py-2.5 px-3 text-slate-300 font-mono">
                        {evt.destinationIP}:{evt.destinationPort || 'any'}
                      </td>
                      <td className="py-2.5 px-3">
                        <SeverityBadge severity={evt.severity} />
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                        {formatTimeAgo(evt.timestamp)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                      No events in buffer. Run the simulator or connect an agent to see real-time streaming.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
