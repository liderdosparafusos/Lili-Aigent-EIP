
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Lock, Unlock, AlertTriangle, RefreshCw, CheckCircle, 
  Circle, AlertOctagon, TrendingUp, TrendingDown, DollarSign,
  FileText, Activity, ShieldCheck, ArrowRight, Trash2, X, ClipboardList, Info,
  Printer, Archive
} from 'lucide-react';
import { 
  FechamentoMensal, LedgerEntry, User, UserRole, 
  Insight, NFData, EtapasFechamento, FechamentoPreview, ChecklistItem 
} from '../types';
import { 
  getFechamento, fecharPeriodo, reabrirPeriodo, atualizarEtapaFechamento, 
  resetFechamentoMensal, simularFechamento, executarChecklistPreFechamento, gerarRelatorioPDF 
} from '../services/closing';
import { getLedger } from '../services/ledger';
import { loadReportFromStorage, saveReportToStorage } from '../services/storage';
import { listarInsights } from '../services/agent';
import { runClosingAgent } from '../services/closingAgent';
import { calcularResumoFechamento, calcularComissoesDoDia } from '../services/logic';
import ClosingTimeline from './ClosingTimeline';
import DivergencePanel from './DivergencePanel';
import ChatWidget from './ChatWidget';
import { useNotification } from './NotificationSystem';

interface MonthlyClosingDashboardProps {
  user: User;
  onNavigate: (module: string, subModule?: string) => void;
}

const MonthlyClosingDashboard: React.FC<MonthlyClosingDashboardProps> = ({ user, onNavigate }) => {
  const { notify } = useNotification();
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7)); 
  const [fechamento, setFechamento] = useState<FechamentoMensal | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [activeDivergences, setActiveDivergences] = useState<NFData[]>([]);
  const [agentAlerts, setAgentAlerts] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [selectedDivergence, setSelectedDivergence] = useState<NFData | null>(null);
  const [fullReport, setFullReport] = useState<any>(null); 
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistResults, setChecklistResults] = useState<ChecklistItem[]>([]);
  const [previewData, setPreviewData] = useState<FechamentoPreview | null>(null);
  const [confirmCheck, setConfirmCheck] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
        await runClosingAgent(periodo);
        const [fechamentoData, ledgerData, alertsData, reportData] = await Promise.all([
            getFechamento(periodo),
            getLedger(periodo),
            listarInsights(),
            loadReportFromStorage(periodo)
        ]);
        setFechamento(fechamentoData);
        setLedgerEntries(ledgerData);
        setFullReport(reportData);
        setAgentAlerts(alertsData.filter(i => 
            (i.tipo === 'FECHAMENTO' && i.contexto?.periodo === periodo) || 
            (i.tipo === 'Financeiro' && (i.severidade === 'CRITICO' || i.prioridade === 'Crítico'))
        ));
        if (reportData && reportData.registros) {
            setActiveDivergences(reportData.registros.filter((r: NFData) => r.status_divergencia === 'DIVERGENCIA'));
        } else { setActiveDivergences([]); }
    } catch (e) { notify("Erro ao carregar", "Não foi possível carregar os dados.", "error"); } 
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [periodo]);

  const handleToggleStep = async (step: keyof EtapasFechamento) => {
      if (!fechamento || user.role !== UserRole.OPERADOR || fechamento.status === 'FECHADO') return;
      const currentVal = fechamento.etapas[step];
      await atualizarEtapaFechamento(periodo, step, !currentVal);
      loadData();
  };

  const handleInitiateClosing = async () => {
      if (!fechamento) return;
      setProcessing(true);
      try { const results = await executarChecklistPreFechamento(periodo); setChecklistResults(results); setShowChecklistModal(true); } 
      catch (e: any) { notify("Atenção", e.message, "error"); } 
      finally { setProcessing(false); }
  };

  const handleChecklistPassed = async () => {
      setShowChecklistModal(false); setProcessing(true); setConfirmCheck(false); 
      try { const preview = await simularFechamento(periodo); setPreviewData(preview); setShowReviewModal(true); } 
      catch (e: any) { notify("Erro na Simulação", e.message, "error"); } 
      finally { setProcessing(false); }
  };

  const handleConfirmClosing = async () => {
      if (!confirmCheck) return;
      setProcessing(true);
      try { await fecharPeriodo(periodo); setShowReviewModal(false); notify("Mês Fechado!", "Dados congelados.", "success"); loadData(); } 
      catch (e: any) { notify("Erro ao Fechar", e.message, "error"); } 
      finally { setProcessing(false); }
  };

  const handleReopenPeriod = async () => {
      if (!confirm("Deseja reabrir o período?")) return;
      setProcessing(true); await reabrirPeriodo(periodo); loadData(); setProcessing(false);
  };

  const handleDivergenceResolved = async (updatedNF: NFData) => {
    if (!fullReport) return;
    const updatedRegistros = fullReport.registros.map((r: NFData) => 
        r.numero === updatedNF.numero ? updatedNF : r
    );
    const updatedReport = { ...fullReport, registros: updatedRegistros };
    setFullReport(updatedReport);
    await saveReportToStorage(updatedReport);
    setActiveDivergences(updatedRegistros.filter((r: NFData) => r.status_divergencia === 'DIVERGENCIA'));
    setSelectedDivergence(null);
    notify("Divergência resolvida", `NF ${updatedNF.numero} processada com sucesso.`, "success");
    loadData();
  };

  // CÁLCULO DE KPIs BASEADO NO RELATÓRIO SALVO (Fonte única de verdade)
  const kpis = useMemo(() => {
      if (!fullReport) return { salesNF: 0, salesNoNF: 0, returns: 0, totalSales: 0, projectedCommission: 0 };
      
      const resumo = calcularResumoFechamento(fullReport);
      const comissoes = calcularComissoesDoDia(fullReport);

      return {
          salesNF: resumo.totalVendasComNF,
          salesNoNF: resumo.totalVendasSemNF,
          returns: resumo.totalEstornos,
          totalSales: resumo.totalVendasGeral,
          projectedCommission: comissoes.totalComissao
      };
  }, [fullReport]);

  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const isClosed = fechamento?.status === 'FECHADO';
  const canClose = fechamento && Object.values(fechamento.etapas).every(v => v === true) && !isClosed && activeDivergences.length === 0;

  if (loading || !fechamento) return <div className="flex flex-col items-center justify-center h-screen bg-slate-950"><RefreshCw className="animate-spin text-cyan-500 mb-4" /><p className="text-cyan-500 font-orbitron">Carregando...</p></div>;

  if (isClosed && fechamento.resumoConsolidado) {
      return <ResumoFechamentoView fechamento={fechamento} user={user} onReopen={handleReopenPeriod} setPeriodo={setPeriodo} periodo={periodo} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans pb-20 relative">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 border-b border-slate-800 pb-6">
          <div>
              <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-orbitron font-bold text-white">Fechamento do Mês</h1>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isClosed ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/50' : 'bg-amber-900/30 text-amber-400 border-amber-500/50'}`}>
                      {fechamento.status?.replace('_', ' ') || "EM ANDAMENTO"}
                  </span>
              </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900 p-2 rounded-xl border border-slate-800">
              <input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-bold outline-none [color-scheme:dark]" />
              <button onClick={handleInitiateClosing} disabled={!canClose || processing || user.role !== UserRole.OPERADOR} className={`px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all ${canClose ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
                  {processing ? <RefreshCw className="animate-spin" /> : <Lock className="w-4 h-4" />} Processar Fechamento
              </button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard label="Vendas NF" value={fmtCurrency(kpis.salesNF)} icon={FileText} color="text-cyan-400" bg="bg-cyan-900/10" border="border-cyan-500/20" />
          <KPICard label="NFC-e / Cupom" value={fmtCurrency(kpis.salesNoNF)} icon={DollarSign} color="text-orange-400" bg="bg-orange-900/10" border="border-orange-500/20" />
          <KPICard label="Devoluções" value={`- ${fmtCurrency(kpis.returns)}`} icon={TrendingDown} color="text-red-400" bg="bg-red-900/10" border="border-red-500/20" />
          <KPICard label="Comissão Total" value={fmtCurrency(kpis.projectedCommission)} icon={TrendingUp} color="text-emerald-400" bg="bg-emerald-900/10" border="border-emerald-500/20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-xl font-bold text-white mb-6">Checklist de Etapas</h3>
                  <div className="space-y-4">
                      <CheckItem label="Movimento Importado" checked={fechamento.etapas?.movimentoImportado} onClick={() => handleToggleStep('movimentoImportado')} disabled={isClosed || user.role !== UserRole.OPERADOR} />
                      <CheckItem label="XML Importado" checked={fechamento.etapas?.notasImportadas} onClick={() => handleToggleStep('notasImportadas')} disabled={isClosed || user.role !== UserRole.OPERADOR} />
                      <CheckItem label="Divergências" checked={fechamento.etapas?.divergenciasResolvidas} onClick={() => handleToggleStep('divergenciasResolvidas')} disabled={isClosed || user.role !== UserRole.OPERADOR} alert={activeDivergences.length > 0} />
                      <CheckItem label="Validação Gerencial" checked={fechamento.etapas?.validado} onClick={() => handleToggleStep('validado')} disabled={isClosed || user.role !== UserRole.OPERADOR} isFinal />
                  </div>
              </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden h-[400px] flex flex-col shadow-2xl">
                  <div className="p-6 border-b border-slate-700 bg-slate-900/50 font-bold flex justify-between items-center">
                    <span>Divergências Pendentes ({activeDivergences.length})</span>
                    {activeDivergences.length > 0 && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded animate-pulse">Ação Requerida</span>}
                  </div>
                  <div className="flex-1 overflow-auto">
                    {activeDivergences.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500"><CheckCircle className="w-12 h-12 mb-4 opacity-20 text-emerald-500" /><p>Todas as divergências do período foram resolvidas.</p></div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold sticky top-0"><tr><th className="px-6 py-3">NF</th><th className="px-6 py-3">Inconsistência Identificada</th><th className="px-6 py-3 text-right">Valor</th></tr></thead>
                            <tbody className="divide-y divide-slate-700">
                                {activeDivergences.map(div => (
                                    <tr key={div.numero} onClick={() => setSelectedDivergence(div)} className="hover:bg-slate-700/30 cursor-pointer transition-colors group">
                                        <td className="px-6 py-4 font-bold text-white group-hover:text-cyan-400">{div.numero}</td>
                                        <td className="px-6 py-4 text-red-300 font-medium">{div.motivo_divergencia}</td>
                                        <td className="px-6 py-4 text-right font-mono">{fmtCurrency(div.valor)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                  </div>
              </div>
          </div>
      </div>
      {selectedDivergence && <DivergencePanel divergence={selectedDivergence} onClose={() => setSelectedDivergence(null)} onResolve={handleDivergenceResolved} user={user} periodo={periodo} />}
      <ChatWidget data={{ fechamento, kpis, fullReport }} mode="CLOSING" />
    </div>
  );
};

const ResumoFechamentoView = ({ fechamento, user, onReopen, setPeriodo, periodo }: any) => {
    const { totais, detalheVendedores } = fechamento.resumoConsolidado;
    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans">
            <div className="flex justify-between items-center mb-8 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold">Documento de Fechamento - {periodo}</h2>
                  <span className="px-2 py-0.5 bg-emerald-900 text-emerald-400 text-[10px] font-bold rounded uppercase">Auditado</span>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => gerarRelatorioPDF(fechamento)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg"><Printer className="w-4 h-4" /> Exportar PDF</button>
                    {user.role === UserRole.OPERADOR && <button onClick={onReopen} className="px-4 py-2 border border-slate-600 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-sm font-bold"><Unlock className="w-4 h-4" /> Reabrir Período</button>}
                </div>
            </div>
            <div className="max-w-4xl mx-auto bg-white text-slate-900 p-12 rounded shadow-2xl relative">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <ShieldCheck className="w-40 h-40" />
                </div>
                <h1 className="text-3xl font-black uppercase mb-8 border-b-2 border-slate-900 pb-4 flex justify-between items-center">
                  <span>Resumo Mensal Consolidado</span>
                  <span className="text-lg font-normal text-slate-500">{periodo}</span>
                </h1>
                <table className="w-full text-sm mb-10 border-collapse">
                    <tbody className="divide-y divide-slate-100">
                        <tr className="font-bold"><td className="py-4 px-2">Vendas Brutas (NF + NFC-e)</td><td className="py-4 px-2 text-right">{fmt(totais.vendasBrutas)}</td></tr>
                        <tr className="text-red-600"><td className="py-4 px-2">Estornos e Devoluções</td><td className="py-4 px-2 text-right">-{fmt(totais.devolucoes)}</td></tr>
                        <tr className="text-slate-500 italic"><td className="py-4 px-2">Despesas Operacionais (Saídas Planilha)</td><td className="py-4 px-2 text-right">-{fmt(totais.despesas)}</td></tr>
                        <tr className="bg-slate-50 font-black border-t-2 border-slate-900"><td className="py-5 px-2 text-lg uppercase">Resultado Líquido do Período</td><td className="py-5 px-2 text-right text-lg">{fmt(totais.liquido)}</td></tr>
                    </tbody>
                </table>

                <h2 className="text-xl font-bold mb-4 uppercase border-b border-slate-200 pb-2">Rateio de Comissões</h2>
                <table className="w-full text-sm">
                   <thead><tr className="bg-slate-50 text-slate-500 uppercase text-[10px]"><th className="p-2 text-left">Vendedor</th><th className="p-2 text-right">Base</th><th className="p-2 text-center">%</th><th className="p-2 text-right">Comissão</th></tr></thead>
                   <tbody className="divide-y divide-slate-100">
                      {detalheVendedores.map((v: any) => (
                        <tr key={v.vendedor}><td className="p-2 font-bold">{v.vendedor}</td><td className="p-2 text-right">{fmt(v.baseComissao)}</td><td className="p-2 text-center">{v.percentual}%</td><td className="p-2 text-right font-bold text-emerald-600">{fmt(v.comissao)}</td></tr>
                      ))}
                   </tbody>
                   <tfoot><tr className="font-black bg-slate-50"><td colSpan={3} className="p-2 text-right uppercase">Total de Comissões</td><td className="p-2 text-right text-emerald-600">{fmt(totais.comissaoTotal)}</td></tr></tfoot>
                </table>
            </div>
        </div>
    );
};

const KPICard = ({ label, value, icon: Icon, color, bg, border }: any) => (
    <div className={`p-6 rounded-xl border ${bg} ${border} relative overflow-hidden flex flex-col justify-between h-32 shadow-xl transition-all hover:scale-[1.02]`}>
        <div className="relative z-10"><p className="text-xs font-bold text-slate-400 uppercase mb-2 font-orbitron tracking-widest">{label}</p><p className={`text-3xl font-black ${color}`}>{value}</p></div>
        <Icon className="absolute top-4 right-4 w-12 h-12 opacity-10" />
    </div>
);

const CheckItem = ({ label, checked, onClick, disabled, isFinal, alert }: any) => (
    <div onClick={!disabled ? onClick : undefined} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-800'} ${checked ? 'bg-emerald-900/10 border-emerald-900/30' : alert ? 'bg-red-900/10 border-red-900/50 animate-pulse' : 'bg-slate-800/50 border-slate-700'}`}>
        <div className={`p-1 rounded-full ${checked ? 'text-emerald-400' : 'text-slate-600'}`}>{checked ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}</div>
        <span className={`font-bold text-sm ${checked ? 'text-emerald-100' : 'text-slate-400'}`}>{label}</span>
        {alert && !checked && <AlertTriangle className="w-4 h-4 text-red-500 ml-auto" />}
    </div>
);

export default MonthlyClosingDashboard;
