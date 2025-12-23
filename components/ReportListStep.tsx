
import React, { useEffect, useState } from 'react';
import { FileText, Calendar, ChevronRight, HardDrive, AlertTriangle, RefreshCw, Trash2, X, PlusCircle, Edit } from 'lucide-react';
import { SavedReportMetadata, User, UserRole } from '../types';
import { listSavedReports, deleteReportFromStorage } from '../services/storage';

interface ReportListStepProps {
  onSelectReport: (id: string) => void;
  onEditReport?: (id: string) => void;
  onLogout: () => void;
  currentUser: User;
  onNewReport?: () => void; // Callback para criar novo
}

const ReportListStep: React.FC<ReportListStepProps> = ({ onSelectReport, onEditReport, onLogout, currentUser, onNewReport }) => {
  const [reports, setReports] = useState<SavedReportMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for deletion modal
  const [reportToDelete, setReportToDelete] = useState<SavedReportMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listSavedReports();
      setReports(list);
    } catch (e: any) {
      console.error(e);
      // Mensagem amigável baseada no erro
      let msg = "Não foi possível conectar ao banco de dados.";
      
      if (e.code === 'auth/network-request-failed') {
          msg = "Erro de conexão. Verifique sua internet.";
      } else if (e.code === 'auth/operation-not-allowed') {
          msg = "Erro de configuração: O login 'Anônimo' não está ativado no Firebase Console.";
      } else if (e.code === 'auth/unauthorized-domain') {
          msg = "Erro de domínio: Este endereço (site/IP) não está autorizado no Firebase Authentication.";
      } else if (e.message) {
          msg = `Erro técnico: ${e.message}`;
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDeleteClick = (e: React.MouseEvent, report: SavedReportMetadata) => {
    e.stopPropagation(); // Prevent opening the report
    setReportToDelete(report);
  };

  const handleEditClick = (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    if (onEditReport) onEditReport(reportId);
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;

    if (currentUser.role !== UserRole.OPERADOR) {
      alert("Acesso restrito ao perfil OPERADOR.");
      setReportToDelete(null);
      return;
    }

    setIsDeleting(true);
    const success = await deleteReportFromStorage(reportToDelete.id, reportToDelete.type);
    
    if (success) {
      // Update local state to remove item
      setReports(prev => prev.filter(r => r.id !== reportToDelete.id || r.type !== reportToDelete.type));
      setReportToDelete(null);
    } else {
      alert("Erro ao excluir. Verifique sua permissão ou conexão.");
    }
    setIsDeleting(false);
  };

  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="max-w-4xl mx-auto mt-8 p-4 md:p-8 relative">
       <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-slate-700 pb-4 gap-4">
         <div>
            <h2 className="text-2xl font-orbitron font-bold text-white mb-2">Gestão de Fechamentos</h2>
            <p className="text-slate-400">Histórico de Fechamentos Salvos na Nuvem</p>
         </div>
         
         <div className="flex gap-4">
            {currentUser.role === UserRole.OPERADOR && onNewReport && (
                <button 
                    onClick={onNewReport}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold shadow-lg shadow-cyan-900/30 transition-all hover:scale-105"
                >
                    <PlusCircle className="w-5 h-5" /> Novo Processamento
                </button>
            )}
            <button onClick={onLogout} className="text-sm text-red-400 hover:text-red-300 underline self-center">
                Voltar
            </button>
         </div>
       </div>

       {loading ? (
          <div className="text-center p-12 text-slate-500 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
              <span>Carregando relatórios do servidor...</span>
          </div>
       ) : error ? (
         <div className="bg-red-900/20 border border-red-800 rounded-xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl text-red-400 font-bold mb-2">Falha na Conexão</h3>
            <p className="text-red-300 mb-6 max-w-lg mx-auto">{error}</p>
            <button 
              onClick={fetchReports}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2 mx-auto"
            >
               <RefreshCw className="w-4 h-4" /> Tentar Novamente
            </button>
         </div>
       ) : reports.length === 0 ? (
         <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
            <HardDrive className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl text-slate-300 font-bold">Nenhum registro encontrado</h3>
            <p className="text-slate-500 mt-2">Nenhum fechamento salvo na nuvem ainda.</p>
            <div className="flex justify-center gap-4 mt-6">
                <button 
                    onClick={fetchReports}
                    className="px-4 py-2 border border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg text-sm transition-colors"
                >
                    Recarregar Lista
                </button>
                {currentUser.role === UserRole.OPERADOR && onNewReport && (
                    <button 
                        onClick={onNewReport}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-sm transition-colors"
                    >
                        Criar o Primeiro
                    </button>
                )}
            </div>
         </div>
       ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-[fadeIn_0.3s_ease-out]">
            {reports.map((report) => (
              <div key={`${report.type}-${report.id}`} className="relative group">
                <button
                    onClick={() => onSelectReport(report.id)}
                    className="w-full bg-slate-800 border border-slate-700 hover:border-cyan-500 rounded-xl p-6 transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] text-left flex flex-col justify-between h-40"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FileText className="w-24 h-24 text-cyan-400" />
                    </div>
                    
                    <div>
                        <div className="flex items-center gap-2 text-cyan-400 mb-2">
                            <Calendar className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">{report.id}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors pr-8">
                            {report.monthYear}
                        </h3>
                    </div>

                    <div className="flex justify-between items-end mt-4">
                        <div>
                            <p className="text-xs text-slate-500 uppercase">Total Consolidado</p>
                            <p className="text-lg font-bold text-green-400">{fmtCurrency(report.totalValue)}</p>
                        </div>
                        <div className="bg-slate-700 group-hover:bg-cyan-600 p-2 rounded-full transition-colors">
                            <ChevronRight className="w-5 h-5 text-white" />
                        </div>
                    </div>
                </button>
                
                {/* Actions for OPERADOR */}
                {currentUser.role === UserRole.OPERADOR && report.type === 'SALES' && (
                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                        <button
                            onClick={(e) => handleEditClick(e, report.id)}
                            className="p-2 bg-slate-700/50 hover:bg-blue-600/90 text-slate-400 hover:text-white rounded-lg transition-colors border border-transparent hover:border-blue-500"
                            title="Editar Fechamento"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={(e) => handleDeleteClick(e, report)}
                            className="p-2 bg-slate-700/50 hover:bg-red-600/90 text-slate-400 hover:text-white rounded-lg transition-colors border border-transparent hover:border-red-500"
                            title="Excluir Fechamento"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
                {/* Delete only for payment if OPERADOR */}
                {currentUser.role === UserRole.OPERADOR && report.type === 'PAYMENT' && (
                     <button 
                        onClick={(e) => handleDeleteClick(e, report)}
                        className="absolute top-4 right-4 p-2 bg-slate-700/50 hover:bg-red-600/90 text-slate-400 hover:text-white rounded-lg transition-colors z-10 border border-transparent hover:border-red-500"
                        title="Excluir Mês"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
              </div>
            ))}
         </div>
       )}

       {/* Confirmation Modal */}
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
                    <h3 className="text-xl font-bold text-white mb-2">Excluir Fechamento?</h3>
                    <p className="text-slate-400 text-sm mb-6">
                        Tem certeza que deseja excluir o fechamento de <span className="text-white font-bold">{reportToDelete.monthYear}</span>? <br/>
                        Esta ação removerá os dados da nuvem permanentemente.
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
};

export default ReportListStep;
