
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Download, RefreshCw, AlertTriangle, FileSpreadsheet, X, DollarSign, 
  TrendingDown, User as UserIcon, Search, Save, ArrowLeft, Briefcase, 
  FileText, CheckCircle, Clock, PieChart as PieChartIcon, Filter, Calendar,
  ListFilter, CreditCard, Receipt, FileDown, ExternalLink, ChevronDown, ChevronRight, RotateCcw,
  Sparkles, Wallet, Percent, LayoutDashboard, List, MinusCircle, Eye, Info, Tag
} from 'lucide-react';
import { RelatorioFinal, NFData, SaidaData, VendaSemNF, User, UserRole } from '../types';
import { getVendedorLabel, generateMonthlyExcel, calcularResumoFechamento, calcularComissoesDoDia } from '../services/logic';
import { saveReportToStorage } from '../services/storage';
import ChatWidget from './ChatWidget';
import ExecutiveDashboard from './ExecutiveDashboard';

interface ReportStepProps {
  data: RelatorioFinal;
  currentUser: User;
  onRestart: () => void;
  onBackToList?: () => void;
}

const VENDORS = ['E', 'C', 'T', 'B'];

const DEFAULT_VENDOR_CONFIG = { color: "text-slate-400", bg: "bg-slate-800", border: "border-slate-600", iconColor: "text-slate-500" };
const VENDOR_CONFIG: Record<string, typeof DEFAULT_VENDOR_CONFIG> = {
  "E": { color: "text-blue-400", bg: "bg-blue-900/20", border: "border-blue-500/50", iconColor: "text-blue-500" },
  "C": { color: "text-pink-400", bg: "bg-pink-900/20", border: "border-pink-500/50", iconColor: "text-pink-500" },
  "T": { color: "text-orange-400", bg: "bg-orange-900/20", border: "border-orange-500/50", iconColor: "text-orange-500" },
  "B": { color: "text-indigo-400", bg: "bg-indigo-900/20", border: "border-indigo-500/50", iconColor: "text-indigo-500" }
};

const getVendorStyle = (code: string | null | undefined) => {
    if (!code) return DEFAULT_VENDOR_CONFIG;
    return VENDOR_CONFIG[code] || DEFAULT_VENDOR_CONFIG;
};

const PAYMENT_FILTER_OPTIONS = ["DINHEIRO", "CARTAO", "PIX CIELO", "PIX ITAU", "SISPAG ITAU", "FATURADA"];

interface UnifiedSaleItem {
  id: string;
  data: string;
  nf: string;
  cliente: string;
  vendedorCode: string;
  vendedorLabel: string;
  situacao: 'AVISTA' | 'FATURADA' | 'SEMNF' | 'DEVOLUCAO' | 'SAIDA';
  pagamento: string;
  valor: number;
  originalRef: NFData | VendaSemNF | SaidaData;
}

const ReportStep: React.FC<ReportStepProps> = ({ data, currentUser, onRestart, onBackToList }) => {
  const { registros, vendas_sem_nf_lista, saidas_lista } = data;
  const [viewMode, setViewMode] = useState<'EXECUTIVE' | 'OPERATIONAL'>('EXECUTIVE');
  const [activeTab, setActiveTab] = useState<string>('TODAS'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [dateStart, setDateStart] = useState(''); 
  const [dateEnd, setDateEnd] = useState(''); 
  const [situacaoFilter, setSituacaoFilter] = useState('');
  const [vendedorFilter, setVendedorFilter] = useState('');
  const [formaPagamentoFilter, setFormaPagamentoFilter] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  
  // Estado para o item selecionado para detalhamento
  const [selectedItem, setSelectedItem] = useState<UnifiedSaleItem | null>(null);

  const isOperador = currentUser.role === UserRole.OPERADOR;
  const resumoSmart = useMemo(() => calcularResumoFechamento(data), [data]);
  const resumoComissao = useMemo(() => calcularComissoesDoDia(data), [data]);

  const allSales = useMemo(() => {
    const list: UnifiedSaleItem[] = [];
    registros.forEach(r => {
      const effectiveDate = r.tipo === 'PAGA_NO_DIA' ? (r.data_pagamento_calculada || r.data_emissao || "") : (r.data_emissao || "");
      let situacao: 'AVISTA' | 'FATURADA' | 'DEVOLUCAO' = 'FATURADA';
      if (r.tipo === 'DEVOLUCAO') situacao = 'DEVOLUCAO';
      else if (r.tipo === 'PAGA_NO_DIA') situacao = 'AVISTA';

      list.push({
        id: `NF-${r.numero}`,
        data: effectiveDate,
        nf: r.numero,
        cliente: r.cliente,
        vendedorCode: r.vendedor_final || 'E',
        vendedorLabel: getVendedorLabel(r.vendedor_final),
        situacao: situacao,
        pagamento: r.tipo === 'FATURADA' 
           ? (r.inf_cpl_xml?.match(/(\d+\s*DDL)/i)?.[0]?.toUpperCase() || "PRAZO")
           : (r.detalhe_pagamento_original || r.forma_pagamento_movimento || (r.tipo === 'DEVOLUCAO' ? "ESTORNO" : "DINHEIRO")),
        valor: r.valor,
        originalRef: r
      });
    });

    vendas_sem_nf_lista.forEach((v, idx) => {
      list.push({
        id: `SNF-${idx}`,
        data: v.data || "",
        nf: "—",
        cliente: "NFC-e - Consumidor final",
        vendedorCode: v.vendedor || 'E',
        vendedorLabel: getVendedorLabel(v.vendedor),
        situacao: 'SEMNF',
        pagamento: v.detalhe_pagamento || v.forma_pagamento || "OUTROS",
        valor: v.valor,
        originalRef: v
      });
    });
    return list;
  }, [registros, vendas_sem_nf_lista]);

  const kpis = useMemo(() => {
    return {
      totalGeral: allSales.reduce((acc, i) => acc + i.valor, 0),
      totalAvista: allSales.filter(i => i.situacao === 'AVISTA').reduce((acc, i) => acc + i.valor, 0),
      totalFaturado: allSales.filter(i => i.situacao === 'FATURADA').reduce((acc, i) => acc + i.valor, 0),
      totalSemNF: allSales.filter(i => i.situacao === 'SEMNF').reduce((acc, i) => acc + i.valor, 0),
      countNFs: registros.length,
      totalSaidas: (saidas_lista || []).reduce((acc, s) => acc + Math.abs(s.valor), 0)
    };
  }, [allSales, registros, saidas_lista]);

  const filteredList = useMemo(() => {
    if (activeTab === 'SAIDAS') {
        const list = (saidas_lista || []).map((s, idx) => ({
            id: `OUT-${idx}`,
            data: s.data,
            nf: 'SAÍDA',
            cliente: s.descricao,
            vendedorCode: 'LOJA',
            vendedorLabel: 'CAIXA',
            situacao: 'SAIDA' as const,
            pagamento: 'DÉBITO CAIXA',
            valor: -Math.abs(s.valor),
            originalRef: s
        }));
        if (searchTerm) {
            const low = searchTerm.toLowerCase();
            return list.filter(l => l.cliente.toLowerCase().includes(low));
        }
        return list;
    }

    let items = allSales;
    if (activeTab === 'AVISTA') items = items.filter(i => i.situacao === 'AVISTA');
    else if (activeTab === 'FATURADO') items = items.filter(i => i.situacao === 'FATURADA');
    else if (activeTab === 'SEMNF') items = items.filter(i => i.situacao === 'SEMNF');
    else if (activeTab.startsWith('VEND_')) {
       const vCode = activeTab.split('_')[1];
       items = items.filter(i => i.vendedorCode === vCode);
    }

    if (activeTab === 'TODAS') {
        if (dateStart || dateEnd) {
          items = items.filter(i => {
              if (!i.data) return false;
              const [d, m, y] = i.data.split('/').map(Number);
              const itemDate = new Date(y, m - 1, d);
              let matchesStart = true; let matchesEnd = true;
              if (dateStart) { const [yS, mS, dS] = dateStart.split('-').map(Number); const startDate = new Date(yS, mS - 1, dS); matchesStart = itemDate >= startDate; }
              if (dateEnd) { const [yE, mE, dE] = dateEnd.split('-').map(Number); const endDate = new Date(yE, mE - 1, dE); matchesEnd = itemDate <= endDate; }
              return matchesStart && matchesEnd;
          });
        }
        if (situacaoFilter) {
            if (situacaoFilter === 'COMNF') items = items.filter(i => i.situacao !== 'SEMNF');
            else items = items.filter(i => i.situacao === situacaoFilter);
        }
        if (vendedorFilter) items = items.filter(i => i.vendedorCode === vendedorFilter);
        if (formaPagamentoFilter) {
            if (formaPagamentoFilter === 'CARTAO') items = items.filter(i => i.pagamento && i.pagamento.includes('CARTAO'));
            else if (formaPagamentoFilter === 'FATURADA') items = items.filter(i => i.situacao === 'FATURADA');
            else items = items.filter(i => i.pagamento === formaPagamentoFilter);
        }
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      items = items.filter(i => 
        i.nf.toLowerCase().includes(lower) || i.cliente.toLowerCase().includes(lower) ||
        i.vendedorLabel.toLowerCase().includes(lower) || i.valor.toFixed(2).includes(lower) ||
        i.pagamento.toLowerCase().includes(lower)
      );
    }
    return items;
  }, [allSales, saidas_lista, activeTab, searchTerm, dateStart, dateEnd, situacaoFilter, vendedorFilter, formaPagamentoFilter]);

  const groupedData = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredList.forEach(item => {
        const dateKey = item.data || 'Sem Data Definida';
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(item);
    });
    return groups;
  }, [filteredList]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedData).sort((a, b) => {
        if (a === 'Sem Data Definida') return 1; if (b === 'Sem Data Definida') return -1;
        const aa = a.split('/').reverse().join(''); const bb = b.split('/').reverse().join('');
        return bb.localeCompare(aa); 
    });
  }, [groupedData]);

  useEffect(() => {
      if (searchTerm) setExpandedDates(sortedDates);
      else setExpandedDates([]);
  }, [sortedDates, searchTerm]);

  const toggleDate = (date: string) => setExpandedDates(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);

  const handleSave = async () => {
      setSaveStatus('saving');
      try { const success = await saveReportToStorage(data); setSaveStatus(success ? 'saved' : 'error'); } 
      catch (e) { setSaveStatus('error'); } 
      finally { setTimeout(() => setSaveStatus('idle'), 3000); }
  };

  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const SituationBadge = ({ type }: { type: string }) => {
     if (type === 'AVISTA') return <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-900/30 text-emerald-400 border-emerald-800/50">À VISTA</span>;
     if (type === 'FATURADA') return <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-purple-900/30 text-purple-400 border-purple-800/50">FATURADA</span>;
     if (type === 'DEVOLUCAO') return <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-red-900/30 text-red-400 border-red-800/50">DEVOLUÇÃO</span>;
     if (type === 'SAIDA') return <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-red-900/30 text-red-400 border-red-800/50">SAÍDA</span>;
     return <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-orange-900/30 text-orange-400 border-orange-800/50">NFC-e / CUPOM</span>;
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 pb-20 font-sans">
      {/* Detalhes Modal Overlay */}
      {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-[slideUp_0.3s_ease-out]">
                  <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900/80">
                      <div className="flex gap-4">
                          <div className={`p-3 rounded-2xl border ${selectedItem.situacao === 'SAIDA' ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-cyan-900/20 border-cyan-800 text-cyan-400'}`}>
                             {selectedItem.situacao === 'SAIDA' ? <TrendingDown className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                          </div>
                          <div>
                              <h3 className="text-2xl font-black text-white font-orbitron">
                                {selectedItem.nf !== '—' && selectedItem.nf !== 'SAÍDA' ? `NF ${selectedItem.nf}` : selectedItem.nf}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                  <SituationBadge type={selectedItem.situacao} />
                                  <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Período: {data.monthYear}</span>
                              </div>
                          </div>
                      </div>
                      <button onClick={() => setSelectedItem(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                          <X className="w-6 h-6" />
                      </button>
                  </div>

                  <div className="p-8 space-y-6 bg-slate-950/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="col-span-2 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Cliente / Descrição</label>
                             <p className="text-lg font-bold text-white leading-tight">{selectedItem.cliente}</p>
                          </div>

                          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Valor da Operação</label>
                             <p className={`text-2xl font-black ${selectedItem.valor < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmtCurrency(selectedItem.valor)}</p>
                          </div>

                          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Responsável Final</label>
                             <div className="flex items-center gap-2 text-white font-bold">
                                 <UserIcon className="w-4 h-4 text-cyan-500" />
                                 {selectedItem.vendedorLabel}
                             </div>
                          </div>

                          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Data de Referência</label>
                             <div className="flex items-center gap-2 text-slate-300 font-bold">
                                 <Calendar className="w-4 h-4 text-slate-500" />
                                 {selectedItem.data}
                             </div>
                          </div>

                          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Fluxo / Forma de Pgto</label>
                             <div className="flex items-center gap-2 text-slate-300 font-bold">
                                 <CreditCard className="w-4 h-4 text-slate-500" />
                                 {selectedItem.pagamento}
                             </div>
                          </div>
                      </div>

                      {/* Informações Técnicas (Somente para NFs) */}
                      {selectedItem.nf !== '—' && selectedItem.nf !== 'SAÍDA' && (selectedItem.originalRef as NFData).data_emissao && (
                          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-inner">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <Info className="w-4 h-4 text-cyan-600" /> Metadados do Processamento
                              </h4>
                              <div className="grid grid-cols-2 gap-4 text-[11px]">
                                  <div className="flex justify-between border-b border-slate-800 pb-1">
                                      <span className="text-slate-500">Emissão (XML):</span>
                                      <span className="text-slate-300 font-mono">{(selectedItem.originalRef as NFData).data_emissao}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-800 pb-1">
                                      <span className="text-slate-500">Pagamento (Caixa):</span>
                                      <span className="text-slate-300 font-mono">{(selectedItem.originalRef as NFData).data_pagamento_calculada || '-'}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-800 pb-1">
                                      <span className="text-slate-500">Vendedor (XML):</span>
                                      <span className="text-slate-300">{(selectedItem.originalRef as NFData).vendedor_xml ? getVendedorLabel((selectedItem.originalRef as NFData).vendedor_xml) : '-'}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-800 pb-1">
                                      <span className="text-slate-500">Vendedor (Caixa):</span>
                                      <span className="text-slate-300">{(selectedItem.originalRef as NFData).vendedor_movimento ? getVendedorLabel((selectedItem.originalRef as NFData).vendedor_movimento) : '-'}</span>
                                  </div>
                              </div>
                              { (selectedItem.originalRef as NFData).inf_cpl_xml && (
                                  <div className="mt-4 pt-3 border-t border-slate-800">
                                      <span className="text-slate-600 text-[10px] font-bold uppercase block mb-1">Informações Adicionais / DDL</span>
                                      <p className="text-slate-400 text-xs italic">{(selectedItem.originalRef as NFData).inf_cpl_xml}</p>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
                  <div className="p-6 bg-slate-900/80 border-t border-slate-800 flex justify-end">
                      <button 
                        onClick={() => setSelectedItem(null)} 
                        className="px-8 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700 uppercase text-xs tracking-widest"
                      >
                          Fechar Detalhes
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6 border-b border-slate-800 pb-6">
         <div className="flex items-center gap-4">
             {onBackToList && (
                 <button onClick={onBackToList} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
                     <ArrowLeft className="w-5 h-5 text-slate-400" />
                 </button>
             )}
             <div>
                 <h1 className="text-3xl font-orbitron font-bold text-white tracking-wide">{data.monthYear || 'Controle de Vendas'}</h1>
                 <p className="text-slate-400 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Dados Consolidados</p>
             </div>
         </div>

         <div className="flex flex-col sm:flex-row gap-4 items-center">
             <div className="bg-slate-900 p-1 rounded-lg border border-slate-700 flex">
                 <button onClick={() => setViewMode('EXECUTIVE')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'EXECUTIVE' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><LayoutDashboard className="w-4 h-4" /> Visão Executiva</button>
                 <button onClick={() => setViewMode('OPERATIONAL')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'OPERATIONAL' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><List className="w-4 h-4" /> Visão Detalhada</button>
             </div>
             <div className="flex flex-wrap gap-2">
                 {isOperador && (
                   <>
                     <button onClick={handleSave} disabled={saveStatus === 'saved'} className={`px-4 py-2 border rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${saveStatus === 'saved' ? 'bg-emerald-900/50 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-cyan-500'}`}><Save className="w-4 h-4" /> {saveStatus === 'saved' ? 'Salvo' : 'Salvar'}</button>
                     <button onClick={() => generateMonthlyExcel(data)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-colors"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
                   </>
                 )}
             </div>
         </div>
      </div>

      {viewMode === 'EXECUTIVE' ? (
          <ExecutiveDashboard resumo={resumoSmart} comissoes={resumoComissao} />
      ) : (
          <div className="animate-[fadeIn_0.5s_ease-out]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                 <KPICard label="Total Geral" value={kpis.totalGeral} icon={DollarSign} color="text-white" bg="bg-slate-800" border="border-slate-600" />
                 <KPICard label="Saídas Totais" value={kpis.totalSaidas} icon={TrendingDown} color="text-red-400" bg="bg-red-900/10" border="border-red-800/50" />
                 <KPICard label="Total Notas À Vista" value={kpis.totalAvista} icon={CheckCircle} color="text-emerald-400" bg="bg-emerald-900/10" border="border-emerald-800/50" />
                 <KPICard label="Total Notas Faturadas" value={kpis.totalFaturado} icon={Clock} color="text-purple-400" bg="bg-purple-900/10" border="border-purple-800/50" />
                 <KPICard label="Total NFC-e / Cupom" value={kpis.totalSemNF} icon={Receipt} color="text-orange-400" bg="bg-orange-900/10" border="border-orange-800/50" />
              </div>

              <div className="mb-6 flex flex-col gap-4">
                 <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-1">
                     <TabButton active={activeTab === 'TODAS'} onClick={() => setActiveTab('TODAS')} label="TODAS AS NOTAS" icon={FileText} color="cyan" />
                     <TabButton active={activeTab === 'SAIDAS'} onClick={() => setActiveTab('SAIDAS')} label="SAÍDAS (DESPESAS)" icon={TrendingDown} color="red" />
                     <TabButton active={activeTab === 'AVISTA'} onClick={() => setActiveTab('AVISTA')} label="À VISTA" icon={CheckCircle} color="emerald" />
                     <TabButton active={activeTab === 'FATURADO'} onClick={() => setActiveTab('FATURADO')} label="FATURADAS" icon={Clock} color="purple" />
                     <TabButton active={activeTab === 'SEMNF'} onClick={() => setActiveTab('SEMNF')} label="NFC-e / CUPOM" icon={Receipt} color="orange" />
                 </div>
              </div>

              <div className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden min-h-[500px] flex flex-col shadow-2xl">
                 <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex flex-col gap-4">
                     <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                         <div className="flex items-center gap-3">
                             <div>
                                <h2 className="text-xl font-bold text-white uppercase">
                                    {activeTab === 'TODAS' ? 'Visão Geral Completa' : 
                                     activeTab === 'SAIDAS' ? 'Listagem de Saídas / Despesas' : activeTab}
                                </h2>
                                <p className="text-slate-500 text-xs">{filteredList.length} registros encontrados. Clique em uma linha para detalhes.</p>
                             </div>
                         </div>
                         <div className="relative w-full xl:w-96 group">
                            <div className="absolute top-2.5 left-3 text-slate-500 pointer-events-none"><Search className="w-5 h-5" /></div>
                            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Pesquisar..." className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:border-cyan-500 outline-none transition-all" />
                         </div>
                     </div>

                     {activeTab === 'TODAS' && (
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                               <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none [color-scheme:dark]" />
                               <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none [color-scheme:dark]" />
                               <select value={situacaoFilter} onChange={(e) => setSituacaoFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
                                   <option value="">Todas Situações</option>
                                   <option value="COMNF">Com Nota</option>
                                   <option value="AVISTA">À Vista</option>
                                   <option value="FATURADA">Faturada</option>
                                   <option value="SEMNF">Sem Nota</option>
                                   <option value="DEVOLUCAO">Devolução</option>
                               </select>
                               <select value={vendedorFilter} onChange={(e) => setVendedorFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
                                   <option value="">Vendedores</option>
                                   {VENDORS.map(v => <option key={v} value={v}>{getVendedorLabel(v)}</option>)}
                               </select>
                               <select value={formaPagamentoFilter} onChange={(e) => setFormaPagamentoFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
                                   <option value="">Pagamentos</option>
                                   {PAYMENT_FILTER_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                               </select>
                           </div>
                        </div>
                     )}
                 </div>

                 <div className="flex-1 overflow-auto">
                     <table className="w-full text-left border-collapse">
                         <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase font-bold sticky top-0 z-10 shadow-sm tracking-widest">
                             <tr>
                                <th className="px-6 py-4 border-b border-slate-800">Referência</th>
                                <th className="px-6 py-4 border-b border-slate-800">NF / Ref</th>
                                <th className="px-6 py-4 border-b border-slate-800 w-1/3">Descrição / Cliente</th>
                                <th className="px-6 py-4 border-b border-slate-800 text-center">Resp.</th>
                                <th className="px-6 py-4 border-b border-slate-800 text-center">Situação</th>
                                <th className="px-6 py-4 border-b border-slate-800">Fluxo</th>
                                <th className="px-6 py-4 border-b border-slate-800 text-right">Valor</th>
                                <th className="px-4 py-4 border-b border-slate-800 w-10"></th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800/40 text-sm">
                             {sortedDates.map((date) => {
                                const dayTotal = groupedData[date].reduce((acc, i) => acc + i.valor, 0);
                                return (
                                <React.Fragment key={date}>
                                    <tr onClick={() => toggleDate(date)} className="bg-slate-900/50 hover:bg-slate-800/80 cursor-pointer transition-colors select-none">
                                       <td colSpan={8} className="px-6 py-3 border-b border-slate-800 font-bold text-white uppercase tracking-widest bg-slate-900/30">
                                          <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1 rounded bg-slate-800">
                                                    {expandedDates.includes(date) ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                                                </div>
                                                <span>{date} <span className="text-slate-500 font-normal text-xs ml-1">({groupedData[date].length} registros)</span></span>
                                            </div>
                                            <span className={`font-black ${dayTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtCurrency(dayTotal)}</span>
                                          </div>
                                       </td>
                                    </tr>
                                    {expandedDates.includes(date) && groupedData[date].map((item) => (
                                        <tr key={item.id} onClick={() => setSelectedItem(item)} className="hover:bg-cyan-500/[0.03] transition-all cursor-pointer group">
                                            <td className="px-6 py-2.5 text-slate-500 font-mono text-xs pl-12">{item.data}</td>
                                            <td className="px-6 py-2.5 font-black text-slate-200 tracking-tight group-hover:text-cyan-400 transition-colors">
                                                {item.nf}
                                            </td>
                                            <td className="px-6 py-2.5 text-slate-300 font-medium truncate max-w-[250px] group-hover:text-white transition-colors">{item.cliente}</td>
                                            <td className="px-6 py-2.5 text-center">
                                                <span className={`inline-block w-fit px-2 py-0.5 rounded-full text-center leading-5 text-[10px] font-bold border ${getVendorStyle(item.vendedorCode).bg} ${getVendorStyle(item.vendedorCode).color} ${getVendorStyle(item.vendedorCode).border}`}>
                                                    {item.vendedorLabel}
                                                </span>
                                            </td>
                                            <td className="px-6 py-2.5 text-center"><SituationBadge type={item.situacao} /></td>
                                            <td className="px-6 py-2.5 text-slate-400 text-[11px] font-bold uppercase italic">{item.pagamento}</td>
                                            <td className={`px-6 py-2.5 text-right font-black ${item.valor < 0 ? 'text-red-400' : 'text-slate-100'}`}>{fmtCurrency(item.valor)}</td>
                                            <td className="px-4 py-2.5 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Eye className="w-4 h-4 text-cyan-500" />
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                             )})}
                             {sortedDates.length === 0 && (
                                 <tr>
                                     <td colSpan={8} className="px-6 py-24 text-center text-slate-600 italic">
                                         <Search className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                         <p className="text-lg font-orbitron">Nenhum registro encontrado</p>
                                         <p className="text-xs mt-1">Tente ajustar os filtros ou pesquisar outro termo.</p>
                                     </td>
                                 </tr>
                             )}
                         </tbody>
                     </table>
                 </div>
              </div>
          </div>
      )}
      <ChatWidget data={data} mode="SALES" />
    </div>
  );
};

const KPICard = ({ label, value, icon: Icon, color, bg, border }: any) => (
    <div className={`p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${bg} ${border} backdrop-blur-sm relative overflow-hidden shadow-xl`}>
        <div className="flex justify-between items-start relative z-10">
            <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-orbitron">{label}</p>
                <p className={`text-2xl lg:text-3xl font-black tracking-tight ${color}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}</p>
            </div>
            <div className={`p-2 rounded-xl bg-black/20`}>
                <Icon className={`w-5 h-5 opacity-80 ${color}`} />
            </div>
        </div>
        <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-3xl opacity-10 pointer-events-none bg-white`}></div>
    </div>
);

const TabButton = ({ active, onClick, label, icon: Icon, color }: any) => {
    const activeStyles: Record<string, string> = {
        cyan: "bg-cyan-900/20 text-cyan-400 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.1)]",
        red: "bg-red-900/20 text-red-400 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]",
        emerald: "bg-emerald-900/20 text-emerald-400 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]",
        purple: "bg-purple-900/20 text-purple-400 border-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.1)]",
        orange: "bg-orange-900/20 text-orange-400 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]"
    };

    return (
        <button 
            onClick={onClick} 
            className={`flex items-center gap-2 px-6 py-4 border-b-2 text-xs font-black uppercase transition-all duration-300 tracking-widest ${active ? activeStyles[color] : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/20'}`}
        >
            <Icon className="w-4 h-4" /> {label}
        </button>
    );
};

export default ReportStep;
