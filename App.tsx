
import React, { useState, useEffect } from 'react';
import { AppState, NFData, RelatorioFinal, DivergenceItem, User, UserRole, VendaSemNF, SaidaData } from './types';
import LoginStep from './components/LoginStep';
import UploadStep from './components/UploadStep';
import ResolutionStep from './components/ResolutionStep';
import ReportStep from './components/ReportStep';
import ReportListStep from './components/ReportListStep';
import ImportClientesStep from './components/ImportClientesStep';
import ImportProductsStep from './components/ImportProductsStep';
import ImportHistoryStep from './components/ImportHistoryStep';
import CustomerQueryStep from './components/CustomerQueryStep';
import ProductQueryStep from './components/ProductQueryStep';
import BudgetListStep from './components/BudgetListStep';
import BudgetEditorStep from './components/BudgetEditorStep';
import OrderListStep from './components/OrderListStep';
import OrderDetailStep from './components/OrderDetailStep';
import FinanceEventsStep from './components/FinanceEventsStep'; 
import CommissionDashboardStep from './components/CommissionDashboardStep'; 
import FinancialSummaryStep from './components/FinancialSummaryStep';
import DailyMovementStep from './components/DailyMovementStep'; 
import CommercialAgentStep from './components/CommercialAgentStep';
import IntelligenceAlerts from './components/IntelligenceAlerts';
import ExecutionHub from './components/ExecutionHub';
import CommercialDashboard from './components/CommercialDashboard'; 
import ReceivablesDashboard from './components/ReceivablesDashboard';
import SellerListStep from './components/SellerListStep'; 
import MonthlyClosingDashboard from './components/MonthlyClosingDashboard';
import CardSalesExport from './components/CardSalesExport';
import AppLayout from './components/AppLayout';
import PlaceholderModule from './components/PlaceholderModule';
import { ClientProvider } from './contexts/ClientContext'; 
import { NotificationProvider } from './components/NotificationSystem';
import { 
  processarMovimentosDiarios, 
  processarXmlNotas, 
  classificarNF, 
  verificarDivergencias,
  createNfFromMovement,
  mergeReportData,
  recalculateTotals
} from './services/logic';
import { loadReportFromStorage } from './services/storage';
import { getClientesMap } from './services/customers';
import { atualizarEtapaFechamento, registrarEventoFechamento } from './services/closing'; 
import { Activity, ArrowLeft, Box, Receipt } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  const [loadingMsg, setLoadingMsg] = useState<string>("");
  
  const [activeModule, setActiveModule] = useState('dashboard');
  const [activeSubModule, setActiveSubModule] = useState<string | undefined>(undefined);
  
  const [reportData, setReportData] = useState<RelatorioFinal | null>(null);
  const [divergences, setDivergences] = useState<DivergenceItem[]>([]);
  const [processedNFs, setProcessedNFs] = useState<NFData[]>([]);
  const [currentDivIndex, setCurrentDivIndex] = useState(0);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [selectedOrcamentoId, setSelectedOrcamentoId] = useState<string | undefined>(undefined);
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | undefined>(undefined);

  const getPeriodFromData = (data: RelatorioFinal): string | null => {
      const sampleDate = data.registros[0]?.data_emissao || data.vendas_sem_nf_lista[0]?.data;
      if (sampleDate) {
          const parts = sampleDate.includes('/') ? sampleDate.split('/') : sampleDate.split('-');
          if (parts.length === 3) {
              const y = parts[2].length === 4 ? parts[2] : parts[0];
              const m = parts[1];
              return `${y}-${m.padStart(2, '0')}`;
          }
      }
      return null;
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setAppState(AppState.MAIN_MENU); 
    setActiveModule('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setAppState(AppState.LOGIN);
    setReportData(null);
    setDivergences([]);
    setIsEditingReport(false);
    setActiveModule('dashboard');
    setActiveSubModule(undefined);
  };

  const handleNavigation = (module: string, subModule?: string) => {
      setActiveModule(module);
      setActiveSubModule(subModule);

      if (module === 'dashboard') {
          setAppState(AppState.MAIN_MENU);
      }
      else if (module === 'finance') {
          if (subModule === 'receivables') setAppState(AppState.CONTAS_A_RECEBER);
          if (subModule === 'card_export') setAppState(AppState.EXPORT_VENDAS_CARTAO);
      }
      else if (module === 'sales') {
          if (subModule === 'budgets') setAppState(AppState.ORCAMENTOS_LIST);
          if (subModule === 'orders') setAppState(AppState.PEDIDOS_LIST);
      }
      else if (module === 'daily') {
          if (subModule === 'movimento') setAppState(AppState.MAIN_MENU);
          if (subModule === 'eventos') setAppState(AppState.FINANCEIRO_EVENTOS);
      }
      else if (module === 'closing') {
          if (subModule === 'live') setAppState(AppState.REPORT);
          if (subModule === 'process') setAppState(AppState.REPORT_LIST);
          if (subModule === 'summary') setAppState(AppState.FINANCEIRO_RESUMO);
      }
      else if (module === 'commissions') {
          setAppState(AppState.COMISSOES_DASHBOARD);
      }
      else if (module === 'intelligence') {
          if (subModule === 'agent') setAppState(AppState.AGENTE_COMERCIAL);
          if (subModule === 'alerts') setAppState(AppState.INTELLIGENCE_ALERTS);
          if (subModule === 'execution_hub') setAppState(AppState.EXECUTION_HUB);
      }
      else if (module === 'registers') {
          if (subModule === 'clients') setAppState(AppState.CONSULTA_CLIENTES);
          if (subModule === 'products') setAppState(AppState.CONSULTA_PRODUTOS);
      }
      else if (module === 'settings') {
          if (subModule === 'sellers') setAppState(AppState.VENDEDORES_LIST);
      }
  };

  const handleBackToList = () => {
    setReportData(null);
    setIsEditingReport(false);
    setAppState(AppState.REPORT_LIST);
  };

  const handleNavigateToBudgetEdit = (id?: string) => {
      setSelectedOrcamentoId(id);
      setAppState(AppState.ORCAMENTOS_EDIT);
  };

  const handleNavigateToOrderDetail = (id: string) => {
      setSelectedPedidoId(id);
      setAppState(AppState.PEDIDOS_DETAIL);
  };

  const handleRestart = () => {
    setReportData(null);
    setDivergences([]);
    setProcessedNFs([]);
    setCurrentDivIndex(0);
    setIsEditingReport(false);
    if (user?.role === UserRole.OPERADOR) {
      setAppState(AppState.UPLOAD);
    } else {
      setAppState(AppState.REPORT_LIST);
    }
  };

  const handleSelectReport = async (id: string) => {
    setLoadingMsg("Carregando relatório da nuvem...");
    const data = await loadReportFromStorage(id);
    if (data) {
      setReportData(data);
      setAppState(AppState.REPORT);
    } else {
      alert("Erro ao carregar relatório salvo.");
    }
  };

  const handleEditReport = async (id: string) => {
    setLoadingMsg("Carregando relatório para edição...");
    const data = await loadReportFromStorage(id);
    if (data) {
        setReportData(data);
        setIsEditingReport(true);
        setAppState(AppState.UPLOAD);
    } else {
        alert("Erro ao carregar relatório para edição.");
    }
  };

  const handleNewReport = () => {
    setIsEditingReport(false);
    setReportData(null);
    setAppState(AppState.UPLOAD);
  };

  const handleFilesSelected = async (movFile: File | null, xmlFile: File | null) => {
    setAppState(AppState.PROCESSING);
    setLoadingMsg("Lendo arquivos...");
    try {
      setLoadingMsg("Carregando base de clientes...");
      const clientesMap = await getClientesMap();
      setLoadingMsg("Processando movimentos e XMLs...");
      const movPromise = movFile ? processarMovimentosDiarios(movFile) : Promise.resolve({ 
         NF_MOVIMENTO: {} as Record<string, any>, VENDAS_SEM_NF: [] as VendaSemNF[], TOTAIS_FORMA: {dinheiro:0, pix:0, cartao:0}, SAIDAS_LISTA: [] as SaidaData[]
      });
      const xmlPromise = xmlFile ? processarXmlNotas(xmlFile, clientesMap) : Promise.resolve({} as Record<string, any>);
      const [movData, xmlData] = await Promise.all([movPromise, xmlPromise]);
      let finalNfList: NFData[] = [];
      let finalSemNf: VendaSemNF[] = [];
      let finalSaidas: SaidaData[] = [];
      let finalTotals = movData.TOTAIS_FORMA;

      if (isEditingReport && reportData) {
         setLoadingMsg("Mesclando novos dados com o fechamento existente...");
         const mergeResult = mergeReportData(reportData, movData, xmlData) as any;
         finalNfList = mergeResult.mergedRegistros;
         finalSemNf = mergeResult.mergedSemNF;
         finalSaidas = mergeResult.mergedSaidas;
         finalTotals = recalculateTotals(finalNfList, finalSemNf, mergeResult.newNfMovimentoMap);
      } 
      else {
         setLoadingMsg("Analisando regras de negócio...");
         const { NF_MOVIMENTO, VENDAS_SEM_NF, SAIDAS_LISTA } = movData;
         const NF_XML = xmlData;
         const nfKeys = Object.keys(NF_XML);
         Object.keys(NF_MOVIMENTO).forEach(k => {
            if (!nfKeys.includes(k)) nfKeys.push(k);
         });
         for (const key of nfKeys) {
            let nfFull: NFData;
            if (NF_XML[key]) {
                 const classified = classificarNF(key, NF_XML[key], NF_MOVIMENTO) as any;
                 const divCheck = verificarDivergencias(classified) as any;
                 let vendedor_final: string | undefined = undefined;
                 if (divCheck.status_divergencia === 'OK') {
                    if (classified.tipo === 'PAGA_NO_DIA') {
                        vendedor_final = classified.vendedor_movimento as string;
                    } else {
                        vendedor_final = classified.vendedor_xml;
                    }
                 }
                 nfFull = { ...classified, ...divCheck, vendedor_final } as NFData;
            } else {
                 if (NF_MOVIMENTO[key]) {
                     nfFull = createNfFromMovement(key, NF_MOVIMENTO[key]) as NFData;
                 } else {
                     continue;
                 }
            }
            finalNfList.push(nfFull);
         }
         finalSemNf = VENDAS_SEM_NF;
         finalSaidas = SAIDAS_LISTA;
      }
      const tempDivergences: DivergenceItem[] = [];
      finalNfList.forEach((nf, index) => {
         if (nf.status_divergencia === 'DIVERGENCIA') {
            tempDivergences.push({ nfData: nf, index });
         }
      });
      setProcessedNFs(finalNfList);
      setDivergences(tempDivergences);
      const newReportData = {
        id: reportData?.id,
        monthYear: reportData?.monthYear,
        createdAt: reportData?.createdAt,
        totais_forma: finalTotals,
        vendas_sem_nf_lista: finalSemNf,
        saidas_lista: finalSaidas,
        registros: [] as NFData[],
        divergencias_resolvidas: 0
      };
      setReportData(newReportData as RelatorioFinal);
      
      const period = getPeriodFromData({ ...newReportData, registros: finalNfList } as RelatorioFinal);
      if (period) {
          const files = [];
          if (movFile) files.push("Movimento");
          if (xmlFile) files.push("XML");
          
          // OTIMIZAÇÃO: Atualização manual e controlada de etapas em vez de Effect
          await atualizarEtapaFechamento(period, 'movimentoImportado', true);
          await atualizarEtapaFechamento(period, 'notasImportadas', true);
          await atualizarEtapaFechamento(period, 'conciliado', true);
          if (tempDivergences.length === 0) {
              await atualizarEtapaFechamento(period, 'divergenciasResolvidas', true);
          }

          await registrarEventoFechamento(period, 'IMPORT', `Importação de arquivos: ${files.join(', ')}`);
          if (tempDivergences.length > 0) {
              await registrarEventoFechamento(period, 'DIVERGENCE', `${tempDivergences.length} divergências detectadas.`);
          }
      }
      
      if (tempDivergences.length > 0) {
        setAppState(AppState.RESOLUTION);
        setCurrentDivIndex(0);
      } else {
        setReportData(prev => prev ? ({ ...prev, registros: finalNfList }) : null);
        setAppState(AppState.REPORT);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao processar arquivos.");
      setAppState(AppState.UPLOAD);
    }
  };

  const handleDivergenceResolution = (choice: string) => {
    const currentDivItem = divergences[currentDivIndex];
    if (!currentDivItem) return;
    let finalVendor: string | null = null;
    let finalDate: string | undefined = undefined;
    const { vendedor_movimento, vendedor_xml, vendedor_correto, data_emissao } = currentDivItem.nfData;
    if (['E', 'C', 'T', 'B'].includes(choice)) finalVendor = choice;
    else if (choice === '1') finalVendor = vendedor_movimento!;
    else if (choice === '2') finalVendor = vendedor_correto || null;
    else if (choice === '3') finalVendor = vendedor_xml;
    else if (choice === 'DATE_MOV') { finalVendor = vendedor_movimento!; }
    else if (choice === 'DATE_XML') { finalDate = data_emissao; finalVendor = vendedor_movimento || vendedor_xml; }
    else if (choice === '4') finalVendor = 'IGNORADO'; 
    const updatedNFs = [...processedNFs];
    updatedNFs[currentDivItem.index] = {
      ...updatedNFs[currentDivItem.index],
      vendedor_final: finalVendor || updatedNFs[currentDivItem.index].vendedor_final || 'INDEFINIDO',
      status_divergencia: 'OK'
    };
    if (finalDate) { updatedNFs[currentDivItem.index].data_pagamento_calculada = finalDate; }
    setProcessedNFs(updatedNFs);
    if (currentDivIndex < divergences.length - 1) {
      setCurrentDivIndex(prev => prev + 1);
    } else {
      const finalReport = {
        ...reportData!,
        registros: updatedNFs.filter(n => n.vendedor_final !== 'IGNORADO'),
        divergencias_resolvidas: divergences.length
      } as RelatorioFinal;
      
      setReportData(finalReport);
      
      // OTIMIZAÇÃO: Marca divergências como resolvidas no DB se chegamos ao fim
      const period = getPeriodFromData(finalReport);
      if (period) {
          atualizarEtapaFechamento(period, 'divergenciasResolvidas', true);
      }
      
      setAppState(AppState.REPORT);
    }
  };

  const handleDivergenceBack = () => {
    if (currentDivIndex > 0) { setCurrentDivIndex(prev => prev - 1); }
  };

  const renderContent = () => {
    if (appState === AppState.CONTAS_A_RECEBER) {
        return <ReceivablesDashboard user={user!} />;
    }
    if (appState === AppState.EXPORT_VENDAS_CARTAO) {
        return <CardSalesExport onBack={() => handleNavigation('dashboard')} />;
    }
    if (activeModule === 'dashboard') {
        return (
            <div className="bg-slate-900 min-h-full">
                <CommercialDashboard user={user!} onNavigate={handleNavigation} />
            </div>
        );
    }
    if (activeModule === 'sales') {
        if (activeSubModule === 'budgets') {
            if (appState === AppState.ORCAMENTOS_EDIT) {
                return (
                    <div className="bg-slate-900 min-h-full p-4">
                        <BudgetEditorStep 
                            currentUser={user!} 
                            orcamentoId={selectedOrcamentoId} 
                            onBack={() => setAppState(AppState.ORCAMENTOS_LIST)} 
                        />
                    </div>
                );
            }
            return (
                <div className="bg-slate-900 min-h-full p-4">
                    <BudgetListStep 
                        currentUser={user!} 
                        onNavigateToEdit={handleNavigateToBudgetEdit} 
                        onBack={() => handleNavigation('dashboard')} 
                    />
                </div>
            );
        }
        if (activeSubModule === 'orders') {
            if (appState === AppState.PEDIDOS_DETAIL && selectedPedidoId) {
                return (
                    <div className="bg-slate-900 min-h-full p-4">
                        <OrderDetailStep 
                            currentUser={user!} 
                            pedidoId={selectedPedidoId} 
                            onBack={() => setAppState(AppState.PEDIDOS_LIST)} 
                        />
                    </div>
                );
            }
            return (
                <div className="bg-slate-900 min-h-full p-4">
                    <OrderListStep 
                        currentUser={user!} 
                        onNavigateToDetail={handleNavigateToOrderDetail} 
                        onBack={() => handleNavigation('dashboard')} 
                    />
                </div>
            );
        }
        if (activeSubModule === 'invoices') {
            return <PlaceholderModule title="Emissão de Notas Fiscais" description="Módulo de faturamento e emissão de NFe." icon={Receipt} />;
        }
    }
    if (activeModule === 'daily') {
        if (activeSubModule === 'movimento') {
            return (
                <div className="bg-slate-900 min-h-full p-4">
                    <DailyMovementStep onBack={() => handleNavigation('dashboard')} />
                </div>
            );
        }
        if (activeSubModule === 'eventos') {
            return (
                <div className="bg-slate-900 min-h-full p-4">
                    <FinanceEventsStep onBack={() => handleNavigation('dashboard')} />
                </div>
            );
        }
    }
    if (activeModule === 'closing') {
        if (activeSubModule === 'live') {
            return <MonthlyClosingDashboard user={user!} onNavigate={handleNavigation} />;
        }
        if (activeSubModule === 'summary') {
            return (
                <div className="bg-slate-900 min-h-full p-4">
                    <FinancialSummaryStep onBack={() => handleNavigation('dashboard')} />
                </div>
            );
        }
        if (activeSubModule === 'process') {
            if (appState === AppState.REPORT_LIST) {
                return (
                    <ReportListStep 
                        onSelectReport={handleSelectReport} 
                        onEditReport={handleEditReport}
                        currentUser={user!} 
                        onLogout={() => {}}
                        onNewReport={handleNewReport}
                    />
                );
            }
            if (appState === AppState.UPLOAD) {
                return (
                    <div className="p-6">
                        <button onClick={handleBackToList} className="flex items-center text-slate-400 hover:text-slate-600 transition-colors mb-4">
                            <ArrowLeft className="w-5 h-5 mr-2" /> Cancelar e Voltar
                        </button>
                        <UploadStep onFilesSelected={handleFilesSelected} isEditing={isEditingReport} />
                    </div>
                );
            }
            if (appState === AppState.PROCESSING) {
                return (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-slate-200 border-t-cyan-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Activity className="w-8 h-8 text-cyan-500 animate-pulse" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-slate-700 mb-2">Processando Dados</h3>
                            <p className="text-slate-500 animate-pulse">{loadingMsg}</p>
                        </div>
                    </div>
                );
            }
            if (appState === AppState.RESOLUTION) {
                return (
                    <ResolutionStep 
                        divergence={processedNFs[divergences[currentDivIndex].index]}
                        currentIndex={currentDivIndex}
                        totalDivergences={divergences.length}
                        onResolve={handleDivergenceResolution}
                        onGoBack={handleDivergenceBack}
                    />
                );
            }
            if (appState === AppState.REPORT && reportData) {
                return (
                    <div className="bg-slate-900 min-h-full">
                        <ReportStep 
                            data={reportData} 
                            currentUser={user!}
                            onRestart={handleRestart}
                            onBackToList={handleBackToList}
                        />
                    </div>
                );
            }
            return <ReportListStep onSelectReport={handleSelectReport} onEditReport={handleEditReport} currentUser={user!} onLogout={() => {}} onNewReport={handleNewReport} />;
        }
    }
    if (activeModule === 'commissions') {
        if (activeSubModule === 'dashboard' || activeSubModule === 'period') {
            return (
                <div className="bg-slate-900 min-h-full p-4">
                    <CommissionDashboardStep onBack={() => handleNavigation('dashboard')} />
                </div>
            );
        }
    }
    if (activeModule === 'intelligence') {
        if (activeSubModule === 'agent') {
            return (
                <div className="bg-slate-900 min-h-full p-4">
                    <CommercialAgentStep onBack={() => handleNavigation('dashboard')} currentUser={user!} />
                </div>
            );
        }
        if (activeSubModule === 'alerts') {
            return (
                <div className="bg-slate-900 min-h-full p-4">
                    <IntelligenceAlerts onBack={() => handleNavigation('dashboard')} currentUser={user!} />
                </div>
            );
        }
        if (activeSubModule === 'execution_hub') {
            return (
                <div className="bg-slate-900 min-h-full p-4">
                    <ExecutionHub onBack={() => handleNavigation('dashboard')} currentUser={user!} />
                </div>
            );
        }
    }
    if (activeModule === 'registers') {
        if (activeSubModule === 'clients') {
            if (appState === AppState.IMPORT_CLIENTES) {
                return (
                    <div className="bg-slate-900 min-h-full p-4">
                        <ImportClientesStep onBack={() => handleNavigation('dashboard')} />
                    </div>
                );
            }
            if (appState === AppState.IMPORT_HISTORICO) {
                return (
                    <div className="bg-slate-900 min-h-full p-4">
                        <ImportHistoryStep onBack={() => handleNavigation('dashboard')} />
                    </div>
                );
            }
            return (
                <div className="bg-slate-900 min-h-full p-4">
                    <CustomerQueryStep onBack={() => handleNavigation('dashboard')} currentUser={user!} />
                </div>
            );
        }
        if (activeSubModule === 'products') {
            if (appState === AppState.IMPORT_PRODUCTS) {
                 return (
                    <div className="bg-slate-900 min-h-full p-4">
                        <ImportProductsStep onBack={() => setAppState(AppState.CONSULTA_PRODUTOS)} />
                    </div>
                 );
            }
            return (
                <div className="bg-slate-900 min-h-full p-4">
                    <ProductQueryStep 
                        onBack={() => handleNavigation('dashboard')} 
                        currentUser={user!} 
                        onImport={() => setAppState(AppState.IMPORT_PRODUCTS)}
                    />
                </div>
            );
        }
    }
    if (activeModule === 'settings') {
        if (activeSubModule === 'sellers') {
            return (
                <div className="bg-slate-900 min-h-full p-4">
                    <SellerListStep onBack={() => handleNavigation('dashboard')} currentUser={user!} />
                </div>
            );
        }
    }
    return <PlaceholderModule title={activeModule?.toUpperCase()} description="Módulo em desenvolvimento." icon={Box} />;
  };

  return (
    <NotificationProvider>
        <ClientProvider>
        {user ? (
            <AppLayout 
                user={user} 
                activeModule={activeModule}
                activeSubModule={activeSubModule}
                onNavigate={handleNavigation}
                onLogout={handleLogout}
                activeContextLabel={reportData?.monthYear}
            >
                {renderContent()}
            </AppLayout>
        ) : (
            <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-200">
                <LoginStep onLogin={handleLogin} />
            </div>
        )}
        </ClientProvider>
    </NotificationProvider>
  );
};

export default App;
