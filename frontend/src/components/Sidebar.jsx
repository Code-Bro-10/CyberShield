import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Server,
  Crosshair,
  BarChart3,
  AlertTriangle,
  BrainCircuit,
  Terminal,
  Settings,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export const Sidebar = ({ activeTab, onSelectTab }) => {
  const { connected, unreadAlertCount } = useSocket();

  const navItems = [
    { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'monitoring', label: 'Live Monitoring', icon: Activity, pulse: true },
    { id: 'nodes', label: 'Network Nodes', icon: Server },
    { id: 'threat-intel', label: 'Threat Intelligence', icon: Crosshair },
    { id: 'analytics', label: 'Attack Analytics', icon: BarChart3 },
    { id: 'incidents', label: 'Incident Center', icon: AlertTriangle, badge: unreadAlertCount },
    { id: 'ml', label: 'ML Detection', icon: BrainCircuit },
    { id: 'simulation', label: 'Simulation & Demo', icon: Flame, highlight: true },
    { id: 'logs', label: 'System Logs', icon: Terminal },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-[#1e293b] flex flex-col shrink-0 select-none">
      {/* Brand Logo */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-[#1e293b] bg-[#070b14]/70">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
          <ShieldCheck className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping-slow" />
        </div>
        <div>
          <span className="text-base font-bold tracking-wider text-white flex items-center gap-1">
            CYBER<span className="text-cyan-400">SHIELD</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono tracking-widest block -mt-0.5">
            DISTRIBUTED IDS
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          SOC Operations
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#111a2e]/60 border border-transparent'
              } ${item.highlight && !isActive ? 'text-amber-400/90 hover:text-amber-300' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? 'text-cyan-400'
                      : item.highlight
                      ? 'text-amber-400'
                      : 'text-slate-400 group-hover:text-slate-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {/* Badges / Indicators */}
              <div className="flex items-center gap-1.5">
                {item.pulse && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
                {item.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white shadow-sm">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Cluster Node Status Banner */}
      <div className="p-4 border-t border-[#1e293b] bg-[#070b14]/50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-400'
              }`}
            />
            <span className="text-slate-300 font-medium">Socket Engine</span>
          </div>
          <span
            className={`font-mono text-[11px] ${
              connected ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {connected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>
      </div>
    </aside>
  );
};
