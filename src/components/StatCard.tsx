import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  id?: string;
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean; // positive in security meaning risk is going down
    label: string;
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  description,
  icon: Icon,
  trend,
  onClick,
}) => {
  const isClickable = !!onClick;
  
  return (
    <div
      id={id}
      onClick={onClick}
      className={`p-5 rounded-lg border border-neutral-200 bg-white shadow-xs transition-all duration-150 ${
        isClickable ? 'cursor-pointer hover:border-neutral-900 hover:shadow-sm active:translate-y-[1px]' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-mono tracking-wider uppercase text-neutral-500 font-medium">
            {title}
          </span>
          <h3 className="text-3xl font-sans font-semibold text-neutral-900 mt-2 tracking-tight">
            {value}
          </h3>
        </div>
        <div className="p-2.5 rounded-md bg-neutral-50 border border-neutral-100/80 text-neutral-700">
          <Icon className="h-5 w-5 stroke-[1.75]" />
        </div>
      </div>
      
      {description && (
        <p className="text-xs text-neutral-500 mt-2.5 leading-relaxed font-sans">
          {description}
        </p>
      )}

      {trend && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-neutral-50 text-[11px] font-mono">
          <span
            className={`font-semibold ${
              trend.isPositive ? 'text-emerald-700' : 'text-neutral-500'
            }`}
          >
            {trend.value}
          </span>
          <span className="text-neutral-400">{trend.label}</span>
        </div>
      )}
    </div>
  );
};
