
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Calendar, DollarSign, TrendingUp, TrendingDown, 
  Info, AlertTriangle, FileText, ShoppingBag, XCircle, Search, 
  RefreshCw, Filter, ChevronDown, ChevronRight, Receipt, 
  Download, Printer, User as UserIcon, CreditCard, Tag, Eye,
  Activity, CheckCircle, Clock, ShieldCheck, Wallet, Coins, Smartphone,
  Zap, Maximize2, MinusCircle, PlusCircle
} from 'lucide-react';
import { RelatorioFinal, NFData, VendaSemNF, UserRole, SaidaData } from '../types';
import { loadReportFromStorage } from '../services/storage';
import { getVendedorLabel } from '../services/logic';

interface DailyMovementStepProps {
  onBack: () => void;
}

// Interface para o Adaptador de Conferência (Atualizada para suportar Saídas)
interface OperationalItem {
    id: string;
    data: string;
    origemId: string;
    cliente: string; // No caso de saídas, aqui entra a Descrição
    vendedor: string;
    valor: number;
    categoria: 'NOTAS FISCAIS' | 'NFC-e / CUPOM' | 'SAÍDAS';
    tipoPagamento: string; // No caso de saídas, aqui entra a Categoria da Planilha
    formaPagamento: string;
    descricaoOriginal: string;
}

const DailyMovementStep: React.FC<DailyMovementStepProps> = ({ onBack }) => {
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7)); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [operationalItems, setOperationalItems] = useState<OperationalItem[]>([]);
  
  const [conferenceMode, setConferenceMode] = useState(false);

  // Estados de Expansão
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [expandedPayTypes, setExpandedPayTypes] = useState<Set<string>>(new Set());
  const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set());

  // Filtros de Card
  const [activeCardFilter, setActiveCardFilter] = useState<'ALL' | 'AVISTA' | 'FATURADA' | 'NFC-E' | 'SAIDAS'>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');

  // Modal Detail
  const [selectedItem, setSelectedItem] = useState<OperationalItem | null>(null);

  // --- ADAPTER: CONVERTER RELATÓRIO EM ITENS DE CONFERÊNCIA ---
  const DailyMovementAdapter = (report: RelatorioFinal): OperationalItem[] => {
      const items: OperationalItem[] = [];

      // 1. Processar Notas Fiscais (Registros Conciliados)
      (report.registros || []).forEach(nf => {
          items.push({
              id: `NF-${nf.numero}`,
              data: nf.tipo === 'PAGA_NO_DIA' ? (nf.data_pagamento_calculada || nf.data_emissao) : nf.data_emissao,
              origemId: nf.numero,
              cliente: nf.cliente || "Consumidor Final",
              vendedor: nf.vendedor_final || "INDEFINIDO",
              valor: nf.valor,
              categoria: 'NOTAS FISCAIS',
              tipoPagamento: nf.tipo === 'FATURADA' ? 'FATURADA' : 'À VISTA',
              formaPagamento: nf.forma_pagamento_movimento || (nf.tipo === 'FATURADA' ? 'FATURADO' : 'DINHEIRO'),
              descricaoOriginal: nf.inf_cpl_xml || ""
          });
      });

      // 2. Processar Vendas Sem NF (NFC-e / Cupom)
      (report.vendas_sem_nf_lista || []).forEach((v, idx) => {
          items.push({
              id: `SNF-${idx}-${v.data}`,
              data: v.data,
              origemId: 'NFC-e / Cupom',
              cliente: "Consumidor Final",
              vendedor: v.vendedor || "ENEIAS",
              valor: v.valor,
              categoria: 'NFC-e / CUPOM',
              tipoPagamento: 'À VISTA',
              formaPagamento: v.forma_pagamento || "DINHEIRO",
              descricaoOriginal: v.descricao || ""
          });
      });

      // 3. Processar Saídas (EXCLUSIVAMENTE DA PLANILHA IMPORTADA)
      (report.saidas_lista || []).forEach((s: any, idx) => {
          items.push({
              id: `OUT-${idx}-${s.data}`,
              data: s.data,
              origemId: 'SAÍDA',
              cliente: s.descricao || "Saída sem descrição",
              vendedor: 'LOJA',
              valor: -Math.abs(s.valor), // Negativo para visualização de saída
              categoria: 'SAÍDAS',
              tipoPagamento: (s.categoria || 'DESPESAS OPERACIONAIS').toUpperCase(),
              formaPagamento: 'DÉBITO CAIXA',
              descricaoOriginal: `Lançamento manual na planilha: ${s.descricao}`
          });
      });

      return items;
  };

  const loadData = async () => {
    setLoading(true);
    try {
        const report = await loadReportFromStorage(periodo);
        if (report) {
            const adapted = DailyMovementAdapter(report);
            setOperationalItems(adapted);
            setExpandedDates(new Set());
            setExpandedDocs(new Set());
        } else {
            setOperationalItems([]);
        }
    } catch (e) {
        console.error("Erro ao carregar relatório de conferência", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [periodo]);

  // --- LÓGICA DE FILTRAGEM ---

  const filteredItems = useMemo(() => {
      return operationalItems.filter(item => {
          const matchesSearch = item.cliente.toLowerCase().includes(searchTerm.toLowerCase()) || 
                               item.origemId.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesVendor = vendorFilter === 'ALL' || item.vendedor === vendorFilter;
          
          let matchesCard = true;
          if (activeCardFilter === 'AVISTA') matchesCard = item.categoria === 'NOTAS FISCAIS' && item.tipoPagamento === 'À VISTA';
          if (activeCardFilter === 'FATURADA') matchesCard = item.tipoPagamento === 'FATURADA';
          if (activeCardFilter === 'NFC-E') matchesCard = item.categoria === 'NFC-e / CUPOM';
          if (activeCardFilter === 'SAIDAS') matchesCard = item.categoria === 'SAÍDAS';

          return matchesSearch && matchesVendor && matchesCard;
      });
  }, [operationalItems, searchTerm, vendorFilter, activeCardFilter]);

  const kpis = useMemo(() => {
      const stats = { total: 0, avista: 0, faturada: 0, nfce: 0, saidas: 0, count: 0 };
      operationalItems.forEach(i => {
          if (i.categoria === 'SAÍDAS') {
              stats.saidas += Math.abs(i.valor);
          } else {
              stats.total += i.valor;
              if (i.categoria === 'NFC-e / CUPOM') stats.nfce += i.valor;
              else {
                  if (i.tipoPagamento === 'À VISTA') stats.avista += i.valor;
                  else stats.faturada += i.valor;
              }
          }
          stats.count++;
      });
      return stats;
  }, [operationalItems]);

  // --- ESTRUTURA HIERÁRQUICA ---
  const hierarchicalData = useMemo(() => {
    const dates: Record<string, any> = {};

    filteredItems.forEach(item => {
        const d = item.data;
        if (!dates[d]) dates[d] = { total: 0, docs: {} };
        
        // As saídas subtraem do total do dia na visão de conferência
        dates[d].total += item.valor;

        const docCat = item.categoria;
        const payType = item.tipoPagamento;
        const method = item.formaPagamento;

        if (!dates[d].docs[docCat]) dates[d].docs[docCat] = { total: 0, payTypes: {} };
        dates[d].docs[docCat].total += item.valor;

        if (!dates[d].docs[docCat].payTypes[payType]) dates[d].docs[docCat].payTypes[payType] = { total: 0, methods: {} };
        dates[d].docs[docCat].payTypes[payType].total += item.valor;

        if (!dates[d].docs[docCat].payTypes[payType].methods[method]) dates[d].docs[docCat].payTypes[payType].methods[method] = { total: 0, items: [] };
        dates[d].docs[docCat].payTypes[payType].methods[method].total += item.valor;
        dates[d].docs[docCat].payTypes[payType].methods[method].items.push(item);
    });

    return dates;
  }, [filteredItems]);

  const sortedDates = useMemo(() => Object.keys(hierarchicalData).sort().reverse(), [hierarchicalData]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, key: string) => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setter(next);
  };

  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  
  const getVendedoresUnicos = () => {
      const vends = new Set(operationalItems.map(e => e.vendedor).filter(v => v && v !== 'LOJA'));
      return Array.from(vends) as string[];
  };

  return (
    <div className="max-w-[1600px] mx-auto mt-6 px-4 md:px-8 pb-20 font-sans animate-[fadeIn_0.3s_ease-out]">
        
        {/* HEADER & FILTRO DE PERÍODO */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6 border-b border-slate-800 pb-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-3xl font-orbitron font-bold text-white tracking-tight">Movimento Diário</h2>
                    <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-500" /> Conferência Fiel à Planilha e XMLs Importados
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-slate-900/80 p-2 rounded-xl border border-slate-800 shadow-xl">
                <div className="flex items-center gap-2 px-2 border-r border-slate-700 mr-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Período</span>
                </div>
                <input 
                    type="month" 
                    value={periodo} 
                    onChange={(e) => setPeriodo(e.target.value)} 
                    className="bg-slate-950 border border-slate-800 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-cyan-500 transition-colors [color-scheme:dark]" 
                />
                <button onClick={loadData} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg transition-all border border-slate-700">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </div>

        {/* 1. CARDS KPI (ATIVOS PARA FILTRO) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <QuickFilterCard label="Total Vendas" value={fmtCurrency(kpis.total)} icon={DollarSign} color="white" active={activeCardFilter === 'ALL'} onClick={() => setActiveCardFilter('ALL')} />
            <QuickFilterCard label="Saídas do Dia" value={fmtCurrency(kpis.saidas)} icon={TrendingDown} color="red" active={activeCardFilter === 'SAIDAS'} onClick={() => setActiveCardFilter('SAIDAS')} />
            <QuickFilterCard label="Notas À Vista" value={fmtCurrency(kpis.avista)} icon={CheckCircle} color="emerald" active={activeCardFilter === 'AVISTA'} onClick={() => setActiveCardFilter('AVISTA')} />
            <QuickFilterCard label="Notas Faturadas" value={fmtCurrency(kpis.faturada)} icon={Clock} color="purple" active={activeCardFilter === 'FATURADA'} onClick={() => setActiveCardFilter('FATURADA')} />
            <QuickFilterCard label="NFC-e / Cupom" value={fmtCurrency(kpis.nfce)} icon={Receipt} color="orange" active={activeCardFilter === 'NFC-E'} onClick={() => setActiveCardFilter('NFC-E')} />
        </div>

        {/* 2. BARRA DE BUSCA E VENDEDOR + TOGGLE CONFERÊNCIA */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 mb-8 flex flex-wrap gap-4 items-end shadow-inner backdrop-blur-md">
            <div className="flex-1 min-w-[300px]">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Pesquisar na Lista</label>
                <div className="relative group">
                    <Search className="w-4 h-4 absolute top-3 left-3 text-slate-500 group-focus-within:text-cyan-500 transition-colors" />
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Busca por cliente, descrição ou número..." className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none transition-all" />
                </div>
            </div>
            <div className="w-64">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Vendedor</label>
                <div className="relative">
                    <UserIcon className="w-4 h-4 absolute top-3 left-3 text-slate-500 pointer-events-none" />
                    <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none appearance-none transition-all">
                        <option value="ALL">Todos (Exceto Saídas)</option>
                        {getVendedoresUnicos().map(v => <option key={v} value={v}>{getVendedorLabel(v)}</option>)}
                    </select>
                </div>
            </div>
            
            <div className="h-full flex items-center pl-2">
                <button 
                    onClick={() => setConferenceMode(!conferenceMode)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                        conferenceMode 
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                >
                    <Maximize2 className={`w-4 h-4 ${conferenceMode ? 'animate-pulse' : ''}`} />
                    <span>MODO CONFERÊNCIA</span>
                </button>
            </div>
        </div>

        {/* 3. LISTAGEM HIERÁRQUICA */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[500px] backdrop-blur-md">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-950 text-slate-500 text-xs uppercase font-bold sticky top-0 z-30 shadow-lg">
                        <tr>
                            <th className="px-8 py-5 w-48 tracking-widest text-center">Referência</th>
                            <th className="px-8 py-5 tracking-widest">Descrição / Cliente / Categoria</th>
                            <th className="px-8 py-5 text-center tracking-widest w-40">Responsável</th>
                            <th className="px-8 py-5 text-right tracking-widest w-48">Valor</th>
                            <th className="px-8 py-5 w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {sortedDates.map(date => {
                            const dateData = hierarchicalData[date];
                            const isDateExpanded = expandedDates.has(date);

                            return (
                                <React.Fragment key={date}>
                                    {/* NÍVEL 0: DATA HEADER */}
                                    <tr onClick={() => toggle(expandedDates, setExpandedDates, date)} className="bg-slate-950/80 hover:bg-slate-900 cursor-pointer border-b border-slate-800 sticky top-[60px] z-20 backdrop-blur-md transition-colors">
                                        <td colSpan={3} className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-500 border border-slate-700 shadow-inner">
                                                    {isDateExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                                </div>
                                                <span className="font-orbitron font-bold text-white uppercase text-lg tracking-widest">{date}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className={`font-black text-xl drop-shadow-[0_0_8px_rgba(0,0,0,0.3)] ${dateData.total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {fmtCurrency(dateData.total)}
                                            </span>
                                        </td>
                                        <td></td>
                                    </tr>

                                    {/* NÍVEL 1: CATEGORIA DE DOCUMENTO (NOTAS, NFC-e, SAÍDAS) */}
                                    {isDateExpanded && Object.entries(dateData.docs).map(([docType, docData]: [string, any]) => {
                                        const docKey = `${date}|${docType}`;
                                        const isDocExpanded = expandedDocs.has(docKey);
                                        const isSaida = docType === 'SAÍDAS';

                                        return (
                                            <React.Fragment key={docType}>
                                                <tr onClick={() => toggle(expandedDocs, setExpandedDocs, docKey)} className={`bg-slate-900/60 hover:bg-slate-800/50 cursor-pointer border-b border-slate-800/40 transition-colors`}>
                                                    <td colSpan={5} className="px-16 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-1 rounded transition-colors ${isDocExpanded ? (isSaida ? 'text-red-400' : 'text-cyan-400') : 'text-slate-600'}`}>
                                                                {isDocExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {isSaida ? <MinusCircle className="w-4 h-4 text-red-500" /> : <PlusCircle className="w-4 h-4 text-emerald-500" />}
                                                                <span className={`font-black uppercase text-xs tracking-widest ${isSaida ? 'text-red-400' : 'text-slate-100'}`}>{docType}</span>
                                                            </div>
                                                            <span className={`text-xs font-bold ml-auto px-3 py-1 rounded-full border border-slate-800 uppercase tracking-tighter ${isSaida ? 'bg-red-950/20 text-red-500' : 'bg-slate-950 text-slate-500'}`}>
                                                                Total: {fmtCurrency(docData.total)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* NÍVEL 2: TIPO DE PAGAMENTO (OU CATEGORIA DA SAÍDA) */}
                                                {isDocExpanded && Object.entries(docData.payTypes).map(([payType, payData]: [string, any]) => {
                                                    const payKey = `${docKey}|${payType}`;
                                                    const isPayExpanded = expandedPayTypes.has(payKey);

                                                    return (
                                                        <React.Fragment key={payType}>
                                                            <tr onClick={() => toggle(expandedPayTypes, setExpandedPayTypes, payKey)} className="bg-slate-900/30 hover:bg-slate-800/40 cursor-pointer border-b border-slate-800/20 transition-colors">
                                                                <td colSpan={5} className={`px-24 ${conferenceMode ? 'py-5' : 'py-3'}`}>
                                                                    <div className={`flex items-center gap-3 border-l-4 pl-4 ${isSaida ? 'border-red-800' : 'border-slate-700'}`}>
                                                                        {isPayExpanded ? <ChevronDown className={`w-3 h-3 ${isSaida ? 'text-red-500' : 'text-cyan-500'}`} /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
                                                                        <span className={`font-bold uppercase tracking-widest ${conferenceMode ? 'text-base' : 'text-sm'} ${isSaida ? 'text-red-300' : 'text-slate-300'}`}>
                                                                            {payType}
                                                                        </span>
                                                                        <span className={`font-black ml-auto ${conferenceMode ? 'text-sm text-slate-400' : 'text-xs text-slate-600'}`}>
                                                                            {fmtCurrency(payData.total)}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            </tr>

                                                            {/* NÍVEL 3: FORMA DE PAGAMENTO */}
                                                            {isPayExpanded && Object.entries(payData.methods).map(([method, methodData]: [string, any]) => {
                                                                const methKey = `${payKey}|${method}`;
                                                                const isMethExpanded = expandedMethods.has(methKey);

                                                                return (
                                                                    <React.Fragment key={method}>
                                                                        <tr onClick={() => toggle(expandedMethods, setExpandedMethods, methKey)} className="bg-slate-900/10 hover:bg-slate-800/40 cursor-pointer border-b border-slate-800/10 transition-colors">
                                                                            <td colSpan={5} className={`px-32 ${conferenceMode ? 'py-4' : 'py-3'}`}>
                                                                                <div className="flex items-center gap-4 border-l border-slate-800 pl-4">
                                                                                    {isSaida ? <Wallet className="w-4 h-4 text-red-500" /> : method.includes('CART') ? <CreditCard className="w-4 h-4 text-blue-500" /> : method.includes('PIX') ? <Smartphone className="w-4 h-4 text-cyan-500" /> : <Coins className="w-4 h-4 text-amber-500" />}
                                                                                    <span className={`font-bold text-slate-400 uppercase ${conferenceMode ? 'text-base' : 'text-sm'}`}>
                                                                                        {isSaida ? 'LANÇAMENTOS DA CATEGORIA' : method}
                                                                                    </span>
                                                                                    <span className={`font-extrabold italic ml-auto ${conferenceMode ? 'text-sm text-slate-400' : 'text-xs text-slate-600'}`}>
                                                                                        {methodData.items.length} ITENS &bull; {fmtCurrency(methodData.total)}
                                                                                    </span>
                                                                                </div>
                                                                            </td>
                                                                        </tr>

                                                                        {/* NÍVEL 4: ITENS INDIVIDUAIS */}
                                                                        {isMethExpanded && methodData.items.map((item: OperationalItem) => (
                                                                            <tr key={item.id} onClick={() => setSelectedItem(item)} className={`group transition-all cursor-pointer border-b border-slate-800/10 ${isSaida ? 'hover:bg-red-500/[0.05]' : 'hover:bg-cyan-500/[0.05]'}`}>
                                                                                <td className={`px-40 ${conferenceMode ? 'py-5' : 'py-4'} text-center`}>
                                                                                    <span className={`font-black tracking-tight ${item.categoria === 'NFC-e / CUPOM' ? 'text-orange-500/70 italic' : isSaida ? 'text-red-500/50' : 'text-slate-400 font-mono'} ${conferenceMode ? 'text-sm' : 'text-xs'}`}>
                                                                                        {item.origemId}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-8 py-4">
                                                                                    <div className="flex flex-col">
                                                                                        <span className={`text-slate-200 font-bold group-hover:text-white transition-colors ${conferenceMode ? 'text-base' : 'text-sm'}`}>{item.cliente}</span>
                                                                                        <span className="text-xs text-slate-600 uppercase mt-1 tracking-tighter truncate max-w-xs">{item.descricaoOriginal}</span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-8 py-4 text-center">
                                                                                    <span className={`bg-slate-800 px-3 py-1 rounded font-black text-slate-500 border border-slate-700 uppercase ${conferenceMode ? 'text-xs' : 'text-[10px]'}`}>{item.vendedor === 'LOJA' ? 'SISTEMA CAIXA' : getVendedorLabel(item.vendedor)}</span>
                                                                                </td>
                                                                                <td className={`px-8 py-4 text-right font-black ${item.valor < 0 ? 'text-red-400' : 'text-slate-100'} ${conferenceMode ? 'text-base' : 'text-sm'}`}>
                                                                                    {fmtCurrency(item.valor)}
                                                                                </td>
                                                                                <td className="px-8 py-4 text-center">
                                                                                    <Eye className={`w-5 h-5 text-slate-800 transition-colors ${isSaida ? 'group-hover:text-red-500' : 'group-hover:text-cyan-500'}`} />
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}

                        {sortedDates.length === 0 && !loading && (
                            <tr><td colSpan={5} className="px-8 py-32 text-center text-slate-600"><ShoppingBag className="w-20 h-20 mx-auto mb-6 opacity-10" /><p className="text-2xl font-bold font-orbitron text-slate-700 uppercase tracking-widest">Sem registros no período</p></td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* MODAL DETALHE */}
        {selectedItem && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
                <div className={`bg-slate-900 border ${selectedItem.categoria === 'SAÍDAS' ? 'border-red-900' : 'border-slate-700'} rounded-[32px] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col`}>
                    <div className="p-8 border-b border-slate-800 bg-slate-900/80 flex justify-between items-start">
                        <div className="flex gap-5">
                            <div className={`p-4 rounded-2xl border bg-slate-800 border-slate-700 shadow-lg ${selectedItem.categoria === 'SAÍDAS' ? 'text-red-400' : 'text-cyan-400'}`}>
                                {selectedItem.categoria === 'SAÍDAS' ? <MinusCircle className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-white tracking-tight font-orbitron mt-2">{selectedItem.origemId}</h3>
                                <p className="text-slate-500 text-xs uppercase font-bold tracking-widest mt-1">{selectedItem.categoria}</p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedItem(null)} className="p-2 text-slate-500 hover:text-white transition-all group"><XCircle className="w-8 h-8 group-hover:scale-110 transition-transform" /></button>
                    </div>
                    <div className="p-8 space-y-6 bg-slate-950/50">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">{selectedItem.categoria === 'SAÍDAS' ? 'Beneficiário / Motivo' : 'Cliente / Beneficiário'}</label>
                                <p className="text-lg font-bold text-white leading-tight">{selectedItem.cliente}</p>
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Valor do Item</label>
                                <p className={`text-2xl font-black ${selectedItem.valor < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmtCurrency(selectedItem.valor)}</p>
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Responsável</label>
                                <div className="flex items-center gap-2 text-white font-bold">
                                    {selectedItem.vendedor === 'LOJA' ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <UserIcon className="w-4 h-4 text-blue-500" />}
                                    {selectedItem.vendedor === 'LOJA' ? 'CONFERÊNCIA CAIXA' : getVendedorLabel(selectedItem.vendedor)}
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-inner">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-widest block mb-2">Informações da Importação</label>
                            <p className="text-slate-400 text-sm italic leading-relaxed">{selectedItem.descricaoOriginal || "Item operacional importado via planilha diária."}</p>
                        </div>
                    </div>
                    <div className="p-8 bg-slate-900/80 border-t border-slate-800 flex justify-end gap-4">
                        <button onClick={() => setSelectedItem(null)} className={`px-10 py-3 rounded-2xl text-sm font-black shadow-xl transition-all uppercase tracking-widest text-white ${selectedItem.categoria === 'SAÍDAS' ? 'bg-red-700 hover:bg-red-600' : 'bg-cyan-600 hover:bg-cyan-500'}`}>
                            Fechar Conferência
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

const QuickFilterCard = ({ label, value, icon: Icon, color, active, onClick }: any) => {
    const colorMap: Record<string, string> = {
        white: "text-white bg-slate-800 border-slate-700",
        emerald: "text-emerald-400 bg-emerald-900/10 border-emerald-500/20",
        purple: "text-purple-400 bg-purple-900/10 border-purple-500/20",
        orange: "text-orange-400 bg-orange-900/10 border-orange-500/20",
        red: "text-red-400 bg-red-900/10 border-red-500/20",
    };
    return (
        <div 
            onClick={onClick} 
            className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xl relative overflow-hidden group ${
                active ? 'ring-2 ring-cyan-500 ring-offset-4 ring-offset-slate-950 scale-105 z-10' : 'hover:scale-[1.02] opacity-80 hover:opacity-100'
            } ${colorMap[color] || colorMap.white}`}
        >
            <div className="flex justify-between items-start mb-4 relative z-10">
                <p className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-white' : 'text-slate-500'}`}>{label}</p>
                <div className={`p-2 rounded-xl transition-colors ${active ? 'bg-white/20' : 'bg-black/20'}`}>
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : ''}`} />
                </div>
            </div>
            <p className={`text-2xl font-black tracking-tight relative z-10 font-orbitron ${active ? 'text-white' : ''}`}>{value}</p>
            <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-3xl opacity-10 pointer-events-none group-hover:opacity-25 transition-opacity ${color === 'emerald' ? 'bg-emerald-500' : color === 'purple' ? 'bg-purple-500' : color === 'orange' ? 'bg-orange-500' : color === 'red' ? 'bg-red-500' : 'bg-white'}`}></div>
        </div>
    );
};

export default DailyMovementStep;
