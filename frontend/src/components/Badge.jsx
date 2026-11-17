import React from 'react';
import { getSeverityColor, getStatusColor } from '../utils/formatters';

export const SeverityBadge = ({ severity, className = '' }) => {
  const colors = getSeverityColor(severity);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.badge} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} animate-pulse`} />
      {severity}
    </span>
  );
};

export const StatusBadge = ({ status, className = '' }) => {
  const colors = getStatusColor(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.badge} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {status}
    </span>
  );
};
