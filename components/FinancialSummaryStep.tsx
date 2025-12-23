
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Calendar, FileText, Lock, TrendingUp, TrendingDown, 
  DollarSign, PieChart, Info, AlertTriangle 
} from 'lucide-react';
import { FechamentoMensal, RelatorioFinal, ResumoFechamento } from '../types';
import { listarFechamentosConcluidos } from '../services/closing';
import { loadReportFromStorage } from '../services/storage';
import { calcularResumoFechamento } from '../services/logic';
import { ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface FinancialSummaryStepProps {
  onBack: () => void;
}

const FinancialSummaryStep: React.FC<FinancialSummaryStepProps> = ({ onBack }) => {
  const [closedPeriods, setClosedPeriods] = useState<FechamentoMensal[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [reportData, setReportData] = useState<RelatorioFinal | null>(null);
  const [resumo, setResumo] = useState<ResumoFechamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  // 1. Load Closed Periods on Mount
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const periods = await listarFechamentosConcluidos();
      setClosedPeriods(periods);
      
      if (periods.length > 0) {
        // Select the most recent one by default
        setSelectedPeriod(periods[0].periodo);
      }
      setLoading(false);
    };
    init();
  }, []);

  // 2. Load Report Data when Period Changes
  useEffect(() => {
    const loadReport = async () => {
      if (!selectedPeriod) return;
      setLoadingReport(true);
      setReportData(null);
      setResumo(null);

      // The ID for reports matches the period YYYY-MM
      const data = await loadReportFromStorage(selectedPeriod);
      if (data) {
        setReportData(data);
        const calc = calcularResumoFechamento(data);
        setResumo(calc);
      }
      setLoadingReport(false);
    };

    loadReport();
  }, [selectedPeriod]);

  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  
  const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'];

  const paymentMixData = useMemo(() => {
      if (!resumo) return [];
      return Object.entries(resumo.totaisPorForma).map(([key, value]) => ({
          name: key,
          value: Number(value)
      })).filter(i => i.value > 0);
  }, [resumo]);

  return (
    <div className="max-w-7xl mx-auto mt-8 px-6 pb-20">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-orbitron font-bold text-white">Resumo Mensal</h2>
                        <span className="px-3 py-1 bg-amber-900/30 border border-amber-600/50 text-amber-400 text-[10px] font-bold uppercase rounded-full flex items-center gap-1">
                            <Info className="w-3 h-3" /> Módulo em Desenvolvimento (EIP)
                        </span>
                    </div>
                    <p className="text-slate-400 text-sm mt-1">Visão consolidada de períodos fechados.</p>
                </div>
            </div>

            {/* PERIOD SELECTOR */}
            <div className="bg-slate-900 border border-slate-700 p-2 rounded-xl flex items-center gap-3">
                <div className="relative">
                    <Calendar className="w-4 h-4 absolute top-2.5 left-3 text-slate-500" />
                    <select 
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="bg-slate-800 text-white text-sm rounded-lg pl-9 pr-8 py-2 border-none focus:ring-2 focus:ring-cyan-500 outline-none appearance-none min-w-[180px]"
                        disabled={loading || closedPeriods.length === 0}
                    >
                        {closedPeriods.length === 0 ? (
                            <option>Nenhum mês fechado</option>
                        ) : (
                            closedPeriods.map(p => (
                                <option key={p.id} value={p.periodo}>
                                    {p.periodo} - Fechado
                                </option>
                            ))
                        )}
                    </select>
                </div>
            </div>
        </div>

        {/* CONTENT STATES */}
        {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500">Buscando histórico...</p>
            </div>
        ) : closedPeriods.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 border-dashed rounded-xl p-12 text-center">
                <Lock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-300 mb-2">Nenhum mês fechado disponível</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                    O Resumo Mensal exibe apenas dados de meses que já passaram pelo processo de fechamento completo e validação.
                </p>
            </div>
        ) : loadingReport ? (
            <div className="animate-pulse space-y-4">
                <div className="h-32 bg-slate-800 rounded-xl"></div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="h-48 bg-slate-800 rounded-xl"></div>
                    <div className="h-48 bg-slate-800 rounded-xl"></div>
                    <div className="h-48 bg-slate-800 rounded-xl"></div>
                </div>
            </div>
        ) : !resumo ? (
            <div className="p-8 text-center text-red-400 bg-red-900/10 border border-red-900/30 rounded-xl">
                Erro ao carregar dados do relatório consolidado.
            </div>
        ) : (
            <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
                
                {/* 1. KEY METRICS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <DollarSign className="w-24 h-24 text-cyan-400" />
                        </div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Entradas Totais</p>
                        <h3 className="text-3xl font-black text-white">{fmtCurrency(resumo.totalVendasGeral)}</h3>
                        <div className="mt-4 flex gap-4 text-xs text-slate-400">
                            <span>NF: <strong className="text-cyan-400">{fmtCurrency(resumo.totalVendasComNF)}</strong></span>
                            <span>S/N: <strong className="text-orange-400">{fmtCurrency(resumo.totalVendasSemNF)}</strong></span>
                        </div>
                    </div>

                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <TrendingDown className="w-24 h-24 text-red-400" />
                        </div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Saídas / Despesas</p>
                        <h3 className="text-3xl font-black text-red-400">{fmtCurrency(resumo.totalSaidas)}</h3>
                        <p className="text-xs text-red-300/60 mt-4">Registradas no caixa diário</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 p-6 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <TrendingUp className="w-24 h-24 text-emerald-400" />
                        </div>
                        <p className="text-emerald-400/80 text-xs font-bold uppercase tracking-wider mb-1">Resultado Líquido</p>
                        <h3 className="text-3xl font-black text-emerald-400">{fmtCurrency(resumo.saldoEsperado)}</h3>
                        <p className="text-xs text-emerald-600 mt-4 font-medium">Resultado do Período</p>
                    </div>
                </div>

                {/* 2. CHARTS & DETAILS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* MIX DE PAGAMENTO */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 lg:col-span-1 flex flex-col">
                        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-purple-400" /> Mix de Recebimento
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPie>
                                    <Pie
                                        data={paymentMixData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {paymentMixData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                                        formatter={(value: number) => fmtCurrency(value)}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                                </RechartsPie>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* DETALHAMENTO DE VENDEDORES (SOMENTE LEITURA) */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-0 lg:col-span-2 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-700 bg-slate-900/30">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <FileText className="w-5 h-5 text-cyan-400" /> Detalhamento por Vendedor
                            </h3>
                        </div>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-900 text-slate-500 uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-4">Vendedor</th>
                                        <th className="px-6 py-4 text-right">Total Vendido</th>
                                        <th className="px-6 py-4 text-right">Devoluções</th>
                                        <th className="px-6 py-4 text-right">Resultado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {(Object.entries(resumo.totaisPorVendedor) as [string, number][])
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([vend, val]) => (
                                        <tr key={vend} className="hover:bg-slate-700/30">
                                            <td className="px-6 py-4 font-bold text-white">{vend}</td>
                                            <td className="px-6 py-4 text-right text-slate-300">{fmtCurrency(val)}</td>
                                            {/* Note: In ResumoFechamento, totals include negatives. We don't have separate returns here easily without recalcing. 
                                                For this read-only summary, we show net. */}
                                            <td className="px-6 py-4 text-right text-slate-500">-</td>
                                            <td className="px-6 py-4 text-right font-bold text-emerald-400">{fmtCurrency(val)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* 3. FOOTER INFO */}
                <div className="bg-blue-900/10 border border-blue-800/30 rounded-xl p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                        <h4 className="text-blue-300 font-bold text-sm">Dados Auditados</h4>
                        <p className="text-blue-200/70 text-xs mt-1">
                            Este relatório exibe os valores congelados no momento do fechamento ({selectedPeriod}). 
                            Alterações posteriores no Ledger ou em NFs não afetam estes números, garantindo a integridade histórica.
                        </p>
                    </div>
                </div>

            </div>
        )}
    </div>
  );
};

export default FinancialSummaryStep;
