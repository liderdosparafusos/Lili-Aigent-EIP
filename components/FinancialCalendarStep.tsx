import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Calendar, PlusCircle, Filter, CheckCircle, 
  XCircle, Clock, ChevronLeft, ChevronRight, List, Grid, DollarSign,
  TrendingUp, TrendingDown, RefreshCw
} from 'lucide-react';
import { ItemCalendario, User, UserRole } from '../types';
import { listarCalendario, atualizarStatusItem, gerarCalendarioDeEventos, criarItemManual } from '../services/calendar';

interface FinancialCalendarStepProps {
  onBack: () => void;
  currentUser: User;
}

const FinancialCalendarStep: React.FC<FinancialCalendarStepProps> = ({ onBack, currentUser }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<ItemCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'LIST'>('CALENDAR');
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RECEBER' | 'PAGAR'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDENTE' | 'PAGO'>('ALL');

  // Manual Creation Modal
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState<Partial<ItemCalendario>>({
      tipo: 'PAGAR',
      status: 'PENDENTE',
      dataPrevista: new Date().toISOString().split('T')[0],
      valor: 0,
      entidade: { tipo: 'INTERNO', nome: '' }
  });

  const loadData = async () => {
    setLoading(true);
    // Fetch current month data
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const data = await listarCalendario(`${year}-${month}`, `${year}-${month}`);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const handleSyncEvents = async () => {
      setLoading(true);
      await gerarCalendarioDeEventos(); // Sync from Financial Events
      await loadData();
  };

  const changeMonth = (delta: number) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + delta);
      setCurrentDate(newDate);
  };

  const toggleStatus = async (item: ItemCalendario) => {
      if (currentUser.role === UserRole.CONSULTA && item.tipo !== 'RECEBER' && item.status === 'PAGO') {
          // Consult/Operator rules: can mark as paid. Logic check generally handled by backend rules or simple UI guard.
          // Allowing toggle for now.
      }
      
      const newStatus = item.status === 'PENDENTE' ? 'PAGO' : 'PENDENTE';
      const paymentDate = newStatus === 'PAGO' ? new Date().toISOString().split('T')[0] : undefined;
      
      await atualizarStatusItem(item.id, newStatus, paymentDate);
      
      // Optimistic update
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus, dataPagamento: paymentDate } : i));
  };

  const handleSaveManual = async () => {
      if (!newItem.valor || !newItem.entidade?.nome) return alert("Preencha valor e nome.");
      
      await criarItemManual({
          tipo: newItem.tipo as any,
          status: 'PENDENTE',
          dataPrevista: newItem.dataPrevista!,
          valor: parseFloat(newItem.valor.toString()),
          entidade: {
              tipo: 'INTERNO',
              nome: newItem.entidade.nome
          },
          referencia: {},
          observacao: newItem.observacao
      });
      
      setShowModal(false);
      loadData();
  };

  // Calculations
  const filteredItems = useMemo(() => {
      return items.filter(i => {
          if (typeFilter !== 'ALL' && i.tipo !== typeFilter) return false;
          if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
          return true;
      });
  }, [items, typeFilter, statusFilter]);

  const totals = useMemo(() => {
      let pagar = 0;
      let receber = 0;
      let saldo = 0;
      
      filteredItems.forEach(i => {
          if (i.status === 'CANCELADO') return;
          if (i.tipo === 'PAGAR') pagar += i.valor;
          else receber += i.valor;
      });
      saldo = receber - pagar;
      return { pagar, receber, saldo };
  }, [filteredItems]);

  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- RENDER HELPERS ---
  const getDayItems = (day: number) => {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return filteredItems.filter(i => i.dataPrevista === dateStr);
  };

  const renderCalendarGrid = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday

      const days = [];
      for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-32 bg-slate-900/30 border border-slate-800"></div>);
      
      for (let d = 1; d <= daysInMonth; d++) {
          const dayItems = getDayItems(d);
          const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
          
          days.push(
              <div key={d} className={`h-32 border border-slate-800 p-2 overflow-hidden relative group ${isToday ? 'bg-slate-800/80 ring-1 ring-cyan-500' : 'bg-slate-900/50 hover:bg-slate-800'}`}>
                  <span className={`text-sm font-bold ${isToday ? 'text-cyan-400' : 'text-slate-500'}`}>{d}</span>
                  <div className="mt-1 space-y-1 overflow-y-auto max-h-[90px] custom-scrollbar">
                      {dayItems.map(item => (
                          <div 
                            key={item.id} 
                            className={`text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer ${
                                item.tipo === 'RECEBER' 
                                ? (item.status === 'PAGO' ? 'bg-emerald-900/30 border-emerald-800 text-emerald-500 line-through opacity-50' : 'bg-emerald-900/50 border-emerald-600 text-white')
                                : (item.status === 'PAGO' ? 'bg-red-900/30 border-red-800 text-red-500 line-through opacity-50' : 'bg-red-900/50 border-red-600 text-white')
                            }`}
                            onClick={() => toggleStatus(item)}
                            title={`${item.entidade.nome} - ${fmtCurrency(item.valor)}`}
                          >
                              {item.entidade.nome}
                          </div>
                      ))}
                  </div>
                  {/* Add Button on Hover */}
                  {currentUser.role === UserRole.OPERADOR && (
                      <button 
                        onClick={() => {
                            setNewItem({ ...newItem, dataPrevista: `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}` });
                            setShowModal(true);
                        }}
                        className="absolute bottom-1 right-1 p-1 bg-slate-700 hover:bg-cyan-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                          <PlusCircle className="w-3 h-3" />
                      </button>
                  )}
              </div>
          );
      }
      return days;
  };

  return (
    <div className="max-w-7xl mx-auto mt-6 px-4 pb-20">
       
       {/* HEADER */}
       <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
           <div className="flex items-center gap-4">
               <button onClick={onBack} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                   <ArrowLeft className="w-5 h-5" />
               </button>
               <div>
                   <h2 className="text-2xl font-bold text-white font-orbitron">Calendário Financeiro</h2>
                   <p className="text-slate-400 text-sm">Planejamento de Contas a Pagar e Receber</p>
               </div>
           </div>
           
           <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg">
               <button onClick={() => setViewMode('CALENDAR')} className={`p-2 rounded ${viewMode === 'CALENDAR' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
                   <Grid className="w-5 h-5" />
               </button>
               <button onClick={() => setViewMode('LIST')} className={`p-2 rounded ${viewMode === 'LIST' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
                   <List className="w-5 h-5" />
               </button>
           </div>
       </div>

       {/* CONTROLS */}
       <div className="flex flex-col lg:flex-row gap-4 mb-6">
           <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-1">
               <button onClick={() => changeMonth(-1)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
                   <ChevronLeft className="w-5 h-5" />
               </button>
               <div className="px-4 text-center min-w-[150px]">
                   <span className="text-white font-bold block uppercase">{currentDate.toLocaleString('pt-BR', { month: 'long' })}</span>
                   <span className="text-xs text-slate-500">{currentDate.getFullYear()}</span>
               </div>
               <button onClick={() => changeMonth(1)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
                   <ChevronRight className="w-5 h-5" />
               </button>
           </div>

           <div className="flex flex-wrap gap-2 items-center flex-1">
               <button onClick={() => setTypeFilter('ALL')} className={`px-3 py-1.5 rounded text-sm font-bold border ${typeFilter === 'ALL' ? 'bg-slate-700 text-white border-slate-500' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>Todos</button>
               <button onClick={() => setTypeFilter('RECEBER')} className={`px-3 py-1.5 rounded text-sm font-bold border ${typeFilter === 'RECEBER' ? 'bg-emerald-900/50 text-emerald-400 border-emerald-600' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>Receber</button>
               <button onClick={() => setTypeFilter('PAGAR')} className={`px-3 py-1.5 rounded text-sm font-bold border ${typeFilter === 'PAGAR' ? 'bg-red-900/50 text-red-400 border-red-600' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>Pagar</button>
               
               <div className="h-6 w-px bg-slate-700 mx-2"></div>

               <button onClick={handleSyncEvents} className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-bold border border-cyan-700 text-cyan-400 hover:bg-cyan-900/30">
                   <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sincronizar
               </button>
               
               {currentUser.role === UserRole.OPERADOR && (
                   <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-bold bg-cyan-600 text-white hover:bg-cyan-500 ml-auto">
                       <PlusCircle className="w-4 h-4" /> Novo Lançamento
                   </button>
               )}
           </div>
       </div>

       {/* TOTALS */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
           <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex justify-between items-center">
               <div>
                   <p className="text-xs text-slate-500 uppercase font-bold">Total a Receber</p>
                   <p className="text-xl font-bold text-emerald-400">{fmtCurrency(totals.receber)}</p>
               </div>
               <TrendingUp className="w-8 h-8 text-emerald-500/50" />
           </div>
           <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex justify-between items-center">
               <div>
                   <p className="text-xs text-slate-500 uppercase font-bold">Total a Pagar</p>
                   <p className="text-xl font-bold text-red-400">{fmtCurrency(totals.pagar)}</p>
               </div>
               <TrendingDown className="w-8 h-8 text-red-500/50" />
           </div>
           <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex justify-between items-center">
               <div>
                   <p className="text-xs text-slate-500 uppercase font-bold">Saldo Previsto</p>
                   <p className={`text-xl font-bold ${totals.saldo >= 0 ? 'text-white' : 'text-red-400'}`}>{fmtCurrency(totals.saldo)}</p>
               </div>
               <DollarSign className="w-8 h-8 text-slate-500/50" />
           </div>
       </div>

       {/* CONTENT */}
       {viewMode === 'CALENDAR' ? (
           <div className="grid grid-cols-7 gap-px bg-slate-700 rounded-xl overflow-hidden border border-slate-700">
               {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'].map(d => (
                   <div key={d} className="bg-slate-900 py-2 text-center text-xs font-bold text-slate-500">{d}</div>
               ))}
               {renderCalendarGrid()}
           </div>
       ) : (
           <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
               <table className="w-full text-left text-sm">
                   <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                       <tr>
                           <th className="px-6 py-4">Data</th>
                           <th className="px-6 py-4">Entidade</th>
                           <th className="px-6 py-4 text-center">Tipo</th>
                           <th className="px-6 py-4 text-center">Status</th>
                           <th className="px-6 py-4 text-right">Valor</th>
                           <th className="px-6 py-4 text-center">Ação</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-700">
                       {filteredItems.sort((a,b) => a.dataPrevista.localeCompare(b.dataPrevista)).map(item => (
                           <tr key={item.id} className="hover:bg-slate-700/50">
                               <td className="px-6 py-4 font-mono text-slate-300">
                                   {new Date(item.dataPrevista).toLocaleDateString('pt-BR')}
                               </td>
                               <td className="px-6 py-4 font-medium text-white">
                                   {item.entidade.nome}
                                   <span className="block text-xs text-slate-500">{item.observacao || item.entidade.tipo}</span>
                               </td>
                               <td className="px-6 py-4 text-center">
                                   {item.tipo === 'RECEBER' ? <span className="text-emerald-400 font-bold text-xs">RECEBER</span> : <span className="text-red-400 font-bold text-xs">PAGAR</span>}
                               </td>
                               <td className="px-6 py-4 text-center">
                                   <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                       item.status === 'PAGO' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' :
                                       item.status === 'CANCELADO' ? 'bg-red-900/30 text-red-400 border border-red-800' :
                                       'bg-slate-700 text-slate-300 border border-slate-600'
                                   }`}>
                                       {item.status}
                                   </span>
                               </td>
                               <td className="px-6 py-4 text-right font-bold text-slate-200">
                                   {fmtCurrency(item.valor)}
                               </td>
                               <td className="px-6 py-4 text-center">
                                   <button 
                                      onClick={() => toggleStatus(item)}
                                      className="text-xs text-cyan-400 hover:underline"
                                   >
                                       {item.status === 'PENDENTE' ? 'Baixar' : 'Reabrir'}
                                   </button>
                               </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           </div>
       )}

       {/* MODAL MANUAL ENTRY */}
       {showModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
               <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
                   <h3 className="text-xl font-bold text-white mb-4">Novo Lançamento Manual</h3>
                   <div className="space-y-4">
                       <div>
                           <label className="block text-xs text-slate-500 uppercase mb-1">Tipo</label>
                           <div className="flex gap-2">
                               <button 
                                 onClick={() => setNewItem({...newItem, tipo: 'PAGAR'})}
                                 className={`flex-1 py-2 rounded border font-bold text-sm ${newItem.tipo === 'PAGAR' ? 'bg-red-900/50 border-red-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                               >
                                   PAGAR
                               </button>
                               <button 
                                 onClick={() => setNewItem({...newItem, tipo: 'RECEBER'})}
                                 className={`flex-1 py-2 rounded border font-bold text-sm ${newItem.tipo === 'RECEBER' ? 'bg-emerald-900/50 border-emerald-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                               >
                                   RECEBER
                               </button>
                           </div>
                       </div>
                       
                       <div>
                           <label className="block text-xs text-slate-500 uppercase mb-1">Descrição / Entidade</label>
                           <input 
                              type="text" 
                              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-cyan-500"
                              value={newItem.entidade?.nome}
                              onChange={(e) => setNewItem({...newItem, entidade: { ...newItem.entidade!, nome: e.target.value }})}
                              placeholder="Ex: Aluguel, Salário, Ajuste..."
                           />
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="block text-xs text-slate-500 uppercase mb-1">Data</label>
                               <input 
                                  type="date" 
                                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-cyan-500"
                                  value={newItem.dataPrevista}
                                  onChange={(e) => setNewItem({...newItem, dataPrevista: e.target.value})}
                               />
                           </div>
                           <div>
                               <label className="block text-xs text-slate-500 uppercase mb-1">Valor (R$)</label>
                               <input 
                                  type="number" 
                                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-cyan-500"
                                  value={newItem.valor}
                                  onChange={(e) => setNewItem({...newItem, valor: parseFloat(e.target.value)})}
                               />
                           </div>
                       </div>

                       <div>
                           <label className="block text-xs text-slate-500 uppercase mb-1">Observação</label>
                           <textarea 
                              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none focus:border-cyan-500 text-sm"
                              rows={2}
                              value={newItem.observacao || ''}
                              onChange={(e) => setNewItem({...newItem, observacao: e.target.value})}
                           />
                       </div>
                   </div>

                   <div className="flex gap-2 mt-6">
                       <button onClick={() => setShowModal(false)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold transition-colors">Cancelar</button>
                       <button onClick={handleSaveManual} className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold transition-colors">Salvar</button>
                   </div>
               </div>
           </div>
       )}

    </div>
  );
};

export default FinancialCalendarStep;