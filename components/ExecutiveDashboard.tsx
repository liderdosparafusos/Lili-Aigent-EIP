
import React from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  DollarSign, TrendingDown, TrendingUp, AlertTriangle, Wallet, 
  CreditCard, PieChart as PieIcon, Activity
} from 'lucide-react';
import { ResumoFechamento, ResumoComissaoDiaria } from '../types';

interface ExecutiveDashboardProps {
  resumo: ResumoFechamento;
  comissoes: ResumoComissaoDiaria;
}

const COLORS = ['#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1'];

const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ resumo, comissoes }) => {
  
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const fmtCompact = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: "compact" }).format(v);

  // Safeguards
  if (!resumo || !comissoes) return null;

  // 1. Preparar dados para o Gráfico de Mix de Pagamento
  const paymentData = Object.entries(resumo.totaisPorForma || {})
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a, b) => b.value - a.value);

  // 2. Preparar dados para o Gráfico NF vs Sem NF
  const taxData = [
    { name: 'Com Nota Fiscal', value: resumo.totalVendasComNF },
    { name: 'Sem Nota (Cupom)', value: resumo.totalVendasSemNF }
  ];

  // 3. Alertas Inteligentes
  const alerts = [];
  const percentualEstorno = resumo.totalVendasGeral > 0 ? (resumo.totalEstornos / resumo.totalVendasGeral) : 0;
  const percentualSaida = resumo.totalVendasGeral > 0 ? (resumo.totalSaidas / resumo.totalVendasGeral) : 0;

  if (percentualEstorno > 0.05) { // Alerta se estorno > 5%
      alerts.push({
          type: 'warning',
          title: 'Alto Índice de Estornos',
          msg: `Devoluções representam ${(percentualEstorno * 100).toFixed(1)}% das vendas hoje.`
      });
  }
  if (percentualSaida > 0.30) { // Alerta se saídas > 30%
      alerts.push({
          type: 'critical',
          title: 'Saídas Elevadas',
          msg: `Despesas consumiram ${(percentualSaida * 100).toFixed(1)}% do faturamento diário.`
      });
  }
  if (resumo.saldoEsperado < 0) {
      alerts.push({
          type: 'critical',
          title: 'Resultado Negativo',
          msg: 'As saídas superaram as entradas neste período.'
      });
  }

  const commissionDetails = comissoes.detalhe || [];

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      
      {/* BLOCO 1: VISÃO GERAL (CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <DollarSign className="w-24 h-24 text-cyan-400" />
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Vendas Brutas</p>
              <h3 className="text-3xl font-black text-white">{fmt(resumo.totalVendasGeral)}</h3>
              <div className="mt-4 flex items-center gap-2 text-xs text-cyan-400">
                  <Activity className="w-4 h-4" /> Movimentação Total
              </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <TrendingDown className="w-24 h-24 text-red-400" />
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total de Saídas</p>
              <h3 className="text-3xl font-black text-red-400">{fmt(resumo.totalSaidas)}</h3>
              <div className="mt-4 flex items-center gap-2 text-xs text-red-300/70">
                  <TrendingDown className="w-4 h-4" /> Retiradas do Período
              </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-emerald-500/30 p-6 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Wallet className="w-24 h-24 text-emerald-400" />
              </div>
              <p className="text-emerald-500/80 text-xs font-bold uppercase tracking-wider mb-1">Resultado Líquido</p>
              <h3 className="text-3xl font-black text-emerald-400">{fmt(resumo.saldoEsperado)}</h3>
              <p className="text-xs text-emerald-600 mt-4 font-medium">Resultado Operacional do Período</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <TrendingUp className="w-24 h-24 text-orange-400" />
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Comissões do Período</p>
              <h3 className="text-3xl font-black text-orange-400">{fmt(comissoes.totalComissao)}</h3>
              <div className="mt-4 flex items-center gap-2 text-xs text-orange-300/70">
                  <TrendingUp className="w-4 h-4" /> Custo Variável
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* BLOCO 2: MIX DE PAGAMENTO */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 lg:col-span-2 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-purple-400" /> Mix de Pagamento
              </h3>
              <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={paymentData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                          <XAxis type="number" stroke="#64748b" tickFormatter={fmtCompact} />
                          <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} tick={{fontSize: 12}} />
                          <Tooltip 
                              cursor={{fill: '#334155', opacity: 0.4}}
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                              itemStyle={{ color: '#fff' }}
                              formatter={(value: number) => [fmt(value), 'Valor']}
                          />
                          <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={32}>
                              {paymentData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* BLOCO 4: COM NF x SEM NF */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-cyan-400" /> Fiscal
              </h3>
              <div className="flex-1 min-h-[250px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={taxData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                          >
                              <Cell fill="#0ea5e9" /> {/* Com NF */}
                              <Cell fill="#f97316" /> {/* Sem NF */}
                          </Pie>
                          <Tooltip 
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                              itemStyle={{ color: '#fff' }}
                              formatter={(value: number) => fmt(value)}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                  </ResponsiveContainer>
                  {/* Central Label */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                      <div className="text-center">
                          <span className="text-xs text-slate-500 font-bold uppercase">Total</span>
                          <div className="text-white font-bold">{fmtCompact(resumo.totalVendasGeral)}</div>
                      </div>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-sky-900/20 p-3 rounded-lg border border-sky-800/50 text-center">
                      <p className="text-[10px] text-sky-400 uppercase font-bold">Com Nota</p>
                      <p className="text-sky-300 font-bold">{fmtCompact(resumo.totalVendasComNF)}</p>
                  </div>
                  <div className="bg-orange-900/20 p-3 rounded-lg border border-orange-800/50 text-center">
                      <p className="text-[10px] text-orange-400 uppercase font-bold">Sem Nota</p>
                      <p className="text-orange-300 font-bold">{fmtCompact(resumo.totalVendasSemNF)}</p>
                  </div>
              </div>
          </div>
      </div>

      {/* BLOCO 3: RANKING DE VENDEDORES */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" /> Performance da Equipe
          </h3>
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-slate-500 uppercase text-xs">
                      <tr>
                          <th className="px-6 py-4 rounded-l-lg">Vendedor</th>
                          <th className="px-6 py-4 text-right">Total Vendido</th>
                          <th className="px-6 py-4 text-right hidden md:table-cell">% Part.</th>
                          <th className="px-6 py-4 text-right">Comissão</th>
                          <th className="px-6 py-4 rounded-r-lg w-full">Performance</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                      {commissionDetails.map((c, idx) => {
                          if (!c) return null;
                          const vendasBrutas = c.vendasBrutas || 0;
                          const valorComissao = c.valorComissao || 0;
                          const percent = resumo.totalVendasGeral > 0 ? (vendasBrutas / resumo.totalVendasGeral) * 100 : 0;
                          
                          return (
                              <tr key={idx} className="group hover:bg-slate-800 transition-colors">
                                  <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${idx === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-slate-300'}`}>
                                          {idx + 1}
                                      </div>
                                      {c.vendedor}
                                  </td>
                                  <td className="px-6 py-4 text-right text-slate-200 font-medium">
                                      {fmt(vendasBrutas)}
                                  </td>
                                  <td className="px-6 py-4 text-right text-slate-400 hidden md:table-cell">
                                      {percent.toFixed(1)}%
                                  </td>
                                  <td className="px-6 py-4 text-right font-bold text-emerald-400">
                                      {fmt(valorComissao)}
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                                          <div 
                                              className="bg-cyan-500 h-full rounded-full transition-all duration-1000 ease-out" 
                                              style={{ width: `${percent}%` }}
                                          />
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>

      {/* BLOCO 5: ALERTAS (CONDICIONAL) */}
      {alerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alerts.map((alert, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border flex items-start gap-4 ${
                      alert.type === 'critical' ? 'bg-red-900/20 border-red-800' : 'bg-amber-900/20 border-amber-800'
                  }`}>
                      <AlertTriangle className={`w-6 h-6 shrink-0 ${alert.type === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                      <div>
                          <h4 className={`font-bold text-sm mb-1 ${alert.type === 'critical' ? 'text-red-300' : 'text-amber-300'}`}>
                              {alert.title}
                          </h4>
                          <p className={`text-xs ${alert.type === 'critical' ? 'text-red-200/70' : 'text-amber-200/70'}`}>
                              {alert.msg}
                          </p>
                      </div>
                  </div>
              ))}
          </div>
      )}

    </div>
  );
};

export default ExecutiveDashboard;
