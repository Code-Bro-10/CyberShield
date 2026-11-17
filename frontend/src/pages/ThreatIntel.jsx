import React, { useEffect, useState } from 'react';
import {
  Crosshair,
  Plus,
  Search,
  Filter,
  Shield,
  Trash2,
  CheckCircle,
  ExternalLink,
  Share2,
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { SeverityBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { formatDateTime, formatTimeAgo } from '../utils/formatters';

export const ThreatIntel = () => {
  const { socket } = useSocket();
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form fields
  const [formType, setFormType] = useState('IP');
  const [formValue, setFormValue] = useState('');
  const [formSeverity, setFormSeverity] = useState('High');
  const [formConfidence, setFormConfidence] = useState(85);
  const [formSource, setFormSource] = useState('Analyst Triage');
  const [formDesc, setFormDesc] = useState('');

  const fetchThreatIntel = async () => {
    try {
      const res = await api.get('/threat-intelligence?limit=100');
      if (res.success && res.indicators) {
        setIndicators(res.indicators);
      }
    } catch (err) {
      console.error('Error fetching threat intel:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreatIntel();

    if (!socket) return;

    const onNewIntel = (newRec) => {
      setIndicators((prev) => [newRec, ...prev.filter((i) => i._id !== newRec._id)]);
    };

    socket.on('new_threat_intel', onNewIntel);

    return () => {
      socket.off('new_threat_intel', onNewIntel);
    };
  }, [socket]);

  const handleAddIndicator = async (e) => {
    e.preventDefault();
    if (!formValue) return;

    try {
      const res = await api.post('/threat-intelligence', {
        indicatorType: formType,
        indicatorValue: formValue,
        severity: formSeverity,
        confidence: Number(formConfidence),
        source: formSource,
        description: formDesc || 'Distributed IOC Catalog entry',
      });

      if (res.success) {
        setIsModalOpen(false);
        setFormValue('');
        setFormDesc('');
        fetchThreatIntel();
      }
    } catch (err) {
      alert(err.message || 'Failed to save threat indicator');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this threat intelligence indicator?')) return;
    try {
      await api.delete(`/threat-intelligence/${id}`);
      setIndicators((prev) => prev.filter((i) => i._id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete indicator');
    }
  };

  const filtered = indicators.filter((item) => {
    if (typeFilter && item.indicatorType !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        item.indicatorValue?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.source?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d1424] border border-[#1e293b] p-5 rounded-xl">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-cyan-400" />
            Distributed Threat Intelligence & IOC Repository
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Global catalog of malicious IPs, C2 domains, and file hashes shared autonomously across all cluster nodes.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 transition-colors shrink-0"
        >
          <Share2 className="w-4 h-4" />
          <span>Publish IOC to Cluster</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0d1424] border border-[#1e293b] p-3 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search indicator, hash, source..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="">All Indicator Types</option>
            <option value="IP">IP Address</option>
            <option value="DOMAIN">C2 Domain</option>
            <option value="HASH_SHA256">SHA-256 Hash</option>
            <option value="URL">Malicious URL</option>
          </select>
          <span className="text-xs font-mono text-slate-400">
            {filtered.length} Indicators
          </span>
        </div>
      </div>

      {/* Threat Intel Table */}
      <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={7} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Crosshair}
            title="No threat indicators match query"
            description="Add known malicious IPs or file hashes to synchronize with all connected sensors."
            actionLabel="Add Threat Indicator"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111a2e] text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-[#1e293b]">
                <tr>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Indicator Value</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Detection Count</th>
                  <th className="py-3 px-4">Seen On Nodes</th>
                  <th className="py-3 px-4">Last Seen</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/50 font-mono">
                {filtered.map((item) => (
                  <tr key={item._id} className="hover:bg-[#111a2e]/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-cyan-400">
                      <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-[10px]">
                        {item.indicatorType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-amber-300">
                      {item.indicatorValue}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {item.description}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <SeverityBadge severity={item.severity} />
                    </td>
                    <td className="py-3.5 px-4 font-bold text-cyan-400">
                      {item.confidence}%
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{item.source}</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">
                      {item.detectionCount} hits
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {item.associatedNodes?.length > 0 ? (
                        item.associatedNodes.join(', ')
                      ) : (
                        <span className="text-slate-600">Pending hits</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {formatTimeAgo(item.lastSeen)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                        title="Delete IOC"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Indicator Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Publish Threat Indicator to Cluster"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAddIndicator} className="space-y-4">
          <p className="text-xs text-slate-400">
            Approved indicators are instantly synchronized with all edge agents for automated threat correlation.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Indicator Type *
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="IP">IP Address</option>
                <option value="DOMAIN">C2 Domain</option>
                <option value="HASH_SHA256">SHA-256 Hash</option>
                <option value="URL">Malicious URL</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Threat Severity *
              </label>
              <select
                value={formSeverity}
                onChange={(e) => setFormSeverity(e.target.value)}
                className="w-full px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Indicator Value *
            </label>
            <input
              type="text"
              required
              placeholder={
                formType === 'IP'
                  ? 'e.g. 198.51.100.45'
                  : formType === 'HASH_SHA256'
                  ? '64-character SHA256 hex string'
                  : 'domain.com or full URL'
              }
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              className="w-full px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Confidence ({formConfidence}%)
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={formConfidence}
                onChange={(e) => setFormConfidence(e.target.value)}
                className="w-full accent-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Feed / Attribution Source
              </label>
              <input
                type="text"
                value={formSource}
                onChange={(e) => setFormSource(e.target.value)}
                className="w-full px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Threat Description
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Observed in Mirai botnet reconnaissance or credential harvesting"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="pt-3 border-t border-[#1e293b] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Publish Indicator
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
