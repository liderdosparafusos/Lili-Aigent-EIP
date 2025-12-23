
import React, { useState, useEffect } from 'react';
import { 
    Zap, CheckCircle, XCircle, ShieldCheck, 
    RefreshCw, Play, AlertOctagon, History, 
    ArrowRight, Bot, Info, ShieldAlert
} from 'lucide-react';
import { AgentAction, User } from '../types';
import { listarAcoesPendentes, confirmarAcaoAssistida, cancelarAcaoAssistida, generateAssistedActions } from '../services/executingAgent';
import { useNotification } from './NotificationSystem';

interface ExecutionHubProps {
  onBack: () => void;
  currentUser: User;
}

const ExecutionHub: React.FC<ExecutionHubProps> = ({ onBack, currentUser }) => {
  const { notify } = useNotification();
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
        await generateAssistedActions(); // Tenta gerar novas baseado em alertas
        const data = await listarAcoesPendentes();
        setActions(data);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleConfirm = async (action: AgentAction) => {
      setProcessingId(action.id);
      try {
          await confirmarAcaoAssistida(action.id, currentUser.email);
          notify("Ação Confirmada", "A operação foi registrada e agendada para execução.", "success");
          setActions(prev => prev.filter(a => a.id !== action.id));
      } catch (e) {
          notify("Erro na Execução", "Não foi possível confirmar a ação.", "error");
      } finally {
          setProcessingId(null);
      }
  };

  const handleCancel = async (action: AgentAction) => {
      setProcessingId(action.id);
      try {
          await cancelarAcaoAssistida(action.id, currentUser.email);
          notify("Ação Cancelada", "A sugestão foi removida do fluxo de execução.", "info");
          setActions(prev => prev.filter(a => a.id !== action.id));
      } finally {
          setProcessingId(null);
      }
  };

  return (
    <div className="max-w-6xl mx-auto mt-8 px-4 md:px-8 pb-24 font-sans animate-[fadeIn_0.5s_ease-out]">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-slate-800 pb-8">
            <div>
                <h1 className="text-3xl font-orbitron font-bold text-white flex items-center gap-3">
                    <Zap className="text-yellow-500 w-8 h-8 fill-yellow-500/20" />
                    Módulo Execution
                </h1>
                <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> 
                    Ações assistidas baseadas em inteligência operacional
                </p>
            </div>
            
            <div className="flex gap-4">
                <button 
                    onClick={loadData}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Sincronizar Ações
                </button>
            </div>
        </div>

        {/* FEED DE AÇÕES */}
        <div className="space-y-8">
            {loading ? (
                <div className="p-20 text-center text-slate-600 flex flex-col items-center gap-4">
                    <RefreshCw className="animate-spin w-10 h-10 text-yellow-500" />
                    <p className="font-orbitron tracking-widest text-xs uppercase">Carregando fila de execução assistida...</p>
                </div>
            ) : actions.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-[32px] p-24 text-center flex flex-col items-center shadow-inner">
                    <CheckCircle className="w-20 h-20 text-emerald-500/10 mb-6" />
                    <h3 className="text-2xl font-bold text-slate-500 font-orbitron">SEM AÇÕES PENDENTES</h3>
                    <p className="text-slate-600 max-w-sm mt-3 text-sm">
                        O sistema não identificou operações que requeiram sua intervenção imediata agora.
                    </p>
                </div>
            ) : (
                actions.map((action) => (
                    <div key={action.id} className="relative group animate-[slideUp_0.4s_ease-out]">
                        <div className="bg-slate-900/80 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl transition-all hover:border-indigo-500/50">
                            <div className="p-8 md:p-10">
                                
                                <div className="flex flex-col lg:flex-row gap-10">
                                    {/* INFO COL */}
                                    <div className="flex-1 space-y-6">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                                {action.tipo}
                                            </span>
                                            <span className="text-slate-600 text-[10px] font-mono">REF: {action.id}</span>
                                        </div>

                                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                                            AÇÃO SUGERIDA: {action.titulo}
                                        </h2>

                                        <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl">
                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Procedimento Sugerido</h4>
                                            <p className="text-slate-200 text-lg leading-relaxed font-medium">
                                                {action.acaoSugerida}
                                            </p>
                                        </div>

                                        <div className="bg-indigo-900/10 border border-indigo-500/20 p-6 rounded-2xl">
                                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                                <Info className="w-4 h-4" /> IMPACTO DA OPERAÇÃO
                                            </h4>
                                            <p className="text-indigo-200 text-sm leading-relaxed italic">
                                                {action.impacto}
                                            </p>
                                        </div>
                                    </div>

                                    {/* DECISION COL */}
                                    <div className="lg:w-80 shrink-0 flex flex-col justify-center">
                                        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 space-y-4 shadow-inner">
                                            <p className="text-xs font-bold text-center text-slate-500 uppercase mb-4">Confirmar Execução?</p>
                                            
                                            <button 
                                                onClick={() => handleConfirm(action)}
                                                disabled={!!processingId}
                                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {processingId === action.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                Sim, Confirmar
                                            </button>

                                            <button 
                                                onClick={() => handleCancel(action)}
                                                disabled={!!processingId}
                                                className="w-full py-4 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Não, Cancelar
                                            </button>

                                            <div className="pt-4 flex items-center gap-2 justify-center text-slate-600">
                                                <ShieldAlert className="w-3 h-3" />
                                                <span className="text-[9px] font-bold uppercase tracking-tighter">Ação requer confirmação humana</span>
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

export default ExecutionHub;
