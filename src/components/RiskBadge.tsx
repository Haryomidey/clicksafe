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
          bg: 'bg-[#eefbf1] text-[#188018] border-[#bdecc8]',
          dot: 'bg-emerald-500',
          indicator: 'Low Risk',
          text: 'Safe'
        };
      case 'caution':
        return {
          bg: 'bg-[#fff6e7] text-[#a76b12] border-[#f3d49c]',
          dot: 'bg-amber-500',
          indicator: 'Medium Risk',
          text: 'Caution'
        };
      case 'dangerous':
        return {
          bg: 'bg-[#fff0f6] text-[#d41470] border-[#f5bad4]',
          dot: 'bg-rose-600 animate-pulse',
          indicator: 'High Threat',
          text: 'Dangerous'
        };
      default:
        return {
          bg: 'bg-[#f4f8ff] text-[#74758d] border-[#dfe7f5]',
          dot: 'bg-neutral-400',
          indicator: 'Unknown',
          text: 'Unknown'
        };
    }
  };

  const current = getStyles();
  const padding = size === 'sm' ? 'px-2 py-1 text-[10px]' : size === 'lg' ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-extrabold ${current.bg} ${padding}`}
    >
      {showIcon && <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />}
      <span>{current.text}</span>
      {score !== undefined && (
        <span className="opacity-75 font-sans border-l pl-1.5 ml-1 border-current/20">
          Score: {score}/100
        </span>
      )}
    </span>
  );
};
