
import React from 'react';
import { ShoppingCart, CalendarCheck, ArrowRight, ArrowUpRight, Database, Users, Search, Archive } from 'lucide-react';
import { User, UserRole } from '../types';

interface MainMenuProps {
  user: User;
  onSelectModule: (module: 'FECHAMENTO' | 'PAGAMENTOS' | 'IMPORT_CLIENTES' | 'CONSULTA_CLIENTES' | 'IMPORT_HISTORICO') => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ user, onSelectModule }) => {
  return (
    <div className="max-w-7xl mx-auto mt-12 px-6">
      <div className="text-center mb-12">
         <h2 className="text-3xl md:text-4xl font-orbitron font-bold text-white mb-2">
            Bem-vindo, {user.email.split('@')[0]}
         </h2>
         <p className="text-slate-400">Selecione o módulo de trabalho:</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
         {/* MÓDULO 1: FECHAMENTO */}
         <button 
           onClick={() => onSelectModule('FECHAMENTO')}
           className="group relative bg-slate-800/50 border border-slate-700 hover:border-cyan-500 rounded-2xl p-8 transition-all hover:bg-slate-800 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] text-left flex flex-col justify-between h-64 overflow-hidden"
         >
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
               <ShoppingCart className="w-40 h-40 text-cyan-400" />
           </div>
           
           <div className="relative z-10">
              <div className="w-12 h-12 bg-cyan-900/50 rounded-lg flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white font-orbitron mb-2">Fechamento de Vendas</h3>
              <p className="text-slate-400 text-sm">Conciliação de Movimento Diário, XML de Saída, Divergências e Relatórios.</p>
           </div>

           <div className="relative z-10 flex items-center text-cyan-400 font-bold text-sm uppercase tracking-wider group-hover:translate-x-2 transition-transform">
              Acessar Módulo <ArrowRight className="w-4 h-4 ml-2" />
           </div>
         </button>

         {/* MÓDULO 2: PAGAMENTOS */}
         <button 
           onClick={() => onSelectModule('PAGAMENTOS')}
           className="group relative bg-slate-800/50 border border-slate-700 hover:border-emerald-500 rounded-2xl p-8 transition-all hover:bg-slate-800 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] text-left flex flex-col justify-between h-64 overflow-hidden"
         >
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
               <CalendarCheck className="w-40 h-40 text-emerald-400" />
           </div>
           
           <div className="relative z-10">
              <div className="w-12 h-12 bg-emerald-900/50 rounded-lg flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                  <CalendarCheck className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white font-orbitron mb-2">Pagamentos a Efetuar</h3>
              <p className="text-slate-400 text-sm">Controle de Contas a Pagar, XML de Entrada, Vencimentos e Baixas.</p>
           </div>

           <div className="relative z-10 flex items-center text-emerald-400 font-bold text-sm uppercase tracking-wider group-hover:translate-x-2 transition-transform">
              Acessar Módulo <ArrowRight className="w-4 h-4 ml-2" />
           </div>
         </button>

         {/* MÓDULO 3: CONSULTA CLIENTES */}
         <button 
           onClick={() => onSelectModule('CONSULTA_CLIENTES')}
           className="group relative bg-slate-800/50 border border-slate-700 hover:border-purple-500 rounded-2xl p-8 transition-all hover:bg-slate-800 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] text-left flex flex-col justify-between h-64 overflow-hidden"
         >
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
               <Users className="w-40 h-40 text-purple-400" />
           </div>
           
           <div className="relative z-10">
              <div className="w-12 h-12 bg-purple-900/50 rounded-lg flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                  <Search className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white font-orbitron mb-2">Consultar Clientes</h3>
              <p className="text-slate-400 text-sm">Busca rápida por Nome, CNPJ ou Código. Visualização detalhada de cadastro.</p>
           </div>

           <div className="relative z-10 flex items-center text-purple-400 font-bold text-sm uppercase tracking-wider group-hover:translate-x-2 transition-transform">
              Acessar Módulo <ArrowRight className="w-4 h-4 ml-2" />
           </div>
         </button>
      </div>

      {/* IMPORT SECTION - OPERADOR ONLY */}
      {user.role === UserRole.OPERADOR && (
         <div className="border-t border-slate-800 pt-8 flex justify-center gap-4 flex-wrap">
             {/* Import Clientes */}
             <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center gap-6 max-w-xl w-full">
                <div className="p-3 bg-slate-800 rounded-lg text-slate-400">
                    <Database className="w-6 h-6" />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h4 className="text-white font-bold mb-1">Atualização de Cadastro</h4>
                    <p className="text-slate-500 text-xs">Importar base de clientes (XML) do ERP.</p>
                </div>
                <button 
                    onClick={() => onSelectModule('IMPORT_CLIENTES')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-slate-700 hover:border-purple-500"
                >
                    <ArrowUpRight className="w-4 h-4" />
                    Importar
                </button>
             </div>

             {/* Import Histórico */}
             <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center gap-6 max-w-xl w-full">
                <div className="p-3 bg-slate-800 rounded-lg text-amber-500">
                    <Archive className="w-6 h-6" />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h4 className="text-white font-bold mb-1">Histórico (Arquivo Morto)</h4>
                    <p className="text-slate-500 text-xs">Importar XMLs antigos para Inteligência.</p>
                </div>
                <button 
                    onClick={() => onSelectModule('IMPORT_HISTORICO')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-slate-700 hover:border-amber-500"
                >
                    <ArrowUpRight className="w-4 h-4" />
                    Carregar
                </button>
             </div>
         </div>
      )}
    </div>
  );
};

export default MainMenu;
