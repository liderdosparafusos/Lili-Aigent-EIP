
import React, { useState, useEffect } from 'react';
import { 
  User, Search, PlusCircle, Edit, Trash2, ArrowLeft, Save, X, RefreshCw 
} from 'lucide-react';
import { Vendedor, User as AppUser, UserRole } from '../types';
import { listarVendedores, salvarVendedor, excluirVendedor, inicializarVendedoresPadrao } from '../services/sellers';

interface SellerListStepProps {
  onBack: () => void;
  currentUser: AppUser;
}

const SellerListStep: React.FC<SellerListStepProps> = ({ onBack, currentUser }) => {
  const [sellers, setSellers] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit/Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Vendedor | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Vendedor>>({});

  const loadData = async () => {
    setLoading(true);
    const data = await listarVendedores();
    setSellers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInitDefaults = async () => {
      if (!confirm("Isso criará os vendedores padrão (Eneias, Carlos, Tarcisio, Braga) se não existirem. Continuar?")) return;
      setLoading(true);
      await inicializarVendedoresPadrao();
      await loadData();
  };

  const handleCreate = () => {
      setEditingSeller(null);
      setFormData({
          nome: '',
          codigo: '',
          percentualComissao: 3.0,
          ativo: true
      });
      setShowModal(true);
  };

  const handleEdit = (v: Vendedor) => {
      setEditingSeller(v);
      setFormData({ ...v });
      setShowModal(true);
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Tem certeza que deseja excluir este vendedor?")) return;
      await excluirVendedor(id);
      await loadData();
  };

  const handleSave = async () => {
      if (!formData.nome || !formData.codigo) {
          alert("Nome e Código são obrigatórios.");
          return;
      }

      const vendedor: Vendedor = {
          id: editingSeller ? editingSeller.id : crypto.randomUUID(),
          nome: formData.nome.toUpperCase(),
          codigo: formData.codigo.toUpperCase(),
          percentualComissao: Number(formData.percentualComissao),
          ativo: formData.ativo !== undefined ? formData.ativo : true,
          criadoEm: editingSeller ? editingSeller.criadoEm : new Date().toISOString()
      };

      await salvarVendedor(vendedor);
      setShowModal(false);
      loadData();
  };

  const filteredSellers = sellers.filter(s => 
      s.nome.includes(searchTerm.toUpperCase()) || 
      s.codigo.includes(searchTerm.toUpperCase())
  );

  return (
    <div className="max-w-5xl mx-auto mt-8 px-4 md:px-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
           <button onClick={onBack} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
           </button>
           <div>
              <h2 className="text-2xl md:text-3xl font-orbitron font-bold text-white">Vendedores</h2>
              <p className="text-slate-400 text-sm">Cadastro de comissões e códigos.</p>
           </div>
        </div>
        
        <div className="flex gap-2">
            {sellers.length === 0 && currentUser.role === UserRole.OPERADOR && (
                <button 
                    onClick={handleInitDefaults}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-600 text-slate-400 hover:text-white rounded-lg font-bold text-sm"
                >
                    <RefreshCw className="w-4 h-4" /> Restaurar Padrões
                </button>
            )}
            {currentUser.role === UserRole.OPERADOR && (
                <button 
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold shadow-lg shadow-cyan-900/20 transition-all"
                >
                    <PlusCircle className="w-5 h-5" /> Novo Vendedor
                </button>
            )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
          <Search className="h-5 w-5 text-slate-500 absolute top-3.5 left-3" />
          <input 
             type="text" 
             className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-lg bg-slate-800/50 text-slate-200 focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-500 uppercase" 
             placeholder="BUSCAR VENDEDOR..." 
             value={searchTerm} 
             onChange={(e) => setSearchTerm(e.target.value)} 
          />
      </div>

      {/* List */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden min-h-[300px]">
         {loading ? (
             <div className="flex flex-col items-center justify-center py-20">
                 <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                 <p className="text-slate-400">Carregando...</p>
             </div>
         ) : filteredSellers.length === 0 ? (
             <div className="text-center py-20">
                 <User className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                 <h3 className="text-xl text-slate-300 font-bold">Nenhum vendedor encontrado</h3>
             </div>
         ) : (
             <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm whitespace-nowrap">
                     <thead className="bg-slate-900 text-slate-400 uppercase text-xs font-orbitron tracking-wider">
                         <tr>
                             <th className="px-6 py-4">Nome</th>
                             <th className="px-6 py-4 text-center">Código (Importação)</th>
                             <th className="px-6 py-4 text-right">Comissão (%)</th>
                             <th className="px-6 py-4 text-center">Status</th>
                             <th className="px-6 py-4 text-center">Ações</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-700">
                         {filteredSellers.map((v) => (
                             <tr key={v.id} className="hover:bg-slate-700/50 transition-colors">
                                 <td className="px-6 py-4 font-bold text-white">{v.nome}</td>
                                 <td className="px-6 py-4 text-center">
                                     <span className="inline-block bg-slate-900 border border-slate-700 rounded px-3 py-1 font-mono text-cyan-400 font-bold">
                                         {v.codigo}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4 text-right text-emerald-400 font-bold text-base">
                                     {v.percentualComissao.toFixed(1)}%
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                     {v.ativo ? (
                                         <span className="text-emerald-500 text-xs font-bold bg-emerald-900/20 px-2 py-1 rounded">ATIVO</span>
                                     ) : (
                                         <span className="text-red-500 text-xs font-bold bg-red-900/20 px-2 py-1 rounded">INATIVO</span>
                                     )}
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                     {currentUser.role === UserRole.OPERADOR && (
                                         <div className="flex justify-center gap-2">
                                             <button 
                                                onClick={() => handleEdit(v)}
                                                className="p-2 bg-slate-700 hover:bg-cyan-600 text-white rounded transition-colors"
                                             >
                                                 <Edit className="w-4 h-4" />
                                             </button>
                                             <button 
                                                onClick={() => handleDelete(v.id)}
                                                className="p-2 bg-slate-700 hover:bg-red-600 text-white rounded transition-colors"
                                             >
                                                 <Trash2 className="w-4 h-4" />
                                             </button>
                                         </div>
                                     )}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         )}
      </div>

      {/* MODAL */}
      {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-white">
                          {editingSeller ? 'Editar Vendedor' : 'Novo Vendedor'}
                      </h3>
                      <button onClick={() => setShowModal(false)}><X className="text-slate-400 hover:text-white" /></button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs text-slate-500 uppercase mb-1">Nome</label>
                          <input 
                             type="text" 
                             className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white outline-none focus:border-cyan-500 uppercase"
                             value={formData.nome}
                             onChange={(e) => setFormData({...formData, nome: e.target.value})}
                             placeholder="EX: ENEIAS"
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs text-slate-500 uppercase mb-1">Código (Import)</label>
                              <input 
                                 type="text" 
                                 className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white outline-none focus:border-cyan-500 uppercase font-mono"
                                 value={formData.codigo}
                                 onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                                 placeholder="EX: E"
                                 maxLength={2}
                              />
                          </div>
                          <div>
                              <label className="block text-xs text-slate-500 uppercase mb-1">Comissão (%)</label>
                              <input 
                                 type="number" 
                                 step="0.1"
                                 className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white outline-none focus:border-cyan-500"
                                 value={formData.percentualComissao}
                                 onChange={(e) => setFormData({...formData, percentualComissao: parseFloat(e.target.value)})}
                              />
                          </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                          <input 
                             type="checkbox" 
                             id="ativo"
                             checked={formData.ativo}
                             onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                             className="w-4 h-4 accent-cyan-500"
                          />
                          <label htmlFor="ativo" className="text-sm text-slate-300 select-none">Vendedor Ativo</label>
                      </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                      <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold transition-colors">
                          Cancelar
                      </button>
                      <button onClick={handleSave} className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-colors flex justify-center items-center gap-2">
                          <Save className="w-4 h-4" /> Salvar
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default SellerListStep;
