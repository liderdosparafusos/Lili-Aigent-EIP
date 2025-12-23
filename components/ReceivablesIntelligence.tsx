
import React, { useState, useEffect } from 'react';
import { 
    Activity, ShieldAlert, Zap, TrendingUp, AlertTriangle, 
    ArrowRight, CheckCircle, Clock, Info, ShieldCheck, Target
} from 'lucide-react';
import { ReceivablesIntelligenceData, getReceivablesIntelligence } from '../services/financialAgent';

const ReceivablesIntelligence: React.FC = () => {
    const [data, setData] = useState<ReceivablesIntelligenceData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getReceivablesIntelligence().then(res => {
            setData(res);
            setLoading(false);
        });
    }, []);

    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    if (loading || !data) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
                <Activity className="w-12 h-12 text-indigo-500 animate-pulse mb-4" />
                <p className="text-slate-400 font-orbitron animate-pulse uppercase tracking-widest text-xs">Sincronizando Central de Inteligência...</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-[fadeIn_0.5s_ease-out]">
            
            {/* COLUNA 1: SCORE E KPI PREDITIVO */}
            <div className="space-y-6">
                {/* Health Score Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ShieldCheck className="w-32 h-32 text-emerald-400" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-8">Score de Saúde da Carteira</h3>
                        <div className="flex items-end gap-4 mb-2">
                            <span className={`text-7xl font-black font-orbitron leading-none ${data.healthScore > 70 ? 'text-emerald-400' : data.healthScore > 40 ? 'text-amber-400' : 'text-red-400'}`}>
                                {data.healthScore}
                            </span>
                            <span className="text-slate-600 font-bold mb-2">/ 100</span>
                        </div>
                        <p className="text-slate-400 text-sm mb-6">Nível de Risco: <strong className={data.riskLevel === 'BAIXO' ? 'text-emerald-400' : 'text-red-400'}>{data.riskLevel}</strong></p>
                        
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-4">
                            <div className={`h-full transition-all duration-1000 ease-out ${data.healthScore > 70 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${data.healthScore}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-600 font-bold uppercase">Baseado em Inadimplência vs Saldo Ativo</p>
                    </div>
                </div>

                {/* Previsão de Liquidez */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-900/30 rounded-lg text-indigo-400 border border-indigo-800/30">
                            <Zap className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-white text-sm">Liquidez Projetada (7 dias)</h3>
                    </div>
                    <p className="text-2xl font-black text-white mb-2">{fmt(data.liquidityForecast7d)}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Target className="w-3 h-3" /> Considera margem de quebra de 5%
                    </p>
                </div>
            </div>

            {/* COLUNA 2: FILA DE PRIORIDADES (INSIGHTS) */}
            <div className="xl:col-span-2 space-y-6">
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col min-h-[500px]">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-bold text-white font-orbitron flex items-center gap-3">
                            <Activity className="text-indigo-400 w-5 h-5" />
                            Fila de Prioridade Imediata
                        </h3>
                        <span className="text-[10px] font-black bg-indigo-900/30 text-indigo-400 px-2 py-1 rounded border border-indigo-800/50 uppercase tracking-widest">IA Real-Time</span>
                    </div>

                    <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {data.priorityQueue.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-600">
                                <CheckCircle className="w-12 h-12 mb-4 opacity-20" />
                                <p>Nenhuma ação prioritária detectada.</p>
                            </div>
                        ) : (
                            data.priorityQueue.map((insight) => (
                                <div key={insight.id} className={`group p-6 rounded-2xl border transition-all hover:bg-slate-900 ${insight.severidade === 'CRITICO' ? 'bg-red-900/10 border-red-900/30' : 'bg-slate-800/40 border-slate-700'}`}>
                                    <div className="flex flex-col md:flex-row gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                {insight.severidade === 'CRITICO' ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <Info className="w-4 h-4 text-indigo-400" />}
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{insight.titulo}</span>
                                            </div>
                                            <p className="text-sm text-slate-200 font-medium mb-4">{insight.mensagem}</p>
                                            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold bg-indigo-950/50 p-3 rounded-xl border border-indigo-900/30">
                                                <ArrowRight className="w-3 h-3" /> {insight.recomendacao}
                                            </div>
                                        </div>
                                        <div className="w-full md:w-32 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Impacto</p>
                                            <p className="text-lg font-black text-white">{fmt(insight.contexto.valorEnvolvido || 0)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Concentração de Risco */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Target className="w-4 h-4" /> Principais Concentrações de Saldo
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {data.topRiskClients.map((c, idx) => (
                            <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-indigo-500 transition-all">
                                <p className="text-[10px] text-slate-600 font-bold uppercase truncate mb-2">{c.cliente}</p>
                                <p className="text-base font-black text-white mb-1">{c.percentual.toFixed(1)}%</p>
                                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                                    <div className={`h-full ${c.risco === 'ALTO' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500'}`} style={{ width: `${c.percentual}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceivablesIntelligence;
