import React from 'react';
import { SafetyStatus } from '../types';

interface RiskBadgeProps {
  status: SafetyStatus;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  status,
  score,
  size = 'md',
  showIcon = true,
}) => {
  const getStyles = () => {
    switch (status) {
      case 'safe':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/55',
          dot: 'bg-emerald-500',
          indicator: 'Low Risk',
          text: 'Safe'
        };
      case 'caution':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200/55',
          dot: 'bg-amber-500',
          indicator: 'Medium Risk',
          text: 'Caution'
        };
      case 'dangerous':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200/55',
          dot: 'bg-rose-600 animate-pulse',
          indicator: 'High Threat',
          text: 'Dangerous'
        };
      default:
        return {
          bg: 'bg-neutral-50 text-neutral-600 border-neutral-200',
          dot: 'bg-neutral-400',
          indicator: 'Unknown',
          text: 'Unknown'
        };
    }
  };

  const current = getStyles();
  const padding = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium rounded border ${current.bg} ${padding}`}
    >
      {showIcon && <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />}
      <span className="uppercase tracking-wider">{current.text}</span>
      {score !== undefined && (
        <span className="opacity-75 font-sans border-l pl-1.5 ml-1 border-current/20">
          Score: {score}/100
        </span>
      )}
    </span>
  );
};
