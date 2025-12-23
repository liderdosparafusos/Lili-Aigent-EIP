
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
  Users, AlertTriangle, Filter, Calendar, RefreshCw, Trophy,
  Bot, Sparkles, Activity, CreditCard, CheckCircle, Clock,
  FileText, ArrowUpRight, Target, BarChart2, PieChart as PieIcon,
  Receipt, Tag
} from 'lucide-react';
import { CommercialCompetencyData, getDashboardComercial } from '../services/dashboard';
import { getVendedorLabel } from '../services/logic';
import { User } from '../types';
import { useNotification } from './NotificationSystem';

interface CommercialDashboardProps {
  user: User;
  onNavigate: (module: string, subModule?: string) => void;
}

const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'];

const CommercialDashboard: React.FC<CommercialDashboardProps> = ({ user, onNavigate }) => {
  const { notify } = useNotification();
  
  // Período default: Mês Atual
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState<CommercialCompetencyData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
        const result = await getDashboardComercial(startDate, endDate);
        setData(result);
    } catch (e) {
        console.error(e);
        notify("Erro de Sincronização", "Não foi possível carregar os dados comerciais.", "error");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const fmtNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

  if (loading || !data) {
    return (
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-orbitron animate-pulse">Consolidando Inteligência Comercial...</p>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto pb-20 relative font-sans text-slate-200">
      
      {/* HEADER E FILTROS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6 border-b border-slate-800 pb-6">
         <div>
             <h1 className="text-3xl font-orbitron font-bold text-white tracking-wide flex items-center gap-3">
                <BarChart2 className="text-indigo-400 w-8 h-8" />
                Inteligência Comercial
             </h1>
             <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                 <Target className="w-4 h-4 text-emerald-500" />
                 Análise Consolidada de Vendas (NFe + NFC-e)
             </p>
         </div>

         <div className="flex flex-wrap items-center gap-3 bg-slate-900/50 p-2 rounded-2xl border border-slate-800 shadow-2xl">
             <div className="flex items-center gap-2 px-3 border-r border-slate-700 mr-2">
                 <Calendar className="w-4 h-4 text-slate-500" />
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filtrar Período</span>
             </div>
             <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-white text-sm font-bold outline-none focus:text-indigo-400 transition-colors [color-scheme:dark]"
             />
             <span className="text-slate-600">até</span>
             <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-white text-sm font-bold outline-none focus:text-indigo-400 transition-colors [color-scheme:dark]"
             />
             <button 
                onClick={loadData}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-xl transition-all border border-slate-700"
             >
                 <RefreshCw className="w-4 h-4" />
             </button>
         </div>
      </div>

      {/* KPIs PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <KPICard 
             label="Faturamento Bruto" 
             value={fmtCurrency(data.kpis.totalVendasBrutas)} 
             subValue="Vendas Totais"
             icon={DollarSign}
             color="indigo"
          />
          <KPICard 
             label="Vendas À Vista" 
             value={fmtCurrency(data.kpis.vendasAVista)} 
             subValue="Dinheiro / Pix / Débito"
             icon={CheckCircle}
             color="emerald"
          />
          <KPICard 
             label="Vendas Faturadas" 
             value={fmtCurrency(data.kpis.vendasFaturadas)} 
             subValue="Boletos / Prazo"
             icon={Clock}
             color="purple"
          />
          <KPICard 
             label="Balcão (NFC-e)" 
             value={fmtCurrency(data.kpis.vendasNfce)} 
             subValue="Vendas Sem XML"
             icon={Receipt}
             color="orange"
          />
          <KPICard 
             label="Devoluções" 
             value={fmtCurrency(data.kpis.totalEstornos)} 
             subValue="Abatimentos"
             icon={TrendingDown}
             color="red"
          />
          <KPICard 
             label="Resultado Líquido" 
             value={fmtCurrency(data.kpis.resultadoComercial)} 
             subValue="Margem de Vendas"
             icon={Trophy}
             color="cyan"
             highlight
          />
      </div>

      {/* INDICADORES SECUNDÁRIOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex items-center justify-between shadow-xl">
              <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ticket Médio</p>
                  <p className="text-2xl font-black text-white">{fmtCurrency(data.kpis.ticketMedio)}</p>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20"><Tag className="text-indigo-400 w-6 h-6" /></div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex items-center justify-between shadow-xl">
              <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Volume Operacional</p>
                  <p className="text-2xl font-black text-white">{fmtNumber(data.kpis.qtdVendas)} vendas</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20"><ShoppingBag className="text-emerald-400 w-6 h-6" /></div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex items-center justify-between shadow-xl">
              <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Índice de Retorno</p>
                  <p className={`text-2xl font-black ${data.kpis.totalEstornos / (data.kpis.totalVendasBrutas || 1) > 0.1 ? 'text-red-400' : 'text-slate-200'}`}>
                      {((data.kpis.totalEstornos / (data.kpis.totalVendasBrutas || 1)) * 100).toFixed(1)}%
                  </p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20"><AlertTriangle className="text-red-400 w-6 h-6" /></div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* GRÁFICO RITMO DE VENDAS */}
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
              <div className="flex justify-between items-center mb-8">
                  <h3 className="text-lg font-bold text-white font-orbitron flex items-center gap-3">
                      <Activity className="text-indigo-400 w-5 h-5" />
                      Faturamento Diário
                  </h3>
                  <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vendas Reais</span>
                  </div>
              </div>
              <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.ritmoVendas}>
                          <defs>
                              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis 
                            dataKey="data" 
                            stroke="#475569" 
                            fontSize={10} 
                            tickFormatter={(val) => val.split('-').reverse().slice(0,2).join('/')}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#475569" 
                            fontSize={10} 
                            tickFormatter={(val) => `R$${val/1000}k`}
                            tickLine={false}
                            axisLine={false}
                          />
                          <RechartsTooltip 
                             contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                             formatter={(value: number) => [fmtCurrency(value), 'Faturamento']}
                          />
                          <Area type="monotone" dataKey="valor" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* GRÁFICO MIX PAGAMENTO */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col backdrop-blur-md">
              <h3 className="text-lg font-bold text-white font-orbitron mb-8 flex items-center gap-3">
                  <PieIcon className="text-purple-400 w-5 h-5" />
                  Mix de Recebimento
              </h3>
              <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={data.mixPagamento}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="valor"
                              nameKey="metodo"
                          >
                              {data.mixPagamento.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                            formatter={(value: number) => fmtCurrency(value)}
                          />
                          <Legend iconType="circle" wrapperStyle={{fontSize: '11px', paddingTop: '20px'}} />
                      </PieChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* RANKING VENDEDORES */}
          <div className="lg:col-span-3 bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
                  <h3 className="text-lg font-bold text-white font-orbitron flex items-center gap-3">
                      <Trophy className="text-yellow-500 w-5 h-5" />
                      Performance por Vendedor
                  </h3>
                  <button className="text-xs font-bold text-indigo-400 flex items-center gap-2 hover:underline">
                      Análise Detalhada <ArrowUpRight className="w-3 h-3" />
                  </button>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-slate-950/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                          <tr>
                              <th className="px-8 py-5">Colaborador</th>
                              <th className="px-8 py-5 text-right">Vendas Líquidas</th>
                              <th className="px-8 py-5 text-center">Volume</th>
                              <th className="px-8 py-5 text-right">Market Share</th>
                              <th className="px-8 py-5">Performance</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                          {data.rankingVendedores.map((v, idx) => (
                              <tr key={v.nome} className="hover:bg-slate-800/30 transition-colors group">
                                  <td className="px-8 py-4">
                                      <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-slate-800 text-slate-400'}`}>
                                              {idx + 1}
                                          </div>
                                          <span className="font-bold text-white group-hover:text-indigo-300 transition-colors">{v.nome}</span>
                                      </div>
                                  </td>
                                  <td className="px-8 py-4 text-right font-mono font-bold text-indigo-400">
                                      {fmtCurrency(v.valor)}
                                  </td>
                                  <td className="px-8 py-4 text-center text-slate-400 font-medium">
                                      {v.vendasCount} docs
                                  </td>
                                  <td className="px-8 py-4 text-right text-slate-300 font-bold">
                                      {v.percentual.toFixed(1)}%
                                  </td>
                                  <td className="px-8 py-4 w-48">
                                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                          <div 
                                             className={`h-full rounded-full transition-all duration-1000 ease-out ${idx === 0 ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-600'}`}
                                             style={{ width: `${v.percentual}%` }}
                                          />
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
    </div>
  );
};

const KPICard = ({ label, value, subValue, icon: Icon, color, highlight }: any) => {
    const colorMap: Record<string, string> = {
        indigo: "border-indigo-500/20 text-indigo-400 bg-indigo-500/5 shadow-indigo-500/10",
        emerald: "border-emerald-500/20 text-emerald-400 bg-emerald-500/5 shadow-emerald-500/10",
        purple: "border-purple-500/20 text-purple-400 bg-purple-500/5 shadow-purple-500/10",
        orange: "border-orange-500/20 text-orange-400 bg-orange-500/5 shadow-orange-500/10",
        red: "border-red-500/20 text-red-400 bg-red-500/5 shadow-red-900/10",
        cyan: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10 shadow-cyan-500/20",
    };

    return (
        <div className={`p-6 rounded-2xl border flex flex-col justify-between h-36 transition-all hover:scale-[1.03] shadow-xl ${colorMap[color]} ${highlight ? 'ring-1 ring-cyan-500/50' : 'bg-slate-900/60'}`}>
            <div className="flex justify-between items-start">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                <div className={`p-2 rounded-xl bg-black/30 backdrop-blur-sm`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <div>
                <p className="text-2xl font-black text-white tracking-tight leading-none mb-1">{value}</p>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">{subValue}</p>
            </div>
        </div>
    );
};

export default CommercialDashboard;
