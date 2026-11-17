import React from 'react';
import { ShieldAlert, Search } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = ShieldAlert,
  title = 'No records found',
  description = 'No security events or alerts match your current criteria.',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#1e293b] rounded-xl bg-[#0d1424]/40 my-4">
      <div className="p-3 bg-slate-800/60 rounded-xl text-slate-400 mb-3 border border-[#1e293b]">
        <Icon className="w-8 h-8 text-cyan-400/80" />
      </div>
      <h3 className="text-base font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
