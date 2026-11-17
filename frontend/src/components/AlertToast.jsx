import React from 'react';
import { useSocket } from '../context/SocketContext';
import { SeverityBadge } from './Badge';
import { ShieldAlert, X, CheckCircle, ExternalLink } from 'lucide-react';
import api from '../services/api';

export const AlertToastContainer = () => {
  const { alertToasts, dismissToast } = useSocket();

  if (!alertToasts || alertToasts.length === 0) return null;

  const handleAcknowledge = async (alertId) => {
    try {
      await api.patch(`/alerts/${alertId}/acknowledge`);
      dismissToast(alertId);
    } catch {
      dismissToast(alertId);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {alertToasts.map((toast) => (
        <div
          key={toast.alertId || toast.receivedAt}
          className="pointer-events-auto bg-[#0d1424]/95 border-l-4 border-l-red-500 border border-[#1e293b] rounded-lg p-4 shadow-2xl backdrop-blur-md transition-all duration-300 animate-slideInRight"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
              <span className="text-xs font-semibold text-slate-100 uppercase tracking-wider">
                {toast.category}
              </span>
              <SeverityBadge severity={toast.severity} />
            </div>
            <button
              onClick={() => dismissToast(toast.alertId)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-300 font-mono leading-relaxed line-clamp-2">
            {toast.description}
          </p>

          <div className="mt-3 pt-2 border-t border-[#1e293b]/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Node: <strong className="text-cyan-400 font-mono">{toast.nodeId}</strong></span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAcknowledge(toast.alertId)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded text-[11px] transition-colors"
              >
                <CheckCircle className="w-3 h-3" />
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
