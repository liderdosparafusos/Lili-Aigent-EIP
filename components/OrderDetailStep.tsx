
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, User, Package, Printer, CheckCircle, XCircle, Trash2, RefreshCw
} from 'lucide-react';
import { Pedido, PedidoStatus, User as AppUser, UserRole } from '../types';
import { buscarPedidoPorId, atualizarStatusPedido, excluirPedido } from '../services/orders';
import { useNotification } from './NotificationSystem';

interface OrderDetailStepProps {
  currentUser: AppUser;
  pedidoId: string;
  onBack: () => void;
}

const OrderDetailStep: React.FC<OrderDetailStepProps> = ({ currentUser, pedidoId, onBack }) => {
  const { notify } = useNotification();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const data = await buscarPedidoPorId(pedidoId);
      if (data) setPedido(data);
      setLoading(false);
    };
    init();
  }, [pedidoId]);

  const handleStatusChange = async (newStatus: PedidoStatus) => {
      if (!pedido) return;
      if (!confirm(`Confirma alteração de status para ${newStatus}?`)) return;
      
      setProcessing(true);
      const success = await atualizarStatusPedido(pedido.id, newStatus);
      if (success) {
          setPedido({ ...pedido, status: newStatus });
          notify("Status Atualizado", `Pedido marcado como ${newStatus}.`, "success");
      } else {
          notify("Erro", "Não foi possível atualizar o status.", "error");
      }
      setProcessing(false);
  };

  const handleDelete = async () => {
      if (!pedido) return;
      if (!confirm("TEM CERTEZA? Ao excluir este pedido, o orçamento de origem será liberado para edição novamente.")) return;
      
      setProcessing(true);
      try {
          const success = await excluirPedido(pedido.id);
          if (success) {
              notify("Pedido Excluído", "O pedido foi removido e o orçamento foi liberado.", "success");
              onBack();
          } else {
              notify("Erro", "Falha ao excluir pedido.", "error");
          }
      } catch (e) {
          notify("Erro Crítico", "Falha de conexão.", "error");
      } finally {
          setProcessing(false);
      }
  };

  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (loading || !pedido) return <div className="p-8 text-center text-slate-500">Carregando...</div>;

  const isOperador = currentUser.role === UserRole.OPERADOR;

  return (
    <div className="max-w-5xl mx-auto mt-6 px-4 pb-20">
       
       {/* Top Bar */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                  <h2 className="text-2xl font-bold text-white font-orbitron flex items-center gap-2">
                      Pedido #{pedido.id}
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border 
                        ${pedido.status === 'ABERTO' ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 
                          pedido.status === 'FATURADO' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' :
                          'bg-red-900/30 text-red-400 border-red-800'}`}>
                          {pedido.status}
                      </span>
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                      Gerado em {new Date(pedido.dataCriacao).toLocaleDateString()} a partir do Orçamento #{pedido.orcamentoId}
                  </p>
              </div>
          </div>

          <div className="flex flex-wrap gap-2">
              <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 border border-slate-600 text-slate-300 hover:bg-slate-700 rounded-lg font-bold text-sm flex items-center gap-2"
              >
                  <Printer className="w-4 h-4" /> Imprimir
              </button>

              {isOperador && (
                  <button 
                    onClick={handleDelete}
                    disabled={processing}
                    className="px-4 py-2 bg-red-900/20 border border-red-700 text-red-400 hover:bg-red-900/40 rounded-lg font-bold text-sm flex items-center gap-2"
                  >
                    {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Excluir Pedido
                  </button>
              )}

              {isOperador && pedido.status === 'ABERTO' && (
                  <>
                     <button 
                        onClick={() => handleStatusChange('FATURADO')} 
                        disabled={processing}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm flex items-center gap-2"
                     >
                        {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Faturar
                     </button>
                     <button 
                        onClick={() => handleStatusChange('CANCELADO')} 
                        disabled={processing}
                        className="px-4 py-2 bg-red-900/20 border border-red-800 text-red-400 hover:bg-red-900/40 rounded-lg font-bold text-sm flex items-center gap-2"
                     >
                        {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Cancelar
                     </button>
                  </>
              )}
          </div>
       </div>

       {/* HEADER SECTION (Client) */}
       <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cliente</label>
                   <div className="flex items-center gap-3">
                       <div className="p-2 bg-slate-900 rounded-lg text-slate-400"><User className="w-5 h-5" /></div>
                       <div>
                           <p className="text-white font-bold text-lg">{pedido.clienteNomeSnapshot}</p>
                           <p className="text-xs text-slate-500">Cod: {pedido.clienteId}</p>
                       </div>
                   </div>
               </div>
               <div className="flex flex-col gap-2">
                   <label className="block text-xs font-bold text-slate-500 uppercase">Observações</label>
                   <p className="text-slate-300 text-sm bg-slate-900/50 p-3 rounded border border-slate-800">
                      {pedido.observacao || "Sem observações."}
                   </p>
               </div>
           </div>
       </div>

       {/* ITEMS SECTION */}
       <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden min-h-[400px] flex flex-col">
           <div className="p-4 bg-slate-900/50 border-b border-slate-700">
               <h3 className="font-bold text-white flex items-center gap-2"><Package className="w-4 h-4 text-emerald-500" /> Itens do Pedido</h3>
           </div>

           <div className="flex-1 overflow-x-auto">
               <table className="w-full text-left text-sm">
                   <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                       <tr>
                           <th className="px-4 py-3 w-12">#</th>
                           <th className="px-4 py-3">Produto</th>
                           <th className="px-4 py-3 w-24 text-center">Und</th>
                           <th className="px-4 py-3 w-32 text-right">Qtd</th>
                           <th className="px-4 py-3 w-32 text-right">Preço Unit.</th>
                           <th className="px-4 py-3 w-32 text-right">Desconto</th>
                           <th className="px-4 py-3 w-32 text-right">Total</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-700">
                       {pedido.itens.map((item, idx) => (
                           <tr key={idx} className="hover:bg-slate-700/30">
                               <td className="px-4 py-3 text-slate-500 font-mono">{idx + 1}</td>
                               <td className="px-4 py-3">
                                   <p className="text-white font-medium">{item.descricaoSnapshot}</p>
                                   <p className="text-xs text-slate-500">Ref: {item.produtoId}</p>
                               </td>
                               <td className="px-4 py-3 text-center text-slate-400">{item.unidade}</td>
                               <td className="px-4 py-3 text-right text-slate-200">{item.quantidade}</td>
                               <td className="px-4 py-3 text-right text-slate-200">{fmtCurrency(item.precoUnitario)}</td>
                               <td className="px-4 py-3 text-right text-red-300">-{fmtCurrency(item.desconto)}</td>
                               <td className="px-4 py-3 text-right font-bold text-white">
                                   {fmtCurrency(item.totalItem)}
                               </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           </div>
           
           {/* Totals Footer */}
           <div className="bg-slate-900 p-6 border-t border-slate-700 flex flex-col items-end gap-2">
               <div className="flex justify-between w-64 text-sm">
                   <span className="text-slate-400">Subtotal:</span>
                   <span className="text-slate-200">{fmtCurrency(pedido.totais.subtotal)}</span>
               </div>
               <div className="flex justify-between w-64 text-sm">
                   <span className="text-slate-400">Descontos:</span>
                   <span className="text-red-400">-{fmtCurrency(pedido.totais.desconto)}</span>
               </div>
               <div className="w-64 h-px bg-slate-700 my-1"></div>
               <div className="flex justify-between w-64 text-xl font-bold">
                   <span className="text-white">Total:</span>
                   <span className="text-emerald-400">{fmtCurrency(pedido.totais.total)}</span>
               </div>
           </div>
       </div>
    </div>
  );
};

export default OrderDetailStep;
