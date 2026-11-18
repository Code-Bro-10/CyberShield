import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Ban,
  Zap,
  Lock,
  Globe,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Terminal,
  Activity,
  Layers,
  ExternalLink,
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Modal } from '../components/Modal';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { formatDateTime, formatTimeAgo } from '../utils/formatters';

export const ActiveDefense = ({ onOpenDefenseModal }) => {
  const { socket } = useSocket();
  const [defenses, setDefenses] = useState([]);
  const [stats, setStats] = useState({
    activeCount: 0,
    blockedIPCount: 0,
    quarantinedHashCount: 0,
    rateLimitCount: 0,
  });
  const [playbooks, setPlaybooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);

  // Manual defense form modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualTarget, setManualTarget] = useState('');
  const [manualCategory, setManualCategory] = useState('Brute Force');
  const [manualType, setManualType] = useState('BLOCK_IP');
  const [manualAction, setManualAction] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  const fetchDefenses = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (search) params.append('search', search);

      const res = await api.get(`/security/defenses?${params.toString()}`);
      if (res.success) {
        setDefenses(res.defenses || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load active defenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaybooks = async () => {
    try {
      const res = await api.get('/security/playbooks');
      if (res.success && res.playbooks) {
        setPlaybooks(res.playbooks);
      }
    } catch (err) {
      console.error('Failed to load security playbooks:', err);
    }
  };

  useEffect(() => {
    fetchDefenses();
    fetchPlaybooks();
  }, [statusFilter, categoryFilter]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;

    const onDefenseApplied = (data) => {
      const newDef = data.defense;
      setDefenses((prev) => [newDef, ...prev.filter((d) => d.defenseId !== newDef.defenseId)]);
      setStats((prev) => ({
        ...prev,
        activeCount: prev.activeCount + 1,
        blockedIPCount: newDef.defenseType === 'BLOCK_IP' ? prev.blockedIPCount + 1 : prev.blockedIPCount,
        quarantinedHashCount: newDef.defenseType === 'QUARANTINE_HASH' ? prev.quarantinedHashCount + 1 : prev.quarantinedHashCount,
        rateLimitCount: newDef.defenseType === 'RATE_LIMIT' ? prev.rateLimitCount + 1 : prev.rateLimitCount,
      }));
    };

    const onDefenseRevoked = (data) => {
      setDefenses((prev) =>
        prev.map((d) => (d.defenseId === data.defenseId ? { ...d, status: 'Revoked' } : d))
      );
      setStats((prev) => ({
        ...prev,
        activeCount: Math.max(0, prev.activeCount - 1),
      }));
    };

    socket.on('defense_applied', onDefenseApplied);
    socket.on('defense_revoked', onDefenseRevoked);

    return () => {
      socket.off('defense_applied', onDefenseApplied);
      socket.off('defense_revoked', onDefenseRevoked);
    };
  }, [socket]);

  const handleRevoke = async (defenseId) => {
    if (!window.confirm(`Are you sure you want to revoke defense ${defenseId}? This will remove the firewall block.`)) {
      return;
    }

    try {
      await api.delete(`/security/defenses/${defenseId}`);
      setDefenses((prev) =>
        prev.map((d) => (d.defenseId === defenseId ? { ...d, status: 'Revoked' } : d))
      );
      setStats((prev) => ({ ...prev, activeCount: Math.max(0, prev.activeCount - 1) }));
    } catch (err) {
      alert(`Error revoking defense: ${err.message}`);
    }
  };

  const handleCreateManualDefense = async (e) => {
    e.preventDefault();
    if (!manualTarget.trim()) return;

    setSubmittingManual(true);
    try {
      const res = await api.post('/security/apply', {
        target: manualTarget.trim(),
        category: manualCategory,
        defenseType: manualType,
        actionTaken: manualAction.trim() || `Manual ${manualType} applied for ${manualTarget}`,
        notes: manualNotes.trim(),
      });

      if (res.success) {
        setIsManualModalOpen(false);
        setManualTarget('');
        setManualAction('');
        setManualNotes('');
        fetchDefenses();
      }
    } catch (err) {
      alert(err.message || 'Failed to apply security defense');
    } finally {
      setSubmittingManual(false);
    }
  };

  const filteredDefenses = defenses.filter((def) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      def.defenseId?.toLowerCase().includes(q) ||
      def.target?.toLowerCase().includes(q) ||
      def.actionTaken?.toLowerCase().includes(q) ||
      def.appliedBy?.toLowerCase().includes(q) ||
      def.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0d1424] border border-[#1e293b] flex items-center justify-between shadow-lg shadow-cyan-950/10">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Active Countermeasures
            </span>
            <span className="text-2xl font-bold font-mono text-cyan-400 block mt-1">
              {stats.activeCount}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Enforced across edge sensors</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0d1424] border border-[#1e293b] flex items-center justify-between shadow-lg shadow-cyan-950/10">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Blocked Attacker IPs
            </span>
            <span className="text-2xl font-bold font-mono text-red-400 block mt-1">
              {stats.blockedIPCount}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Perimeter drops & blackholes</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <Ban className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0d1424] border border-[#1e293b] flex items-center justify-between shadow-lg shadow-cyan-950/10">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Quarantined Hashes
            </span>
            <span className="text-2xl font-bold font-mono text-purple-400 block mt-1">
              {stats.quarantinedHashCount}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">EDR & Defender signatures</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0d1424] border border-[#1e293b] flex items-center justify-between shadow-lg shadow-cyan-950/10">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Rate Limits & Clamping
            </span>
            <span className="text-2xl font-bold font-mono text-amber-400 block mt-1">
              {stats.rateLimitCount}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">SYN floods & brute throttles</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Controls & Search Filter */}
      <div className="p-4 rounded-xl bg-[#0d1424] border border-[#1e293b] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter defenses by target IP, hash, ID, or operator..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#090d19] border border-[#1e293b] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-[#090d19] border border-[#1e293b] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Revoked">Revoked</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="py-2 px-3 bg-[#090d19] border border-[#1e293b] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="">All Attack Categories</option>
            <option value="Brute Force">Brute Force</option>
            <option value="Port Scan">Port Scan</option>
            <option value="DDoS / Traffic Anomaly">DDoS / Traffic Anomaly</option>
            <option value="Suspicious IP">Suspicious IP</option>
            <option value="Malware Indicator">Malware Indicator</option>
            <option value="Network Anomaly">Network Anomaly</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={() => fetchDefenses()}
            className="p-2 rounded-lg bg-[#111a2e] hover:bg-[#1e293b] text-slate-300 hover:text-white border border-[#1e293b] transition-colors cursor-pointer"
            title="Refresh active defenses"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium font-mono bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-950/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Deploy Manual Defense
          </button>
        </div>
      </div>

      {/* Active Defenses Table */}
      <div className="rounded-xl bg-[#0d1424] border border-[#1e293b] overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[#1e293b] bg-[#111a2e]/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Deployed Security Defenses & Firewall Rules
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {filteredDefenses.length} rules recorded
          </span>
        </div>

        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} />
          </div>
        ) : filteredDefenses.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={ShieldCheck}
              title="No Security Defenses Match Filter"
              description="No active or revoked security countermeasures found matching your current filter criteria."
              actionLabel="Deploy First Defense"
              onAction={() => setIsManualModalOpen(true)}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#090d19] text-[11px] font-mono uppercase text-slate-400 border-b border-[#1e293b]">
                <tr>
                  <th className="py-3 px-4">Defense ID</th>
                  <th className="py-3 px-4">Attack Category</th>
                  <th className="py-3 px-4">Target (IP / Hash)</th>
                  <th className="py-3 px-4">Defense Type</th>
                  <th className="py-3 px-4">Action Taken</th>
                  <th className="py-3 px-4">Applied At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60 font-mono">
                {filteredDefenses.map((def) => {
                  const isActive = def.status === 'Active';

                  return (
                    <tr
                      key={def.defenseId}
                      className="hover:bg-[#111a2e]/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-cyan-400">
                        {def.defenseId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {def.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-200">
                        {def.target}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            def.defenseType === 'BLOCK_IP'
                              ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                              : def.defenseType === 'QUARANTINE_HASH'
                              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                              : def.defenseType === 'RATE_LIMIT'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          {def.defenseType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-300 font-sans">
                        {def.actionTaken}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {formatTimeAgo(def.appliedAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                            Revoked
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isActive ? (
                          <button
                            onClick={() => handleRevoke(def.defenseId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Revoke / Unblock
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500">Revoked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incident Response Playbooks Reference Cards */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              CyberAttack Defense Playbooks & Standard Operating Procedures
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            6 Threat Categories Covered
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playbooks.map((pb) => (
            <div
              key={pb.category}
              className="p-4 rounded-xl bg-[#0d1424] border border-[#1e293b] hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    {pb.category}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold uppercase ${
                      pb.severity === 'Critical'
                        ? 'text-red-400'
                        : pb.severity === 'High'
                        ? 'text-orange-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {pb.severity} Severity
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-200">{pb.title}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  {pb.description}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#1e293b]">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  Automated Mitigations:
                </span>
                <div className="space-y-1">
                  {pb.mitigations?.map((m) => (
                    <div
                      key={m.id}
                      className="text-[11px] text-slate-300 font-mono flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>{m.title}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <div className="text-[10px] font-mono text-slate-400 bg-[#050811] p-2 rounded border border-[#1e293b] truncate">
                    <code>{pb.recommendedCommand}</code>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Defense Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Deploy Custom Security Defense Countermeasure"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateManualDefense} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-slate-400 uppercase tracking-wider text-[10px] mb-1">
              Target Entity (IP Address, SHA-256 Hash, or Hostname) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 198.51.100.99 or e3b0c44298fc1c149..."
              value={manualTarget}
              onChange={(e) => setManualTarget(e.target.value)}
              className="w-full px-3 py-2 bg-[#090d19] border border-[#1e293b] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Attack Category
              </label>
              <select
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[#090d19] border border-[#1e293b] rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="Brute Force">Brute Force</option>
                <option value="Port Scan">Port Scan</option>
                <option value="DDoS / Traffic Anomaly">DDoS / Traffic Anomaly</option>
                <option value="Suspicious IP">Suspicious IP</option>
                <option value="Malware Indicator">Malware Indicator</option>
                <option value="Network Anomaly">Network Anomaly</option>
                <option value="Manual">Manual Triage</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Defense Action Type
              </label>
              <select
                value={manualType}
                onChange={(e) => setManualType(e.target.value)}
                className="w-full px-3 py-2 bg-[#090d19] border border-[#1e293b] rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="BLOCK_IP">BLOCK_IP (Firewall Drop)</option>
                <option value="RATE_LIMIT">RATE_LIMIT (Traffic Throttling)</option>
                <option value="QUARANTINE_HASH">QUARANTINE_HASH (EDR Blacklist)</option>
                <option value="ENABLE_SYN_COOKIES">ENABLE_SYN_COOKIES</option>
                <option value="PROPAGATE_IOC">PROPAGATE_IOC (Cluster Feed)</option>
                <option value="ISOLATE_HOST">ISOLATE_HOST (LAN Containment)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 uppercase tracking-wider text-[10px] mb-1">
              Action Description
            </label>
            <input
              type="text"
              placeholder="e.g. Immediate perimeter drop for repeated SSH failure"
              value={manualAction}
              onChange={(e) => setManualAction(e.target.value)}
              className="w-full px-3 py-2 bg-[#090d19] border border-[#1e293b] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 uppercase tracking-wider text-[10px] mb-1">
              Operational Notes (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Provide context or authorization ticket reference..."
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              className="w-full px-3 py-2 bg-[#090d19] border border-[#1e293b] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#1e293b]">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-[#111a2e] hover:bg-[#1e293b] text-slate-300 text-xs font-sans transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingManual}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-mono font-medium shadow-md shadow-cyan-950/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {submittingManual ? 'Deploying...' : 'Deploy Countermeasure'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
