
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  HandCoins, ClockAlert, ShieldAlert, CalendarClock, Search, 
  Filter, ArrowUpRight, DollarSign, User as UserIcon, FileText,
  CheckCircle, AlertTriangle, TrendingUp, Wallet, Receipt,
  UserPlus, AlertOctagon, History, Briefcase, Tag, MoreVertical,
  RefreshCw, Activity, Bot, MessageSquare, LayoutDashboard, Database
} from 'lucide-react';
import { ReceivableEntry, ReceivablesSummary, User, UserRole } from '../types';
import { getReceivablesSummary, listarRecebiveis } from '../services/receivables';
import { getReceivablesAgentContext, runFinancialAgentAnalysis } from '../services/financialAgent';
import { getVendedorLabel } from '../services/logic';
import ReceivableSettlementModal from './ReceivableSettlementModal';
import ReceivablesIntelligence from './ReceivablesIntelligence';
import ChatWidget from './ChatWidget';

const AGING_COLORS = ['#fbbf24', '#f87171', '#ef4444', '#7f1d1d'];
const STATUS_COLORS: Record<string, string> = { 'ABERTA': '#38bdf8', 'PARCIAL': '#818cf8', 'PAGA': '#10b981', 'VENCIDA': '#ef4444', 'CANCELADA': '#475569' };

const ReceivablesDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [viewMode, setViewMode] = useState<'INTELLIGENCE' | 'OPERATIONAL'>('INTELLIGENCE');
  const [summary, setSummary] = useState<ReceivablesSummary | null>(null);
  const [entries, setEntries] = useState<ReceivableEntry[]>([]);
  const [agentContext, setAgentContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [settlingReceivable, setSettlingReceivable] = useState<ReceivableEntry | null>(null);

  const loadData = async () => {
    setLoading(true);
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    
    try {
        const [s, e, ctx] = await Promise.all([
            getReceivablesSummary(firstDay, lastDay),
            listarRecebiveis(),
            getReceivablesAgentContext()
        ]);
        setSummary(s);
        setEntries(e);
        setAgentContext(ctx);
    } catch (err) {
        console.error("Erro ao carregar dados financeiros", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleQuickAudit = async () => {
      setAnalyzing(true);
      await runFinancialAgentAnalysis();
      await loadData();
      setAnalyzing(false);
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const filteredEntries = entries.filter(e => {
    const matchesSearch = e.cliente.toLowerCase().includes(searchTerm.toLowerCase()) || e.numero_nf.includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading || !summary) {
    return (
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-orbitron animate-pulse uppercase tracking-widest text-xs">Sincronizando Tesouraria...</p>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto pb-20 font-sans text-slate-200 relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-800 pb-6">
         <div>
             <h1 className="text-3xl font-orbitron font-bold text-white tracking-wide flex items-center gap-3">
                <HandCoins className="text-emerald-400 w-8 h-8" />
                Contas a Receber
             </h1>
             <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                 <ShieldAlert className="w-4 h-4 text-amber-500" />
                 Gestão de Liquidez e Cobrança por Competência
             </p>
         </div>

         <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex mr-4 shadow-inner">
                <button 
                    onClick={() => setViewMode('INTELLIGENCE')} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'INTELLIGENCE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Bot className="w-4 h-4" /> Inteligência
                </button>
                <button 
                    onClick={() => setViewMode('OPERATIONAL')} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'OPERATIONAL' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Database className="w-4 h-4" /> Carteira
                </button>
            </div>

            <button 
                onClick={handleQuickAudit}
                disabled={analyzing}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
            >
                <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
                {analyzing ? 'Auditando...' : 'Auditoria Rápida'}
            </button>
         </div>
      </div>

      {viewMode === 'INTELLIGENCE' ? (
          <ReceivablesIntelligence />
      ) : (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            {/* KPIs DE TESOURARIA */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                <KPICard label="Total em Aberto" value={fmt(summary.totalAberto)} subValue="Carteira Ativa" icon={Wallet} color="indigo" />
                <KPICard label="A Receber Hoje" value={fmt(summary.receberHoje)} subValue="Previsão Imediata" icon={CalendarClock} color="cyan" />
                <KPICard label="Próximos 7 dias" value={fmt(summary.receber7Dias)} subValue="Curto Prazo" icon={TrendingUp} color="emerald" />
                <KPICard label="Próximos 30 dias" value={fmt(summary.receber30Dias)} subValue="Ciclo Mensal" icon={HandCoins} color="blue" />
                <KPICard label="Total Vencido" value={fmt(summary.totalVencido)} subValue="Inadimplência" icon={ClockAlert} color="red" highlight />
                <KPICard label="Recebido (Mês)" value={fmt(summary.recebidoPeriodo)} subValue="Liquidez Realizada" icon={CheckCircle} color="emerald" />
            </div>

            {/* LISTA OPERACIONAL */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60">
                    <div>
                        <h3 className="text-lg font-bold text-white font-orbitron">Listagem Granular</h3>
                        <p className="text-slate-500 text-xs mt-1">Conferência de títulos faturados</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute top-2.5 left-3 text-slate-500" />
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar NF ou Cliente..."
                                className="bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-emerald-500 outline-none w-64 transition-all"
                            />
                        </div>
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 outline-none appearance-none"
                        >
                            <option value="ALL">Todos Status</option>
                            <option value="ABERTA">Aberta</option>
                            <option value="VENCIDA">Vencida</option>
                            <option value="PARCIAL">Parcial</option>
                            <option value="PAGA">Paga</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-950/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Vencimento</th>
                                <th className="px-8 py-5">Documento</th>
                                <th className="px-8 py-5">Cliente</th>
                                <th className="px-8 py-5 text-center">Status</th>
                                <th className="px-8 py-5 text-right">Saldo Aberto</th>
                                <th className="px-8 py-5 text-right">Valor Original</th>
                                <th className="px-8 py-5">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 text-sm">
                            {filteredEntries.map((e) => {
                                const isVencida = e.status === 'VENCIDA';
                                const canSettle = e.saldo_aberto > 0 && e.status !== 'CANCELADA';
                                return (
                                    <tr key={e.id} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className={`px-8 py-4 font-mono font-bold ${isVencida ? 'text-red-400' : 'text-slate-300'}`}>
                                            {e.data_vencimento.split('-').reverse().join('/')}
                                        </td>
                                        <td className="px-8 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold">NF {e.numero_nf}</span>
                                                <span className="text-[10px] text-slate-500 uppercase">Emissão: {e.data_emissao.split('-').reverse().join('/')}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-300 font-medium group-hover:text-white transition-colors">{e.cliente}</span>
                                                <span className="text-[10px] text-slate-500">Vendedor: {getVendedorLabel(e.vendedor)}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
                                                e.status === 'ABERTA' ? 'bg-sky-900/20 text-sky-400 border-sky-800' :
                                                e.status === 'VENCIDA' ? 'bg-red-900/20 text-red-400 border-red-800 animate-pulse' :
                                                e.status === 'PAGA' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-800' :
                                                e.status === 'PARCIAL' ? 'bg-indigo-900/20 text-indigo-400 border-indigo-800' :
                                                'bg-slate-800 text-slate-500 border-slate-700'
                                            }`}>
                                                {e.status}
                                            </span>
                                        </td>
                                        <td className={`px-8 py-4 text-right font-mono font-black ${isVencida ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {fmt(e.saldo_aberto)}
                                        </td>
                                        <td className="px-8 py-4 text-right text-slate-500 font-mono">
                                            {fmt(e.valor_original)}
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                            {canSettle && user.role === UserRole.OPERADOR ? (
                                                <button 
                                                    onClick={() => setSettlingReceivable(e)}
                                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-900/20"
                                                >
                                                    BAIXAR
                                                </button>
                                            ) : (
                                                <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-white transition-all">
                                                    <ArrowUpRight className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
      )}

      {/* MODAL DE BAIXA */}
      {settlingReceivable && (
          <ReceivableSettlementModal 
            receivable={settlingReceivable}
            currentUser={user}
            onClose={() => setSettlingReceivable(null)}
            onSuccess={() => {
                setSettlingReceivable(null);
                loadData();
            }}
          />
      )}

      <ChatWidget data={agentContext} mode="RECEIVABLES" />
    </div>
  );
};

const KPICard = ({ label, value, subValue, icon: Icon, color, highlight }: any) => {
    const colorMap: Record<string, string> = {
        indigo: "border-indigo-500/20 text-indigo-400 bg-indigo-500/5 shadow-indigo-500/10",
        emerald: "border-emerald-500/20 text-emerald-400 bg-emerald-500/5 shadow-emerald-500/10",
        cyan: "border-cyan-500/20 text-cyan-400 bg-cyan-500/5 shadow-cyan-500/10",
        blue: "border-blue-500/20 text-blue-400 bg-blue-500/5 shadow-blue-500/10",
        red: "border-red-500/30 text-red-400 bg-red-950/20 shadow-red-900/10",
    };

    return (
        <div className={`p-6 rounded-2xl border flex flex-col justify-between h-36 transition-all hover:scale-[1.03] shadow-xl backdrop-blur-md ${colorMap[color]} ${highlight ? 'ring-1 ring-red-500/50' : 'bg-slate-900/60'}`}>
            <div className="flex justify-between items-start">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                <div className={`p-2 rounded-xl bg-black/30 backdrop-blur-sm`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <div>
                <p className="text-2xl font-black text-white tracking-tight leading-none mb-1">{value}</p>
                <p className="text-[9px] font-medium text-slate-600 uppercase tracking-tighter">{subValue}</p>
            </div>
        </div>
    );
};

export default ReceivablesDashboard;
