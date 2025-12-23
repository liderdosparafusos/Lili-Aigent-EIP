
import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, Circle, Lock, Unlock, AlertTriangle, RefreshCw, History
} from 'lucide-react';
import { FechamentoMensal, EtapasFechamento, UserRole } from '../types';
import { getFechamento, fecharPeriodo, reabrirPeriodo, atualizarEtapaFechamento } from '../services/closing';
import { runClosingAgent } from '../services/closingAgent'; 
import ClosingTimeline from './ClosingTimeline';

interface ClosingStatusWidgetProps {
  periodo: string; // YYYY-MM
  userRole: UserRole;
}

const ClosingStatusWidget: React.FC<ClosingStatusWidgetProps> = ({ periodo, userRole }) => {
  const [data, setData] = useState<FechamentoMensal | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const lastAnalyzed = useRef<string>("");

  const load = async (forceAudit = false) => {
    setLoading(true);
    try {
        // Redução de chamadas Gemini: Só roda se o período mudou ou se solicitado manualmente
        if (forceAudit || lastAnalyzed.current !== periodo) {
            await runClosingAgent(periodo).catch(e => console.warn("IA Offline ou Quota Gemini atingida"));
            lastAnalyzed.current = periodo;
        }
        
        const res = await getFechamento(periodo);
        setData(res);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [periodo]);

  const handleManualValidate = async () => {
      if (userRole !== UserRole.OPERADOR) return;
      setProcessing(true);
      await atualizarEtapaFechamento(periodo, 'validado', true);
      await load();
      setProcessing(false);
  };

  const handleClose = async () => {
      if (!confirm("Confirmar fechamento do mês? Os dados serão congelados.")) return;
      setProcessing(true);
      try {
          await fecharPeriodo(periodo);
          await load();
      } catch (e: any) {
          alert(e.message);
      } finally {
          setProcessing(false);
      }
  };

  const handleReopen = async () => {
      if (!confirm("Reabrir período para correções?")) return;
      setProcessing(true);
      await reabrirPeriodo(periodo);
      await load();
      setProcessing(false);
  };

  if (loading || !data) return <div className="animate-pulse bg-slate-800/50 h-64 rounded-xl"></div>;

  const steps: { key: keyof EtapasFechamento, label: string }[] = [
      { key: 'movimentoImportado', label: 'Importação Movimento' },
      { key: 'notasImportadas', label: 'Importação XML' },
      { key: 'conciliado', label: 'Conciliação Automática' },
      { key: 'divergenciasResolvidas', label: 'Resolução Divergências' },
      { key: 'comissaoCalculada', label: 'Cálculo de Comissões' },
      { key: 'validado', label: 'Validação Gerencial' },
  ];

  const completedCount = Object.values(data.etapas || {}).filter(Boolean).length;
  const progress = (completedCount / steps.length) * 100;
  const isClosed = data.status === 'FECHADO';
  const canClose = completedCount === steps.length && !isClosed;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex flex-col h-full relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                    {isClosed ? <Lock className="w-5 h-5 text-emerald-500" /> : <Unlock className="w-5 h-5 text-amber-500" />}
                    Fechamento {periodo}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                    Status: <span className={`font-bold ${isClosed ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {data.status?.replace('_', ' ') || "EM ANDAMENTO"}
                    </span>
                </p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setShowTimeline(!showTimeline)} className={`p-2 rounded hover:bg-slate-700 transition-colors ${showTimeline ? 'text-cyan-400 bg-slate-700' : 'text-slate-500'}`} title="Ver Histórico">
                    <History className="w-4 h-4" />
                </button>
                <button onClick={() => load(true)} className="text-slate-500 hover:text-white transition-colors" title="Recarregar e Auditar">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* Timeline Overlay */}
        {showTimeline ? (
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar bg-slate-900/50 rounded-lg p-2 mb-4 border border-slate-700">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 sticky top-0 bg-slate-900/90 py-1 backdrop-blur-sm z-10">Histórico de Eventos</h4>
                <ClosingTimeline events={data.timeline || []} />
            </div>
        ) : (
            <>
                {/* Progress Bar */}
                <div className="w-full bg-slate-700 rounded-full h-2 mb-6">
                    <div 
                        className={`h-2 rounded-full transition-all duration-500 ${isClosed ? 'bg-emerald-500' : 'bg-cyan-500'}`} 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                {/* Checklist */}
                <div className="flex-1 space-y-3 mb-6">
                    {steps.map(step => (
                        <div key={step.key} className="flex items-center gap-3">
                            {data.etapas?.[step.key] ? (
                                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                            ) : (
                                <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                            )}
                            <span className={`text-sm ${data.etapas?.[step.key] ? 'text-slate-300' : 'text-slate-500'}`}>
                                {step.label}
                            </span>
                            
                            {/* Manual Validation Button */}
                            {step.key === 'validado' && !data.etapas?.validado && !isClosed && userRole === UserRole.OPERADOR && (
                                <button 
                                    onClick={handleManualValidate}
                                    disabled={processing}
                                    className="ml-auto text-[10px] bg-slate-700 hover:bg-emerald-600 hover:text-white px-2 py-1 rounded text-slate-400 transition-colors"
                                >
                                    Validar
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </>
        )}

        {/* Actions */}
        <div className="mt-auto pt-4 border-t border-slate-700">
            {isClosed ? (
                userRole === UserRole.OPERADOR && (
                    <button 
                        onClick={handleReopen}
                        disabled={processing}
                        className="w-full py-2 border border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg text-sm font-bold transition-colors"
                    >
                        Reabrir Período
                    </button>
                )
            ) : (
                <button 
                    onClick={handleClose}
                    disabled={!canClose || processing || userRole !== UserRole.OPERADOR}
                    className={`w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        canClose 
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20' 
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                >
                    {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    Fechar Período
                </button>
            )}
            
            {!canClose && !isClosed && (
                <p className="text-[10px] text-center text-slate-500 mt-2 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Complete todas as etapas
                </p>
            )}
        </div>
    </div>
  );
};

export default ClosingStatusWidget;
