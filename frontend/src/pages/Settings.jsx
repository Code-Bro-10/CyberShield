import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Shield,
  Sliders,
  Bell,
  Users,
  Server,
  CheckCircle,
  Volume2,
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { CardSkeleton } from '../components/LoadingSkeleton';

export const Settings = () => {
  const { user } = useAuth();
  const { soundEnabled, toggleSound } = useSocket();
  const [settings, setSettings] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [environment, setEnvironment] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [heartbeatTimeout, setHeartbeatTimeout] = useState(30);
  const [bruteForceThreshold, setBruteForceThreshold] = useState(5);
  const [bruteForceWindow, setBruteForceWindow] = useState(60);
  const [portScanThreshold, setPortScanThreshold] = useState(8);
  const [dosThreshold, setDosThreshold] = useState(25);
  const [autoIncidents, setAutoIncidents] = useState(true);
  const [ruleToggles, setRuleToggles] = useState({
    bruteForce: true,
    portScan: true,
    dosTraffic: true,
    suspiciousIp: true,
    malwareHash: true,
    networkAnomaly: true,
  });

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.success) {
        setSettings(res.settings);
        setUsersList(res.users || []);
        setEnvironment(res.environment || {});

        setHeartbeatTimeout(res.settings.heartbeatTimeoutSeconds || 30);
        setBruteForceThreshold(res.settings.bruteForceThreshold || 5);
        setBruteForceWindow(res.settings.bruteForceWindowSeconds || 60);
        setPortScanThreshold(res.settings.portScanUniquePortsThreshold || 8);
        setDosThreshold(res.settings.dosThresholdEvents || 25);
        setAutoIncidents(res.settings.autoIncidentCreation ?? true);
        if (res.settings.ruleToggles) setRuleToggles(res.settings.ruleToggles);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await api.post('/settings', {
        heartbeatTimeoutSeconds: Number(heartbeatTimeout),
        bruteForceThreshold: Number(bruteForceThreshold),
        bruteForceWindowSeconds: Number(bruteForceWindow),
        portScanUniquePortsThreshold: Number(portScanThreshold),
        dosThresholdEvents: Number(dosThreshold),
        autoIncidentCreation: autoIncidents,
        ruleToggles,
      });

      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRuleToggle = (ruleKey) => {
    setRuleToggles((prev) => ({
      ...prev,
      [ruleKey]: !prev[ruleKey],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d1424] border border-[#1e293b] p-5 rounded-xl">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-cyan-400" />
            System Configuration & SOC Policies
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tune detection thresholds, sensor heartbeat timeouts, alert notifications, and user access roles.
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-mono">
            <CheckCircle className="w-4 h-4" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      {loading ? (
        <CardSkeleton />
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Detection Thresholds Card */}
            <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl p-5 shadow-sm space-y-4 font-mono text-xs">
              <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2 font-sans">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Detection Engine Thresholds
              </h3>

              <div>
                <label className="text-slate-300 block mb-1">
                  Node Heartbeat Timeout Window ({heartbeatTimeout} seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={heartbeatTimeout}
                  onChange={(e) => setHeartbeatTimeout(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-slate-500">
                  Sensors that miss this timeout window will be automatically transitioned to OFFLINE.
                </span>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">
                  Brute Force Trigger Threshold ({bruteForceThreshold} failed attempts in {bruteForceWindow}s)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="3"
                    max="50"
                    placeholder="Attempts"
                    value={bruteForceThreshold}
                    onChange={(e) => setBruteForceThreshold(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="number"
                    min="10"
                    max="300"
                    placeholder="Window (s)"
                    value={bruteForceWindow}
                    onChange={(e) => setBruteForceWindow(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">
                  Port Scan Threshold ({portScanThreshold} distinct ports)
                </label>
                <input
                  type="number"
                  min="3"
                  max="100"
                  value={portScanThreshold}
                  onChange={(e) => setPortScanThreshold(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">
                  DoS Volumetric Threshold ({dosThreshold} reqs in 10s)
                </label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={dosThreshold}
                  onChange={(e) => setDosThreshold(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Rule Activation Toggles */}
            <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl p-5 shadow-sm space-y-4 text-xs">
              <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                Detection Rule Engine Modules
              </h3>
              <p className="text-slate-400 text-xs">
                Enable or disable individual detection algorithms at runtime without restarting servers.
              </p>

              <div className="divide-y divide-[#1e293b]/60">
                {[
                  { key: 'bruteForce', label: 'Brute Force Authentication Detector', desc: 'Tracks failed login frequency by source and target host' },
                  { key: 'portScan', label: 'Horizontal & Vertical Port Scan Detector', desc: 'Tracks unique destination ports accessed in sliding window' },
                  { key: 'dosTraffic', label: 'DoS / DDoS Volumetric Rate Monitor', desc: 'Identifies connection spikes and request flooding' },
                  { key: 'suspiciousIp', label: 'Threat Intelligence IOC Feed Matcher', desc: 'Correlates source IPs with central blacklist catalog' },
                  { key: 'malwareHash', label: 'Malware SHA-256 Signature Lookup', desc: 'Compares file metadata hashes with known malicious hashes' },
                  { key: 'networkAnomaly', label: 'Machine Learning Flow Anomaly Engine', desc: 'Runs Isolation Forest inference on network flow statistics' },
                ].map((rule) => (
                  <div key={rule.key} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200 block">{rule.label}</span>
                      <span className="text-[10px] text-slate-400">{rule.desc}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRuleToggle(rule.key)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        ruleToggles[rule.key] ? 'bg-cyan-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                          ruleToggles[rule.key] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User Management & Environment Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Accounts */}
            <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl p-5 shadow-sm space-y-3 text-xs">
              <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Authorized SOC Operators ({usersList.length})
              </h3>

              <div className="divide-y divide-[#1e293b]/60 font-mono">
                {usersList.map((u) => (
                  <div key={u._id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">{u.name}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-cyan-400 border border-slate-700">
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Environment Overview */}
            <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl p-5 shadow-sm space-y-3 font-mono text-xs">
              <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2 font-sans">
                <Server className="w-4 h-4 text-cyan-400" />
                Cluster Infrastructure Endpoints
              </h3>

              <div className="divide-y divide-[#1e293b]/60">
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Environment</span>
                  <span className="text-slate-200">{environment.nodeEnv || 'development'}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Backend Port</span>
                  <span className="text-cyan-400 font-bold">{environment.port || 5000}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Database Driver</span>
                  <span className="text-slate-200">{environment.mongoUri || 'MongoDB Memory/Active'}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Distributed Broker</span>
                  <span className="text-slate-200">{environment.redisUrl || 'redis://127.0.0.1:6379'}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Python ML Service</span>
                  <span className="text-purple-400">{environment.mlServiceUrl || 'http://127.0.0.1:5001'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium rounded-lg text-xs font-mono flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'SAVING...' : 'APPLY CONFIGURATION'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
