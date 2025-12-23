
import React, { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar, Filter } from 'lucide-react';
import { EventoFinanceiro, User } from '../types';
import { listarEventosFinanceiros } from '../services/finance';

interface FinanceEventsStepProps {
  onBack: () => void;
}

const FinanceEventsStep: React.FC<FinanceEventsStepProps> = ({ onBack }) => {
  const [eventos, setEventos] = useState<EventoFinanceiro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listarEventosFinanceiros().then(data => {
        setEventos(data);
        setLoading(false);
    });
  }, []);

  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR') + ' ' + new Date(d).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

  return (
    <div className="max-w-7xl mx-auto mt-8 px-6 pb-20">
        <div className="flex items-center gap-4 mb-8">
            <button onClick={onBack} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h2 className="text-3xl font-orbitron font-bold text-white">Eventos Financeiros</h2>
                <p className="text-slate-400 text-sm">Histórico de movimentações (EIP & ERP)</p>
            </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            {loading ? (
                <div className="p-12 text-center text-slate-500">Carregando eventos...</div>
            ) : eventos.length === 0 ? (
                <div className="p-12 text-center text-slate-500">Nenhum evento registrado.</div>
            ) : (
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Descrição</th>
                            <th className="px-6 py-4 text-center">Origem</th>
                            <th className="px-6 py-4 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {eventos.map(ev => (
                            <tr key={ev.id} className="hover:bg-slate-700/30">
                                <td className="px-6 py-4 font-mono text-slate-400">{fmtDate(ev.dataEvento)}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${ev.natureza === 'ENTRADA' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                                        {ev.tipo}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-white">
                                    {ev.descricao}
                                    {ev.referencia.vendedorId && <span className="block text-xs text-slate-500">Vend: {ev.referencia.vendedorId}</span>}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="px-2 py-0.5 border border-slate-600 rounded text-[10px] text-slate-300">{ev.origem}</span>
                                </td>
                                <td className={`px-6 py-4 text-right font-bold ${ev.natureza === 'ENTRADA' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {ev.natureza === 'SAIDA' ? '-' : ''}{fmtCurrency(ev.valor)}
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

export default FinanceEventsStep;
