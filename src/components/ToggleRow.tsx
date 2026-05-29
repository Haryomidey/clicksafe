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
      className="flex items-start justify-between gap-6 rounded-2xl px-3 py-4 transition-colors hover:bg-[#f4f8ff]"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-base font-extrabold leading-tight text-[#181936]">
            {title}
          </h4>
          {statusBadge}
        </div>
        <p className="mt-1 max-w-xl text-sm font-semibold leading-relaxed text-[#74758d]">
          {description}
        </p>
      </div>
      
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full p-1 shadow-inner transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-[#8db9f3] ${
          checked ? 'bg-[#4d7ed8]' : 'bg-[#d9dce5]'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-[0_3px_8px_rgba(24,25,54,0.22)] ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};
