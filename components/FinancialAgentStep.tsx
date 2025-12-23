
import React, { useState, useEffect } from 'react';
import { 
  Bot, RefreshCw, AlertTriangle, Info, CheckCircle, Archive, 
  ArrowRight, Filter, DollarSign, TrendingDown, TrendingUp,
  ShieldAlert, Clock, AlertOctagon
} from 'lucide-react';
import { Insight, InsightSeverity, User as AppUser } from '../types';
import { runFinancialAgentAnalysis } from '../services/financialAgent';
import { listarInsights, marcarInsightLido } from '../services/agent';

interface FinancialAgentStepProps {
  onBack: () => void;
  currentUser: AppUser;
}

const FinancialAgentStep: React.FC<FinancialAgentStepProps> = ({ onBack, currentUser }) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Filters
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | InsightSeverity>('ALL');
  const [filterStatus, setFilterStatus] = useState<'NOVO' | 'LIDO' | 'ARQUIVADO' | 'ALL'>('NOVO');

  const loadData = async () => {
    setLoading(true);
    const data = await listarInsights();
    // Prioriza insights financeiros e de fechamento nesta visão
    setInsights(data.filter(i => i.tipo === 'Financeiro' || i.tipo === 'FECHAMENTO'));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunAnalysis = async () => {
      setAnalyzing(true);
      await runFinancialAgentAnalysis();
      await loadData();
      setAnalyzing(false);
  };

  const handleUpdateStatus = async (id: string, status: 'LIDO' | 'ARQUIVADO') => {
      setInsights(prev => prev.map(i => i.id === id ? { ...i, status } : i));
      await marcarInsightLido(id, status);
  };

  const filteredInsights = insights.filter(i => {
      const severityKey = i.severidade || i.prioridade;
      if (filterSeverity !== 'ALL' && severityKey !== filterSeverity) return false;
      if (filterStatus !== 'ALL' && i.status !== filterStatus) return false;
      return true;
  });

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 md:px-8 pb-20">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-900/20 rounded-full border border-emerald-500/30">
                    <Bot className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-3xl font-orbitron font-bold text-white">Agente Financeiro</h2>
                    <p className="text-slate-400 text-sm">Auditoria automática de recebíveis e riscos de caixa.</p>
                </div>
            </div>
            
            <button 
                onClick={handleRunAnalysis}
                disabled={analyzing}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
            >
                <RefreshCw className={`w-5 h-5 ${analyzing ? 'animate-spin' : ''}`} />
                {analyzing ? 'Analisando Carteira...' : 'Auditar Recebíveis'}
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* SIDEBAR FILTERS */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Filter className="w-4 h-4" /> Filtros de Alerta
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-2">Status</label>
                            <div className="flex flex-col gap-2">
                                {['NOVO', 'LIDO', 'ARQUIVADO', 'ALL'].map(s => (
                                    <button 
                                        key={s}
                                        onClick={() => setFilterStatus(s as any)}
                                        className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === s ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        {s === 'ALL' ? 'TODOS' : s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-2">Gravidade</label>
                            <div className="flex flex-col gap-2">
                                {['ALL', 'CRITICO', 'ATENCAO', 'INFO'].map(s => (
                                    <button 
                                        key={s}
                                        onClick={() => setFilterSeverity(s as any)}
                                        className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${filterSeverity === s ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        {s === 'ALL' ? 'TODAS' : s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-emerald-900/10 border border-emerald-800/30 rounded-2xl p-6">
                    <h4 className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" /> Compliance IA
                    </h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                        O agente financeiro monitora 24/7 a saúde do faturamento. Notas vencidas de clientes VIP recebem prioridade máxima de notificação.
                    </p>
                </div>
            </div>

            {/* MAIN FEED */}
            <div className="lg:col-span-3 space-y-4">
                {loading ? (
                    <div className="py-20 text-center text-slate-500 animate-pulse">Sincronizando inteligência...</div>
                ) : filteredInsights.length === 0 ? (
                    <div className="bg-slate-900/40 border border-slate-800 border-dashed rounded-3xl py-24 text-center">
                        <CheckCircle className="w-16 h-16 text-emerald-500/20 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-500">Tudo em ordem no financeiro</h3>
                        <p className="text-slate-600 text-sm mt-1">Nenhum risco detectado para os filtros selecionados.</p>
                    </div>
                ) : (
                    filteredInsights.map(insight => (
                        <div 
                            key={insight.id} 
                            className={`group relative bg-slate-900/60 border rounded-2xl p-6 transition-all hover:bg-slate-900 ${
                                (insight.severidade || insight.prioridade) === 'CRITICO' ? 'border-red-900/50 hover:border-red-600' :
                                (insight.severidade || insight.prioridade) === 'ATENCAO' ? 'border-amber-900/50 hover:border-amber-500' :
                                'border-slate-800 hover:border-emerald-500'
                            }`}
                        >
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        {(insight.severidade || insight.prioridade) === 'CRITICO' ? <AlertOctagon className="text-red-500 w-5 h-5" /> : 
                                         (insight.severidade || insight.prioridade) === 'ATENCAO' ? <AlertTriangle className="text-amber-500 w-5 h-5" /> : 
                                         <Info className="text-blue-400 w-5 h-5" />}
                                        
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                            (insight.severidade || insight.prioridade) === 'CRITICO' ? 'bg-red-500/20 text-red-400' :
                                            (insight.severidade || insight.prioridade) === 'ATENCAO' ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        }`}>
                                            {insight.severidade || insight.prioridade}
                                        </span>
                                        
                                        <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {new Date(insight.dataGeracao).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">{insight.titulo}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-4">{insight.mensagem || insight.descricao}</p>

                                    {insight.recomendacao && (
                                        <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex items-start gap-3">
                                            <Zap className="w-4 h-4 text-emerald-400 mt-0.5" />
                                            <p className="text-xs font-medium text-slate-300">
                                                <span className="text-emerald-400 font-bold uppercase mr-1">Ação IA:</span>
                                                {insight.recomendacao}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full md:w-48 shrink-0 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                                    <div className="mb-4">
                                        <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Impacto</p>
                                        <p className={`text-xl font-black ${(insight.severidade || insight.prioridade) === 'CRITICO' ? 'text-red-400' : 'text-white'}`}>
                                            {insight.contexto?.valorEnvolvido ? fmt(insight.contexto.valorEnvolvido) : 'Análise Qualitativa'}
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        {insight.status === 'NOVO' && (
                                            <button 
                                                onClick={() => handleUpdateStatus(insight.id, 'LIDO')}
                                                className="flex-1 py-2 bg-slate-800 hover:bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg transition-all"
                                            >
                                                Ciente
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleUpdateStatus(insight.id, 'ARQUIVADO')}
                                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-500 hover:text-white rounded-lg transition-all"
                                            title="Arquivar Alerta"
                                        >
                                            <Archive className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
  );
};

const Zap = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
);

export default FinancialAgentStep;
