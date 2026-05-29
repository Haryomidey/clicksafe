import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 py-12 rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50">
      <div className="p-3 w-fit rounded-full bg-neutral-100/80 text-neutral-400 mb-4 border border-neutral-200/50">
        <Icon className="h-6 w-6 stroke-[1.5]" />
      </div>
      <h3 className="text-sm font-semibold text-neutral-800 tracking-tight font-sans">
        {title}
      </h3>
      <p className="text-xs text-neutral-400 max-w-sm mt-1 leading-normal font-sans">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-3 py-1.5 text-xs font-mono font-medium rounded-md bg-neutral-900 text-white hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
