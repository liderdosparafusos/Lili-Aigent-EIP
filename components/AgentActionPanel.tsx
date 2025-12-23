
import React, { useState } from 'react';
import { 
  X, Zap, CheckCircle, AlertOctagon, ArrowRight, FileText, 
  MapPin, ShieldCheck, User, Box, Construction
} from 'lucide-react';
import { AgentAction, User as AppUser, UserRole } from '../types';
import { executeAgentAction } from '../services/executingAgent';

interface AgentActionPanelProps {
  action: AgentAction;
  onClose: () => void;
  onRefresh: () => void;
  currentUser: AppUser;
}

const AgentActionPanel: React.FC<AgentActionPanelProps> = ({ action, onClose, onRefresh, currentUser }) => {
  const [executing, setExecuting] = useState(false);
  const [executed, setExecuted] = useState(action.status === 'EXECUTED');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExecute = async () => {
      if (currentUser.role !== UserRole.OPERADOR) return;
      if (!confirm("Confirma a execução desta ação? Esta operação é irreversível.")) return;

      setExecuting(true);
      setErrorMsg(null);
      
      try {
          await executeAgentAction(action, currentUser.email);
          setExecuted(true);
          setTimeout(() => {
              onRefresh();
              onClose();
          }, 1500);
      } catch (e: any) {
          if (e.message.includes('EIP_NOT_IMPLEMENTED')) {
              setErrorMsg("Módulo em Desenvolvimento (EIP). Funcionalidade temporariamente indisponível para execução automática.");
          } else {
              alert("Erro na execução: " + e.message);
          }
      } finally {
          setExecuting(false);
      }
  };

  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-slate-900 shadow-2xl border-l border-slate-700 transform transition-transform duration-300 z-50 flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900 flex justify-between items-start">
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <span className="bg-indigo-900/50 text-indigo-300 border border-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Agente Executor
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        executed ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700' : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                        {executed ? 'EXECUTADO' : action.status}
                    </span>
                </div>
                <h2 className="text-xl font-bold text-white leading-tight">
                    {action.title}
                </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* EIP Error State */}
            {errorMsg && (
                <div className="bg-amber-900/20 border border-amber-800 p-4 rounded-xl flex items-start gap-3 animate-[fadeIn_0.3s_ease-out]">
                    <Construction className="w-6 h-6 text-amber-500 shrink-0" />
                    <div>
                        <h4 className="text-amber-400 font-bold text-sm">Funcionalidade EIP</h4>
                        <p className="text-amber-200/80 text-xs mt-1">{errorMsg}</p>
                        <p className="text-slate-400 text-[10px] mt-2 italic">Dica: Utilize o módulo de simulação ou valide manualmente.</p>
                    </div>
                </div>
            )}

            {/* Context Explanation */}
            <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Motivação
                </h4>
                <p className="text-slate-300 text-sm leading-relaxed bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    {action.explanation}
                </p>
            </div>

            {/* Tax Rules & Impact */}
            <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Regras Fiscais Aplicadas
                </h4>
                
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                    <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center text-xs">
                        <span className="flex items-center gap-1 text-slate-400">
                            <MapPin className="w-3 h-3" /> Origem: <strong className="text-white">{action.taxContext.ufOrigem}</strong>
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className="flex items-center gap-1 text-slate-400">
                            <MapPin className="w-3 h-3" /> Destino: <strong className="text-white">{action.taxContext.ufDestino}</strong>
                        </span>
                    </div>
                    <div className="divide-y divide-slate-700/50">
                        {action.taxContext.rulesApplied.map((rule, idx) => (
                            <div key={idx} className="p-3 text-sm">
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-indigo-300">{rule.ruleId}</span>
                                    <span className="text-xs bg-slate-900 px-2 py-0.5 rounded text-slate-400">{rule.impact}</span>
                                </div>
                                <p className="text-slate-400 text-xs">{rule.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Simulation / Data Preview */}
            <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <Box className="w-4 h-4" /> Dados da Execução
                </h4>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-xs text-slate-300 space-y-2">
                    <div className="flex justify-between">
                        <span>Alvos (IDs):</span>
                        <span className="text-white">{action.payload.targetIds.length} Pedidos</span>
                    </div>
                    {action.payload.proposedData.valorTotal && (
                        <div className="flex justify-between">
                            <span>Valor Total:</span>
                            <span className="text-emerald-400 font-bold">{fmtCurrency(action.payload.proposedData.valorTotal)}</span>
                        </div>
                    )}
                    {action.payload.proposedData.cliente && (
                        <div className="flex justify-between">
                            <span>Cliente:</span>
                            <span className="text-white">{action.payload.proposedData.cliente}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Audit Trail (If executed) */}
            {executed && action.audit && (
                <div className="bg-emerald-900/10 border border-emerald-800 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-emerald-400 text-sm">Ação Executada com Sucesso</h4>
                        <p className="text-emerald-200/70 text-xs mt-1">
                            Aprovado por {action.audit.approvedBy} em {new Date(action.audit.executedAt!).toLocaleString()}
                        </p>
                    </div>
                </div>
            )}

        </div>

        {/* Footer Actions */}
        {!executed && (
            <div className="p-6 border-t border-slate-800 bg-slate-900/50">
                {currentUser.role === UserRole.OPERADOR ? (
                    <button 
                        onClick={handleExecute}
                        disabled={executing}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {executing ? (
                            <>Processando...</>
                        ) : (
                            <>
                                <Zap className="w-5 h-5" /> Aprovar e Executar
                            </>
                        )}
                    </button>
                ) : (
                    <div className="text-center p-3 bg-slate-800 rounded-lg border border-slate-700">
                        <p className="text-slate-400 text-sm flex items-center justify-center gap-2">
                            <AlertOctagon className="w-4 h-4" />
                            Aprovação restrita a Operadores.
                        </p>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default AgentActionPanel;
