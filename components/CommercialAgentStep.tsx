
import React, { useState, useEffect } from 'react';
import { 
  Bot, RefreshCw, AlertTriangle, Info, CheckCircle, Archive, 
  ArrowRight, Filter, DollarSign, Zap, List
} from 'lucide-react';
import { Insight, InsightSeverity, User as AppUser, UserRole, AgentAction } from '../types';
import { runCommercialAgentAnalysis, listarInsights, marcarInsightLido } from '../services/agent';
import { listarAgentActions } from '../services/executingAgent';
import AgentActionPanel from './AgentActionPanel';

interface CommercialAgentStepProps {
  onBack: () => void;
  currentUser: AppUser;
}

const CommercialAgentStep: React.FC<CommercialAgentStepProps> = ({ onBack, currentUser }) => {
  // Tabs
  const [activeTab, setActiveTab] = useState<'INSIGHTS' | 'ACTIONS'>('INSIGHTS');

  // Insights State
  const [insights, setInsights] = useState<Insight[]>([]);
  
  // Actions State
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [selectedAction, setSelectedAction] = useState<AgentAction | null>(null);

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Filters
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | InsightSeverity>('ALL');
  const [filterStatus, setFilterStatus] = useState<'NOVO' | 'LIDO' | 'ARQUIVADO' | 'ALL'>('NOVO');

  const loadData = async () => {
    setLoading(true);
    const [insightsData, actionsData] = await Promise.all([
        listarInsights(),
        listarAgentActions()
    ]);
    setInsights(insightsData);
    setActions(actionsData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunAnalysis = async () => {
      setAnalyzing(true);
      await runCommercialAgentAnalysis();
      await loadData(); // Reload both lists
      setAnalyzing(false);
  };

  const handleUpdateStatus = async (id: string, status: 'LIDO' | 'ARQUIVADO') => {
      setInsights(prev => prev.map(i => i.id === id ? { ...i, status } : i));
      await marcarInsightLido(id, status);
  };

  const filteredInsights = insights.filter(i => {
      if (filterSeverity !== 'ALL' && i.severidade !== filterSeverity) return false;
      if (filterStatus !== 'ALL' && i.status !== filterStatus) return false;
      return true;
  });

  const getSeverityIcon = (sev: InsightSeverity) => {
      switch(sev) {
          case 'CRITICO': return <AlertTriangle className="w-5 h-5 text-red-500" />;
          case 'ATENCAO': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
          case 'INFO': return <Info className="w-5 h-5 text-blue-500" />;
      }
  };

  const getSeverityColor = (sev: InsightSeverity) => {
      switch(sev) {
          case 'CRITICO': return 'border-red-500/50 bg-red-900/10';
          case 'ATENCAO': return 'border-amber-500/50 bg-amber-900/10';
          case 'INFO': return 'border-blue-500/50 bg-blue-900/10';
      }
  };

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 md:px-8 pb-20 relative">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-900/20 rounded-full border border-indigo-500/30">
                    <Bot className="w-8 h-8 text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-3xl font-orbitron font-bold text-white">Agente Comercial</h2>
                    <p className="text-slate-400 text-sm">Análise inteligente e execução de tarefas.</p>
                </div>
            </div>
            
            <button 
                onClick={handleRunAnalysis}
                disabled={analyzing}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-900/30 transition-all disabled:opacity-50"
            >
                <RefreshCw className={`w-5 h-5 ${analyzing ? 'animate-spin' : ''}`} />
                {analyzing ? 'Analisando Dados...' : 'Executar Análise'}
            </button>
        </div>

        {/* TABS */}
        <div className="flex gap-4 mb-6 border-b border-slate-700">
            <button 
                onClick={() => setActiveTab('INSIGHTS')}
                className={`pb-3 px-2 flex items-center gap-2 font-bold text-sm transition-colors ${activeTab === 'INSIGHTS' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <List className="w-4 h-4" /> Insights ({filteredInsights.length})
            </button>
            <button 
                onClick={() => setActiveTab('ACTIONS')}
                className={`pb-3 px-2 flex items-center gap-2 font-bold text-sm transition-colors ${activeTab === 'ACTIONS' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <Zap className="w-4 h-4" /> Oportunidades de Ação ({actions.filter(a => a.status === 'SUGGESTED').length})
            </button>
        </div>

        {activeTab === 'INSIGHTS' && (
            <>
                {/* FILTERS */}
                <div className="flex flex-wrap gap-4 mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold text-slate-400 uppercase">Filtros:</span>
                    </div>
                    
                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="bg-slate-800 border border-slate-700 text-white text-sm rounded px-3 py-1.5 focus:border-indigo-500 outline-none"
                    >
                        <option value="NOVO">Novos</option>
                        <option value="LIDO">Lidos</option>
                        <option value="ARQUIVADO">Arquivados</option>
                        <option value="ALL">Todos</option>
                    </select>

                    <select 
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value as any)}
                        className="bg-slate-800 border border-slate-700 text-white text-sm rounded px-3 py-1.5 focus:border-indigo-500 outline-none"
                    >
                        <option value="ALL">Todas Severidades</option>
                        <option value="CRITICO">Crítico</option>
                        <option value="ATENCAO">Atenção</option>
                        <option value="INFO">Informativo</option>
                    </select>
                </div>

                {/* INSIGHTS FEED */}
                <div className="grid grid-cols-1 gap-4">
                    {loading ? (
                        <div className="text-center py-20 text-slate-500">Carregando insights...</div>
                    ) : filteredInsights.length === 0 ? (
                        <div className="text-center py-20 bg-slate-800/30 rounded-xl border border-slate-700 border-dashed">
                            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-500/50" />
                            <p className="text-slate-400">Nenhum insight encontrado com os filtros atuais.</p>
                        </div>
                    ) : (
                        filteredInsights.map(insight => (
                            <div 
                                key={insight.id} 
                                className={`p-6 rounded-xl border flex flex-col md:flex-row gap-6 animate-[fadeIn_0.3s_ease-out] ${getSeverityColor(insight.severidade)}`}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        {getSeverityIcon(insight.severidade)}
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded bg-black/20 uppercase tracking-wider ${
                                            insight.severidade === 'CRITICO' ? 'text-red-400' : 
                                            insight.severidade === 'ATENCAO' ? 'text-amber-400' : 'text-blue-400'
                                        }`}>
                                            {insight.severidade}
                                        </span>
                                        <span className="text-xs text-slate-400 bg-black/20 px-2 py-0.5 rounded">
                                            {insight.tipo}
                                        </span>
                                        <span className="text-xs text-slate-500 ml-auto">
                                            {new Date(insight.dataGeracao).toLocaleDateString()}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-xl font-bold text-white mb-2">{insight.titulo}</h3>
                                    <p className="text-slate-300 mb-4">{insight.mensagem}</p>
                                    
                                    {insight.recomendacao && (
                                        <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                            <p className="text-sm font-medium text-indigo-300 flex items-start gap-2">
                                                <ArrowRight className="w-4 h-4 mt-0.5 shrink-0" /> 
                                                Recomendação: {insight.recomendacao}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Context Data & Actions */}
                                <div className="w-full md:w-64 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 gap-4">
                                    <div className="space-y-2 text-sm text-slate-400">
                                        {insight.contexto.valorEnvolvido && (
                                            <div className="flex justify-between">
                                                <span>Valor:</span>
                                                <span className="text-white font-bold">R$ {insight.contexto.valorEnvolvido.toLocaleString('pt-BR')}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 mt-auto">
                                        {insight.status === 'NOVO' && (
                                            <button 
                                                onClick={() => handleUpdateStatus(insight.id, 'LIDO')}
                                                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded transition-colors"
                                            >
                                                Marcar Lido
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleUpdateStatus(insight.id, 'ARQUIVADO')}
                                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors"
                                            title="Arquivar"
                                        >
                                            <Archive className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </>
        )}

        {activeTab === 'ACTIONS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {actions.length === 0 ? (
                    <div className="col-span-2 text-center py-20 bg-slate-800/30 rounded-xl border border-slate-700 border-dashed">
                        <Zap className="w-16 h-16 mx-auto mb-4 text-indigo-500/50" />
                        <p className="text-slate-400">Nenhuma oportunidade de ação detectada no momento.</p>
                    </div>
                ) : (
                    actions.map(action => (
                        <div 
                            key={action.id} 
                            className={`p-6 rounded-xl border relative overflow-hidden transition-all ${
                                action.status === 'EXECUTED' ? 'bg-slate-800 border-slate-700 opacity-75' : 'bg-indigo-900/10 border-indigo-500/50 hover:bg-indigo-900/20 cursor-pointer'
                            }`}
                            onClick={action.status !== 'EXECUTED' ? () => setSelectedAction(action) : undefined}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    {action.status === 'EXECUTED' ? (
                                        <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Executado</span>
                                    ) : (
                                        <span className="bg-indigo-500 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase animate-pulse">Sugerido</span>
                                    )}
                                    <span className="text-xs text-slate-500">{action.type.replace('_', ' ')}</span>
                                </div>
                                {action.status !== 'EXECUTED' && <ArrowRight className="w-5 h-5 text-indigo-400" />}
                            </div>
                            
                            <h3 className="text-lg font-bold text-white mb-2">{action.title}</h3>
                            <p className="text-slate-400 text-sm mb-4 line-clamp-2">{action.explanation}</p>
                            
                            <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-white/5 pt-3">
                                <span>Origem: {action.taxContext.ufOrigem}</span>
                                <span>Destino: {action.taxContext.ufDestino}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}

        {/* Action Review Panel */}
        {selectedAction && (
            <AgentActionPanel 
                action={selectedAction}
                onClose={() => setSelectedAction(null)}
                onRefresh={loadData}
                currentUser={currentUser}
            />
        )}
    </div>
  );
};

export default CommercialAgentStep;
