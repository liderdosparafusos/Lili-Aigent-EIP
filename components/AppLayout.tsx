
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { User } from '../types';
import { Menu } from 'lucide-react';
import { Logo } from './Logo';

interface AppLayoutProps {
  user: User;
  children: React.ReactNode;
  activeModule: string;
  activeSubModule?: string;
  onNavigate: (module: string, subModule?: string) => void;
  onLogout: () => void;
  activeContextLabel?: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ 
  user, 
  children, 
  activeModule, 
  activeSubModule, 
  onNavigate, 
  onLogout,
  activeContextLabel
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* Sidebar (Fixed Left) */}
      <Sidebar 
        user={user}
        activeModule={activeModule}
        activeSubModule={activeSubModule}
        onNavigate={onNavigate}
        onLogout={onLogout}
        activeContextLabel={activeContextLabel}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area (Right) */}
      <main className="flex-1 flex flex-col h-full relative lg:ml-64 w-full transition-all duration-300">
        
        {/* Mobile Header Toggle */}
        <div className="lg:hidden h-16 bg-slate-900 border-b border-slate-800 flex items-center px-4 shrink-0 gap-3">
            <button 
                onClick={() => setIsMobileOpen(true)}
                className="p-2 text-slate-400 hover:text-white"
            >
                <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
                <Logo className="w-6 h-6 text-cyan-500" />
                <span className="font-orbitron font-bold text-white">LiLi AIgent EIP</span>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50">
            {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
