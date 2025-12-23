
import React, { useState, useMemo, useEffect } from 'react';
import { Upload, FileArchive, Calendar, CheckCircle, Circle, RefreshCw, Save, ArrowLeft, Search, Trash2, X } from 'lucide-react';
import { User, UserRole, PaymentReport, NfeEntrada, SavedReportMetadata } from '../types';
import { processarXmlEntrada } from '../services/logic';
import { savePaymentReportToStorage, loadPaymentReportFromStorage, listSavedReports, deleteReportFromStorage } from '../services/storage';
import ChatWidget from './ChatWidget';

interface PaymentModuleProps {
  user: User;
  onBack: () => void;
}

const PaymentModule: React.FC<PaymentModuleProps> = ({ user, onBack }) => {
  const [viewState, setViewState] = useState<'UPLOAD' | 'DASHBOARD'>('UPLOAD');
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [data, setData] = useState<PaymentReport | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReportMetadata[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // States for Deletion
  const [reportToDelete, setReportToDelete] = useState<SavedReportMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOperador = user.role === UserRole.OPERADOR;

  const fetchReports = async () => {
    try {
        const list = await listSavedReports();
        setSavedReports(list.filter(r => r.type === 'PAYMENT'));
    } catch (error) {
        console.error("Erro ao listar pagamentos", error);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleProcess = async () => {
    if (!xmlFile) return;
    setProcessing(true);
    try {
        const items = await processarXmlEntrada(xmlFile);
        // Added required 'createdAt' property to fix type error
        const report: PaymentReport = {
            items,
            createdAt: new Date().toISOString()
        };
        setData(report);
        setViewState('DASHBOARD');
    } catch (e) {
        alert("Erro ao processar arquivo");
    } finally {
        setProcessing(false);
    }
  };

  const handleLoadSaved = async (id: string) => {
    const loaded = await loadPaymentReportFromStorage(id);
    if (loaded) {
        setData(loaded);
        setViewState('DASHBOARD');
    } else {
        alert("Erro ao carregar relatório salvo");
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, report: SavedReportMetadata) => {
    e.stopPropagation();
    setReportToDelete(report);
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;
    
    setIsDeleting(true);
    const success = await deleteReportFromStorage(reportToDelete.id, 'PAYMENT');
    
    if (success) {
        // Refresh list logic
        setSavedReports(prev => prev.filter(r => r.id !== reportToDelete.id));
        setReportToDelete(null);
    } else {
        alert("Erro ao excluir. Tente novamente.");
    }
    setIsDeleting(false);
  };

  const togglePaymentStatus = (nfeIndex: number, parcelaIndex: number) => {
    if (!data) return;
    const newData = { ...data };
    const p = newData.items[nfeIndex].parcelas[parcelaIndex];
    p.status = p.status === 'pendente' ? 'pago' : 'pendente';
    setData(newData);
  };

  const handleSave = async () => {
     if (data) {
        setSaveStatus('saving');
        
        // Timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 15000)
        );

        try {
            const result = await Promise.race([
                savePaymentReportToStorage(data),
                timeoutPromise
            ]);

            const success = result as boolean;
            if (success) {
                setSaveStatus('saved');
                fetchReports(); // Refresh list after saving
            } else {
                setSaveStatus('error');
                alert("Falha ao salvar. Verifique se as configurações do Firebase em 'services/firebase.ts' estão corretas.");
            }
        } catch (e: any) {
            setSaveStatus('error');
            if (e.message === "Timeout") {
                alert("O salvamento demorou muito e foi cancelado. Verifique sua conexão ou se as chaves do Firebase estão corretas.");
            } else {
                alert("Erro ao salvar: " + e.message);
            }
        } finally {
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
     }
  };

  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const fmtDate = (d: string) => {
     if(!d) return "-";
     const [y, m, da] = d.split('-');
     return `${da}/${m}/${y}`;
  }

  // Flatten parcels for listing
  const flatParcels = useMemo(() => {
     if (!data) return [];
     const list: any[] = [];
     data.items.forEach((nfe, nfeIdx) => {
        nfe.parcelas.forEach((p, pIdx) => {
            list.push({
                ...p,
                fornecedor: nfe.fornecedor,
                nfeIndex: nfeIdx,
                pIndex: pIdx,
                nfNum: nfe.numero_nf
            });
        });
     });
     return list.sort((a,b) => a.dVenc.localeCompare(b.dVenc));
  }, [data]);

  const filteredParcels = useMemo(() => {
    if (!searchTerm) return flatParcels;
    const lower = searchTerm.toLowerCase();
    return flatParcels.filter(p => 
        p.fornecedor.toLowerCase().includes(lower) ||
        p.nfNum.includes(lower) ||
        p.nDup.includes(lower) ||
        fmtCurrency(p.vDup).includes(lower) ||
        fmtDate(p.dVenc).includes(lower)
    );
  }, [flatParcels, searchTerm]);

  const stats = useMemo(() => {
    let total = 0;
    let pago = 0;
    let pendente = 0;
    filteredParcels.forEach(p => {
        total += p.vDup;
        if (p.status === 'pago') pago += p.vDup;
        else pendente += p.vDup;
    });
    return { total, pago, pendente };
  }, [filteredParcels]);


  if (viewState === 'UPLOAD') {
     return (
        <div className="max-w-4xl mx-auto mt-8 px-6">
            <button onClick={onBack} className="flex items-center text-slate-400 hover:text-white mb-6">
                <ArrowLeft className="w-5 h-5 mr-2" /> Voltar ao Menu
            </button>
            <h2 className="text-3xl font-orbitron font-bold text-white mb-8">Pagamentos a Efetuar</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* UPLOAD CARD */}
               {isOperador ? (
                   <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
                      <h3 className="text-xl font-bold text-white mb-4">Novo Processamento</h3>
                      <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:bg-slate-800 transition-colors relative">
                        <input 
                            type="file" 
                            accept=".zip"
                            onChange={(e) => setXmlFile(e.target.files ? e.target.files[0] : null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {xmlFile ? (
                            <div>
                                <FileArchive className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                                <p className="text-white font-medium">{xmlFile.name}</p>
                            </div>
                        ) : (
                            <div>
                                <Upload className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                                <p className="text-slate-400">Upload ZIP XML Entrada</p>
                            </div>
                        )}
                      </div>
                      <button 
                         onClick={handleProcess}
                         disabled={!xmlFile || processing}
                         className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                         {processing ? <RefreshCw className="animate-spin" /> : "Processar Arquivos"}
                      </button>
                   </div>
               ) : (
                   <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-8 flex items-center justify-center text-slate-500">
                      <p>Acesso de Consulta - Selecione um mês ao lado</p>
                   </div>
               )}

               {/* SAVED LIST */}
               <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
                  <h3 className="text-xl font-bold text-white mb-4">Consultar Mês Salvo</h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                     {savedReports.length === 0 && <p className="text-slate-500 text-sm">Nenhum registro encontrado.</p>}
                     {savedReports.map(r => (
                        <div key={r.id} className="relative group">
                            <button 
                                onClick={() => handleLoadSaved(r.id)}
                                className="w-full flex justify-between items-center p-4 bg-slate-900 border border-slate-800 rounded-lg hover:border-emerald-500 transition-colors group-hover:bg-slate-800"
                            >
                                <span className="text-slate-300 font-bold group-hover:text-emerald-400">{r.monthYear}</span>
                                <span className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                            </button>
                            
                            {isOperador && (
                                <button 
                                    onClick={(e) => handleDeleteClick(e, r)}
                                    className="absolute right-2 top-2 p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-full transition-colors z-10"
                                    title="Excluir Mês"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* CONFIRMATION MODAL */}
            {reportToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
                        <button 
                            onClick={() => setReportToDelete(null)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Excluir Pagamentos?</h3>
                            <p className="text-slate-400 text-sm mb-6">
                                Tem certeza que deseja excluir o registro de <span className="text-white font-bold">{reportToDelete.monthYear}</span>? <br/>
                                Esta ação não pode ser desfeita.
                            </p>
                            
                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={() => setReportToDelete(null)}
                                    className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-lg hover:bg-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors flex justify-center items-center"
                                >
                                    {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Sim, Excluir"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
     );
  }

  return (
    <div className="max-w-6xl mx-auto mt-8 px-6 pb-20 relative">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setViewState('UPLOAD')} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h2 className="text-2xl font-orbitron font-bold text-white">Gestão de Pagamentos</h2>
                <p className="text-slate-400 text-sm">{data?.monthYear || "Mês atual"}</p>
            </div>
          </div>
          {isOperador && (
            <button 
                onClick={handleSave}
                disabled={saveStatus === 'saved'}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow-lg transition-colors ${
                   saveStatus === 'saved' ? 'bg-emerald-900/50 border border-emerald-700 text-emerald-400' :
                   saveStatus === 'error' ? 'bg-red-900/50 border border-red-700 text-red-400' :
                   'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20'
                }`}
            >
                <Save className="w-4 h-4" />
                {saveStatus === 'saving' ? 'Salvando...' : 
                 saveStatus === 'saved' ? 'Salvo no Dispositivo' : 
                 saveStatus === 'error' ? 'Erro ao Salvar' :
                 'Salvar Processamento'}
            </button>
          )}
       </div>

       {/* KPI */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
              <p className="text-xs font-bold text-slate-500 uppercase">Total a Pagar</p>
              <p className="text-2xl font-black text-white">{fmtCurrency(stats.total)}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
              <p className="text-xs font-bold text-emerald-500 uppercase">Pago</p>
              <p className="text-2xl font-black text-emerald-400">{fmtCurrency(stats.pago)}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
              <p className="text-xs font-bold text-amber-500 uppercase">Pendente</p>
              <p className="text-2xl font-black text-amber-400">{fmtCurrency(stats.pendente)}</p>
          </div>
       </div>

       {/* SEARCH BAR */}
       <div className="mb-6 relative">
          <Search className="h-5 w-5 text-slate-500 absolute top-3.5 left-3" />
          <input 
             type="text" 
             className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-lg bg-slate-800/50 text-slate-200 focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-500" 
             placeholder="Buscar boleto por fornecedor, valor, data..." 
             value={searchTerm} 
             onChange={(e) => setSearchTerm(e.target.value)} 
          />
       </div>

       {/* LIST */}
       <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                    <tr>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Vencimento</th>
                        <th className="px-6 py-4">Fornecedor</th>
                        <th className="px-6 py-4">NF / Parcela</th>
                        <th className="px-6 py-4 text-right">Valor</th>
                        <th className="px-6 py-4 text-center">Ação</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-700">
                    {filteredParcels.map((p, idx) => {
                        const isPaid = p.status === 'pago';
                        return (
                            <tr key={idx} className={`hover:bg-slate-800/80 transition-colors ${isPaid ? 'opacity-50' : ''}`}>
                                <td className="px-6 py-4">
                                    {isPaid ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-900/30 text-emerald-400 rounded text-xs font-bold border border-emerald-800">
                                            <CheckCircle className="w-3 h-3" /> PAGO
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-900/30 text-amber-400 rounded text-xs font-bold border border-amber-800">
                                            <Circle className="w-3 h-3" /> PENDENTE
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 font-mono text-slate-300">{fmtDate(p.dVenc)}</td>
                                <td className="px-6 py-4 font-bold text-white">{p.fornecedor}</td>
                                <td className="px-6 py-4 text-slate-400">NF {p.nfNum} <span className="text-xs opacity-50">({p.nDup})</span></td>
                                <td className="px-6 py-4 text-right font-medium text-slate-200">{fmtCurrency(p.vDup)}</td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => togglePaymentStatus(p.nfeIndex, p.pIndex)}
                                        className={`text-xs font-bold px-3 py-1 rounded transition-colors ${
                                            isPaid 
                                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                                            : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                        }`}
                                    >
                                        {isPaid ? "Desmarcar" : "Baixar"}
                                    </button>
                                </td>
                            </tr>
                        )
                    })}
                    {filteredParcels.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                Nenhum pagamento encontrado para sua busca.
                            </td>
                        </tr>
                    )}
                 </tbody>
              </table>
          </div>
       </div>

       {/* CHAT AI WIDGET */}
       <ChatWidget data={flatParcels} mode="PAYMENT" />
    </div>
  );
};

export default PaymentModule;
