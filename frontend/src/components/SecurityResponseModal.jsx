import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { SeverityBadge } from './Badge';
import {
  ShieldAlert,
  ShieldCheck,
  Ban,
  Zap,
  Lock,
  Globe,
  Copy,
  Check,
  Terminal,
  AlertTriangle,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';
import api from '../services/api';

export const SecurityResponseModal = ({ isOpen, onClose, alert, onDefenseApplied }) => {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('iptables');
  const [copied, setCopied] = useState(false);
  const [appliedDefenses, setAppliedDefenses] = useState([]);

  useEffect(() => {
    if (!isOpen) {
      setSuccessMessage(null);
      setErrorMessage(null);
      setCopied(false);
    }
  }, [isOpen]);

  if (!alert) return null;

  // Extract key targets and category
  const category = alert.category || alert.attack_category || alert.attackType || 'Manual';
  const target =
    alert.sourceIP ||
    alert.source_ip ||
    alert.file_hash ||
    alert.indicatorValue ||
    alert.target ||
    '198.51.100.99';
  const nodeId = alert.nodeId || alert.node_id || 'cluster-wide';
  const alertId = alert.alertId || alert._id || null;
  const severity = alert.severity || 'High';
  const description = alert.description || alert.message || 'Suspicious cyber activity detected by sensor network.';

  // Determine attack-specific playbooks and recommendations
  const getCategoryDefenses = () => {
    switch (category) {
      case 'Brute Force':
        return [
          {
            type: 'BLOCK_IP',
            title: 'Perimeter IP Drop (24h Ban)',
            desc: `Deploy immediate firewall DROP rule blocking ${target} across all ingress ports.`,
            icon: Ban,
            color: 'red',
            actionTaken: `Automated 24h IP drop applied for brute-force source ${target}`,
          },
          {
            type: 'RATE_LIMIT',
            title: 'Strict Auth Rate-Limiting',
            desc: 'Limit authentication handshakes to max 5 attempts/minute with exponential backoff.',
            icon: Zap,
            color: 'amber',
            actionTaken: `Authentication rate-limiting threshold clamped for target endpoint`,
          },
          {
            type: 'PROPAGATE_IOC',
            title: 'Propagate IOC Cluster-Wide',
            desc: `Share ${target} with all distributed agent nodes to preemptively reject auth packets.`,
            icon: Globe,
            color: 'cyan',
            actionTaken: `Source IP ${target} syndicated to all distributed sensor node blocklists`,
          },
        ];

      case 'Port Scan':
        return [
          {
            type: 'BLOCK_IP',
            title: 'Stealth Scanner Drop',
            desc: `Silently discard all TCP/UDP scan probes from ${target} to eliminate service discovery.`,
            icon: Ban,
            color: 'red',
            actionTaken: `Stealth blackhole drop deployed against port scanner ${target}`,
          },
          {
            type: 'RATE_LIMIT',
            title: 'Throttle ICMP & SYN Probing',
            desc: 'Clamp TCP SYN connection rate to 5/s to nullify port-scanning sweeps.',
            icon: Zap,
            color: 'amber',
            actionTaken: `TCP SYN rate-limiting enabled at perimeter gateway`,
          },
          {
            type: 'PROPAGATE_IOC',
            title: 'Cluster Threat Intel Sync',
            desc: 'Broadcast scanning origin IP to all monitoring nodes as active reconnaissance IOC.',
            icon: Globe,
            color: 'cyan',
            actionTaken: `Reconnaissance indicator ${target} synced to cluster threat intelligence`,
          },
        ];

      case 'DDoS / Traffic Anomaly':
        return [
          {
            type: 'ENABLE_SYN_COOKIES',
            title: 'Activate TCP SYN Cookies',
            desc: 'Prevent SYN queue exhaustion by enabling cryptographic SYN cookies in the network stack.',
            icon: ShieldCheck,
            color: 'emerald',
            actionTaken: `Kernel TCP SYN Cookies activated on affected host interface`,
          },
          {
            type: 'RATE_LIMIT',
            title: 'Dynamic Traffic Shaping & Clamping',
            desc: `Limit concurrent TCP connections per origin to 25 and throttle incoming packet burst.`,
            icon: Zap,
            color: 'amber',
            actionTaken: `Dynamic connection concurrency limit enforced on ingress stream`,
          },
          {
            type: 'BLOCK_IP',
            title: 'Drop Flood Origin IP',
            desc: `Instruct border routers to null-route / drop all packets originating from ${target}.`,
            icon: Ban,
            color: 'red',
            actionTaken: `Null-route drop deployed for volumetric flood source ${target}`,
          },
        ];

      case 'Suspicious IP':
        return [
          {
            type: 'BLOCK_IP',
            title: 'Perimeter Border Gateway Drop',
            desc: `Sever all ingress and egress network communications with malicious indicator ${target}.`,
            icon: Ban,
            color: 'red',
            actionTaken: `Border gateway bidirectional block rule deployed for IOC ${target}`,
          },
          {
            type: 'PROPAGATE_IOC',
            title: 'Sync to Distributed Threat Database',
            desc: 'Elevate confidence score to 100% and notify all sensor agents in real time.',
            icon: Globe,
            color: 'cyan',
            actionTaken: `Malicious indicator ${target} marked 100% confidence cluster-wide`,
          },
          {
            type: 'ISOLATE_HOST',
            title: 'Quarantine Contacted Node',
            desc: `Isolate sensor host ${nodeId} to contain potential Command & Control persistence.`,
            icon: Lock,
            color: 'purple',
            actionTaken: `Network containment rule activated for local node ${nodeId}`,
          },
        ];

      case 'Malware Indicator':
        return [
          {
            type: 'QUARANTINE_HASH',
            title: 'Cluster-wide File Hash Quarantine',
            desc: `Register SHA-256 hash ${target.substring(0, 16)}... in EDR protection agents to block execution.`,
            icon: Lock,
            color: 'red',
            actionTaken: `SHA-256 signature ${target} blacklisted on all endpoint detection agents`,
          },
          {
            type: 'ISOLATE_HOST',
            title: 'Host Endpoint Isolation',
            desc: `Cut all network access for node ${nodeId} except secure SOC communication channel.`,
            icon: ShieldAlert,
            color: 'purple',
            actionTaken: `Host endpoint ${nodeId} quarantined from internal LAN mesh`,
          },
          {
            type: 'PROPAGATE_IOC',
            title: 'Publish Malware Hash to Threat Feed',
            desc: 'Record malicious binary hash in threat intelligence with Critical severity rating.',
            icon: Globe,
            color: 'cyan',
            actionTaken: `Malware SHA-256 hash broadcast to enterprise threat intelligence feed`,
          },
        ];

      case 'Network Anomaly':
      default:
        return [
          {
            type: 'RATE_LIMIT',
            title: 'Dynamic Traffic Throttling',
            desc: 'Shape and throttle suspicious flow to 1 Mbps while deep packet inspection runs.',
            icon: Zap,
            color: 'amber',
            actionTaken: `Bandwidth throttling policy applied for anomalous traffic flow`,
          },
          {
            type: 'BLOCK_IP',
            title: 'Precautionary Source Block',
            desc: `Temporarily block source ${target} pending forensic review of anomaly score.`,
            icon: Ban,
            color: 'red',
            actionTaken: `Precautionary firewall drop applied against anomalous stream origin ${target}`,
          },
          {
            type: 'PROPAGATE_IOC',
            title: 'Trigger Deep Forensic Capture',
            desc: 'Capture full packet stream (PCAP) and log flow features for ML retraining.',
            icon: Globe,
            color: 'cyan',
            actionTaken: `Automated PCAP capture triggered for anomalous flow features`,
          },
        ];
    }
  };

  const defenses = getCategoryDefenses();

  // Generated CLI & Firewall Scripts
  const firewallCommands = {
    iptables: `sudo iptables -I INPUT -s ${target} -j DROP\nsudo iptables -I FORWARD -s ${target} -j DROP`,
    ufw: `sudo ufw insert 1 deny from ${target} to any`,
    powershell: `New-NetFirewallRule -DisplayName "CyberShield-Block-${target}" -Direction Inbound -Action Block -RemoteAddress "${target}"`,
    fail2ban: `sudo fail2ban-client set sshd banip ${target}`,
  };

  const handleApplyDefense = async (defense) => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await api.post('/security/apply', {
        alertId,
        nodeId,
        category,
        target,
        defenseType: defense.type,
        actionTaken: defense.actionTaken,
        notes: `Executed via CyberShield Active Security Response for ${category} attack on node ${nodeId}`,
      });

      setSuccessMessage(`Countermeasure applied: ${defense.title} (${res.defense?.defenseId || 'ACTIVE'})`);
      setAppliedDefenses((prev) => [...prev, defense.type]);

      if (onDefenseApplied) {
        onDefenseApplied(res.defense, alertId);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to apply security countermeasure. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCommand = (cmd) => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Active Security Defense & Mitigation" maxWidth="max-w-3xl">
      <div className="space-y-5">
        {/* Top Attack Context Card */}
        <div className="p-4 rounded-xl bg-[#090d19] border border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/30">
                {category}
              </span>
              <SeverityBadge severity={severity} />
              {alertId && (
                <span className="text-[11px] font-mono text-slate-400">
                  ID: <strong className="text-slate-200">{alertId}</strong>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              {description}
            </p>
          </div>

          <div className="shrink-0 text-left sm:text-right border-t sm:border-t-0 sm:border-l border-[#1e293b] pt-2 sm:pt-0 sm:pl-4">
            <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider">
              Attacking Target / IP
            </span>
            <span className="text-sm font-mono font-bold text-cyan-400 tracking-wide block">
              {target}
            </span>
            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
              Node: <strong className="text-slate-300">{nodeId}</strong>
            </span>
          </div>
        </div>

        {/* Feedback Messages */}
        {successMessage && (
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2.5 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-center gap-2.5 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Tailored Mitigation Actions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Tailored Incident Playbook & 1-Click Countermeasures
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              SOC Automated Response (SOAR)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {defenses.map((def) => {
              const Icon = def.icon;
              const isApplied = appliedDefenses.includes(def.type);

              return (
                <div
                  key={def.type}
                  className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200 ${
                    isApplied
                      ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                      : 'bg-[#111a2e]/60 border-[#1e293b] hover:border-cyan-500/40'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isApplied
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : def.color === 'red'
                            ? 'bg-red-500/15 text-red-400'
                            : def.color === 'amber'
                            ? 'bg-amber-500/15 text-amber-400'
                            : def.color === 'purple'
                            ? 'bg-purple-500/15 text-purple-400'
                            : 'bg-cyan-500/15 text-cyan-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-semibold text-slate-200 leading-tight">
                        {def.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {def.desc}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#1e293b]">
                    {isApplied ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 font-semibold">
                        <Check className="w-3.5 h-3.5" /> Defended
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApplyDefense(def)}
                        disabled={loading}
                        className="w-full py-1.5 px-3 rounded-lg text-xs font-medium font-mono tracking-wide bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-900/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Execute Defense
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Copyable Technical Firewall Rules */}
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Direct Host / Perimeter Firewall Script
            </h3>
            <div className="flex items-center gap-1 bg-[#0a0f1d] p-0.5 rounded-lg border border-[#1e293b]">
              {['iptables', 'ufw', 'powershell', 'fail2ban'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                    activeTab === tab
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'powershell' ? 'PowerShell' : tab.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="relative rounded-xl bg-[#050811] border border-[#1e293b] p-3.5 font-mono text-xs text-cyan-300 overflow-x-auto">
            <pre className="whitespace-pre-wrap break-all leading-relaxed pr-16 select-all">
              {firewallCommands[activeTab]}
            </pre>
            <button
              onClick={() => handleCopyCommand(firewallCommands[activeTab])}
              className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-[#111a2e] hover:bg-[#1e293b] text-slate-300 hover:text-white border border-[#1e293b] transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-[#1e293b] text-xs text-slate-400">
          <span className="font-mono text-[11px]">
            Action logged to audit trail & distributed in real-time.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#111a2e] hover:bg-[#1e293b] text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </Modal>
  );
};
