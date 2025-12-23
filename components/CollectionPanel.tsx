
import React, { useMemo } from 'react';
import { MessageSquare, Mail, AlertTriangle, ArrowRight, ExternalLink, ShieldCheck } from 'lucide-react';
import { ReceivableEntry } from '../types';
import { generateCollectionSuggestion } from '../services/collectionAgent';
import { isFeatureActive } from '../services/config';

interface CollectionPanelProps {
  receivable: ReceivableEntry;
  onClose: () => void;
}

const CollectionPanel: React.FC<CollectionPanelProps> = ({ receivable, onClose }) => {
  const suggestions = useMemo(() => generateCollectionSuggestion(receivable), [receivable]);
  
  const waActive = isFeatureActive('feature_whatsapp_enabled');
  const emailActive = isFeatureActive('feature_email_enabled');

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl animate-[fadeIn_0.3s_ease-out]">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="text-cyan-400 w-5 h-5" /> Agente de Cobrança
            </h3>
            <span className="text-[10px] font-black bg-slate-800 text-slate-500 px-2 py-1 rounded border border-slate-700 uppercase tracking-widest">IA Sugestiva</span>
        </div>

        <div className="space-y-6">
            {suggestions.map((s, idx) => (
                <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-emerald-900/30 rounded-lg text-emerald-400">
                                <MessageSquare className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-white uppercase">{s.canal}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold">{s.contexto}</span>
                    </div>

                    <p className="text-sm text-slate-300 italic mb-4 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">
                        "{s.mensagem}"
                    </p>

                    <div className="flex flex-col gap-3">
                        {!waActive && (
                            <div className="bg-amber-900/10 border border-amber-800/30 p-3 rounded-lg flex items-center gap-3">
                                <ShieldCheck className="text-amber-500 w-4 h-4 shrink-0" />
                                <p className="text-[10px] text-amber-200/70 leading-tight uppercase font-bold">
                                    Integração direta desativada. Copie a mensagem manualmente para o WhatsApp.
                                </p>
                            </div>
                        )}
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(s.mensagem);
                                    alert("Mensagem copiada!");
                                }}
                                className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                            >
                                Copiar Texto
                            </button>
                            <button 
                                disabled={!waActive}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${waActive ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                            >
                                Enviar Via API {waActive ? <ArrowRight className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
        
        <button onClick={onClose} className="w-full mt-6 py-2 text-slate-500 hover:text-white text-xs font-bold uppercase transition-colors">Fechar Painel</button>
    </div>
  );
};

export default CollectionPanel;
