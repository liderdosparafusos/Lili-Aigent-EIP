
import React, { useState } from 'react';
import { UploadCloud, FileCode, CheckCircle, Database, ArrowLeft, RefreshCw, Users, AlertTriangle } from 'lucide-react';
import { parseClientesFromXml, sincronizarClientes } from '../services/customers';
import { Cliente } from '../types';

interface ImportClientesStepProps {
  onBack: () => void;
}

const ImportClientesStep: React.FC<ImportClientesStepProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [status, setStatus] = useState<'IDLE' | 'PARSING' | 'READY' | 'SYNCING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [msg, setMsg] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setStatus('PARSING');
    setMsg('Lendo estrutura do XML...');

    try {
      const parsedData = await parseClientesFromXml(selectedFile);
      setClientes(parsedData);
      setStatus('READY');
      setMsg(`${parsedData.length} clientes encontrados no arquivo.`);
    } catch (error) {
      console.error(error);
      setStatus('ERROR');
      setMsg('Erro ao ler o arquivo XML. Verifique o formato.');
    }
  };

  const handleSync = async () => {
    if (clientes.length === 0) return;

    setStatus('SYNCING');
    setMsg('Sincronizando com o banco de dados nuvem...');

    try {
      const count = await sincronizarClientes(clientes);
      setStatus('SUCCESS');
      setMsg(`Sucesso! ${count} clientes foram atualizados/criados.`);
    } catch (error) {
      console.error(error);
      setStatus('ERROR');
      setMsg('Erro ao sincronizar com o Firestore. Verifique sua conexão.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 px-6">
      <button onClick={onBack} className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Menu
      </button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-4 bg-purple-900/30 rounded-full mb-4 border border-purple-500/30">
            <Database className="w-8 h-8 text-purple-400" />
        </div>
        <h2 className="text-3xl font-orbitron font-bold text-white mb-2">Importação de Clientes</h2>
        <p className="text-slate-400">Atualize a base de dados do aplicativo com o XML do ERP Optimus.</p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 shadow-xl">
        
        {/* Upload Area */}
        {status === 'IDLE' || status === 'PARSING' || status === 'ERROR' ? (
           <div className="border-2 border-dashed border-slate-600 hover:border-purple-500 rounded-xl p-10 text-center transition-colors relative bg-slate-900/50">
             <input 
                type="file" 
                accept=".xml" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={status === 'PARSING'}
             />
             {status === 'PARSING' ? (
                <div className="flex flex-col items-center">
                    <RefreshCw className="w-10 h-10 text-purple-500 animate-spin mb-3" />
                    <p className="text-purple-300 font-bold">Lendo Arquivo...</p>
                </div>
             ) : (
                <div className="flex flex-col items-center">
                    <UploadCloud className="w-12 h-12 text-slate-500 mb-3" />
                    <p className="text-slate-300 font-bold text-lg">Clique ou arraste o XML aqui</p>
                    <p className="text-slate-500 text-sm mt-1">Exportação de Participantes (Optimus)</p>
                </div>
             )}
           </div>
        ) : (
           <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-purple-900/20 rounded-lg">
                    <FileCode className="w-8 h-8 text-purple-400" />
                 </div>
                 <div>
                    <p className="text-white font-bold text-lg">{file?.name}</p>
                    <p className="text-slate-500 text-sm">{(file?.size ? (file.size/1024).toFixed(1) : 0)} KB</p>
                 </div>
              </div>
              {status === 'READY' && (
                 <button onClick={() => { setStatus('IDLE'); setFile(null); setClientes([]); }} className="text-xs text-red-400 hover:text-red-300 underline">
                    Remover
                 </button>
              )}
           </div>
        )}

        {/* Status Message */}
        {msg && (
            <div className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${
                status === 'ERROR' ? 'bg-red-900/20 border border-red-800 text-red-300' :
                status === 'SUCCESS' ? 'bg-green-900/20 border border-green-800 text-green-300' :
                'bg-slate-800 border border-slate-700 text-slate-300'
            }`}>
                {status === 'ERROR' && <AlertTriangle className="w-5 h-5 shrink-0" />}
                {status === 'SUCCESS' && <CheckCircle className="w-5 h-5 shrink-0" />}
                {(status === 'READY' || status === 'SYNCING') && <Users className="w-5 h-5 shrink-0" />}
                <span className="font-medium">{msg}</span>
            </div>
        )}

        {/* Sync Button */}
        {status === 'READY' && (
            <button 
                onClick={handleSync}
                className="w-full mt-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-purple-900/30 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
                <RefreshCw className="w-5 h-5" /> Sincronizar Clientes
            </button>
        )}

        {/* Syncing State */}
        {status === 'SYNCING' && (
            <div className="w-full mt-6 py-4 bg-slate-700 text-slate-300 font-bold rounded-lg flex items-center justify-center gap-2 cursor-wait">
                <RefreshCw className="w-5 h-5 animate-spin" /> Processando...
            </div>
        )}

        {/* Success Action */}
        {status === 'SUCCESS' && (
            <button 
                onClick={onBack}
                className="w-full mt-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
            >
                Voltar ao Menu Principal
            </button>
        )}

      </div>
    </div>
  );
};

export default ImportClientesStep;
