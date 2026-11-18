import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  User,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Send,
  Eye,
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { SeverityBadge, StatusBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { formatDateTime, formatTimeAgo } from '../utils/formatters';

export const IncidentCenter = ({ onOpenDefenseModal }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Selected incident for detail view
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [incidentDetail, setIncidentDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [newNote, setNewNote] = useState('');

  // Create incident modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSeverity, setNewSeverity] = useState('High');

  const fetchIncidents = async () => {
    try {
      const res = await api.get('/incidents');
      if (res.success && res.incidents) {
        setIncidents(res.incidents);
      }
    } catch (err) {
      console.error('Error fetching incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();

    if (!socket) return;

    const onNewIncident = (inc) => {
      setIncidents((prev) => [inc, ...prev.filter((i) => i.incidentId !== inc.incidentId)]);
    };

    const onIncidentUpdated = (inc) => {
      setIncidents((prev) =>
        prev.map((i) => (i.incidentId === inc.incidentId ? inc : i))
      );
      if (selectedIncident?.incidentId === inc.incidentId) {
        setIncidentDetail((prev) => ({ ...prev, incident: inc }));
      }
    };

    socket.on('new_incident', onNewIncident);
    socket.on('incident_updated', onIncidentUpdated);

    return () => {
      socket.off('new_incident', onNewIncident);
      socket.off('incident_updated', onIncidentUpdated);
    };
  }, [socket, selectedIncident]);

  const openIncidentDetails = async (incident) => {
    setSelectedIncident(incident);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/incidents/${incident.incidentId}`);
      if (res.success) {
        setIncidentDetail(res);
      }
    } catch (err) {
      console.error('Failed to load incident details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStatusChange = async (incidentId, newStatus) => {
    try {
      const res = await api.patch(`/incidents/${incidentId}`, { status: newStatus });
      if (res.success) {
        fetchIncidents();
      }
    } catch (err) {
      alert(err.message || 'Status update failed');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedIncident) return;

    try {
      const res = await api.post(`/incidents/${selectedIncident.incidentId}/notes`, {
        message: newNote.trim(),
      });
      if (res.success) {
        setNewNote('');
        openIncidentDetails(selectedIncident);
      }
    } catch (err) {
      alert(err.message || 'Failed to add note');
    }
  };

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    if (!newTitle) return;

    try {
      const res = await api.post('/incidents', {
        title: newTitle,
        description: newDesc,
        severity: newSeverity,
        assignedTo: user?.name || 'SOC Analyst',
      });
      if (res.success) {
        setIsCreateOpen(false);
        setNewTitle('');
        setNewDesc('');
        fetchIncidents();
      }
    } catch (err) {
      alert(err.message || 'Failed to create incident');
    }
  };

  const filtered = incidents.filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        item.incidentId?.toLowerCase().includes(q) ||
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.assignedTo?.toLowerCase().includes(q);
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
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Security Incident Response Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Correlated cyber incident triage, evidence gathering, timeline investigation, and containment workflow.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-amber-600/20 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Open New Incident</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0d1424] border border-[#1e293b] p-3 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search incident ID, title, assignee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="">All Incident Statuses</option>
            <option value="New">New</option>
            <option value="Investigating">Investigating</option>
            <option value="Contained">Contained</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
          <span className="text-xs font-mono text-slate-400">
            {filtered.length} Incidents
          </span>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={4} cols={6} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No active security incidents"
            description="High-severity alerts are automatically correlated into incidents. You can also manually open an investigation."
            actionLabel="Open Incident"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111a2e] text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-[#1e293b]">
                <tr>
                  <th className="py-3 px-4">Incident ID</th>
                  <th className="py-3 px-4">Title & Scope</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Alerts Linked</th>
                  <th className="py-3 px-4">Updated</th>
                  <th className="py-3 px-4 text-center">Investigate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/50 font-mono">
                {filtered.map((inc) => (
                  <tr
                    key={inc.incidentId}
                    onClick={() => openIncidentDetails(inc)}
                    className="hover:bg-[#111a2e]/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-amber-400">
                      {inc.incidentId}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-100 font-semibold">{inc.title}</div>
                      <div className="text-[10px] text-slate-400 font-sans line-clamp-1">
                        {inc.description}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <SeverityBadge severity={inc.severity} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={inc.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-sans">
                      {inc.assignedTo || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4 text-cyan-400 font-bold">
                      {inc.relatedAlerts?.length || 0} alert(s)
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {formatTimeAgo(inc.updatedAt || inc.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openIncidentDetails(inc);
                        }}
                        className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded text-[11px] font-sans transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incident Detail & Investigation Modal */}
      <Modal
        isOpen={!!selectedIncident}
        onClose={() => {
          setSelectedIncident(null);
          setIncidentDetail(null);
        }}
        title={`Incident Investigation: ${selectedIncident?.incidentId}`}
        maxWidth="max-w-4xl"
      >
        {selectedIncident && (
          <div className="space-y-5 text-xs font-mono">
            {/* Top Overview Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#111a2e] border border-[#1e293b] rounded-lg">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Severity</span>
                <SeverityBadge severity={selectedIncident.severity} className="mt-1" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Current Status</span>
                <select
                  value={incidentDetail?.incident?.status || selectedIncident.status}
                  onChange={(e) => handleStatusChange(selectedIncident.incidentId, e.target.value)}
                  className="mt-1 px-2 py-1 bg-[#070b14] border border-[#1e293b] rounded text-xs text-cyan-400 font-bold focus:outline-none"
                >
                  <option value="New">New</option>
                  <option value="Investigating">Investigating</option>
                  <option value="Contained">Contained</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Assigned Analyst</span>
                <span className="text-slate-200 font-semibold block mt-1">
                  {selectedIncident.assignedTo || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Created At</span>
                <span className="text-slate-400 block mt-1">
                  {formatDateTime(selectedIncident.createdAt)}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="p-3 bg-[#0d1424] border border-[#1e293b] rounded-lg">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                Incident Scope & Description
              </span>
              <p className="text-slate-200 font-sans leading-relaxed">
                {selectedIncident.description}
              </p>
            </div>

            {/* Linked Alerts List */}
            <div>
              <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider block mb-2">
                Correlated Security Alerts ({incidentDetail?.alerts?.length || 0})
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {incidentDetail?.alerts?.length > 0 ? (
                  incidentDetail.alerts.map((al) => (
                    <div
                      key={al.alertId}
                      className="p-3 bg-[#111a2e] border border-[#1e293b] rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={al.severity} />
                          <span className="text-slate-100 font-semibold">{al.category}</span>
                          <span className="text-[10px] text-slate-500 font-mono">[{al.alertId}]</span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-sans mt-1">
                          {al.description}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-slate-400 font-mono shrink-0 ml-4 flex flex-col items-end gap-1.5">
                        <div>Source: <span className="text-amber-300 font-bold">{al.sourceIP}</span></div>
                        <div>Node: <span className="text-cyan-400">{al.nodeId}</span></div>
                        <button
                          type="button"
                          onClick={() => onOpenDefenseModal && onOpenDefenseModal(al)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-[10px] font-mono font-medium transition-colors cursor-pointer mt-1"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          Apply Defense
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-xs py-3 text-center">
                    No individual alerts linked directly.
                  </div>
                )}
              </div>
            </div>

            {/* Investigation Timeline Notes */}
            <div>
              <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider block mb-2">
                Investigation Notes Timeline
              </span>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1 mb-3">
                {incidentDetail?.incident?.investigationNotes?.length > 0 ? (
                  incidentDetail.incident.investigationNotes.map((note) => (
                    <div
                      key={note.noteId}
                      className="p-3 bg-[#070b14] border border-[#1e293b] rounded-lg"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-semibold text-cyan-400">{note.author}</span>
                        <span>{formatDateTime(note.timestamp)}</span>
                      </div>
                      <p className="text-slate-200 font-sans">{note.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-xs py-2 text-center">
                    No investigation notes recorded yet.
                  </div>
                )}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add triage observation, IOC finding, or containment action..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-sans font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post Note</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </Modal>

      {/* Manual Open Incident Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Open Security Incident"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateIncident} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Incident Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Distributed SSH Credential Spraying Investigation"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Initial Severity
            </label>
            <select
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value)}
              className="w-full px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Description & Objectives
            </label>
            <textarea
              rows={3}
              placeholder="Summarize the incident hypothesis, affected assets, and recommended containment steps..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="pt-3 border-t border-[#1e293b] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Create Incident
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
