
import React, { useState } from 'react';
import { 
  X, AlertTriangle, ArrowRight, User, Calendar, FileText, CheckCircle, HelpCircle, AlertOctagon 
} from 'lucide-react';
import { NFData, UserRole, User as AppUser, DivergenceType } from '../types';
import { getVendedorLabel } from '../services/logic';
import { registrarDecisao } from '../services/decisions';
import { registrarAjusteFechamento } from '../services/ledger';

interface DivergencePanelProps {
  divergence: NFData;
  onClose: () => void;
  onResolve: (updatedNF: NFData) => void;
  user: AppUser;
  periodo: string;
}

const DivergencePanel: React.FC<DivergencePanelProps> = ({ divergence, onClose, onResolve, user, periodo }) => {
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');

  const type = (divergence.tipo_divergencia_padrao?.[0] || 'OUTROS') as DivergenceType;
  const isOperador = user.role === UserRole.OPERADOR;

  // --- ACTIONS HANDLER ---
  const handleAction = async (action: string, payload?: any) => {
      setLoading(true);
      
      let updatedNF = { ...divergence };
      let decisionText = '';
      let requiresAdjustment = false;
      let adjustmentDetails: any = null;

      switch(type) {
          case 'VENDEDOR_DIVERGENTE':
              if (action === 'USE_XML') {
                  updatedNF.vendedor_final = divergence.vendedor_xml;
                  decisionText = `Usou Vendedor XML: ${getVendedorLabel(divergence.vendedor_xml)}`;
                  // Requires adjustment because Ledger usually comes from Movement
                  requiresAdjustment = true;
                  adjustmentDetails = {
                      debitVendor: divergence.vendedor_movimento, // Reverse Movement
                      creditVendor: divergence.vendedor_xml,      // Credit XML
                      amount: divergence.valor
                  };
              } else if (action === 'USE_MOV') {
                  updatedNF.vendedor_final = divergence.vendedor_movimento!;
                  decisionText = `Usou Vendedor Movimento: ${getVendedorLabel(divergence.vendedor_movimento)}`;
              } else if (action === 'MANUAL' && payload) {
                  updatedNF.vendedor_final = payload;
                  decisionText = `Atribuição Manual: ${getVendedorLabel(payload)}`;
              }
              break;
          
          case 'DATA_DIVERGENTE':
              if (action === 'USE_MOV') {
                  // Keep calculated date, just ack
                  decisionText = `Confirmou Data Movimento: ${divergence.data_pagamento_calculada}`;
              } else if (action === 'USE_XML') {
                  updatedNF.data_pagamento_calculada = divergence.data_emissao;
                  decisionText = `Forçou Data Emissão: ${divergence.data_emissao}`;
              }
              break;

          case 'DEVOLUCAO_SEM_REFERENCIA':
              if (action === 'MANUAL_REF' && payload) {
                  updatedNF.nfOriginalReferencia = payload;
                  updatedNF.vendedor_final = 'INDEFINIDO'; 
                  decisionText = `Referência Manual: ${payload}`;
              } else if (action === 'LOSS') {
                  updatedNF.vendedor_final = 'LOJA'; // Assign to store
                  decisionText = "Considerada Perda da Loja";
                  requiresAdjustment = true;
                  adjustmentDetails = {
                      debitVendor: 'INDEFINIDO',
                      creditVendor: 'LOJA',
                      amount: divergence.valor // Negative value in return
                  };
              }
              break;
          
          case 'MOVIMENTO_COM_NF_SEM_XML': // Previously NF_PAGA_SEM_XML
          case 'NF_PAGA_SEM_XML':
              if (action === 'ACK') {
                  decisionText = "Ciente (Pendente XML)";
              }
              break;

          case 'NF_CANCELADA_COM_MOVIMENTO':
              if (action === 'ESTORNO') {
                  // Refund Logic: Nullify the sale
                  decisionText = "Estornar Venda (Cancelada)";
                  requiresAdjustment = true;
                  adjustmentDetails = {
                      debitVendor: divergence.vendedor_movimento,
                      amount: -divergence.valor, // Negative to offset positive sale
                      type: 'ESTORNO'
                  };
                  updatedNF.vendedor_final = 'ESTORNADO';
              } else if (action === 'EXCEPTION') {
                  decisionText = "Manter como Venda (Exceção)";
                  updatedNF.vendedor_final = divergence.vendedor_movimento!;
              }
              break;

          case 'XML_SEM_MOVIMENTO':
              if (action === 'FATURAR') {
                  decisionText = "Considerar Venda Faturada";
                  updatedNF.tipo = 'FATURADA';
                  updatedNF.vendedor_final = divergence.vendedor_xml;
                  // Add Ledger Entry for this Revenue
                  requiresAdjustment = true;
                  adjustmentDetails = {
                      creditVendor: divergence.vendedor_xml,
                      amount: divergence.valor,
                      type: 'VENDA'
                  };
              } else if (action === 'WAIT') {
                  decisionText = "Aguardar Pagamento (Pendente)";
              }
              break;
      }

      // 1. Mark as resolved
      updatedNF.status_divergencia = 'OK';
      
      // 2. Save Decision
      const fullObservation = `${decisionText}. ${comment}`;
      
      await registrarDecisao({
          fechamentoId: periodo,
          divergenceId: divergence.numero,
          tipoDivergencia: type,
          acaoEscolhida: action,
          usuario: user.email,
          observacao: fullObservation
      });

      // 3. Apply Adjustment to Ledger (if needed)
      if (requiresAdjustment && adjustmentDetails) {
          if (adjustmentDetails.type === 'ESTORNO') {
              await registrarAjusteFechamento(
                  periodo, 'ESTORNO', adjustmentDetails.amount, 
                  `Estorno NF Cancelada ${divergence.numero}`, adjustmentDetails.debitVendor, divergence.numero
              );
          } else if (adjustmentDetails.type === 'VENDA') {
              await registrarAjusteFechamento(
                  periodo, 'VENDA', adjustmentDetails.amount,
                  `Inclusão Venda XML ${divergence.numero}`, adjustmentDetails.creditVendor, divergence.numero
              );
          } else {
              // Swap Logic: Debit A, Credit B (Simplified as 2 adjustments or 1 Correction)
              if (adjustmentDetails.debitVendor) {
                  await registrarAjusteFechamento(
                      periodo, 'AJUSTE', -adjustmentDetails.amount, 
                      `Correção (Débito) NF ${divergence.numero}`, adjustmentDetails.debitVendor, divergence.numero
                  );
              }
              if (adjustmentDetails.creditVendor) {
                  await registrarAjusteFechamento(
                      periodo, 'AJUSTE', adjustmentDetails.amount, 
                      `Correção (Crédito) NF ${divergence.numero}`, adjustmentDetails.creditVendor, divergence.numero
                  );
              }
          }
      }

      onResolve(updatedNF);
      setLoading(false);
  };

  const fmtMoney = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-slate-900 shadow-2xl border-l border-slate-700 transform transition-transform duration-300 z-50 flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="bg-red-900/30 text-red-400 border border-red-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        {type.replace(/_/g, ' ')}
                    </span>
                </div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    NF {divergence.numero}
                </h2>
                <p className="text-slate-400 text-sm">{divergence.cliente}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Context Widget */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Dados do Documento
                </h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                        <p className="text-xs text-slate-500 uppercase mb-1">Movimento (Caixa)</p>
                        {divergence.vendedor_movimento ? (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-white font-medium">
                                    <User className="w-3 h-3 text-cyan-500" />
                                    {getVendedorLabel(divergence.vendedor_movimento)}
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 font-mono text-xs">
                                    <Calendar className="w-3 h-3" />
                                    {divergence.data_pagamento_calculada || 'N/A'}
                                </div>
                            </div>
                        ) : (
                            <span className="text-slate-500 italic">Não encontrado</span>
                        )}
                    </div>
                    
                    <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                        <p className="text-xs text-slate-500 uppercase mb-1">Nota Fiscal (XML)</p>
                        {divergence.vendedor_xml && divergence.statusNFe !== 'CANCELADA' ? (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-white font-medium">
                                    <User className="w-3 h-3 text-purple-500" />
                                    {getVendedorLabel(divergence.vendedor_xml)}
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 font-mono text-xs">
                                    <Calendar className="w-3 h-3" />
                                    {divergence.data_emissao || 'N/A'}
                                </div>
                            </div>
                        ) : (
                            <span className={`italic ${divergence.statusNFe === 'CANCELADA' ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                                {divergence.statusNFe === 'CANCELADA' ? 'CANCELADA' : 'Não encontrado'}
                            </span>
                        )}
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                    <span className="text-sm text-slate-400">Valor da Operação</span>
                    <span className="text-xl font-bold text-emerald-400">{fmtMoney(divergence.valor)}</span>
                </div>
            </div>

            {/* Impact Analysis */}
            <div className="bg-blue-900/10 border border-blue-800/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-900/30 rounded-lg text-blue-400">
                        <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-blue-300 mb-1">Impacto Financeiro</h4>
                        <div className="text-xs text-blue-200/70 space-y-1">
                            {type === 'VENDEDOR_DIVERGENTE' && (
                                <>
                                    <p>• {getVendedorLabel(divergence.vendedor_movimento)}: <strong>- {fmtMoney(divergence.valor)}</strong> (Se corrigir p/ XML)</p>
                                    <p>• {getVendedorLabel(divergence.vendedor_xml)}: <strong>+ {fmtMoney(divergence.valor)}</strong> (Se corrigir p/ XML)</p>
                                </>
                            )}
                            {type === 'NF_CANCELADA_COM_MOVIMENTO' && (
                                <p>• Estorno total de <strong>- {fmtMoney(divergence.valor)}</strong> no caixa se confirmado.</p>
                            )}
                            {type === 'XML_SEM_MOVIMENTO' && (
                                <p>• Acréscimo de <strong>+ {fmtMoney(divergence.valor)}</strong> no faturamento se confirmado.</p>
                            )}
                            {type === 'DEVOLUCAO_SEM_REFERENCIA' && (
                                <p>• A devolução será debitada da <strong>LOJA</strong> caso não haja vínculo.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            {isOperador ? (
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Ações Disponíveis</h4>
                    
                    {type === 'VENDEDOR_DIVERGENTE' && (
                        <>
                            <button onClick={() => handleAction('USE_MOV')} className="w-full p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500 rounded-xl flex justify-between items-center group transition-all">
                                <div className="text-left">
                                    <span className="block font-bold text-white group-hover:text-cyan-400">Manter Movimento (Caixa)</span>
                                    <span className="text-xs text-slate-500">O vendedor do caixa recebe a comissão</span>
                                </div>
                                <CheckCircle className="w-5 h-5 text-slate-600 group-hover:text-cyan-500" />
                            </button>
                            <button onClick={() => handleAction('USE_XML')} className="w-full p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500 rounded-xl flex justify-between items-center group transition-all">
                                <div className="text-left">
                                    <span className="block font-bold text-white group-hover:text-purple-400">Corrigir pelo XML</span>
                                    <span className="text-xs text-slate-500">Transfere comissão para vendedor da nota</span>
                                </div>
                                <CheckCircle className="w-5 h-5 text-slate-600 group-hover:text-purple-500" />
                            </button>
                        </>
                    )}

                    {type === 'NF_CANCELADA_COM_MOVIMENTO' && (
                        <>
                            <button onClick={() => handleAction('ESTORNO')} className="w-full p-4 bg-red-900/20 hover:bg-red-900/30 border border-red-800 rounded-xl flex justify-between items-center group transition-all">
                                <div className="text-left">
                                    <span className="block font-bold text-red-400">Estornar Venda</span>
                                    <span className="text-xs text-red-300/50">Remove a venda dos totais (Compensação)</span>
                                </div>
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                            </button>
                            <button onClick={() => handleAction('EXCEPTION')} className="w-full p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex justify-between items-center group transition-all">
                                <div className="text-left">
                                    <span className="block font-bold text-white">Manter como Exceção</span>
                                    <span className="text-xs text-slate-500">Ignora cancelamento (Assume erro fiscal)</span>
                                </div>
                                <ArrowRight className="w-5 h-5 text-slate-500" />
                            </button>
                        </>
                    )}

                    {type === 'XML_SEM_MOVIMENTO' && (
                        <>
                            <button onClick={() => handleAction('FATURAR')} className="w-full p-4 bg-purple-900/20 hover:bg-purple-900/30 border border-purple-800 rounded-xl flex justify-between items-center group transition-all">
                                <div className="text-left">
                                    <span className="block font-bold text-purple-400">Marcar como Faturado</span>
                                    <span className="text-xs text-purple-300/50">Cria evento de venda a prazo</span>
                                </div>
                                <CheckCircle className="w-5 h-5 text-purple-500" />
                            </button>
                            <button onClick={() => handleAction('WAIT')} className="w-full p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex justify-between items-center group transition-all">
                                <div className="text-left">
                                    <span className="block font-bold text-white">Manter Pendente</span>
                                    <span className="text-xs text-slate-500">Aguardar confirmação de pagamento</span>
                                </div>
                                <ArrowRight className="w-5 h-5 text-slate-500" />
                            </button>
                        </>
                    )}

                    {(type === 'MOVIMENTO_COM_NF_SEM_XML' || type === 'NF_PAGA_SEM_XML') && (
                        <button onClick={() => handleAction('ACK')} className="w-full p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex justify-between items-center group transition-all">
                            <div className="text-left">
                                <span className="block font-bold text-white">Ciente (Sem XML)</span>
                                <span className="text-xs text-slate-500">Mantém venda, alerta pendência fiscal</span>
                            </div>
                            <CheckCircle className="w-5 h-5 text-slate-500" />
                        </button>
                    )}

                    {type === 'DEVOLUCAO_SEM_REFERENCIA' && (
                        <div className="space-y-2">
                            <button onClick={() => handleAction('LOSS')} className="w-full p-4 bg-red-900/20 hover:bg-red-900/30 border border-red-800 rounded-xl flex justify-between items-center group transition-all">
                                <div className="text-left">
                                    <span className="block font-bold text-red-400">Considerar Perda da Loja</span>
                                    <span className="text-xs text-red-300/50">Não descontar de vendedor específico</span>
                                </div>
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                            </button>
                        </div>
                    )}

                    {/* Manual Override for Everyone */}
                    <div className="mt-6 pt-6 border-t border-slate-800">
                        <p className="text-xs text-slate-500 mb-2">Atribuição Manual</p>
                        <div className="grid grid-cols-4 gap-2">
                            {['ENEIAS', 'CARLOS', 'TARCISIO', 'BRAGA'].map(v => (
                                <button 
                                    key={v}
                                    onClick={() => handleAction('MANUAL', v.charAt(0))}
                                    className="p-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-xs font-bold text-slate-300"
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4">
                        <textarea 
                            value={comment} 
                            onChange={e => setComment(e.target.value)}
                            placeholder="Adicionar observação sobre a decisão..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-cyan-500 outline-none resize-none"
                            rows={2}
                        />
                    </div>

                </div>
            ) : (
                <div className="p-4 bg-amber-900/20 border border-amber-800 rounded-lg text-amber-200 text-sm flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Apenas Operadores podem resolver divergências.</span>
                </div>
            )}

        </div>
    </div>
  );
};

export default DivergencePanel;
