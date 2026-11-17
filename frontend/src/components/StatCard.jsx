import React from 'react';

export const StatCard = ({
  title,
  value,
  subtext,
  icon: Icon,
  accentColor = 'cyan', // 'cyan' | 'red' | 'amber' | 'emerald' | 'purple'
  loading = false,
  onClick,
}) => {
  const accentStyles = {
    cyan: {
      border: 'hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      badge: 'text-cyan-400',
    },
    red: {
      border: 'hover:border-red-500/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]',
      iconBg: 'bg-red-500/10 text-red-400 border-red-500/20',
      badge: 'text-red-400',
    },
    amber: {
      border: 'hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      badge: 'text-amber-400',
    },
    emerald: {
      border: 'hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      badge: 'text-emerald-400',
    },
    purple: {
      border: 'hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]',
      iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      badge: 'text-purple-400',
    },
  }[accentColor] || accentStyles.cyan;

  return (
    <div
      onClick={onClick}
      className={`relative bg-[#0d1424] border border-[#1e293b] rounded-xl p-5 transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      } ${accentStyles.border}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-400 tracking-wider uppercase">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${accentStyles.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        {loading ? (
          <div className="h-9 w-24 bg-slate-800 animate-pulse rounded" />
        ) : (
          <span className="text-3xl font-bold font-mono text-white tracking-tight">
            {value}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
          {subtext}
        </p>
      )}
    </div>
  );
};
