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
    <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-[#cbd8ef] bg-[#f4f8ff]/70 p-8 py-12 text-center">
      <div className="mb-4 w-fit rounded-full border border-[#dfe7f5] bg-white p-3 text-[#8b8da0]">
        <Icon className="h-6 w-6 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-extrabold tracking-tight text-[#181936]">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-sm font-semibold leading-normal text-[#74758d]">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 cursor-pointer rounded-xl bg-[#4f4d69] px-4 py-2 text-sm font-extrabold text-white transition-colors hover:bg-[#3f3d58]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
