
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, ArrowLeft, Box, Tag, Ruler, FileText, Info,
  DollarSign, BarChart3, Lock, X, Database, PlusCircle, Edit, Save, RefreshCw, MessageSquare,
  TrendingUp, TrendingDown, History, CheckCircle, Percent, AlertTriangle, Package, RotateCcw,
  BarChart, PieChart, Users, ShoppingBag, Calendar, UploadCloud, ChevronDown, Star
} from 'lucide-react';
import { Produto, User, UserRole, ProductBatch, ABCAnalysis, ProductCustomerStats } from '../types';
import { listarProdutos, buscarProdutos, criarProdutoManual, atualizarProduto, aplicarReajusteEmMassa, listarUltimosLotes, reverterLote, gerarCurvaABC, analisarCompradores, listarProdutosMaisUsados } from '../services/products';
import ChatWidget from './ChatWidget';

interface ProductQueryStepProps {
  onBack: () => void;
  currentUser: User;
  onImport?: () => void; 
}

const ProductQueryStep: React.FC<ProductQueryStepProps> = ({ onBack, currentUser, onImport }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  
  // List Type: 'ALL' or 'FAVORITES'
  const [listType, setListType] = useState<'ALL' | 'FAVORITES'>('ALL');

  // Pagination State
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  
  // Edit/Create State
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [viewMode, setViewMode] = useState<'DETAILS' | 'CUSTOMERS'>('DETAILS'); 
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Customer Analysis State
  const [customerStats, setCustomerStats] = useState<ProductCustomerStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Bulk Update State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTab, setBulkTab] = useState<'NEW' | 'HISTORY'>('NEW');
  const [bulkPercent, setBulkPercent] = useState<number>(0);
  const [bulkPreview, setBulkPreview] = useState<{id: string, old: number, new: number, name: string}[]>([]);
  const [batchHistory, setBatchHistory] = useState<ProductBatch[]>([]);
  
  // ABC Analysis State
  const [showABCModal, setShowABCModal] = useState(false);
  const [abcData, setAbcData] = useState<ABCAnalysis | null>(null);
  const [abcLoading, setAbcLoading] = useState(false);
  const [abcStartDate, setAbcStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0]); 
  const [abcEndDate, setAbcEndDate] = useState(new Date().toISOString().split('T')[0]); 

  // Agent State
  const [showAgent, setShowAgent] = useState(false);

  const isOperador = currentUser.role === UserRole.OPERADOR;

  // --- DATA LOADING & PAGINATION ---

  const loadInitialData = async () => {
    setLoading(true);
    setHasMore(true);
    setLastDoc(null);
    try {
      if (listType === 'FAVORITES') {
          const results = await listarProdutosMaisUsados();
          setProducts(results);
          setHasMore(false); // Favorites list is limited to top 20
      } else {
          const result = await listarProdutos(null);
          setProducts(result.items);
          setLastDoc(result.lastDoc);
          setHasMore(result.hasMore);
      }
    } catch (error) {
      console.error("Erro ao carregar produtos", error);
      alert("Erro ao carregar lista de produtos.");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreData = async () => {
    if (loading || !hasMore || searchTerm || listType === 'FAVORITES') return; 
    
    setLoading(true);
    try {
        const result = await listarProdutos(lastDoc);
        setProducts(prev => [...prev, ...result.items]);
        setLastDoc(result.lastDoc);
        setHasMore(result.hasMore);
    } catch (error) {
        console.error("Erro ao carregar mais", error);
    } finally {
        setLoading(false);
    }
  };

  const performSearch = async (term: string) => {
      setSearching(true);
      try {
          if (!term.trim()) {
              await loadInitialData();
          } else {
              // Backend Search
              const results = await buscarProdutos(term);
              setProducts(results);
              setHasMore(false); // Disable pagination on search results
          }
      } catch (error) {
          console.error("Search error", error);
      } finally {
          setSearching(false);
      }
  };

  // Debounce logic
  useEffect(() => {
    loadInitialData();
  }, [listType]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim() !== '') {
          // Temporarily switch out of Favorites if searching
          performSearch(searchTerm);
      } else if (searchTerm === '' && !loading) {
          loadInitialData();
      }
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Load Customer Analysis when Tab Changed
  useEffect(() => {
      if (selectedProduct && viewMode === 'CUSTOMERS') {
          setLoadingStats(true);
          analisarCompradores(selectedProduct)
            .then(stats => setCustomerStats(stats))
            .catch(err => console.error(err))
            .finally(() => setLoadingStats(false));
      }
  }, [selectedProduct, viewMode]);

  const handleRowClick = (product: Produto) => {
    if (!isEditing) {
        setSelectedProduct(product);
        setIsEditing(false);
        setIsCreating(false);
        setViewMode('DETAILS'); 
    }
  };

  const handleCreateClick = () => {
      if (!isOperador) return;
      const newProd: Produto = {
          id: `P${Date.now()}`,
          ean: '',
          descricao: '',
          descricaoReduzida: '',
          grupo: { codigo: '', descricao: '' },
          unidade: { codigo: 'UN', descricao: 'UNIDADE', vendaFracionada: false },
          estoqueAtual: 0,
          ativo: true,
          usageCount: 0,
          precos: { custo: 0, medio: 0, venda: 0, vendaMinima: 0 },
          fiscal: { ncm: '', cest: '', cst: '', icms: { aliquota: 0, reducao: 0, modalidade: '', st: '' }, pis: { cst: '', aliquota: 0 }, cofins: { cst: '', aliquota: 0 } },
          dimensoes: { altura: 0, largura: 0, comprimento: 0 },
          meta: { marca: '', modelo: '', aplicacao: '', observacao: '' },
          controle: { dataInclusao: new Date().toLocaleDateString(), ultimaAlteracao: '', origem: 'EIP' },
          historicoPrecos: []
      };
      setSelectedProduct(newProd);
      setIsEditing(true);
      setIsCreating(true);
      setViewMode('DETAILS');
  };

  const handleEditClick = () => {
      if (!isOperador) return;
      setIsEditing(true);
      setIsCreating(false);
  };

  const handleInputChange = (path: string, value: any) => {
      if (!selectedProduct) return;
      
      const newProd = JSON.parse(JSON.stringify(selectedProduct)); // Deep clone
      
      const parts = path.split('.');
      let current = newProd;
      for (let i = 0; i < parts.length - 1; i++) {
          current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      
      setSelectedProduct(newProd);
  };

  const handleSave = async () => {
      if (!selectedProduct) return;
      if (!selectedProduct.descricao) {
          alert("Descrição é obrigatória.");
          return;
      }

      setSaving(true);
      try {
          if (isCreating) {
              await criarProdutoManual(selectedProduct);
              alert("Produto criado!");
              loadInitialData();
          } else {
              await atualizarProduto(selectedProduct);
              setProducts(prev => prev.map(p => p.id === selectedProduct.id ? selectedProduct : p));
          }
          setIsEditing(false);
          setIsCreating(false);
      } catch (error: any) {
          alert("Erro: " + error.message);
      } finally {
          setSaving(false);
      }
  };

  // --- ABC LOGIC ---
  const handleLoadABC = async () => {
      setAbcLoading(true);
      try {
          const data = await gerarCurvaABC(abcStartDate, abcEndDate);
          setAbcData(data);
      } catch (e: any) {
          alert("Erro na análise ABC: " + e.message);
      } finally {
          setAbcLoading(false);
      }
  };

  useEffect(() => {
      if (showABCModal && !abcData) {
          handleLoadABC();
      }
  }, [showABCModal]);

  // --- BULK UPDATE LOGIC ---
  const handleOpenBulk = async () => {
      setShowBulkModal(true);
      setBulkTab('NEW');
      const hist = await listarUltimosLotes();
      setBatchHistory(hist);
  };

  const handlePreviewBulk = () => {
      if (bulkPercent === 0) return;
      // Only preview current view
      const preview = products.slice(0, 50).map(p => ({
          id: p.id,
          name: p.descricao,
          old: p.precos.venda,
          new: parseFloat((p.precos.venda * (1 + bulkPercent/100)).toFixed(2))
      }));
      setBulkPreview(preview);
  };

  const handleApplyBulk = async () => {
      if (!confirm(`Confirma o reajuste de ${bulkPercent}%?`)) return;
      // Simplified: Apply to currently filtered list IDs.
      const ids = products.map(p => p.id);
      
      setSaving(true);
      try {
          const result = await aplicarReajusteEmMassa(bulkPercent, ids);
          alert(`Reajuste aplicado com sucesso em ${result.affected} produtos.`);
          setShowBulkModal(false);
          loadInitialData();
      } catch (e: any) {
          alert("Erro no reajuste: " + e.message);
      } finally {
          setSaving(false);
      }
  };

  const handleRollback = async (batchId: string) => {
      if (!confirm("Tem certeza que deseja desfazer este reajuste?")) return;
      setSaving(true);
      try {
          const result = await reverterLote(batchId);
          alert(`Sucesso! ${result.restored} produtos foram revertidos.`);
          setShowBulkModal(false);
          loadInitialData();
      } catch (e: any) {
          alert("Erro ao reverter: " + e.message);
      } finally {
          setSaving(false);
      }
  };

  const getMargin = (price: number, cost: number) => {
      if (!price || !cost || cost <= 0) return null;
      const val = price - cost;
      const perc = (val / price) * 100;
      return { val, perc };
  };

  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const marginData = selectedProduct ? getMargin(selectedProduct.precos.venda, selectedProduct.precos.custo) : null;
  const isHealthyMargin = marginData ? marginData.perc > 25 : false;
  const isCriticalMargin = marginData ? marginData.perc < 10 : false;

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 md:px-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
           <button onClick={onBack} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
           </button>
           <div>
              <div className="flex items-center gap-3 mb-1">
                 <h2 className="text-2xl md:text-3xl font-orbitron font-bold text-white">Catálogo de Produtos</h2>
              </div>
              <p className="text-slate-400 text-sm flex items-center gap-2">
                 Gestão de Itens e Inteligência de Preços (EIP)
              </p>
           </div>
        </div>

        <div className="flex gap-2">
            <button 
                onClick={() => setShowAgent(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
            >
                <MessageSquare className="w-4 h-4" /> 🤖 Analisar
            </button>
            
            <button 
                onClick={() => setShowABCModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold shadow-lg transition-all"
            >
                <BarChart className="w-4 h-4" /> Curva ABC
            </button>

            {isOperador && (
                <>
                    {onImport && (
                        <button 
                            onClick={onImport}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg font-bold transition-all"
                        >
                            <UploadCloud className="w-4 h-4" /> Importar XML
                        </button>
                    )}
                    <button 
                        onClick={handleOpenBulk}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-900/20 transition-all"
                    >
                        <Percent className="w-4 h-4" /> Gestão de Preços
                    </button>
                    <button 
                        onClick={handleCreateClick}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold shadow-lg shadow-cyan-900/20 transition-all"
                    >
                        <PlusCircle className="w-5 h-5" /> Novo Produto
                    </button>
                </>
            )}
        </div>
      </div>

      {/* TABS FOR LIST TYPE */}
      <div className="flex gap-4 mb-4 border-b border-slate-700">
          <button 
              onClick={() => { setListType('ALL'); setSearchTerm(''); }}
              className={`pb-3 px-2 flex items-center gap-2 font-bold text-sm transition-colors ${listType === 'ALL' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
              <Box className="w-4 h-4" /> Todos os Produtos
          </button>
          <button 
              onClick={() => { setListType('FAVORITES'); setSearchTerm(''); }}
              className={`pb-3 px-2 flex items-center gap-2 font-bold text-sm transition-colors ${listType === 'FAVORITES' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
              <Star className="w-4 h-4" /> Mais Usados
          </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
          <Search className="h-5 w-5 text-slate-500 absolute top-3.5 left-3" />
          <input 
             type="text" 
             className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-lg bg-slate-800/50 text-slate-200 focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-500 uppercase font-medium" 
             placeholder="BUSCAR POR CÓDIGO OU DESCRIÇÃO..." 
             value={searchTerm} 
             onChange={(e) => setSearchTerm(e.target.value)} 
          />
          {searching && (
              <div className="absolute top-3.5 right-3">
                  <RefreshCw className="w-5 h-5 text-cyan-500 animate-spin" />
              </div>
          )}
      </div>

      {/* Results Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden shadow-xl min-h-[300px]">
         {loading && products.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20">
                 <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                 <p className="text-slate-400">Carregando catálogo...</p>
             </div>
         ) : products.length === 0 ? (
             <div className="text-center py-20">
                 <Box className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                 <h3 className="text-xl text-slate-300 font-bold">Nenhum produto encontrado</h3>
                 <p className="text-slate-500">Verifique a busca ou crie um novo.</p>
             </div>
         ) : (
             <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm whitespace-nowrap">
                     <thead className="bg-slate-900 text-slate-400 uppercase text-xs font-orbitron tracking-wider">
                         <tr>
                             <th className="px-6 py-4">Código</th>
                             <th className="px-6 py-4">Descrição</th>
                             <th className="px-6 py-4 text-center">Origem</th>
                             <th className="px-6 py-4">Unidade</th>
                             <th className="px-6 py-4">Grupo</th>
                             <th className="px-6 py-4 text-right">Estoque</th>
                             <th className="px-6 py-4 text-right">Preço Venda</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-700">
                         {products.map((p) => (
                             <tr 
                                key={p.id} 
                                onClick={() => handleRowClick(p)}
                                className={`hover:bg-slate-700/50 transition-colors cursor-pointer group ${!p.ativo ? 'opacity-50 grayscale' : ''}`}
                             >
                                 <td className="px-6 py-4 font-mono text-cyan-400 font-bold">
                                     {p.id}
                                     {(p.usageCount || 0) > 5 && (
                                         <span className="ml-2 text-yellow-500 text-[10px]" title="Item popular">★</span>
                                     )}
                                 </td>
                                 <td className="px-6 py-4 text-white font-medium">{p.descricao}</td>
                                 <td className="px-6 py-4 text-center">
                                     {p.controle.origem === 'EIP' ? (
                                         <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-900/30 text-purple-300 rounded text-[10px] font-bold border border-purple-800">
                                             <Database className="w-3 h-3" /> EIP
                                         </span>
                                     ) : (
                                         <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded text-[10px] font-bold border border-blue-800">
                                             <Database className="w-3 h-3" /> ERP
                                         </span>
                                     )}
                                 </td>
                                 <td className="px-6 py-4 text-slate-400">{p.unidade.codigo}</td>
                                 <td className="px-6 py-4 text-slate-400">{p.grupo.descricao}</td>
                                 <td className="px-6 py-4 text-right text-slate-300 font-bold">{p.estoqueAtual}</td>
                                 <td className="px-6 py-4 text-right text-emerald-400 font-bold">{fmtCurrency(p.precos.venda)}</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
                 
                 {/* Infinite Scroll / Load More (Only for ALL list) */}
                 {hasMore && !searchTerm && listType === 'ALL' && (
                     <div className="p-4 flex justify-center bg-slate-900/50 border-t border-slate-700">
                         <button 
                            onClick={loadMoreData}
                            disabled={loading}
                            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                         >
                             {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                             Carregar Mais Produtos
                         </button>
                     </div>
                 )}
             </div>
         )}
         <div className="bg-slate-900 px-6 py-3 border-t border-slate-700 text-xs text-slate-500 flex justify-between">
             <span>Exibindo {products.length} produtos {hasMore && listType === 'ALL' ? '(Carregue mais para ver todos)' : '(Fim da lista)'}</span>
             <span>Clique para detalhes</span>
         </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl relative flex flex-col max-h-[90vh]">
                  
                  {/* Modal Header */}
                  <div className="p-6 border-b border-slate-700 flex justify-between items-start rounded-t-2xl bg-slate-800/50">
                      <div className="flex gap-4 w-full">
                          <div className="p-3 bg-cyan-900/20 rounded-xl border border-cyan-700">
                             <Box className="w-8 h-8 text-cyan-400" />
                          </div>
                          <div className="flex-1">
                              {isEditing ? (
                                  <input 
                                    value={selectedProduct.descricao}
                                    onChange={(e) => handleInputChange('descricao', e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white font-bold text-xl mb-1 focus:border-cyan-500 outline-none uppercase"
                                    placeholder="Descrição do Produto"
                                  />
                              ) : (
                                  <div className="flex items-start justify-between w-full">
                                      <div>
                                          <h3 className="text-xl md:text-2xl font-bold text-white mb-1">{selectedProduct.descricao}</h3>
                                          <div className="flex items-center gap-2">
                                              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-600 text-xs text-slate-300 font-mono">
                                                  COD: {selectedProduct.id}
                                              </span>
                                              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-600 text-xs text-slate-300 font-mono">
                                                  EAN: {selectedProduct.ean || 'SEM GTIN'}
                                              </span>
                                              {selectedProduct.controle.origem === 'EIP' && (
                                                  <span className="text-[10px] bg-purple-900 text-purple-200 px-2 py-0.5 rounded border border-purple-700 font-bold">
                                                      PREÇO GERENCIADO PELO EIP
                                                  </span>
                                              )}
                                          </div>
                                      </div>
                                      <button 
                                        onClick={() => setShowAgent(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shadow-lg transform transition-all hover:scale-105"
                                      >
                                          <MessageSquare className="w-4 h-4" /> Análise do Produto (Agent)
                                      </button>
                                  </div>
                              )}
                          </div>
                      </div>
                      <button 
                        onClick={() => { setSelectedProduct(null); setIsEditing(false); setIsCreating(false); }}
                        className="text-slate-500 hover:text-white transition-colors ml-4"
                      >
                          <X className="w-6 h-6" />
                      </button>
                  </div>

                  {/* TABS Navigation */}
                  <div className="flex border-b border-slate-700 bg-slate-900">
                      <button 
                          onClick={() => setViewMode('DETAILS')}
                          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${viewMode === 'DETAILS' ? 'border-cyan-500 text-cyan-400 bg-slate-800/50' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'}`}
                      >
                          <Info className="w-4 h-4" /> Ficha Técnica
                      </button>
                      <button 
                          onClick={() => setViewMode('CUSTOMERS')}
                          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${viewMode === 'CUSTOMERS' ? 'border-purple-500 text-purple-400 bg-slate-800/50' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'}`}
                      >
                          <Users className="w-4 h-4" /> Quem Compra?
                      </button>
                  </div>

                  <div className="p-6 overflow-y-auto bg-slate-900 h-[500px]">
                      {/* VIEW 1: DETAILS */}
                      {viewMode === 'DETAILS' && (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              <div className="lg:col-span-2 space-y-6">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                          <p className="text-xs text-slate-500 uppercase font-bold mb-1">Preço Venda (Unit)</p>
                                          {isEditing ? (
                                              <input 
                                                  type="number" 
                                                  value={selectedProduct.precos.venda} 
                                                  onChange={(e) => handleInputChange('precos.venda', parseFloat(e.target.value))}
                                                  className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-emerald-400 font-bold text-xl"
                                              />
                                          ) : (
                                              <p className="text-2xl font-black text-emerald-400">{fmtCurrency(selectedProduct.precos.venda)}</p>
                                          )}
                                          <p className="text-[10px] text-slate-500 mt-1">Preço Mín: {fmtCurrency(selectedProduct.precos.vendaMinima)}</p>
                                      </div>
                                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                          <p className="text-xs text-slate-500 uppercase font-bold mb-1">Custo Médio</p>
                                          <p className="text-xl font-bold text-white">{selectedProduct.precos.custo > 0 ? fmtCurrency(selectedProduct.precos.custo) : "---"}</p>
                                          <p className="text-[10px] text-slate-500 mt-1">Origem: Nota Entrada (ERP)</p>
                                      </div>
                                      <div className={`p-4 rounded-xl border flex flex-col justify-center ${
                                          marginData 
                                            ? (isCriticalMargin ? 'bg-red-900/10 border-red-800' : isHealthyMargin ? 'bg-emerald-900/10 border-emerald-800' : 'bg-slate-800/50 border-slate-700')
                                            : 'bg-slate-800/50 border-slate-700'
                                      }`}>
                                          {marginData ? (
                                              <>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className={`text-xs uppercase font-bold mb-1 ${isCriticalMargin ? 'text-red-400' : 'text-slate-400'}`}>Margem</p>
                                                        <p className={`text-2xl font-black ${isCriticalMargin ? 'text-red-400' : isHealthyMargin ? 'text-emerald-400' : 'text-white'}`}>
                                                            {marginData.perc.toFixed(1)}%
                                                        </p>
                                                    </div>
                                                    {isCriticalMargin && <AlertTriangle className="w-5 h-5 text-red-500" />}
                                                    {isHealthyMargin && <TrendingUp className="w-5 h-5 text-emerald-500" />}
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-1">R$ {fmtCurrency(marginData.val)} por unidade</p>
                                              </>
                                          ) : (
                                              <div className="flex flex-col items-center justify-center text-slate-500">
                                                  <AlertTriangle className="w-6 h-6 mb-1 opacity-50" />
                                                  <p className="text-xs font-bold text-center">Custo Não Informado</p>
                                                  <p className="text-[10px] text-center">Margem indisponível</p>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                                  <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
                                      <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                                          <Info className="w-4 h-4 text-cyan-500" /> Detalhes Logísticos e Fiscais
                                      </h4>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                          <div>
                                              <p className="text-xs text-slate-500 uppercase font-bold mb-1">Estoque</p>
                                              <p className="text-lg font-bold text-white">{selectedProduct.estoqueAtual} <span className="text-xs text-slate-400 font-normal">{selectedProduct.unidade.codigo}</span></p>
                                          </div>
                                          <div>
                                              <p className="text-xs text-slate-500 uppercase font-bold mb-1">NCM</p>
                                              <p className="text-slate-300">{selectedProduct.fiscal.ncm || '---'}</p>
                                          </div>
                                          <div>
                                              <p className="text-xs text-slate-500 uppercase font-bold mb-1">Grupo</p>
                                              <p className="text-slate-300 truncate" title={selectedProduct.grupo.descricao}>{selectedProduct.grupo.descricao}</p>
                                          </div>
                                          <div>
                                              <p className="text-xs text-slate-500 uppercase font-bold mb-1">Status</p>
                                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${selectedProduct.ativo ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                                                  {selectedProduct.ativo ? 'ATIVO' : 'INATIVO'}
                                              </span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                              <div className="space-y-6">
                                  <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 max-h-[400px] overflow-y-auto custom-scrollbar flex flex-col">
                                     <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 sticky top-0 bg-slate-900/90 py-2 backdrop-blur-sm z-10">
                                        <History className="w-4 h-4" /> Histórico de Preços
                                     </h4>
                                     <div className="space-y-0 relative flex-1">
                                        {selectedProduct.historicoPrecos?.length === 0 && (
                                            <div className="text-center py-8 text-slate-500 text-xs">
                                                Nenhuma alteração registrada.
                                            </div>
                                        )}
                                        {selectedProduct.historicoPrecos?.slice().reverse().map((h, idx) => (
                                            <div key={idx} className="flex gap-3 pb-6 relative">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-600 shrink-0 mt-1.5 ring-4 ring-slate-900"></div>
                                                    {idx !== (selectedProduct.historicoPrecos?.length || 0) - 1 && (
                                                        <div className="w-0.5 bg-slate-700 h-full absolute top-3 left-[4px] -z-10"></div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-baseline">
                                                        <p className="text-sm font-bold text-white">{fmtCurrency(h.price)}</p>
                                                        <span className="text-[10px] text-slate-500 font-mono">
                                                            {new Date(h.date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-0.5 flex justify-between">
                                                        <span>{h.source === 'XML_IMPORT' ? 'Importação NFe' : h.source === 'BATCH_PERCENTAGE' ? 'Reajuste Lote' : h.source === 'ROLLBACK' ? 'Desfeito' : 'Manual'}</span>
                                                        {h.oldPrice && (
                                                            <span className="text-slate-600 line-through">{fmtCurrency(h.oldPrice)}</span>
                                                        )}
                                                    </div>
                                                    {h.reason && <p className="text-[10px] text-cyan-500/80 italic mt-1">"{h.reason}"</p>}
                                                </div>
                                            </div>
                                        ))}
                                     </div>
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* VIEW 2: CUSTOMERS */}
                      {viewMode === 'CUSTOMERS' && (
                          <div className="space-y-4">
                              <div className="bg-purple-900/10 border border-purple-800/30 p-4 rounded-xl flex items-center gap-3">
                                  <Users className="w-5 h-5 text-purple-400" />
                                  <p className="text-sm text-purple-200">
                                      Análise baseada em <strong>Pedidos Internos</strong> e <strong>Histórico de Vendas</strong>. 
                                      Use esta lista para identificar oportunidades de recompra ou reativação de clientes.
                                  </p>
                              </div>

                              {loadingStats ? (
                                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                      <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mb-4"></div>
                                      <p>Analisando comportamento de compra...</p>
                                  </div>
                              ) : customerStats.length === 0 ? (
                                  <div className="text-center py-20 text-slate-500 bg-slate-800/30 rounded-xl border border-slate-700 border-dashed">
                                      <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                      <p>Nenhuma venda registrada para este produto ainda.</p>
                                  </div>
                              ) : (
                                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                                      <table className="w-full text-left text-sm">
                                          <thead className="bg-slate-900 text-slate-400 uppercase text-xs sticky top-0">
                                              <tr>
                                                  <th className="px-6 py-3">Cliente</th>
                                                  <th className="px-6 py-3 text-right">Qtd Total</th>
                                                  <th className="px-6 py-3 text-right">Valor Total</th>
                                                  <th className="px-6 py-3 text-right">Frequência</th>
                                                  <th className="px-6 py-3 text-center">Última Compra</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-700">
                                              {customerStats.map((stat) => {
                                                  const daysSince = stat.ultimaCompra 
                                                      ? Math.floor((new Date().getTime() - new Date(stat.ultimaCompra).getTime()) / (1000 * 3600 * 24)) 
                                                      : 0;
                                                  const isInactive = daysSince > 90;

                                                  return (
                                                      <tr key={stat.clienteId} className="hover:bg-slate-700/30 transition-colors">
                                                          <td className="px-6 py-3">
                                                              <div className="flex flex-col">
                                                                  <span className="text-white font-bold">{stat.clienteNome}</span>
                                                                  <span className="text-[10px] text-slate-500 font-mono">ID: {stat.clienteId.slice(0,8)}</span>
                                                              </div>
                                                          </td>
                                                          <td className="px-6 py-3 text-right text-slate-300 font-medium">
                                                              {stat.quantidadeComprada} <span className="text-xs text-slate-500">{selectedProduct.unidade.codigo}</span>
                                                          </td>
                                                          <td className="px-6 py-3 text-right text-emerald-400 font-bold">
                                                              {fmtCurrency(stat.totalGasto)}
                                                          </td>
                                                          <td className="px-6 py-3 text-right text-slate-400">
                                                              {stat.frequencia}x
                                                          </td>
                                                          <td className="px-6 py-3 text-center">
                                                              <div className="flex flex-col items-center">
                                                                  <span className="text-slate-200 flex items-center gap-1">
                                                                      <Calendar className="w-3 h-3 text-slate-500" />
                                                                      {new Date(stat.ultimaCompra).toLocaleDateString()}
                                                                  </span>
                                                                  {isInactive && (
                                                                      <span className="text-[10px] text-red-400 font-bold bg-red-900/20 px-2 rounded mt-0.5">
                                                                          {daysSince} dias sem comprar
                                                                      </span>
                                                                  )}
                                                              </div>
                                                          </td>
                                                      </tr>
                                                  );
                                              })}
                                          </tbody>
                                      </table>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>

                  <div className="p-6 border-t border-slate-700 flex justify-between items-center bg-slate-800/50 rounded-b-2xl">
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                          <Database className="w-3 h-3" />
                          Última atualização: {new Date(selectedProduct.controle.ultimaAlteracao).toLocaleString()}
                      </div>
                      <div className="flex gap-3">
                          {isEditing ? (
                              <>
                                <button 
                                    onClick={() => { setIsEditing(false); setIsCreating(false); setViewMode('DETAILS'); }}
                                    className="px-6 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
                                >
                                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Salvar Alterações
                                </button>
                              </>
                          ) : (
                              <>
                                <button 
                                    onClick={() => setSelectedProduct(null)}
                                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    Fechar
                                </button>
                                {isOperador && (
                                    <button 
                                        onClick={handleEditClick}
                                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
                                    >
                                        <Edit className="w-4 h-4" /> Editar Preço
                                    </button>
                                )}
                              </>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* BULK UPDATE MODAL */}
      {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[85vh]">
                  {/* Header */}
                  <div className="p-6 border-b border-slate-800">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xl font-bold text-white flex items-center gap-2">
                              <TrendingUp className="w-5 h-5 text-indigo-400" />
                              Gestão de Preços em Lote
                          </h3>
                          <button onClick={() => setShowBulkModal(false)}><X className="text-slate-500 hover:text-white" /></button>
                      </div>
                      <div className="flex bg-slate-800 rounded-lg p-1">
                          <button 
                              onClick={() => setBulkTab('NEW')}
                              className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-colors ${bulkTab === 'NEW' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                          >
                              Novo Reajuste
                          </button>
                          <button 
                              onClick={() => setBulkTab('HISTORY')}
                              className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-colors ${bulkTab === 'HISTORY' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                          >
                              Histórico / Desfazer
                          </button>
                      </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6 overflow-y-auto flex-1">
                      {bulkTab === 'NEW' ? (
                          <div className="space-y-6">
                              <div>
                                  <label className="block text-sm font-bold text-slate-400 uppercase mb-2">Percentual de Ajuste (%)</label>
                                  <div className="flex gap-4 items-center">
                                      <input 
                                        type="number" 
                                        value={bulkPercent}
                                        onChange={(e) => setBulkPercent(parseFloat(e.target.value))}
                                        className="flex-1 bg-slate-800 border border-slate-600 rounded-lg p-3 text-white text-lg font-bold focus:border-indigo-500 outline-none"
                                        placeholder="0.0"
                                      />
                                      <button 
                                        onClick={handlePreviewBulk}
                                        className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold"
                                      >
                                          Simular
                                      </button>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-2">
                                      Use valores positivos para aumento (ex: 10) e negativos para desconto (ex: -5).
                                      <br/>Aplicável sobre os <strong>{products.length}</strong> produtos visíveis.
                                  </p>
                              </div>

                              {bulkPreview.length > 0 && (
                                  <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Pré-visualização (Amostra)</h4>
                                      <table className="w-full text-xs text-left">
                                          <thead>
                                              <tr className="text-slate-500">
                                                  <th className="pb-2">Produto</th>
                                                  <th className="pb-2 text-right">Atual</th>
                                                  <th className="pb-2 text-right">Novo</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-700/50">
                                              {bulkPreview.map(p => (
                                                  <tr key={p.id}>
                                                      <td className="py-2 text-slate-300 truncate max-w-[150px]">{p.name}</td>
                                                      <td className="py-2 text-right text-slate-400">{p.old}</td>
                                                      <td className={`py-2 text-right font-bold ${p.new > p.old ? 'text-green-400' : 'text-red-400'}`}>
                                                          {p.new}
                                                      </td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  </div>
                              )}
                          </div>
                      ) : (
                          // HISTORY TAB
                          <div className="space-y-4">
                              {batchHistory.length === 0 ? (
                                  <p className="text-center text-slate-500 py-8">Nenhum histórico de lote encontrado.</p>
                              ) : (
                                  batchHistory.map(batch => (
                                      <div key={batch.id} className={`p-4 rounded-xl border flex flex-col gap-3 ${batch.reverted ? 'bg-slate-800/30 border-slate-700 opacity-60' : 'bg-slate-800 border-slate-600'}`}>
                                          <div className="flex justify-between items-start">
                                              <div>
                                                  <p className="text-sm font-bold text-white">
                                                      Reajuste de {batch.percentage > 0 ? '+' : ''}{batch.percentage}%
                                                  </p>
                                                  <p className="text-xs text-slate-400 mt-1">
                                                      {new Date(batch.date).toLocaleString()} • {batch.affectedCount} produtos
                                                  </p>
                                              </div>
                                              {batch.reverted ? (
                                                  <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-1 rounded font-bold uppercase">Revertido</span>
                                              ) : (
                                                  <button 
                                                      onClick={() => handleRollback(batch.id)}
                                                      disabled={saving}
                                                      className="text-xs bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40 px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                                                  >
                                                      <RotateCcw className="w-3 h-3" /> Desfazer
                                                  </button>
                                              )}
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      )}
                  </div>

                  {/* Footer (Only for New) */}
                  {bulkTab === 'NEW' && (
                      <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                          <button 
                              onClick={() => { setShowBulkModal(false); setBulkPreview([]); setBulkPercent(0); }}
                              className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 font-bold"
                          >
                              Cancelar
                          </button>
                          <button 
                              onClick={handleApplyBulk}
                              disabled={saving || bulkPercent === 0}
                              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg flex items-center gap-2"
                          >
                              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              Confirmar Reajuste
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Agent Chat */}
      <ChatWidget 
          data={{ product: selectedProduct, products: products }}
          mode="PRODUCT_CATALOG"
          defaultOpen={showAgent}
          onClose={() => setShowAgent(false)}
      />
    </div>
  );
};

export default ProductQueryStep;
