
import React, { useState } from 'react';
import { 
  FileSpreadsheet, Calendar, ArrowLeft, Download, RefreshCw, 
  CreditCard, ShieldCheck, AlertCircle, Info, CheckCircle
} from 'lucide-react';
import { exportarVendasCartaoMensal } from '../services/export';
import { useNotification } from './NotificationSystem';

interface CardSalesExportProps {
  onBack: () => void;
}

const CardSalesExport: React.FC<CardSalesExportProps> = ({ onBack }) => {
  const { notify } = useNotification();
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean, message: string } | null>(null);

  const handleExport = async () => {
      setLoading(true);
      setResult(null);
      
      const res = await exportarVendasCartaoMensal(periodo);
      setResult(res);
      
      if (res.success) {
          notify("Exportação Concluída", res.message, "success");
      } else {
          notify("Atenção", res.message, "warning");
      }
      
      setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto mt-10 px-6 pb-20 animate-[fadeIn_0.5s_ease-out]">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
            <button onClick={onBack} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h2 className="text-3xl font-orbitron font-bold text-white tracking-wide">Vendas em Cartão</h2>
                <p className="text-slate-400 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-500" /> Exportação para Fechamento Mensal
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Control Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
                <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                        Selecionar Período de Exportação
                    </label>
                    <div className="relative group">
                        <Calendar className="w-5 h-5 absolute top-3.5 left-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input 
                            type="month" 
                            value={periodo}
                            onChange={(e) => setPeriodo(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 text-white font-bold outline-none focus:border-indigo-500 transition-all [color-scheme:dark]"
                        />
                    </div>
                </div>

                <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-2xl p-4 flex items-start gap-4">
                    <Info className="w-6 h-6 text-indigo-400 shrink-0" />
                    <p className="text-xs text-indigo-200/80 leading-relaxed">
                        Este módulo processa apenas vendas autorizadas via <strong>Crédito, Débito e TEF</strong> vinculadas ao EIP.
                    </p>
                </div>

                <button 
                    onClick={handleExport}
                    disabled={loading}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-900/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
                    {loading ? "Processando..." : "Gerar Planilha Excel"}
                </button>

                {result && (
                    <div className={`p-4 rounded-xl border flex items-center gap-3 animate-[slideUp_0.3s_ease-out] ${result.success ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400' : 'bg-red-900/20 border-red-800 text-red-400'}`}>
                        {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="text-xs font-bold leading-snug">{result.message}</span>
                    </div>
                )}
            </div>

            {/* Info Panel */}
            <div className="space-y-6">
                <div className="bg-slate-800/30 border border-slate-700 rounded-3xl p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-cyan-400" /> Regras de Formatação
                    </h3>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-2 text-xs text-slate-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                            <span><strong>Coluna A:</strong> Data da Venda (DD/MM/AAAA)</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs text-slate-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                            <span><strong>Coluna B:</strong> Valor numérico individual</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs text-slate-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                            <span><strong>Nome do Arquivo:</strong> vendas_cartao_MM_AAAA.xlsx</span>
                        </li>
                    </ul>
                </div>

                <div className="bg-slate-800/30 border border-slate-700 rounded-3xl p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" /> Governança
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                        "Todas as exportações são registradas no Log de Auditoria do sistema, incluindo o usuário responsável e o volume de dados extraído."
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default CardSalesExport;
