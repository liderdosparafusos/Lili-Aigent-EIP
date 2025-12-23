
import React, { useState } from 'react';
import { 
  LayoutDashboard, Calendar, Activity, CheckCircle, FileText, 
  Percent, Bot, Settings, LogOut, Database, Users, AlertTriangle,
  List, PlayCircle, BarChart2, ShoppingBag, Receipt, ClipboardList,
  CalendarRange, Scale, UserCircle, Package, User, HandCoins, Zap, CreditCard
} from 'lucide-react';
import { User as AppUser, UserRole } from '../types';
import { Logo } from './Logo';

interface SidebarProps {
  user: AppUser;
  activeModule: string;
  activeSubModule?: string;
  onNavigate: (module: string, subModule?: string) => void;
  onLogout: () => void;
  activeContextLabel?: string;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

// Estrutura Visual do Menu
type MenuSection = {
  title?: string;
  items: MenuItem[];
};

type MenuItem = {
  id: string;
  subId?: string;
  label: string;
  icon: any;
  roles?: UserRole[];
};

const MENU_STRUCTURE: MenuSection[] = [
  {
    title: 'VISÃO GERAL',
    items: [
      { id: 'dashboard', label: 'Dashboard Comercial', icon: LayoutDashboard }
    ]
  },
  {
    title: 'FINANCEIRO',
    items: [
      { id: 'finance', subId: 'receivables', label: 'Contas a Receber', icon: HandCoins },
      { id: 'finance', subId: 'card_export', label: 'Vendas em Cartão', icon: CreditCard },
      { id: 'daily', subId: 'eventos', label: 'Eventos Financeiros', icon: Activity },
    ]
  },
  {
    title: 'VENDAS',
    items: [
      { id: 'sales', subId: 'budgets', label: 'Orçamentos', icon: FileText },
      { id: 'sales', subId: 'orders', label: 'Pedidos', icon: ShoppingBag },
      { id: 'sales', subId: 'invoices', label: 'Notas Fiscais', icon: Receipt },
    ]
  },
  {
    title: 'MOVIMENTO DO DIA',
    items: [
      { id: 'daily', subId: 'movimento', label: 'Movimento Diário', icon: Calendar },
    ]
  },
  {
    title: 'FECHAMENTO MENSAL',
    items: [
      { id: 'closing', subId: 'live', label: 'Acompanhamento do Mês', icon: CheckCircle },
      { id: 'closing', subId: 'process', label: 'Processar Fechamento', icon: PlayCircle, roles: [UserRole.OPERADOR] },
      { id: 'closing', subId: 'summary', label: 'Resumo Mensal (Fechado)', icon: ClipboardList },
    ]
  },
  {
    title: 'COMISSÕES',
    items: [
      { id: 'commissions', subId: 'dashboard', label: 'Por Vendedor', icon: Percent },
    ]
  },
  {
    title: 'INTELIGÊNCIA',
    items: [
      { id: 'intelligence', subId: 'agent', label: 'Análises do Agent', icon: Bot },
      { id: 'intelligence', subId: 'alerts', label: 'Alertas Inteligentes', icon: AlertTriangle },
      { id: 'intelligence', subId: 'execution_hub', label: 'Centro de Execução', icon: Zap },
    ]
  },
  {
    title: 'CADASTROS',
    items: [
      { id: 'registers', subId: 'clients', label: 'Clientes', icon: User },
      { id: 'registers', subId: 'products', label: 'Produtos', icon: Package },
    ]
  },
  {
    title: 'CONFIGURAÇÕES',
    items: [
      { id: 'settings', subId: 'sellers', label: 'Vendedores', icon: Users },
      { id: 'settings', subId: 'rules', label: 'Regras de Comissão', icon: Scale },
      { id: 'settings', subId: 'users', label: 'Usuários', icon: UserCircle },
    ]
  }
];

const Sidebar: React.FC<SidebarProps> = ({ 
  user, 
  activeModule, 
  activeSubModule, 
  onNavigate, 
  onLogout,
  activeContextLabel,
  isMobileOpen,
  setIsMobileOpen
}) => {

  const handleItemClick = (item: MenuItem) => {
    onNavigate(item.id, item.subId);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 bg-slate-950 border-r border-slate-800 z-50 transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-6 flex items-center gap-3 bg-gradient-to-b from-slate-900 to-slate-950">
           <div className="w-10 h-10 flex items-center justify-center text-cyan-500 bg-slate-800/50 rounded-xl border border-slate-700 shadow-inner">
               <Logo className="w-full h-full p-1" />
           </div>
           <div>
              <h1 className="font-orbitron font-bold text-white tracking-widest text-lg">LILI AIGENT</h1>
              <p className="text-[10px] text-cyan-500 font-bold tracking-[0.3em] uppercase">Enterprise</p>
           </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-2 px-4 space-y-6 custom-scrollbar">
            {MENU_STRUCTURE.map((section, idx) => (
                <div key={idx} className="space-y-1">
                    {section.title && (
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 pl-3">
                            {section.title}
                        </h4>
                    )}
                    
                    {section.items.map(item => {
                        // Permission Check
                        if (item.roles && !item.roles.includes(user.role)) return null;

                        const isActive = activeModule === item.id && activeSubModule === item.subId;
                        const Icon = item.icon;

                        return (
                            <button 
                                key={`${item.id}-${item.subId}`}
                                onClick={() => handleItemClick(item)}
                                className={`
                                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                                    ${isActive 
                                        ? 'bg-gradient-to-r from-cyan-900/40 to-slate-900 text-cyan-400 border-l-2 border-cyan-500 shadow-lg shadow-black/20' 
                                        : 'text-slate-400 hover:text-white hover:bg-slate-900/80 border-l-2 border-transparent'
                                    }
                                `}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            ))}
        </nav>

        {/* Footer / Context */}
        <div className="p-4 bg-slate-900/50 border-t border-slate-800 space-y-3">
            {activeContextLabel && (
                <div className="px-3 py-2 bg-slate-950/50 rounded-lg border border-slate-800/50 flex items-center gap-2">
                    <Database className="w-3 h-3 text-emerald-500" />
                    <div>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Contexto Ativo</p>
                        <p className="text-xs text-slate-300 font-mono truncate max-w-[180px]">{activeContextLabel}</p>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between px-2">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">{user.email.split('@')[0]}</span>
                    <span className="text-[9px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded w-fit uppercase mt-0.5 border border-slate-700">
                        {user.role}
                    </span>
                </div>
                <button 
                    onClick={onLogout}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors"
                    title="Sair"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
