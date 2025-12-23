
import React, { useState, useEffect } from 'react';
import { 
  X, DollarSign, Calendar, CreditCard, Clipboard, 
  AlertTriangle, CheckCircle, RefreshCw, User, History, ArrowRight
} from 'lucide-react';
import { ReceivableEntry, UserRole, User as AppUser } from '../types';
import { registrarBaixaTitulo } from '../services/receivables';
import { useNotification } from './NotificationSystem';

interface ReceivableSettlementModalProps {
  receivable: ReceivableEntry;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: AppUser;
}

const ReceivableSettlementModal: React.FC<ReceivableSettlementModalProps> = ({ 
    receivable, onClose, onSuccess, currentUser 
}) => {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  
  // Form States
  const [valorPago, setValorPago] = useState<number>(receivable.saldo_aberto);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [observacao, setObservacao] = useState('');

  const novoSaldo = receivable.saldo_aberto - valorPago;
  const isParcial = novoSaldo > 0;
  const isTotal = novoSaldo === 0;
  const isInvalid = valorPago <= 0 || valorPago > receivable.saldo_aberto;

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const handleConfirm = async () => {
    if (isInvalid) return;
    setLoading(true);
    try {
        await registrarBaixaTitulo(receivable.id, {
            data_pagamento: dataPagamento,
            valor_pago: valorPago,
            forma_pagamento: formaPagamento,
            observacao: observacao
        });
        notify("Baixa Realizada", `Pagamento de ${fmt(valorPago)} registrado para NF ${receivable.numero_nf}`, "success");
        onSuccess();
    } catch (e: any) {
        notify("Erro na Baixa", e.message, "error");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-[slideUp_0.3s_ease-out]">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-800/50">
                <div className="flex gap-4">
                    <div className="p-3 bg-emerald-900/20 rounded-2xl border border-emerald-800 text-emerald-400">
                        <DollarSign className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white font-orbitron tracking-tight">Baixa de Pagamento</h3>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-widest mt-1">NF {receivable.numero_nf} &bull; {receivable.cliente}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-all"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                
                {/* Resumo de Saldos (UX Spotlight) */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Saldo Atual</p>
                        <p className="text-lg font-black text-white">{fmt(receivable.saldo_aberto)}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center text-slate-600">
                        <ArrowRight className="w-6 h-6" />
                    </div>
                    <div className={`p-4 rounded-2xl border text-center transition-all ${isParcial ? 'bg-amber-900/10 border-amber-800' : 'bg-emerald-900/10 border-emerald-800'}`}>
                        <p className={`text-[10px] font-bold uppercase mb-1 ${isParcial ? 'text-amber-500' : 'text-emerald-500'}`}>Saldo Restante</p>
                        <p className={`text-lg font-black ${isParcial ? 'text-amber-400' : 'text-emerald-400'}`}>{fmt(novoSaldo)}</p>
                    </div>
                </div>

                {/* Mensagens de Contexto */}
                {isParcial && (
                    <div className="bg-amber-900/20 border border-amber-800 p-4 rounded-xl flex items-center gap-3 text-amber-300 text-sm">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <p>O valor é inferior ao saldo. O título permanecerá como <b>PAGAMENTO PARCIAL</b>.</p>
                    </div>
                )}

                {/* Formuário */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Calendar className="w-3 h-3" /> Data do Recebimento
                        </label>
                        <input 
                            type="date" 
                            value={dataPagamento}
                            onChange={(e) => setDataPagamento(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-all [color-scheme:dark]"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <DollarSign className="w-3 h-3" /> Valor Recebido (R$)
                        </label>
                        <input 
                            type="number" 
                            step="0.01"
                            value={valorPago}
                            onChange={(e) => setValorPago(parseFloat(e.target.value) || 0)}
                            className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-white text-xl font-black outline-none transition-all ${isInvalid ? 'border-red-600' : 'border-slate-700 focus:border-emerald-500'}`}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <CreditCard className="w-3 h-3" /> Método de Pagamento
                        </label>
                        <select 
                            value={formaPagamento}
                            onChange={(e) => setFormaPagamento(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-all appearance-none"
                        >
                            <option value="PIX">PIX</option>
                            <option value="DINHEIRO">DINHEIRO (CÉDULA)</option>
                            <option value="CARTAO">CARTÃO DÉBITO</option>
                            <option value="TED_DOC">TED / DOC</option>
                            <option value="OUTROS">OUTROS</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Clipboard className="w-3 h-3" /> Observação Interna
                        </label>
                        <input 
                            type="text" 
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value)}
                            placeholder="Ex: Pago por representante..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-all"
                        />
                    </div>
                </div>

                {/* Histórico de Baixas Prévias (UX Context) */}
                {receivable.historico_baixas && receivable.historico_baixas.length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <History className="w-4 h-4" /> Pagamentos Anteriores
                        </h4>
                        <div className="space-y-3">
                            {receivable.historico_baixas.map((b, i) => (
                                <div key={i} className="flex justify-between items-center text-xs border-b border-slate-900 pb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 font-mono">{b.data_pagamento.split('-').reverse().join('/')}</span>
                                        <span className="text-slate-300 font-bold">{b.forma_pagamento}</span>
                                    </div>
                                    <span className="text-emerald-400 font-black">{fmt(b.valor_pago)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-8 bg-slate-900/80 border-t border-slate-800 flex justify-end gap-4">
                <button 
                    onClick={onClose} 
                    className="px-6 py-3 rounded-2xl text-sm font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest"
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleConfirm}
                    disabled={loading || isInvalid || currentUser.role !== UserRole.OPERADOR}
                    className={`px-10 py-3 rounded-2xl text-sm font-black shadow-xl transition-all uppercase tracking-widest text-white flex items-center gap-2 ${
                        isInvalid || loading || currentUser.role !== UserRole.OPERADOR
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                        : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
                    }`}
                >
                    {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    Confirmar Recebimento
                </button>
            </div>
        </div>
    </div>
  );
};

export default ReceivableSettlementModal;
