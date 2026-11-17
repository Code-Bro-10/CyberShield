import React from 'react';
import { Volume2, VolumeX, Bell, BellRing, LogOut, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export const Header = ({ title = 'Overview Dashboard' }) => {
  const { user, logout } = useAuth();
  const {
    connected,
    soundEnabled,
    toggleSound,
    unreadAlertCount,
    requestNotificationPermission,
  } = useSocket();

  return (
    <header className="h-16 bg-[#0a0f1d]/90 border-b border-[#1e293b] flex items-center justify-between px-8 sticky top-0 z-30 backdrop-blur-md">
      {/* Title & Status */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide">{title}</h1>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>CyberShield SOC</span>
            <span>•</span>
            <span className="text-cyan-400 font-mono">Real-time Stream Active</span>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-4">
        {/* Audio Toggle */}
        <button
          onClick={toggleSound}
          title={soundEnabled ? 'Mute SOC Alert Chimes' : 'Enable SOC Alert Chimes'}
          className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
            soundEnabled
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
              : 'bg-[#111a2e] border-[#1e293b] text-slate-400 hover:text-slate-200'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span className="hidden sm:inline font-mono">{soundEnabled ? 'AUDIO ON' : 'MUTED'}</span>
        </button>

        {/* Browser Notifications Request */}
        <button
          onClick={requestNotificationPermission}
          title="Enable Desktop Push Notifications"
          className="p-2 rounded-lg bg-[#111a2e] border border-[#1e293b] text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* User Profile & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-[#1e293b]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-200">{user?.name || 'Operator'}</div>
              <div className="text-[10px] text-cyan-400 uppercase tracking-wider font-mono">
                {user?.role || 'analyst'}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
