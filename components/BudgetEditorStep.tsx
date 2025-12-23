
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, User, Package, Plus, Trash2, Save, FileText, 
  Search, X, Check, DollarSign, Calendar, ShoppingBag, RefreshCw, Undo2
} from 'lucide-react';
import { 
  Orcamento, OrcamentoItem, OrcamentoStatus, Cliente, Produto, User as AppUser, UserRole 
} from '../types';
import { salvarOrcamento, buscarOrcamentoPorId, atualizarStatusOrcamento, marcarOrcamentoComoEnviado, excluirOrcamento } from '../services/budgets';
import { gerarPedidoDoOrcamento } from '../services/orders';
import { listarClientes } from '../services/customers';
import { listarProdutos } from '../services/products';
import { useNotification } from './NotificationSystem';

interface BudgetEditorStepProps {
  currentUser: AppUser;
  orcamentoId?: string;
  onBack: () => void;
}

const BudgetEditorStep: React.FC<BudgetEditorStepProps> = ({ currentUser, orcamentoId, onBack }) => {
  const { notify } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quote, setQuote] = useState<Orcamento | null>(null);
  
  const [showClientModal, setShowClientModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  
  const [clientSearch, setClientSearch] = useState('');
  const [allClients, setAllClients] = useState<Cliente[]>([]);
  const [clientResults, setClientResults] = useState<Cliente[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientsLoaded, setClientsLoaded] = useState(false);

  const [productSearch, setProductSearch] = useState('');
  const [allProducts, setAllProducts] = useState<Produto[]>([]);
  const [productResults, setProductResults] = useState<Produto[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);

  const isReadOnly = !quote || 
    quote.status !== 'RASCUNHO' || 
    currentUser.role !== UserRole.OPERADOR;
    
  const isConverted = quote?.status === 'CONVERTIDO';
  const isNew = !orcamentoId || (quote && quote.id.includes('-'));

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      if (orcamentoId) {
        const data = await buscarOrcamentoPorId(orcamentoId);
        if (data) setQuote(data);
        else notify("Orçamento não encontrado", "Não foi possível localizar o orçamento solicitado.", "error");
      } else {
        const newQuote: Orcamento = {
          id: crypto.randomUUID(), // Temporário até salvar
          clienteId: '',
          clienteNomeSnapshot: '',
          vendedor: currentUser.email.split('@')[0].toUpperCase(),
          dataCriacao: new Date().toISOString(),
          status: 'RASCUNHO',
          itens: [],
          totais: { subtotal: 0, desconto: 0, total: 0 }
        };
        setQuote(newQuote);
      }
      setLoading(false);
    };
    init();
  }, [orcamentoId, currentUser]);

  useEffect(() => {
    if (!quote || isConverted) return;
    
    const subtotal = quote.itens.reduce((acc, item) => acc + (item.quantidade * item.precoUnitario), 0);
    const totalDiscount = quote.itens.reduce((acc, item) => acc + item.desconto, 0);
    const total = subtotal - totalDiscount;

    if (
        quote.totais.subtotal !== subtotal || 
        quote.totais.desconto !== totalDiscount || 
        quote.totais.total !== total
    ) {
        setQuote(prev => prev ? ({
            ...prev,
            totais: { subtotal, desconto: totalDiscount, total }
        }) : null);
    }
  }, [quote?.itens]);

  const handleOpenClientModal = async () => {
      setShowClientModal(true);
      if (!clientsLoaded) {
          setLoadingClients(true);
          try {
              const list = await listarClientes();
              setAllClients(list);
              setClientResults(list);
              setClientsLoaded(true);
          } catch (e) {
              console.error("Erro ao carregar clientes", e);
              notify("Erro ao carregar lista", "Verifique sua conexão.", "error");
          } finally {
              setLoadingClients(false);
          }
      } else {
          setClientSearch('');
          setClientResults(allClients);
      }
  };

  const handleClientSearch = (term: string) => {
    setClientSearch(term);
    if (!term.trim()) {
        setClientResults(allClients);
        return;
    }
    const lower = term.toLowerCase();
    const filtered = allClients.filter(c => 
        (c.nome && c.nome.toLowerCase().includes(lower)) ||
        (c.fantasia && c.fantasia.toLowerCase().includes(lower)) ||
        (c.cpfCnpj && c.cpfCnpj.includes(lower)) ||
        (c.codigo && c.codigo.toLowerCase().includes(lower))
    );
    setClientResults(filtered);
  };

  const selectClient = (c: Cliente) => {
    setQuote(prev => prev ? ({
        ...prev,
        clienteId: c.codigo,
        clienteNomeSnapshot: c.nome || c.fantasia || "Cliente Sem Nome"
    }) : null);
    setShowClientModal(false);
  };

  const handleOpenProductModal = async () => {
      setShowProductModal(true);
      if (!productsLoaded) {
          setLoadingProducts(true);
          try {
              const result = await listarProdutos();
              setAllProducts(result.items);
              setProductResults(result.items);
              setProductsLoaded(true);
          } catch (e) {
              console.error("Erro ao carregar produtos", e);
              notify("Erro ao carregar catálogo", "Tente novamente em instantes.", "error");
          } finally {
              setLoadingProducts(false);
          }
      } else {
          setProductSearch('');
          setProductResults(allProducts);
      }
  };

  const handleProductSearch = (term: string) => {
    setProductSearch(term);
    if (!term.trim()) {
        setProductResults(allProducts);
        return;
    }
    const lower = term.toLowerCase();
    const filtered = allProducts.filter(p => 
        (p.descricao && p.descricao.toLowerCase().includes(lower)) ||
        (p.ean && p.ean.includes(lower)) ||
        (p.id && p.id.toLowerCase().includes(lower))
    );
    setProductResults(filtered);
  };

  const addProduct = (p: Produto) => {
    if (!quote) return;
    
    const newItem: OrcamentoItem = {
        id: crypto.randomUUID(),
        produtoId: p.id,
        descricaoSnapshot: p.descricao,
        unidade: p.unidade.codigo,
        quantidade: 1,
        precoUnitario: p.precos.venda,
        desconto: 0,
        totalItem: p.precos.venda
    };

    setQuote(prev => prev ? ({
        ...prev,
        itens: [...prev.itens, newItem]
    }) : null);
    setShowProductModal(false);
    setProductSearch('');
  };

  const updateItem = (id: string, field: keyof OrcamentoItem, value: number) => {
     if (isReadOnly || isConverted) return;
     setQuote(prev => {
         if (!prev) return null;
         const newItens = prev.itens.map(item => {
             if (item.id === id) {
                 const updated = { ...item, [field]: value } as OrcamentoItem;
                 updated.totalItem = (updated.quantidade * updated.precoUnitario) - updated.desconto;
                 return updated;
             }
             return item;
         });
         return { ...prev, itens: newItens };
     });
  };

  const removeItem = (id: string) => {
      if (isReadOnly || isConverted) return;
      setQuote(prev => prev ? ({
          ...prev,
          itens: prev.itens.filter(i => i.id !== id)
      }) : null);
  };

  const handleSave = async () => {
    if (!quote) return;
    if (!quote.clienteId) {
        notify("Cliente Obrigatório", "Por favor, selecione um cliente para o orçamento.", "warning");
        return;
    }
    if (quote.itens.length === 0) {
        notify("Orçamento Vazio", "Adicione pelo menos um produto antes de salvar.", "warning");
        return;
    }

    setSaving(true);
    try {
        const result = await salvarOrcamento(quote);
        if (result.success) {
            notify("Orçamento Salvo", `Orçamento #${result.id} gravado com sucesso!`, "success");
            onBack();
        } else {
            notify("Erro ao Salvar", "Ocorreu um problema. Verifique sua conexão.", "error");
        }
    } catch (e: any) {
        notify("Erro Crítico", e.message, "error");
    } finally {
        setSaving(false);
    }
  };

  const handleMarkAsSent = async () => {
      if (!quote) return;
      if (isNew) {
          notify("Salve primeiro", "Salve o orçamento para gerar o número sequencial antes de enviar.", "warning");
          return;
      }
      if (!confirm("Confirmar envio deste orçamento? O status mudará para ENVIADO e a edição será travada.")) return;
      
      setSaving(true);
      try {
          const success = await marcarOrcamentoComoEnviado(quote.id, currentUser.email);
          if (success) {
              setQuote(prev => prev ? ({ 
                  ...prev, 
                  status: 'ENVIADO',
                  dataEnvio: new Date().toISOString(),
                  usuarioEnvio: currentUser.email
              }) : null);
              notify("Orçamento Enviado", "O status foi atualizado para ENVIADO.", "success");
          } else {
              notify("Falha no Envio", "Não foi possível atualizar o status no banco de dados.", "error");
          }
      } catch (e) {
          console.error(e);
          notify("Erro Crítico", "Falha de conexão ao marcar como enviado.", "error");
      } finally {
          setSaving(false);
      }
  };

  const handleStatusChange = async (newStatus: OrcamentoStatus) => {
      if (!quote) return;
      if (!confirm(`Confirmar alteração de status para ${newStatus}?`)) return;
      
      setSaving(true);
      try {
          const success = await atualizarStatusOrcamento(quote.id, newStatus);
          if (success) {
              setQuote(prev => prev ? ({ ...prev, status: newStatus }) : null);
              notify("Status Atualizado", `Orçamento marcado como ${newStatus}.`, "success");
          } else {
              notify("Erro na Atualização", "Não foi possível mudar o status no banco de dados.", "error");
          }
      } catch (e) {
          console.error(e);
          notify("Erro Crítico", "Falha de conexão ao atualizar status.", "error");
      } finally {
          setSaving(false);
      }
  };

  const handleBackToDraft = async () => {
      if (!quote) return;
      if (!confirm("Deseja voltar este orçamento para Rascunho? Isso permitirá editá-lo novamente.")) return;
      
      setSaving(true);
      try {
          const success = await atualizarStatusOrcamento(quote.id, 'RASCUNHO');
          if (success) {
              setQuote(prev => prev ? ({ ...prev, status: 'RASCUNHO' }) : null);
              notify("Modo Edição Ativado", "O orçamento voltou para o status de RASCUNHO.", "info");
          }
      } catch (e) {
          notify("Erro", "Falha ao mudar status.", "error");
      } finally {
          setSaving(false);
      }
  };

  const handleDelete = async () => {
      if (!quote || isNew) return;
      if (!confirm("TEM CERTEZA? Esta ação excluirá permanentemente este orçamento.")) return;
      
      setSaving(true);
      try {
          const success = await excluirOrcamento(quote.id);
          if (success) {
              notify("Orçamento Excluído", "O registro foi removido do banco de dados.", "success");
              onBack();
          } else {
              notify("Falha na Exclusão", "Não foi possível remover o orçamento.", "error");
          }
      } catch (e) {
          notify("Erro Crítico", "Falha de conexão ao excluir.", "error");
      } finally {
          setSaving(false);
      }
  };

  const handleGenerateOrder = async () => {
      if (!quote) return;
      if (quote.status !== 'ENVIADO' && quote.status !== 'APROVADO') return;
      if (!confirm("Confirmar conversão em Pedido? Este orçamento será marcado como 'Convertido' e não poderá ser editado.")) return;

      setSaving(true);
      try {
          const pedidoId = await gerarPedidoDoOrcamento(quote);
          if (pedidoId) {
              notify("Pedido Gerado!", `Orçamento convertido com sucesso. Pedido: ${pedidoId}`, "success");
              onBack(); 
          } else {
              notify("Falha na Conversão", "Não foi possível converter o orçamento. Verifique se ele já foi convertido.", "error");
          }
      } catch (e) {
          console.error(e);
          notify("Erro ao Gerar Pedido", "Ocorreu um erro técnico durante a conversão.", "error");
      } finally {
          setSaving(false);
      }
  };

  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (loading || !quote) return <div className="p-8 text-center text-slate-500">Preparando editor...</div>;

  return (
    <div className="max-w-7xl mx-auto mt-6 px-4 pb-20">
       
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                  <h2 className="text-2xl font-bold text-white font-orbitron flex items-center gap-2">
                      {isNew ? "Novo Orçamento" : `Orçamento #${quote.id}`}
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border 
                        ${quote.status === 'RASCUNHO' ? 'bg-slate-700 text-slate-300 border-slate-600' : 
                          quote.status === 'APROVADO' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' :
                          quote.status === 'CONVERTIDO' ? 'bg-indigo-900/30 text-indigo-400 border-indigo-800' :
                          'bg-blue-900/30 text-blue-400 border-blue-800'}`}>
                          {quote.status}
                      </span>
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                      {isNew ? "Número será gerado ao salvar" : `Criado em ${new Date(quote.dataCriacao).toLocaleDateString()} por ${quote.vendedor}`}
                  </p>
              </div>
          </div>

          <div className="flex flex-wrap gap-2">
              {/* BOTÃO EXCLUIR */}
              {!isNew && !isConverted && currentUser.role === UserRole.OPERADOR && (
                  <button 
                    onClick={handleDelete}
                    disabled={saving}
                    className="px-4 py-2 bg-red-900/20 border border-red-700 text-red-400 hover:bg-red-900/40 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
              )}

              {/* BOTÃO VOLTAR PARA RASCUNHO (LIBERAR PARA EDIÇÃO) */}
              {(quote.status === 'ENVIADO' || quote.status === 'APROVADO') && currentUser.role === UserRole.OPERADOR && (
                  <button 
                    onClick={handleBackToDraft}
                    disabled={saving}
                    className="px-4 py-2 border border-slate-600 text-slate-400 hover:bg-slate-800 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
                  >
                    <Undo2 className="w-4 h-4" />
                    Editar Novamente
                  </button>
              )}

              {!isReadOnly && !isConverted && (
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg shadow-green-900/20 transition-all disabled:opacity-50 min-w-[120px] justify-center"
                  >
                      {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                      <span>{saving ? "Gravando..." : "Salvar"}</span>
                  </button>
              )}
              
              {/* BOTÃO: MARCAR ENVIADO (APENAS PARA RASCUNHOS) */}
              {quote.status === 'RASCUNHO' && currentUser.role === UserRole.OPERADOR && !isReadOnly && (
                  <button 
                    onClick={handleMarkAsSent} 
                    disabled={saving}
                    className="px-4 py-2 border border-blue-600 text-blue-400 hover:bg-blue-900/20 rounded-lg font-bold text-sm flex items-center gap-2"
                  >
                      {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                      Marcar Enviado
                  </button>
              )}

              {/* ACTION: CONVERTER EM PEDIDO (REQUISITO: STATUS = ENVIADO) */}
              {(quote.status === 'ENVIADO' || quote.status === 'APROVADO') && currentUser.role === UserRole.OPERADOR && !isConverted && (
                   <button 
                      onClick={handleGenerateOrder}
                      disabled={saving}
                      className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-900/20 transform transition-all hover:scale-105"
                   >
                      {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />} 
                      <span>🟢 Converter em Pedido</span>
                   </button>
              )}

              {/* AÇÕES DE STATUS QUANDO JÁ ENVIADO */}
              {quote.status === 'ENVIADO' && currentUser.role === UserRole.OPERADOR && !isConverted && (
                   <>
                     <button 
                        onClick={() => handleStatusChange('APROVADO')} 
                        disabled={saving}
                        className="px-4 py-2 bg-emerald-600/20 border border-emerald-600 text-emerald-400 hover:bg-emerald-600/40 rounded-lg font-bold text-sm flex items-center gap-2"
                     >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                        Aprovar
                     </button>
                     <button 
                        onClick={() => handleStatusChange('CANCELADO')} 
                        disabled={saving}
                        className="px-4 py-2 bg-red-600/20 border border-red-800 text-red-400 hover:bg-red-600/40 rounded-lg font-bold text-sm flex items-center gap-2"
                     >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                        Cancelar
                     </button>
                   </>
              )}
          </div>
       </div>

       <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cliente</label>
                   {quote.clienteId ? (
                       <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-700 rounded-lg">
                           <div className="flex items-center gap-3">
                               <div className="p-2 bg-cyan-900/20 rounded-lg text-cyan-400"><User className="w-5 h-5" /></div>
                               <div>
                                   <p className="text-white font-bold">{quote.clienteNomeSnapshot}</p>
                                   <p className="text-xs text-slate-500">Cod: {quote.clienteId}</p>
                               </div>
                           </div>
                           {!isReadOnly && !isConverted && (
                               <button onClick={handleOpenClientModal} className="text-xs text-slate-400 hover:text-white underline">Alterar</button>
                           )}
                       </div>
                   ) : (
                       <button 
                         onClick={handleOpenClientModal}
                         disabled={isReadOnly || isConverted}
                         className="w-full p-4 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-2"
                       >
                           <Search className="w-4 h-4" /> Selecionar Cliente
                       </button>
                   )}
               </div>

               <div className="flex flex-col gap-4">
                   <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Validade</label>
                       <div className="relative">
                           <Calendar className="w-4 h-4 absolute top-2.5 left-3 text-slate-500" />
                           <input 
                              type="date" 
                              disabled={isReadOnly || isConverted}
                              value={quote.dataValidade ? quote.dataValidade.split('T')[0] : ''}
                              onChange={(e) => setQuote(prev => prev ? ({...prev, dataValidade: new Date(e.target.value).toISOString()}) : null)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:border-cyan-500 outline-none"
                           />
                       </div>
                   </div>
                   {quote.dataEnvio && (
                       <div className="text-[10px] text-slate-500 italic">
                           Enviado em {new Date(quote.dataEnvio).toLocaleString()} por {quote.usuarioEnvio}
                       </div>
                   )}
               </div>
           </div>
       </div>

       <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden min-h-[400px] flex flex-col">
           <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
               <h3 className="font-bold text-white flex items-center gap-2"><Package className="w-4 h-4 text-cyan-500" /> Itens do Orçamento</h3>
               {!isReadOnly && !isConverted && (
                   <button 
                     onClick={handleOpenProductModal}
                     className="px-3 py-1.5 bg-cyan-600/20 border border-cyan-600 text-cyan-400 hover:bg-cyan-600 hover:text-white rounded text-xs font-bold transition-colors flex items-center gap-1"
                   >
                       <Plus className="w-3 h-3" /> Adicionar Produto
                   </button>
               )}
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
                           {!isReadOnly && !isConverted && <th className="px-4 py-3 w-12"></th>}
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-700/50">
                       {quote.itens.length === 0 ? (
                           <tr>
                               <td colSpan={8} className="text-center py-12 text-slate-500">
                                   Nenhum item adicionado.
                               </td>
                           </tr>
                       ) : (
                           quote.itens.map((item, idx) => (
                               <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                                   <td className="px-4 py-3 text-slate-500 font-mono">{idx + 1}</td>
                                   <td className="px-4 py-3">
                                       <p className="text-white font-medium">{item.descricaoSnapshot}</p>
                                       <p className="text-xs text-slate-500">Ref: {item.produtoId}</p>
                                   </td>
                                   <td className="px-4 py-3 text-center text-slate-400">{item.unidade}</td>
                                   
                                   <td className="px-4 py-3 text-right">
                                       {isReadOnly || isConverted ? item.quantidade : (
                                           <input 
                                              type="number" 
                                              min="1"
                                              value={item.quantidade}
                                              onChange={(e) => updateItem(item.id, 'quantidade', parseFloat(e.target.value))}
                                              className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right text-white focus:border-cyan-500 outline-none"
                                           />
                                       )}
                                   </td>
                                   <td className="px-4 py-3 text-right">
                                       {isReadOnly || isConverted ? fmtCurrency(item.precoUnitario) : (
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={item.precoUnitario}
                                                    onChange={(e) => updateItem(item.id, 'precoUnitario', parseFloat(e.target.value))}
                                                    className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right text-white focus:border-cyan-500 outline-none"
                                                />
                                            </div>
                                       )}
                                   </td>
                                   <td className="px-4 py-3 text-right">
                                       {isReadOnly || isConverted ? fmtCurrency(item.desconto) : (
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                value={item.desconto}
                                                onChange={(e) => updateItem(item.id, 'desconto', parseFloat(e.target.value))}
                                                className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right text-red-300 focus:border-cyan-500 outline-none"
                                            />
                                       )}
                                   </td>
                                   
                                   <td className="px-4 py-3 text-right font-bold text-white">
                                       {fmtCurrency(item.totalItem)}
                                   </td>
                                   
                                   {!isReadOnly && !isConverted && (
                                       <td className="px-4 py-3 text-center">
                                           <button 
                                              onClick={() => removeItem(item.id)}
                                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                                           >
                                               <Trash2 className="w-4 h-4" />
                                           </button>
                                       </td>
                                   )}
                               </tr>
                           ))
                       )}
                   </tbody>
               </table>
           </div>
           
           <div className="bg-slate-900 p-6 border-t border-slate-700 flex flex-col items-end gap-2">
               <div className="flex justify-between w-64 text-sm">
                   <span className="text-slate-400">Subtotal:</span>
                   <span className="text-slate-200">{fmtCurrency(quote.totais.subtotal)}</span>
               </div>
               <div className="flex justify-between w-64 text-sm">
                   <span className="text-slate-400">Descontos:</span>
                   <span className="text-red-400">-{fmtCurrency(quote.totais.desconto)}</span>
               </div>
               <div className="w-64 h-px bg-slate-700 my-1"></div>
               <div className="flex justify-between w-64 text-xl font-bold">
                   <span className="text-white">Total:</span>
                   <span className="text-cyan-400">{fmtCurrency(quote.totais.total)}</span>
               </div>
           </div>
       </div>

       {showClientModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
               <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
                   <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                       <h3 className="text-white font-bold">Buscar Cliente</h3>
                       <button onClick={() => setShowClientModal(false)}><X className="text-slate-400" /></button>
                   </div>
                   <div className="p-4 border-b border-slate-700">
                       <input 
                          autoFocus
                          placeholder="Digite nome ou CNPJ..." 
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500"
                          value={clientSearch}
                          onChange={(e) => handleClientSearch(e.target.value)}
                       />
                   </div>
                   <div className="flex-1 overflow-y-auto p-2">
                       {loadingClients ? (
                           <div className="p-8 text-center text-slate-500">
                               <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                               Carregando lista de clientes...
                           </div>
                       ) : clientResults.length === 0 ? (
                           <p className="text-center text-slate-500 py-8">Nenhum cliente encontrado.</p>
                       ) : (
                           clientResults.slice(0, 100).map(c => ( 
                               <button 
                                 key={c.codigo} 
                                 onClick={() => selectClient(c)}
                                 className="w-full text-left p-3 hover:bg-slate-800 rounded-lg flex justify-between items-center border-b border-slate-800/50 last:border-0"
                               >
                                   <div>
                                       <p className="text-white font-bold">{c.nome || c.fantasia}</p>
                                       <p className="text-xs text-slate-500">{c.cpfCnpj} | {c.endereco.codigoMunicipio}</p>
                                   </div>
                                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${c.bloqueado ? 'bg-red-900/30 text-red-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                                       {c.bloqueado ? 'BLOQUEADO' : 'ATIVO'}
                                   </span>
                               </button>
                           ))
                       )}
                   </div>
               </div>
           </div>
       )}

       {showProductModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
               <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[80vh]">
                   <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                       <h3 className="text-white font-bold">Adicionar Produto (ERP)</h3>
                       <button onClick={() => setShowProductModal(false)}><X className="text-slate-400" /></button>
                   </div>
                   <div className="p-4 border-b border-slate-700">
                       <input 
                          autoFocus
                          placeholder="Digite descrição, código ou EAN..." 
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500"
                          value={productSearch}
                          onChange={(e) => handleProductSearch(e.target.value)}
                       />
                   </div>
                   <div className="flex-1 overflow-y-auto p-2">
                       {loadingProducts ? (
                           <div className="p-8 text-center text-slate-500">
                               <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                               Carregando catálogo de produtos...
                           </div>
                       ) : productResults.length === 0 ? (
                           <p className="text-center text-slate-500 py-8">Nenhum produto encontrado.</p>
                       ) : (
                           productResults.slice(0, 100).map(p => (
                               <button 
                                 key={p.id} 
                                 disabled={!p.ativo}
                                 onClick={() => addProduct(p)}
                                 className={`w-full text-left p-3 hover:bg-slate-800 rounded-lg flex justify-between items-center border-b border-slate-800/50 last:border-0 ${!p.ativo ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                               >
                                   <div>
                                       <div className="flex items-center gap-2">
                                           <p className="text-white font-bold">{p.descricao}</p>
                                           {!p.ativo && <span className="text-[10px] bg-red-900 text-red-200 px-1 rounded">INATIVO</span>}
                                       </div>
                                       <p className="text-xs text-slate-500">
                                           Cod: {p.id} | Estoque: {p.estoqueAtual} {p.unidade.codigo}
                                       </p>
                                   </div>
                                   <div className="text-right">
                                       <p className="text-emerald-400 font-bold">{fmtCurrency(p.precos.venda)}</p>
                                       <p className="text-[10px] text-slate-500">Mín: {fmtCurrency(p.precos.vendaMinima)}</p>
                                   </div>
                               </button>
                           ))
                       )}
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default BudgetEditorStep;
