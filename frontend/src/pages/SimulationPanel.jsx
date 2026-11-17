import React, { useEffect, useState } from 'react';
import {
  Flame,
  Play,
  Pause,
  Square,
  Zap,
  Server,
  ShieldAlert,
  Activity,
  Terminal,
  Radio,
  Clock,
  CheckCircle,
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { SeverityBadge } from '../components/Badge';
import { formatDateTime, formatTimeAgo } from '../utils/formatters';

export const SimulationPanel = () => {
  const { socket } = useSocket();
  const [status, setStatus] = useState('STOPPED'); // 'RUNNING', 'PAUSED', 'STOPPED'
  const [config, setConfig] = useState({
    targetNode: 'all',
    scenario: 'all',
    frequencySec: 2,
  });
  const [generatedCount, setGeneratedCount] = useState(0);
  const [recentEvents, setRecentEvents] = useState([]);
  const [simulatedNodes, setSimulatedNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickTriggering, setQuickTriggering] = useState(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/simulation/status');
      if (res.success) {
        setStatus(res.status);
        if (res.config) setConfig(res.config);
        setGeneratedCount(res.generatedCount || 0);
        setRecentEvents(res.recentEvents || []);
        if (res.simulatedNodes) setSimulatedNodes(res.simulatedNodes);
      }
    } catch (err) {
      console.error('Failed to load simulation status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    if (!socket) return;

    const onSimStatus = (data) => {
      setStatus(data.status);
      if (data.config) setConfig(data.config);
      setGeneratedCount(data.generatedCount || 0);
      setRecentEvents(data.recentEvents || []);
    };

    socket.on('simulation_status', onSimStatus);

    return () => {
      socket.off('simulation_status', onSimStatus);
    };
  }, [socket]);

  const handleStart = async () => {
    try {
      const res = await api.post('/simulation/start', config);
      if (res.success) setStatus(res.status.status);
    } catch (err) {
      alert(err.message || 'Failed to start simulation');
    }
  };

  const handlePause = async () => {
    try {
      const res = await api.post('/simulation/pause');
      if (res.success) setStatus(res.status.status);
    } catch (err) {
      alert(err.message || 'Failed to pause simulation');
    }
  };

  const handleResume = async () => {
    try {
      const res = await api.post('/simulation/resume');
      if (res.success) setStatus(res.status.status);
    } catch (err) {
      alert(err.message || 'Failed to resume simulation');
    }
  };

  const handleStop = async () => {
    try {
      const res = await api.post('/simulation/stop');
      if (res.success) setStatus(res.status.status);
    } catch (err) {
      alert(err.message || 'Failed to stop simulation');
    }
  };

  const handleQuickTrigger = async (scenarioName) => {
    setQuickTriggering(scenarioName);
    try {
      await api.post('/simulation/trigger', {
        scenario: scenarioName,
        targetNode: config.targetNode !== 'all' ? config.targetNode : null,
      });
    } catch (err) {
      alert(err.message || 'Trigger failed');
    } finally {
      setTimeout(() => setQuickTriggering(null), 800);
    }
  };

  const scenarios = [
    {
      id: 'brute_force',
      title: '1. Brute-Force Auth Attack',
      desc: 'Rapid sequence of SSH failed password attempts from 203.0.113.88 targeting root@10.0.10.15:22.',
      severity: 'High',
      color: 'border-red-500/40 text-red-400',
    },
    {
      id: 'port_scan',
      title: '2. Port Scan Reconnaissance',
      desc: 'Sequential SYN connection probes across standard enterprise ports from 198.51.100.114.',
      severity: 'Medium',
      color: 'border-amber-500/40 text-amber-400',
    },
    {
      id: 'high_traffic_dos',
      title: '3. DoS Traffic Spike',
      desc: 'Abnormal flood rate (85 pkts/sec) targeting web endpoint /api/v1/search.',
      severity: 'High',
      color: 'border-red-500/40 text-red-400',
    },
    {
      id: 'suspicious_ip',
      title: '4. Threat Intel IOC Match',
      desc: 'Traffic originating from blacklisted Mirai Botnet C2 IP (198.51.100.45).',
      severity: 'Critical',
      color: 'border-purple-500/40 text-purple-400',
    },
    {
      id: 'network_anomaly',
      title: '5. ML Anomaly Vector',
      desc: 'Statistical flow vector deviation evaluated as Anomaly Score 0.842 by Isolation Forest.',
      severity: 'High',
      color: 'border-cyan-500/40 text-cyan-400',
    },
    {
      id: 'normal_traffic',
      title: '6. Benign Web Traffic',
      desc: 'Normal background HTTPS and DNS browsing flows from employee workstations.',
      severity: 'Informational',
      color: 'border-emerald-500/40 text-emerald-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d1424] border border-[#1e293b] p-5 rounded-xl">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            Attack Simulation & Demonstration Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Generate safe, isolated synthetic security events to demonstrate distributed event streaming, rule correlation, and ML scoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Engine State:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
              status === 'RUNNING'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                : status === 'PAUSED'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Main Simulation Control Panel */}
      <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl p-5 shadow-sm space-y-5">
        <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" />
          Continuous Generator Parameters
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Target Node */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1 font-mono">
              Target Sensor Node
            </label>
            <select
              value={config.targetNode}
              onChange={(e) => setConfig({ ...config, targetNode: e.target.value })}
              className="w-full px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="all">Round-Robin (All 3 Simulated Nodes)</option>
              {simulatedNodes.map((n) => (
                <option key={n.nodeId} value={n.nodeId}>
                  {n.nodeId} ({n.hostname})
                </option>
              ))}
            </select>
          </div>

          {/* Scenario Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1 font-mono">
              Scenario Sequence
            </label>
            <select
              value={config.scenario}
              onChange={(e) => setConfig({ ...config, scenario: e.target.value })}
              className="w-full px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="all">Dynamic Mixture (Random Realistic)</option>
              <option value="brute_force">Brute Force Auth Attack</option>
              <option value="port_scan">Horizontal Port Scan</option>
              <option value="high_traffic_dos">High-Traffic DoS Flood</option>
              <option value="suspicious_ip">Suspicious IP Threat Intel</option>
              <option value="network_anomaly">ML Network Anomaly</option>
              <option value="normal_traffic">Normal Benign Traffic</option>
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1 font-mono">
              Event Frequency ({config.frequencySec}s)
            </label>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={config.frequencySec}
              onChange={(e) => setConfig({ ...config, frequencySec: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 mt-2"
            />
          </div>
        </div>

        {/* Master Control Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-[#1e293b]/60">
          {status !== 'RUNNING' ? (
            <button
              onClick={handleStart}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-medium rounded-lg text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all font-mono"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START SIMULATION</span>
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg text-xs flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all font-mono"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>PAUSE</span>
            </button>
          )}

          {status === 'PAUSED' && (
            <button
              onClick={handleResume}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all font-mono"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>RESUME</span>
            </button>
          )}

          <button
            onClick={handleStop}
            disabled={status === 'STOPPED'}
            className="px-5 py-2.5 bg-slate-800 hover:bg-red-950/60 hover:text-red-400 hover:border-red-500/40 disabled:opacity-40 text-slate-300 border border-[#1e293b] font-medium rounded-lg text-xs flex items-center gap-2 transition-all font-mono"
          >
            <Square className="w-4 h-4" />
            <span>STOP GENERATOR</span>
          </button>

          <span className="text-xs font-mono text-slate-400 ml-auto">
            Synthetic Events Emitted: <strong className="text-cyan-400 font-bold">{generatedCount}</strong>
          </span>
        </div>
      </div>

      {/* 1-Click Scenario Quick Trigger Cards */}
      <div>
        <h3 className="text-sm font-semibold text-white tracking-wide mb-3 flex items-center gap-2 font-mono">
          <Zap className="w-4 h-4 text-amber-400" />
          Interactive 1-Click Scenario Injectors
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Click any scenario below to immediately dispatch a synthetic telemetry event into the Redis Stream and test the detection pipeline.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((sc) => (
            <div
              key={sc.id}
              className="bg-[#0d1424] border border-[#1e293b] hover:border-cyan-500/40 rounded-xl p-4 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-white tracking-wide">{sc.title}</h4>
                  <SeverityBadge severity={sc.severity} />
                </div>
                <p className="text-xs text-slate-400 font-sans leading-relaxed mb-4">
                  {sc.desc}
                </p>
              </div>

              <button
                onClick={() => handleQuickTrigger(sc.id)}
                disabled={quickTriggering === sc.id}
                className="w-full py-2 bg-[#111a2e] hover:bg-cyan-500/10 hover:border-cyan-500/30 text-cyan-400 border border-[#1e293b] rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {quickTriggering === sc.id ? 'INJECTING EVENT...' : 'INJECT SCENARIO'}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Generated Events Log Stream */}
      <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            Live Synthetic Event Output Stream
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Recent {recentEvents.length} items
          </span>
        </div>

        <div className="p-3 bg-[#070b14] border border-[#1e293b] rounded-lg overflow-x-auto max-h-60">
          {recentEvents.length > 0 ? (
            <div className="space-y-1.5 font-mono text-xs">
              {recentEvents.map((evt) => (
                <div
                  key={evt.eventId}
                  className="flex items-center gap-3 text-slate-300 hover:text-white py-1 border-b border-[#1e293b]/40"
                >
                  <span className="text-slate-500 text-[10px]">
                    {formatDateTime(evt.timestamp)}
                  </span>
                  <span className="text-cyan-400 font-bold">{evt.nodeId}</span>
                  <span className="text-slate-400">[{evt.scenario}]</span>
                  <span className="text-amber-300 font-semibold">{evt.eventType}</span>
                  <span className="text-slate-400">from {evt.sourceIP}</span>
                  <span className="ml-auto">
                    <SeverityBadge severity={evt.severity} />
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-mono py-8 text-center">
              No simulated events generated yet. Click "Start Simulation" or inject a scenario above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
