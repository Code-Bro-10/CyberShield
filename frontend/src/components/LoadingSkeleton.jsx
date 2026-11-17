import React from 'react';

export const TableSkeleton = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="w-full space-y-3 animate-pulse">
      <div className="h-10 bg-[#111a2e] rounded-lg border border-[#1e293b]" />
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="h-14 bg-[#0d1424] rounded-lg border border-[#1e293b]/60 flex items-center px-4 space-x-4"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-4 bg-slate-800 rounded"
              style={{ width: `${Math.max(15, Math.floor(100 / cols) - 4)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = () => (
  <div className="bg-[#0d1424] border border-[#1e293b] rounded-xl p-6 space-y-4 animate-pulse">
    <div className="h-4 bg-slate-800 rounded w-1/3" />
    <div className="h-8 bg-slate-800 rounded w-1/2" />
    <div className="h-3 bg-slate-800 rounded w-2/3" />
  </div>
);
