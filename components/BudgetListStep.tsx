
import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, FileText, Search, Filter, Calendar, 
  ArrowRight, User, AlertCircle, CheckCircle, XCircle, Clock, ShoppingCart
} from 'lucide-react';
import { Orcamento, OrcamentoStatus, User as AppUser, UserRole } from '../types';
import { listarOrcamentos } from '../services/budgets';

interface BudgetListStepProps {
  currentUser: AppUser;
  onNavigateToEdit: (orcamentoId?: string) => void;
  onBack: () => void;
}

const BudgetListStep: React.FC<BudgetListStepProps> = ({ currentUser, onNavigateToEdit, onBack }) => {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrcamentoStatus | 'TODOS'>('TODOS');

  const fetchOrcamentos = async () => {
    setLoading(true);
    const data = await listarOrcamentos();
    setOrcamentos(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrcamentos();
  }, []);

  const filteredList = orcamentos.filter(orc => {
    const matchesSearch = 
      orc.clienteNomeSnapshot.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orc.vendedor.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'TODOS' || orc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  const StatusBadge = ({ status }: { status: OrcamentoStatus }) => {
     switch(status) {
         case 'RASCUNHO': return <span className="px-2 py-1 rounded text-[10px] font-bold bg-slate-700 text-slate-300 border border-slate-600 flex items-center gap-1 w-fit"><Clock className="w-3 h-3"/> RASCUNHO</span>;
         case 'ENVIADO': return <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-900/30 text-blue-400 border border-blue-800 flex items-center gap-1 w-fit"><ArrowRight className="w-3 h-3"/> ENVIADO</span>;
         case 'APROVADO': return <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-900/30 text-emerald-400 border border-emerald-800 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3"/> APROVADO</span>;
         case 'CONVERTIDO': return <span className="px-2 py-1 rounded text-[10px] font-bold bg-indigo-900/30 text-indigo-400 border border-indigo-800 flex items-center gap-1 w-fit"><ShoppingCart className="w-3 h-3"/> CONVERTIDO</span>;
         case 'CANCELADO': return <span className="px-2 py-1 rounded text-[10px] font-bold bg-red-900/30 text-red-400 border border-red-800 flex items-center gap-1 w-fit"><XCircle className="w-3 h-3"/> CANCELADO</span>;
         case 'EXPIRADO': return <span className="px-2 py-1 rounded text-[10px] font-bold bg-orange-900/30 text-orange-400 border border-orange-800 flex items-center gap-1 w-fit"><AlertCircle className="w-3 h-3"/> EXPIRADO</span>;
         default: return null;
     }
  };

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 md:px-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
           <h2 className="text-2xl md:text-3xl font-orbitron font-bold text-white mb-1">Orçamentos</h2>
           <p className="text-slate-400 text-sm">Gestão de propostas comerciais.</p>
        </div>
        
        {currentUser.role === UserRole.OPERADOR && (
            <button 
                onClick={() => onNavigateToEdit()}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold shadow-lg shadow-cyan-900/20 transition-all"
            >
                <PlusCircle className="w-5 h-5" /> Novo Orçamento
            </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
             <Search className="h-5 w-5 text-slate-500 absolute top-2.5 left-3" />
             <input 
                type="text" 
                placeholder="Buscar por Cliente, Nº ou Vendedor..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 outline-none"
             />
          </div>
          <div className="relative min-w-[200px]">
             <Filter className="h-4 w-4 text-slate-500 absolute top-3 left-3" />
             <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 outline-none appearance-none"
             >
                 <option value="TODOS">Todos Status</option>
                 <option value="RASCUNHO">Rascunho</option>
                 <option value="ENVIADO">Enviado</option>
                 <option value="APROVADO">Aprovado</option>
                 <option value="CONVERTIDO">Convertido</option>
                 <option value="CANCELADO">Cancelado</option>
                 <option value="EXPIRADO">Expirado</option>
             </select>
          </div>
      </div>

      {/* List */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden min-h-[400px]">
         {loading ? (
             <div className="flex justify-center items-center py-20 text-slate-500 gap-2">
                 <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full"></div>
                 Carregando...
             </div>
         ) : filteredList.length === 0 ? (
             <div className="text-center py-20 text-slate-500">
                 <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                 <p>Nenhum orçamento encontrado.</p>
             </div>
         ) : (
             <table className="w-full text-left text-sm">
                 <thead className="bg-slate-900 text-slate-400 uppercase text-xs font-bold">
                     <tr>
                         <th className="px-6 py-4">Nº / Data</th>
                         <th className="px-6 py-4">Cliente</th>
                         <th className="px-6 py-4">Status</th>
                         <th className="px-6 py-4 text-center">Vendedor</th>
                         <th className="px-6 py-4 text-right">Total</th>
                         <th className="px-6 py-4"></th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-700">
                     {filteredList.map(orc => (
                         <tr key={orc.id} onClick={() => onNavigateToEdit(orc.id)} className="hover:bg-slate-700/50 transition-colors cursor-pointer group">
                             <td className="px-6 py-4">
                                 <span className="block font-mono text-cyan-400 font-bold">#{orc.id.slice(0, 8).toUpperCase()}</span>
                                 <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                    <Calendar className="w-3 h-3" /> {fmtDate(orc.dataCriacao)}
                                 </span>
                             </td>
                             <td className="px-6 py-4 font-medium text-white">
                                 {orc.clienteNomeSnapshot}
                             </td>
                             <td className="px-6 py-4">
                                 <StatusBadge status={orc.status} />
                             </td>
                             <td className="px-6 py-4 text-center">
                                 <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300">
                                    <User className="w-3 h-3" /> {orc.vendedor}
                                 </div>
                             </td>
                             <td className="px-6 py-4 text-right font-bold text-white text-base">
                                 {fmtCurrency(orc.totais.total)}
                             </td>
                             <td className="px-6 py-4 text-right">
                                 <button className="p-2 text-slate-400 hover:text-white transition-colors">
                                     <ArrowRight className="w-5 h-5" />
                                 </button>
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
         )}
      </div>
    </div>
  );
};

export default BudgetListStep;
