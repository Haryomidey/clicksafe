import React from 'react';

interface ToggleRowProps {
  id?: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  statusBadge?: React.ReactNode;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({
  id,
  title,
  description,
  checked,
  onChange,
  statusBadge,
}) => {
  return (
    <div
      id={id}
      className="flex items-start justify-between gap-6 py-4 border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50/50 px-2 rounded-md transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-neutral-900 leading-tight">
            {title}
          </h4>
          {statusBadge}
        </div>
        <p className="text-xs text-neutral-500 mt-1 leading-relaxed font-sans max-w-xl">
          {description}
        </p>
      </div>
      
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-1 focus:ring-neutral-900 focus:ring-offset-2 ${
          checked ? 'bg-neutral-900' : 'bg-neutral-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};
