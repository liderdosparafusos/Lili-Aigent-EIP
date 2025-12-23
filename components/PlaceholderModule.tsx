
import React from 'react';
import { Construction, LucideIcon } from 'lucide-react';

interface PlaceholderModuleProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

const PlaceholderModule: React.FC<PlaceholderModuleProps> = ({ title, description, icon: Icon }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-[fadeIn_0.5s_ease-out]">
      <div className="bg-slate-800/50 p-6 rounded-full mb-6 border border-slate-700 shadow-xl">
        {Icon ? <Icon className="w-16 h-16 text-slate-500" /> : <Construction className="w-16 h-16 text-slate-500" />}
      </div>
      <h2 className="text-3xl font-orbitron font-bold text-slate-700 mb-3">{title}</h2>
      <p className="text-slate-500 max-w-md text-lg">{description}</p>
      <div className="mt-8 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 text-sm font-semibold">
        Módulo em Desenvolvimento (EIP)
      </div>
    </div>
  );
};

export default PlaceholderModule;
