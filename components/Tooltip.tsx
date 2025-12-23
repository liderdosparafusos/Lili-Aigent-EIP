
import React, { ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
  return (
    <div className="relative group flex items-center justify-center">
      {children}
      <div className={`
        absolute left-1/2 transform -translate-x-1/2 
        ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
        px-3 py-1.5 bg-slate-900 text-slate-200 text-xs font-medium rounded-lg 
        opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none 
        whitespace-nowrap z-50 border border-slate-700 shadow-xl
      `}>
        {content}
        <div className={`
          absolute left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-slate-700
          ${position === 'top' ? 'bottom-[-5px] rotate-45 border-t-0 border-l-0' : 'top-[-5px] rotate-[225deg]'}
        `}></div>
      </div>
    </div>
  );
};
