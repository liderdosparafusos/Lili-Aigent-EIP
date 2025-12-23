
import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, User, TrendingUp, AlertCircle, Search, DollarSign, Percent } from 'lucide-react';
import { Comissao } from '../types';
import { listarComissoes, recalcularComissoesPorPeriodo } from '../services/commissions';
import { useNotification } from './NotificationSystem';

interface CommissionDashboardStepProps {
  onBack: () => void;
}

const CommissionDashboardStep: React.FC<CommissionDashboardStepProps> = ({ onBack }) => {
  const { notify } = useNotification();
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const data = await listarComissoes(periodo);
    setComissoes(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [periodo]);

  const handleRecalculate = async () => {
      setCalculating(true);
      try {
          const result = await recalcularComissoesPorPeriodo(periodo);
          if (result.length === 0) {
              notify("Dados insuficientes", "Certifique-se de que o fechamento deste mês foi processado e salvo primeiro.", "warning");
          } else {
              notify("Sucesso", `Comissões de ${periodo} calculadas com base no relatório consolidado.`, "success");
          }
          await loadData();
      } catch (e) {
          notify("Erro no Cálculo", "Ocorreu uma falha ao acessar os dados de vendas.", "error");
      } finally {
          setCalculating(false);
      }
  };

  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const totalComissao = comissoes.reduce((acc, c) => acc + c.valorCalculado, 0);
  const totalVendas = comissoes.reduce((acc, c) => acc + c.detalhes.vendasBrutas, 0);

  return (
    <div className="max-w-7xl mx-auto mt-8 px-6 pb-20 font-sans text-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-slate-800 pb-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-3xl font-orbitron font-bold text-white">Comissões Mensais</h2>
                    <p className="text-slate-400 text-sm">Cálculo baseado em NFe + NFC-e (Vendedor Final).</p>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-800 shadow-xl">
                <div className="relative">
                    <Search className="w-4 h-4 absolute top-3 left-3 text-slate-500" />
                    <input 
                        type="month" 
                        value={periodo} 
                        onChange={(e) => setPeriodo(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:border-cyan-500 transition-all [color-scheme:dark]"
                    />
                </div>
                <button 
                    onClick={handleRecalculate}
                    disabled={calculating}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg transition-all disabled:opacity-50"
                >
                    {calculating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {calculating ? 'Calculando...' : 'Recalcular'}
                </button>
            </div>
        </div>

        {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium">Carregando dados das comissões...</p>
            </div>
        ) : comissoes.length === 0 ? (
            <div className="bg-slate-800/30 border border-slate-700 border-dashed rounded-3xl p-20 text-center flex flex-col items-center">
                <div className="p-4 bg-slate-800 rounded-full mb-4">
                    <AlertCircle className="w-12 h-12 text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-400 mb-2">Nenhuma comissão calculada para este período</h3>
                <p className="text-slate-500 max-w-md">
                    Clique em <b>Recalcular</b> para processar as vendas do mês de {periodo} ou verifique se o fechamento mensal foi salvo.
                </p>
            </div>
        ) : (
            <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-xl">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Vendas Totais do Mês</p>
                            <p className="text-2xl font-black text-white">{fmtCurrency(totalVendas)}</p>
                        </div>
                        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20"><DollarSign className="text-indigo-400 w-6 h-6" /></div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-xl">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Comissões</p>
                            <p className="text-2xl font-black text-emerald-400">{fmtCurrency(totalComissao)}</p>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20"><TrendingUp className="text-emerald-400 w-6 h-6" /></div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-xl">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Custo Médio Variável</p>
                            <p className="text-2xl font-black text-cyan-400">
                                {totalVendas > 0 ? ((totalComissao / totalVendas) * 100).toFixed(2) : '0.00'}%
                            </p>
                        </div>
                        <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20"><Percent className="text-cyan-400 w-6 h-6" /></div>
                    </div>
                </div>

                {/* LISTA */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
                    <div className="p-8 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white font-orbitron flex items-center gap-3">
                            <User className="text-indigo-400 w-5 h-5" /> Detalhamento por Vendedor
                        </h3>
                        <span className="text-[10px] font-black bg-slate-800 text-slate-500 px-2 py-1 rounded border border-slate-700 uppercase tracking-widest">Base Líquida</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-950/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                                <tr>
                                    <th className="px-8 py-5">Vendedor</th>
                                    <th className="px-8 py-5 text-right">Vendas Brutas</th>
                                    <th className="px-8 py-5 text-right">Estornos</th>
                                    <th className="px-8 py-5 text-right">Base Cálculo</th>
                                    <th className="px-8 py-5 text-center">Taxa (%)</th>
                                    <th className="px-8 py-5 text-right">Comissão</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {comissoes.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 border border-slate-700">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <span className="font-bold text-white group-hover:text-indigo-300 transition-colors">{c.vendedor}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-right font-mono text-slate-300">
                                            {fmtCurrency(c.detalhes.vendasBrutas)}
                                        </td>
                                        <td className="px-8 py-4 text-right font-mono text-red-400/70">
                                            -{fmtCurrency(c.detalhes.estornos)}
                                        </td>
                                        <td className="px-8 py-4 text-right font-mono text-slate-200 font-bold">
                                            {fmtCurrency(c.baseCalculo)}
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                            <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 font-bold text-xs">
                                                {c.percentual}%
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <span className="font-black text-emerald-400 text-lg">
                                                {fmtCurrency(c.valorCalculado)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default CommissionDashboardStep;
