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
      className={`rounded-[22px] border border-[#dfe7f5] bg-white/90 p-5 shadow-[0_16px_36px_rgba(71,92,132,0.08)] transition-all duration-150 ${
        isClickable ? 'cursor-pointer hover:border-[#aac5ed] hover:shadow-[0_20px_42px_rgba(71,92,132,0.13)] active:translate-y-[1px]' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-extrabold uppercase text-[#74758d]">
            {title}
          </span>
          <h3 className="mt-2 text-4xl font-extrabold tracking-tight text-[#181936]">
            {value}
          </h3>
        </div>
        <div className="rounded-2xl border border-[#dfe7f5] bg-[#f4f8ff] p-3 text-[#4d7ed8]">
          <Icon className="h-5 w-5 stroke-[1.75]" />
        </div>
      </div>
      
      {description && (
        <p className="mt-2.5 text-sm font-semibold leading-relaxed text-[#74758d]">
          {description}
        </p>
      )}

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-[#eef3fb] pt-3 text-xs font-extrabold">
          <span
            className={`font-semibold ${
              trend.isPositive ? 'text-[#1f5dcc]' : 'text-[#74758d]'
            }`}
          >
            {trend.value}
          </span>
          <span className="text-[#74758d]">{trend.label}</span>
        </div>
      )}
    </div>
  );
};
