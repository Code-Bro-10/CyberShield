import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Shield,
  Layers,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import api from '../services/api';
import { SeverityBadge } from '../components/Badge';
import { TableSkeleton, CardSkeleton } from '../components/LoadingSkeleton';

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export const AttackAnalytics = () => {
  const [data, setData] = useState(null);
  const [nodeStats, setNodeStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const [attacksRes, nodesRes] = await Promise.all([
        api.get('/analytics/attacks'),
        api.get('/analytics/nodes'),
      ]);

      if (attacksRes.success) setData(attacksRes);
      if (nodesRes.success) setNodeStats(nodesRes.nodes || []);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d1424] border border-[#1e293b] p-5 rounded-xl">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Cyberattack & Telemetry Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated trends, attack vectors, top adversary IPs, and multi-detector effectiveness.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="p-2 bg-[#17233d] border border-[#1e293b] hover:border-cyan-500/30 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          {/* Charts Row 1: Attack Category & Severity Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown Bar Chart */}
            <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-white tracking-wide mb-1 flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                Attack Vector Distribution
              </h3>
              <p className="text-xs text-slate-400 mb-4">Total detected incidents grouped by classification</p>

              <div className="h-64 w-full">
                {data?.categories?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.categories} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="category" stroke="#94a3b8" fontSize={10} angle={-15} textAnchor="end" />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#070b14', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                        {data.categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                    No attack data recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Node-wise Volume */}
            <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-white tracking-wide mb-1 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Sensor Node Telemetry Volume
              </h3>
              <p className="text-xs text-slate-400 mb-4">Events processed per distributed sensor</p>

              <div className="h-64 w-full">
                {nodeStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={nodeStats} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                      <YAxis type="category" dataKey="nodeId" stroke="#cbd5e1" fontSize={10} width={130} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#070b14', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="eventsCount" fill="#06b6d4" name="Events Handled" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                    No node telemetry recorded yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Top Adversary IPs & Detection Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Threat Source IPs */}
            <div className="lg:col-span-2 bg-[#0d1424] border border-[#1e293b] rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-white tracking-wide mb-1">
                Top Malicious Source IPs
              </h3>
              <p className="text-xs text-slate-400 mb-4">Adversary infrastructure generating the highest volume of alerts</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111a2e] text-slate-400 uppercase text-[10px] font-mono border-b border-[#1e293b]">
                    <tr>
                      <th className="py-2.5 px-4">Adversary Source IP</th>
                      <th className="py-2.5 px-4">Alerts Triggered</th>
                      <th className="py-2.5 px-4">Max Severity</th>
                      <th className="py-2.5 px-4 text-right">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]/50 font-mono">
                    {data?.topSourceIPs?.length > 0 ? (
                      data.topSourceIPs.map((ip) => (
                        <tr key={ip.ip} className="hover:bg-[#111a2e]/50">
                          <td className="py-2.5 px-4 text-amber-300 font-bold">{ip.ip}</td>
                          <td className="py-2.5 px-4 text-white font-bold">{ip.count} alerts</td>
                          <td className="py-2.5 px-4">
                            <SeverityBadge severity={ip.severity} />
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-red-400">
                            HIGH RISK
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-500 font-mono">
                          No attacking source IPs cataloged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detection Methods Breakdown */}
            <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-white tracking-wide mb-1">
                Detection Engines
              </h3>
              <p className="text-xs text-slate-400 mb-4">Hits by detection layer</p>

              <div className="space-y-3">
                {data?.detectionMethods?.map((d, idx) => (
                  <div key={d.method} className="p-3 bg-[#111a2e]/60 rounded-lg border border-[#1e293b]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-200">{d.method}</span>
                      <span className="font-mono text-cyan-400 font-bold">{d.count} hits</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (d.count / (data.detectionMethods[0]?.count || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
