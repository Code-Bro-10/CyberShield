export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

export const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '—';
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const formatUptime = (seconds) => {
  if (!seconds || seconds <= 0) return '0s';
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

export const getSeverityColor = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        dot: 'bg-red-500',
        badge: 'bg-red-950/60 text-red-300 border-red-500/40',
      };
    case 'high':
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        dot: 'bg-amber-500',
        badge: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
      };
    case 'medium':
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
        dot: 'bg-yellow-500',
        badge: 'bg-yellow-950/60 text-yellow-300 border-yellow-500/40',
      };
    case 'low':
      return {
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/30',
        text: 'text-cyan-400',
        dot: 'bg-cyan-500',
        badge: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40',
      };
    default:
      return {
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/30',
        text: 'text-slate-400',
        dot: 'bg-slate-400',
        badge: 'bg-slate-800 text-slate-300 border-slate-600',
      };
  }
};

export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'online':
    case 'resolved':
    case 'healthy':
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        dot: 'bg-emerald-400',
        badge: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
      };
    case 'open':
    case 'new':
    case 'reconnecting':
      return {
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/30',
        text: 'text-cyan-400',
        dot: 'bg-cyan-400',
        badge: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40',
      };
    case 'acknowledged':
    case 'investigating':
    case 'degraded':
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        dot: 'bg-amber-400',
        badge: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
      };
    case 'offline':
    case 'critical':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        dot: 'bg-red-400',
        badge: 'bg-red-950/60 text-red-300 border-red-500/40',
      };
    default:
      return {
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/30',
        text: 'text-slate-400',
        dot: 'bg-slate-400',
        badge: 'bg-slate-800 text-slate-300 border-slate-600',
      };
  }
};
