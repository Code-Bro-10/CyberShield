import React, { useEffect, useState, useRef } from 'react';
import {
  Activity,
  Play,
  Pause,
  Filter,
  Search,
  Download,
  Info,
  Shield,
  Layers,
  Clock,
  Eye,
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { SeverityBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { formatDateTime, formatTimeAgo } from '../utils/formatters';

export const LiveMonitoring = () => {
  const { socket } = useSocket();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedNode, setSelectedNode] = useState('');
  const [availableNodes, setAvailableNodes] = useState([]);

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const fetchInitialEvents = async () => {
    try {
      const res = await api.get('/events?limit=100');
      if (res.success && res.events) {
        setEvents(res.events);
      }
      const nodesRes = await api.get('/nodes');
      if (nodesRes.success && nodesRes.nodes) {
        setAvailableNodes(nodesRes.nodes);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialEvents();

    if (!socket) return;

    const onNewEvent = (newEvent) => {
      if (!isPausedRef.current) {
        setEvents((prev) => [newEvent, ...prev.slice(0, 199)]);
      }
    };

    socket.on('new_event', onNewEvent);

    return () => {
      socket.off('new_event', onNewEvent);
    };
  }, [socket]);

  // Client-side filtering
  const filteredEvents = events.filter((evt) => {
    if (selectedSeverity && evt.severity !== selectedSeverity) return false;
    if (selectedMethod && evt.detectionMethod !== selectedMethod) return false;
    if (selectedNode && evt.nodeId !== selectedNode) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        evt.eventId?.toLowerCase().includes(q) ||
        evt.eventType?.toLowerCase().includes(q) ||
        evt.sourceIP?.toLowerCase().includes(q) ||
        evt.destinationIP?.toLowerCase().includes(q) ||
        evt.nodeId?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Action Header & Stream Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d1424] border border-[#1e293b] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span
              className={`w-3 h-3 rounded-full block ${
                isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
              }`}
            />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              Distributed Live Security Event Feed
              {isPaused && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono border border-amber-500/30">
                  STREAM PAUSED
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Capturing Suricata EVE, Zeek logs, ML anomaly telemetry, and host rule probes
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 border transition-colors ${
              isPaused
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'RESUME STREAM' : 'PAUSE STREAM'}</span>
          </button>

          <span className="text-xs font-mono text-slate-400">
            Buffer: <strong className="text-cyan-400">{filteredEvents.length}</strong> events
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-[#0d1424] border border-[#1e293b] p-3 rounded-xl">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search IP, eventId, eventType..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Node Filter */}
        <div>
          <select
            value={selectedNode}
            onChange={(e) => setSelectedNode(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="">All Monitoring Nodes</option>
            {availableNodes.map((n) => (
              <option key={n.nodeId} value={n.nodeId}>
                {n.nodeId}
              </option>
            ))}
          </select>
        </div>

        {/* Severity Filter */}
        <div>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="Informational">Informational</option>
          </select>
        </div>

        {/* Method Filter */}
        <div>
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="">All Detectors</option>
            <option value="RULE_BASED">Rule Based</option>
            <option value="MACHINE_LEARNING">Machine Learning</option>
            <option value="THREAT_INTEL">Threat Intel Feed</option>
            <option value="SURICATA_EVE">Suricata EVE</option>
            <option value="ZEEK_LOG">Zeek Network Log</option>
          </select>
        </div>
      </div>

      {/* Events Stream Table */}
      <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={7} />
          </div>
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            title="No events matching criteria"
            description="Adjust your search filters or start the simulation mode to inject safe synthetic events."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111a2e] text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-[#1e293b]">
                <tr>
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Sensor Node</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Source IP</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/50 font-mono">
                {filteredEvents.map((evt) => (
                  <tr
                    key={evt.eventId}
                    onClick={() => setSelectedEvent(evt)}
                    className="hover:bg-[#111a2e]/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-cyan-400 font-medium">
                      {evt.eventId.substring(0, 16)}...
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {formatDateTime(evt.timestamp)}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{evt.nodeId}</td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {evt.eventType}
                    </td>
                    <td className="py-3 px-4 text-amber-300 font-bold">{evt.sourceIP}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {evt.destinationIP}:{evt.destinationPort || 'any'} ({evt.protocol})
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                        {evt.detectionMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={evt.severity} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(evt);
                        }}
                        className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raw Payload Inspector Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={`Security Event Inspector: ${selectedEvent?.eventId}`}
        maxWidth="max-w-3xl"
      >
        {selectedEvent && (
          <div className="space-y-4 font-mono text-xs">
            {/* Metadata Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-[#111a2e] rounded-lg border border-[#1e293b]">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Severity</span>
                <SeverityBadge severity={selectedEvent.severity} className="mt-1" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Confidence</span>
                <span className="font-bold text-cyan-400">
                  {((selectedEvent.confidence || 0.5) * 100).toFixed(0)}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Protocol</span>
                <span className="text-slate-200">{selectedEvent.protocol}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Method</span>
                <span className="text-slate-300">{selectedEvent.detectionMethod}</span>
              </div>
            </div>

            {/* Connection Information */}
            <div className="p-3 bg-[#111a2e] rounded-lg border border-[#1e293b] space-y-2">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Connection Context
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>Source IP: <strong className="text-amber-300">{selectedEvent.sourceIP}</strong></div>
                <div>Source Port: <span className="text-slate-400">{selectedEvent.sourcePort || 'None'}</span></div>
                <div>Destination IP: <span className="text-slate-200">{selectedEvent.destinationIP}</span></div>
                <div>Destination Port: <span className="text-cyan-300 font-bold">{selectedEvent.destinationPort || 'None'}</span></div>
                <div>Sensor Node: <span className="text-slate-200">{selectedEvent.nodeId}</span></div>
                <div>Timestamp: <span className="text-slate-400">{formatDateTime(selectedEvent.timestamp)}</span></div>
              </div>
            </div>

            {/* Raw JSON Payload */}
            <div>
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Raw Event Payload & Metadata
              </div>
              <pre className="p-4 bg-[#070b14] border border-[#1e293b] rounded-lg overflow-x-auto text-emerald-400 text-[11px] leading-relaxed max-h-72">
                {JSON.stringify({
                  eventId: selectedEvent.eventId,
                  nodeId: selectedEvent.nodeId,
                  eventType: selectedEvent.eventType,
                  detectionMethod: selectedEvent.detectionMethod,
                  severity: selectedEvent.severity,
                  confidence: selectedEvent.confidence,
                  metadata: selectedEvent.metadata,
                  rawPayload: selectedEvent.rawPayload,
                }, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
