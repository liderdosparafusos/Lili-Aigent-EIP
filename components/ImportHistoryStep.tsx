
import React, { useState } from 'react';
import { UploadCloud, FileArchive, CheckCircle, Database, ArrowLeft, RefreshCw, Archive, AlertTriangle } from 'lucide-react';
import { processHistoricalZip } from '../services/history';

interface ImportHistoryStepProps {
  onBack: () => void;
}

const ImportHistoryStep: React.FC<ImportHistoryStepProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [stats, setStats] = useState<{ count: number, errors: number } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleImport = async () => {
    if (!file) return;

    setStatus('PROCESSING');
    try {
      const result = await processHistoricalZip(file);
      setStats(result);
      setStatus('SUCCESS');
    } catch (error) {
      console.error(error);
      setStatus('ERROR');
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 px-6">
      <button onClick={onBack} className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Menu
      </button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-4 bg-amber-900/30 rounded-full mb-4 border border-amber-500/30">
            <Archive className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-3xl font-orbitron font-bold text-white mb-2">Importação Histórica (Arquivo Morto)</h2>
        <p className="text-slate-400">Carregue XMLs antigos para alimentar a inteligência do CRM.</p>
        <div className="mt-4 inline-block bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 text-left max-w-md">
            <strong className="text-amber-400 block mb-1 uppercase">Modo Inteligência</strong>
            Os dados importados aqui <strong>NÃO</strong> afetam o caixa, comissões ou fechamentos mensais. 
            Serão usados exclusivamente para estatísticas de clientes e produtos.
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 shadow-xl">
        
        {/* Upload Area */}
        {status === 'IDLE' || status === 'ERROR' ? (
           <div className="border-2 border-dashed border-slate-600 hover:border-amber-500 rounded-xl p-10 text-center transition-colors relative bg-slate-900/50">
             <input 
                type="file" 
                accept=".zip" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
             />
             {file ? (
                <div className="flex flex-col items-center">
                    <FileArchive className="w-12 h-12 text-amber-500 mb-2" />
                    <p className="text-white font-bold">{file.name}</p>
                    <p className="text-slate-500 text-sm">{(file.size/1024/1024).toFixed(2)} MB</p>
                </div>
             ) : (
                <div className="flex flex-col items-center">
                    <UploadCloud className="w-12 h-12 text-slate-500 mb-3" />
                    <p className="text-slate-300 font-bold text-lg">ZIP com XMLs antigos</p>
                    <p className="text-slate-500 text-sm mt-1">Arraste ou clique para selecionar</p>
                </div>
             )}
           </div>
        ) : (
           <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center">
              {status === 'PROCESSING' ? (
                  <>
                    <RefreshCw className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white">Processando Arquivo Morto...</h3>
                    <p className="text-slate-400 text-sm mt-2">Isso pode levar alguns minutos dependendo do tamanho.</p>
                  </>
              ) : (
                  <>
                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white">Importação Concluída!</h3>
                    <div className="mt-6 flex justify-center gap-8 text-sm">
                        <div>
                            <p className="text-slate-500 uppercase font-bold text-xs">Processados</p>
                            <p className="text-2xl font-mono text-emerald-400">{stats?.count}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 uppercase font-bold text-xs">Erros/Ignorados</p>
                            <p className="text-2xl font-mono text-red-400">{stats?.errors}</p>
                        </div>
                    </div>
                  </>
              )}
           </div>
        )}

        {/* Actions */}
        <div className="mt-6">
            {status === 'IDLE' && (
                <button 
                    onClick={handleImport}
                    disabled={!file}
                    className={`w-full py-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                        file 
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/30' 
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                >
                    <Database className="w-5 h-5" /> Iniciar Importação Segura
                </button>
            )}
            
            {(status === 'SUCCESS' || status === 'ERROR') && (
                <button 
                    onClick={() => { setStatus('IDLE'); setFile(null); setStats(null); }}
                    className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
                >
                    Nova Importação
                </button>
            )}
        </div>

      </div>
    </div>
  );
};

export default ImportHistoryStep;
