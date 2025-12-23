
import React, { useState, useEffect } from 'react';
import { 
    AlertTriangle, Info, CheckCircle, ShieldAlert, 
    RefreshCw, Bot, Zap, Archive, ShieldCheck, 
    ChevronRight, AlertOctagon, TrendingUp, Search
} from 'lucide-react';
import { Insight, User, InsightSeverity, InsightType } from '../types';
import { listarInsights, generateAIIntelligenceAlerts, marcarInsightLido } from '../services/agent';

interface IntelligenceAlertsProps {
  onBack: () => void;
  currentUser: User;
}

const IntelligenceAlerts: React.FC<IntelligenceAlertsProps> = ({ onBack, currentUser }) => {
  const [alerts, setAlerts] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [filterType, setFilterType] = useState<'TODOS' | InsightType>('TODOS');

  const loadData = async () => {
    setLoading(true);
    try {
        const data = await listarInsights();
        setAlerts(data);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleRunBrain = async () => {
      setAnalyzing(true);
      await generateAIIntelligenceAlerts();
      await loadData();
      setAnalyzing(false);
  };

  const handleArchive = async (id: string) => {
      setAlerts(prev => prev.filter(a => a.id !== id));
      await marcarInsightLido(id, 'ARQUIVADO');
  };

  const filtered = alerts.filter(a => filterType === 'TODOS' || a.tipo === filterType);

  const getPriorityStyles = (p: InsightSeverity) => {
      switch(p) {
          case 'Crítico': return 'border-red-500/50 bg-red-950/20 text-red-400';
          case 'Alto': return 'border-orange-500/50 bg-orange-950/20 text-orange-400';
          case 'Médio': return 'border-blue-500/50 bg-blue-950/20 text-blue-400';
          default: return 'border-slate-700 bg-slate-800/40 text-slate-400';
      }
  };

  const getPriorityIcon = (p: InsightSeverity) => {
      switch(p) {
          case 'Crítico': return <AlertOctagon className="w-5 h-5" />;
          case 'Alto': return <AlertTriangle className="w-5 h-5" />;
          case 'Médio': return <Info className="w-5 h-5" />;
          default: return <ChevronRight className="w-5 h-5" />;
      }
  };

  return (
    <div className="max-w-6xl mx-auto mt-8 px-4 md:px-8 pb-24 font-sans animate-[fadeIn_0.5s_ease-out]">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-slate-800 pb-8">
            <div>
                <h1 className="text-3xl font-orbitron font-bold text-white flex items-center gap-3">
                    <ShieldAlert className="text-cyan-500 w-8 h-8" />
                    Módulo Intelligence
                </h1>
                <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> 
                    Vigilância neural de riscos financeiros, fiscais e comerciais
                </p>
            </div>
            
            <div className="flex gap-4">
                <button 
                    onClick={handleRunBrain}
                    disabled={analyzing}
                    className="flex items-center gap-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-900/20 transition-all active:scale-95 disabled:opacity-50"
                >
                    {analyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                    {analyzing ? "Analisando Padrões..." : "Executar Varredura"}
                </button>
            </div>
        </div>

        {/* FILTERS */}
        <div className="flex gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
            {['TODOS', 'Financeiro', 'Fiscal', 'Comercial', 'Operacional'].map(t => (
                <button 
                    key={t}
                    onClick={() => setFilterType(t as any)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${filterType === t ? 'bg-slate-700 text-white border-slate-500' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600'}`}
                >
                    {t}
                </button>
            ))}
        </div>

        {/* FEED DE ALERTAS */}
        <div className="space-y-10">
            {loading ? (
                <div className="p-20 text-center text-slate-600 flex flex-col items-center gap-4">
                    <RefreshCw className="animate-spin w-10 h-10 text-cyan-500" />
                    <p className="font-orbitron tracking-widest text-xs uppercase">Sincronizando feed de inteligência...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-[32px] p-24 text-center flex flex-col items-center shadow-inner">
                    <CheckCircle className="w-20 h-20 text-emerald-500/10 mb-6" />
                    <h3 className="text-2xl font-bold text-slate-500 font-orbitron">SISTEMA DENTRO DA NORMALIDADE</h3>
                    <p className="text-slate-600 max-w-sm mt-3 text-sm">
                        Nenhum padrão anormal ou risco operacional detectado pela IA nas últimas varreduras.
                    </p>
                    <button onClick={handleRunBrain} className="mt-8 text-cyan-500 text-xs font-bold hover:underline">Forçar nova análise</button>
                </div>
            ) : (
                filtered.map((alert) => (
                    <div key={alert.id} className="relative group animate-[slideUp_0.4s_ease-out]">
                        {/* Priority Badge Floating */}
                        <div className={`absolute -top-3 left-8 px-4 py-1 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] shadow-lg z-10 flex items-center gap-2 ${getPriorityStyles(alert.prioridade)}`}>
                            {getPriorityIcon(alert.prioridade)}
                            PRIORIDADE {alert.prioridade}
                        </div>

                        <div className="bg-slate-900/80 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl transition-all hover:bg-slate-900 hover:border-slate-700">
                            <div className="p-8 md:p-12">
                                <div className="flex justify-between items-start mb-8">
                                    <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-tight max-w-2xl">
                                        ALERTA: {alert.titulo}
                                    </h2>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <span className="text-[10px] font-bold text-slate-600 uppercase block">Tipo</span>
                                            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">{alert.tipo}</span>
                                        </div>
                                        <button onClick={() => handleArchive(alert.id)} className="p-3 bg-slate-800 hover:bg-red-900/20 text-slate-500 hover:text-red-400 rounded-2xl transition-all">
                                            <Archive className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                    {/* DESCRIÇÃO */}
                                    <div className="lg:col-span-7 space-y-8">
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                                                Descrição da Ocorrência
                                            </h4>
                                            <p className="text-slate-300 text-lg leading-relaxed font-medium">
                                                {alert.descricao}
                                            </p>
                                        </div>

                                        {/* IMPORTÂNCIA */}
                                        <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-6">
                                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4" />
                                                Por que isso importa
                                            </h4>
                                            <p className="text-slate-400 text-sm italic leading-relaxed">
                                                {alert.importancia}
                                            </p>
                                        </div>
                                    </div>

                                    {/* SUGESTÃO */}
                                    <div className="lg:col-span-5">
                                        <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-3xl p-8 h-full flex flex-col justify-between shadow-inner">
                                            <div>
                                                <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                                    <Zap className="w-4 h-4 fill-yellow-500/20" />
                                                    Sugestão de Próximo Passo
                                                </h4>
                                                <p className="text-white font-bold text-base leading-snug">
                                                    {alert.sugestao}
                                                </p>
                                            </div>
                                            
                                            <div className="mt-8 pt-6 border-t border-indigo-500/10 flex justify-between items-center text-[10px] text-slate-600 font-mono">
                                                <span>REF: {alert.id.slice(0, 12)}</span>
                                                <span>DATA: {new Date(alert.dataGeracao).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
};

export default IntelligenceAlerts;
