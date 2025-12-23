
import React, { useState, useEffect } from 'react';
import { 
  Search, ArrowLeft, User as UserIcon, Phone, MapPin, CreditCard, 
  Calendar, Lock, Unlock, Mail, Edit, X, Briefcase, Save, AlertCircle, RefreshCw, PlusCircle, Database,
  TrendingUp, Clock, AlertTriangle, MessageSquare, ShoppingCart, FileText, Activity, Package
} from 'lucide-react';
import { Cliente, User, UserRole, CRMProfile } from '../types';
import { listarClientes, buscarClientes, atualizarCliente, criarClienteManual } from '../services/customers';
import { buildCustomerProfile } from '../services/crm';
import { useClientContext } from '../contexts/ClientContext';
import ChatWidget from './ChatWidget';

interface CustomerQueryStepProps {
  onBack: () => void;
  currentUser: User;
}

const CustomerQueryStep: React.FC<CustomerQueryStepProps> = ({ onBack, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Selection & Editing State
  const [selectedCustomer, setSelectedCustomer] = useState<Cliente | null>(null);
  const [crmProfile, setCrmProfile] = useState<CRMProfile | null>(null); // CRM State
  const [loadingCRM, setLoadingCRM] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false); 
  const [saving, setSaving] = useState(false);
  
  // Agent State
  const [showAgent, setShowAgent] = useState(false);

  // Use Global Context
  const { setActiveClient } = useClientContext();

  const isOperador = currentUser.role === UserRole.OPERADOR;

  const loadData = async (term: string) => {
    setLoading(true);
    try {
      let result;
      if (!term.trim()) {
        result = await listarClientes();
      } else {
        result = await buscarClientes(term);
      }
      setCustomers(result);
    } catch (error) {
      console.error("Erro ao carregar clientes", error);
      alert("Erro ao carregar lista de clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData('');
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadData(searchTerm);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Load CRM Data when customer is selected
  useEffect(() => {
      const fetchCRM = async () => {
          if (selectedCustomer && !isCreating) {
              setLoadingCRM(true);
              try {
                  const profile = await buildCustomerProfile(selectedCustomer);
                  setCrmProfile(profile);
              } catch (e) {
                  console.error("Failed to load CRM profile", e);
              } finally {
                  setLoadingCRM(false);
              }
          } else {
              setCrmProfile(null);
          }
      };
      fetchCRM();
  }, [selectedCustomer, isCreating]);

  const handleEditClick = (e: React.MouseEvent, customer: Cliente) => {
    e.stopPropagation();
    if (!isOperador) return; 
    
    setSelectedCustomer(JSON.parse(JSON.stringify(customer))); 
    setIsEditing(true);
    setIsCreating(false);
    setActiveClient(customer); 
  };

  const handleCreateClick = () => {
      if (!isOperador) return;
      const newClient: Cliente = {
          codigo: `C${Date.now()}`,
          nome: '',
          fantasia: '',
          cpfCnpj: '',
          cliente: true,
          fornecedor: false,
          transportadora: false,
          bloqueado: false,
          motivoBloqueio: '',
          limite: 0,
          endereco: {
              cep: '',
              logradouro: '',
              numero: '',
              bairro: '',
              codigoMunicipio: '',
              complemento: ''
          },
          contato: {
              telefone: '',
              celular: '',
              email: ''
          },
          datas: {
              cadastro: new Date().toLocaleDateString('pt-BR'),
              alteracao: '',
              ultimaMovimentacao: ''
          },
          observacao: '',
          origem: 'EIP'
      };
      setSelectedCustomer(newClient);
      setIsEditing(true);
      setIsCreating(true);
  };

  const handleSave = async () => {
      if (!selectedCustomer) return;
      if (!selectedCustomer.nome || !selectedCustomer.cpfCnpj) {
          alert("Nome e CPF/CNPJ são obrigatórios.");
          return;
      }

      setSaving(true);
      try {
          if (isCreating) {
              await criarClienteManual(selectedCustomer);
              setCustomers(prev => [...prev, selectedCustomer]);
              alert("Cliente criado com sucesso!");
          } else {
              await atualizarCliente(selectedCustomer);
              setCustomers(prev => prev.map(c => c.codigo === selectedCustomer.codigo ? selectedCustomer : c));
          }
          setIsEditing(false);
          setIsCreating(false);
      } catch (error: any) {
          alert("Erro ao salvar: " + error.message);
      } finally {
          setSaving(false);
      }
  };

  const handleInputChange = (path: string, value: any) => {
      if (!selectedCustomer) return;
      
      const newObj = JSON.parse(JSON.stringify(selectedCustomer));
      
      // Simple deep set
      const parts = path.split('.');
      let current = newObj;
      for (let i = 0; i < parts.length - 1; i++) {
          current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      
      setSelectedCustomer(newObj);
  };

  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 md:px-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
           <button onClick={onBack} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
           </button>
           <div>
              <h2 className="text-2xl md:text-3xl font-orbitron font-bold text-white mb-1">Carteira de Clientes</h2>
              <p className="text-slate-400 text-sm">Consultoria e Cadastro.</p>
           </div>
        </div>
        
        <div className="flex gap-2">
            {/* AGENT BUTTON */}
            <button 
                onClick={() => setShowAgent(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-900/20 transition-all hover:scale-105"
            >
                <MessageSquare className="w-4 h-4" /> 🤖 Analisar
            </button>

            {isOperador && (
                <button 
                    onClick={handleCreateClick}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold shadow-lg shadow-purple-900/20 transition-all"
                >
                    <PlusCircle className="w-5 h-5" /> Novo Cliente
                </button>
            )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
          <Search className="h-5 w-5 text-slate-500 absolute top-3.5 left-3" />
          <input 
             type="text" 
             className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-lg bg-slate-800/50 text-slate-200 focus:ring-purple-500 focus:border-purple-500 placeholder-slate-500" 
             placeholder="Buscar por nome, fantasia, CNPJ ou código..." 
             value={searchTerm} 
             onChange={(e) => setSearchTerm(e.target.value)} 
          />
      </div>

      {/* Results Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden shadow-xl min-h-[300px]">
         {loading ? (
             <div className="flex flex-col items-center justify-center py-20">
                 <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                 <p className="text-slate-400">Consultando base de dados...</p>
             </div>
         ) : customers.length === 0 ? (
             <div className="text-center py-20">
                 <UserIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                 <h3 className="text-xl text-slate-300 font-bold">Nenhum cliente encontrado</h3>
             </div>
         ) : (
             <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm whitespace-nowrap">
                     <thead className="bg-slate-900 text-slate-400 uppercase text-xs font-orbitron tracking-wider">
                         <tr>
                             <th className="px-6 py-4">Código</th>
                             <th className="px-6 py-4">Nome / Fantasia</th>
                             <th className="px-6 py-4">CPF / CNPJ</th>
                             <th className="px-6 py-4">Cidade</th>
                             <th className="px-6 py-4 text-center">Status</th>
                             <th className="px-6 py-4 text-center">Origem</th>
                             <th className="px-6 py-4 text-center">Ações</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-700">
                         {customers.slice(0, 50).map((c) => (
                             <tr key={c.codigo} className="hover:bg-slate-700/50 transition-colors">
                                 <td className="px-6 py-4 font-mono text-purple-400 font-bold">{c.codigo}</td>
                                 <td className="px-6 py-4">
                                     <div className="flex flex-col">
                                         <span className="text-white font-bold">{c.nome}</span>
                                         {c.fantasia && <span className="text-xs text-slate-400">{c.fantasia}</span>}
                                     </div>
                                 </td>
                                 <td className="px-6 py-4 text-slate-300">{c.cpfCnpj}</td>
                                 <td className="px-6 py-4 text-slate-400">{c.endereco?.codigoMunicipio}</td>
                                 <td className="px-6 py-4 text-center">
                                     {c.bloqueado ? (
                                         <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs font-bold border border-red-800">
                                             <Lock className="w-3 h-3" /> BLOQUEADO
                                         </span>
                                     ) : (
                                         <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-900/30 text-emerald-400 rounded text-xs font-bold border border-emerald-800">
                                             <Unlock className="w-3 h-3" /> ATIVO
                                         </span>
                                     )}
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${c.origem === 'EIP' ? 'bg-purple-900/50 text-purple-300 border-purple-700' : 'bg-slate-800 text-slate-400 border-slate-600'}`}>
                                         {c.origem || 'ERP'}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                     <div className="flex justify-center gap-2">
                                         <button 
                                            onClick={() => { setSelectedCustomer(c); setIsEditing(false); }}
                                            className="p-2 bg-slate-800 hover:bg-purple-600 text-slate-400 hover:text-white rounded-lg transition-colors"
                                            title="Visualizar Detalhes"
                                         >
                                             <FileText className="w-4 h-4" />
                                         </button>
                                         {isOperador && (
                                             <button 
                                                onClick={(e) => handleEditClick(e, c)}
                                                className="p-2 bg-slate-800 hover:bg-cyan-600 text-slate-400 hover:text-white rounded-lg transition-colors"
                                                title="Editar"
                                             >
                                                 <Edit className="w-4 h-4" />
                                             </button>
                                         )}
                                     </div>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         )}
         <div className="bg-slate-900 px-6 py-3 border-t border-slate-700 text-xs text-slate-500">
             Mostrando {Math.min(customers.length, 50)} de {customers.length} registros
         </div>
      </div>

      {/* Customer Detail / Edit Modal */}
      {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl relative flex flex-col max-h-[90vh]">
                  
                  {/* Modal Header */}
                  <div className="p-6 border-b border-slate-700 flex justify-between items-start rounded-t-2xl bg-slate-800/50">
                      <div className="flex gap-4 w-full">
                          <div className="p-3 bg-purple-900/20 rounded-xl border border-purple-700">
                             <UserIcon className="w-8 h-8 text-purple-400" />
                          </div>
                          <div className="flex-1">
                              {isEditing ? (
                                  <input 
                                    value={selectedCustomer.nome}
                                    onChange={(e) => handleInputChange('nome', e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white font-bold text-xl mb-1 focus:border-purple-500 outline-none"
                                    placeholder="Nome do Cliente"
                                  />
                              ) : (
                                  <div className="flex items-center justify-between w-full">
                                      <h3 className="text-xl md:text-2xl font-bold text-white mb-1">{selectedCustomer.nome}</h3>
                                      <button 
                                        onClick={() => setShowAgent(true)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-lg"
                                      >
                                          <MessageSquare className="w-3 h-3" /> Analisar
                                      </button>
                                  </div>
                              )}
                              
                              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                  <span className="flex items-center gap-1"><CreditCard className="w-3 h-3"/> {selectedCustomer.cpfCnpj}</span>
                                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3"/> Cód: {selectedCustomer.codigo}</span>
                                  {selectedCustomer.bloqueado && <span className="text-red-400 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> CLIENTE BLOQUEADO</span>}
                              </div>
                          </div>
                      </div>
                      <button 
                        onClick={() => { setSelectedCustomer(null); setIsEditing(false); setIsCreating(false); }}
                        className="text-slate-500 hover:text-white transition-colors ml-4"
                      >
                          <X className="w-6 h-6" />
                      </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 overflow-y-auto bg-slate-900 grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Left Col: Cadastro */}
                      <div className="lg:col-span-2 space-y-6">
                          {/* Dados Gerais */}
                          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                             <h4 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Dados Cadastrais
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase">Fantasia</label>
                                    {isEditing ? (
                                        <input 
                                            value={selectedCustomer.fantasia} 
                                            onChange={(e) => handleInputChange('fantasia', e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white"
                                        />
                                    ) : <p className="text-white">{selectedCustomer.fantasia || '-'}</p>}
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase">Limite de Crédito</label>
                                    {isEditing ? (
                                        <input 
                                            type="number"
                                            value={selectedCustomer.limite} 
                                            onChange={(e) => handleInputChange('limite', parseFloat(e.target.value))}
                                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white"
                                        />
                                    ) : <p className="text-emerald-400 font-bold">{fmtCurrency(selectedCustomer.limite)}</p>}
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs text-slate-500 uppercase">Endereço</label>
                                    {isEditing ? (
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                            <input placeholder="Logradouro" value={selectedCustomer.endereco.logradouro} onChange={(e) => handleInputChange('endereco.logradouro', e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white" />
                                            <input placeholder="Bairro" value={selectedCustomer.endereco.bairro} onChange={(e) => handleInputChange('endereco.bairro', e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white" />
                                            <input placeholder="Cidade (Cód)" value={selectedCustomer.endereco.codigoMunicipio} onChange={(e) => handleInputChange('endereco.codigoMunicipio', e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white" />
                                            <input placeholder="CEP" value={selectedCustomer.endereco.cep} onChange={(e) => handleInputChange('endereco.cep', e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white" />
                                        </div>
                                    ) : (
                                        <p className="text-slate-300">
                                            {selectedCustomer.endereco.logradouro}, {selectedCustomer.endereco.numero} - {selectedCustomer.endereco.bairro}
                                            <br/>
                                            {selectedCustomer.endereco.codigoMunicipio} - CEP: {selectedCustomer.endereco.cep}
                                        </p>
                                    )}
                                </div>
                             </div>
                          </div>

                          {/* CRM: Metrics (Read Only) */}
                          {!isCreating && (
                              <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                                 <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Activity className="w-4 h-4" /> Inteligência Comercial (CRM)
                                 </h4>
                                 
                                 {loadingCRM ? (
                                     <div className="flex items-center gap-2 text-slate-500 text-sm">
                                         <RefreshCw className="w-4 h-4 animate-spin" /> Analisando histórico...
                                     </div>
                                 ) : crmProfile ? (
                                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                         <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                             <p className="text-[10px] text-slate-500 uppercase">Status</p>
                                             <p className={`font-bold text-sm ${
                                                 crmProfile.status === 'ATIVO' ? 'text-emerald-400' :
                                                 crmProfile.status === 'EM_RISCO' ? 'text-amber-400' : 'text-slate-400'
                                             }`}>{crmProfile.status}</p>
                                         </div>
                                         <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                             <p className="text-[10px] text-slate-500 uppercase">LTV (Total)</p>
                                             <p className="font-bold text-white text-sm">{fmtCurrency(crmProfile.metrics.ltv)}</p>
                                         </div>
                                         <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                             <p className="text-[10px] text-slate-500 uppercase">Ticket Médio</p>
                                             <p className="font-bold text-white text-sm">{fmtCurrency(crmProfile.metrics.avgTicket)}</p>
                                         </div>
                                         <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                             <p className="text-[10px] text-slate-500 uppercase">Última Compra</p>
                                             <p className="font-bold text-white text-sm">
                                                 {crmProfile.metrics.daysSinceLastPurchase} dias atrás
                                             </p>
                                         </div>
                                     </div>
                                 ) : (
                                     <p className="text-slate-500 text-sm">Sem dados históricos para este cliente.</p>
                                 )}
                              </div>
                          )}
                      </div>

                      {/* Right Col: Timeline & Actions */}
                      <div className="space-y-6">
                          
                          {/* Contatos */}
                          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                             <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Phone className="w-4 h-4" /> Contato
                             </h4>
                             <div className="space-y-3 text-sm">
                                 <div>
                                     <label className="text-xs text-slate-500">Telefone</label>
                                     {isEditing ? (
                                         <input value={selectedCustomer.contato.telefone} onChange={(e) => handleInputChange('contato.telefone', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white" />
                                     ) : <p className="text-white">{selectedCustomer.contato.telefone || '-'}</p>}
                                 </div>
                                 <div>
                                     <label className="text-xs text-slate-500">Email</label>
                                     {isEditing ? (
                                         <input value={selectedCustomer.contato.email} onChange={(e) => handleInputChange('contato.email', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white" />
                                     ) : <p className="text-white">{selectedCustomer.contato.email || '-'}</p>}
                                 </div>
                             </div>
                          </div>

                          {/* Histórico Recente (CRM) */}
                          {!isCreating && crmProfile && crmProfile.timeline.length > 0 && (
                              <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                                 <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 sticky top-0 bg-slate-900/90 py-1">
                                    <Clock className="w-4 h-4" /> Linha do Tempo
                                 </h4>
                                 <div className="space-y-4">
                                     {crmProfile.timeline.slice(0, 5).map((evt) => (
                                         <div key={evt.id} className="relative pl-4 border-l border-slate-700">
                                             <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-purple-500"></div>
                                             <p className="text-xs text-slate-500">{new Date(evt.date).toLocaleDateString()}</p>
                                             <p className="text-sm text-slate-200 font-medium">{evt.description}</p>
                                             <p className="text-xs text-emerald-400 font-bold">{fmtCurrency(evt.value)}</p>
                                         </div>
                                     ))}
                                 </div>
                              </div>
                          )}

                      </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 border-t border-slate-700 flex justify-end gap-3 bg-slate-800/50 rounded-b-2xl">
                      {isEditing ? (
                          <>
                            <button 
                                onClick={() => { setIsEditing(false); setIsCreating(false); }}
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
                                Salvar
                            </button>
                          </>
                      ) : (
                          <>
                            <button 
                                onClick={() => setSelectedCustomer(null)}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Fechar
                            </button>
                            {isOperador && (
                                <button 
                                    onClick={(e) => {
                                        setIsEditing(true);
                                        // Ensure we stay on current selected
                                    }}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
                                >
                                    <Edit className="w-4 h-4" /> Editar
                                </button>
                            )}
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Agent Chat */}
      <ChatWidget 
          data={{ client: selectedCustomer, crm: crmProfile }}
          mode="SALES" // Switches Agent to CRM/Sales Persona
          defaultOpen={showAgent}
          onClose={() => setShowAgent(false)}
      />
    </div>
  );
};

export default CustomerQueryStep;
