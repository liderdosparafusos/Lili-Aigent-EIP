
import React, { useState } from 'react';
import { UploadCloud, FileCode, CheckCircle, Package, ArrowLeft, RefreshCw, AlertTriangle, Database, Info } from 'lucide-react';
import { parseProdutosFromXml, sincronizarProdutos } from '../services/products';
import { Produto } from '../types';

interface ImportProductsStepProps {
  onBack: () => void;
}

const ImportProductsStep: React.FC<ImportProductsStepProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [status, setStatus] = useState<'IDLE' | 'PARSING' | 'READY' | 'SYNCING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [msg, setMsg] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setStatus('PARSING');
    setMsg('Lendo estrutura do XML de Produtos...');

    try {
      const parsedData = await parseProdutosFromXml(selectedFile);
      setProdutos(parsedData);
      setStatus('READY');
      setMsg(`${parsedData.length} produtos encontrados no arquivo.`);
    } catch (error) {
      console.error(error);
      setStatus('ERROR');
      setMsg('Erro ao ler o arquivo XML. Verifique se é uma exportação de produtos do Optimus.');
    }
  };

  const handleSync = async () => {
    if (produtos.length === 0) return;

    setStatus('SYNCING');
    setMsg('Sincronizando catálogo com a nuvem...');

    try {
      const count = await sincronizarProdutos(produtos);
      setStatus('SUCCESS');
      setMsg(`Sucesso! ${count} produtos foram atualizados no Catálogo Mestre.`);
    } catch (error) {
      console.error(error);
      setStatus('ERROR');
      setMsg('Erro ao sincronizar com o Firestore. Verifique sua conexão.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 px-6">
      <button onClick={onBack} className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Catálogo
      </button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-4 bg-amber-900/30 rounded-full mb-4 border border-amber-500/30">
            <Package className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-3xl font-orbitron font-bold text-white mb-2">Importação de XML de Produtos</h2>
        <p className="text-slate-400">Rotina administrativa de atualização do cadastro.</p>
        
        <div className="mt-6 bg-amber-900/20 border border-amber-800 rounded-lg p-4 text-left max-w-lg mx-auto">
            <h4 className="text-amber-400 font-bold text-sm flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" /> ATENÇÃO
            </h4>
            <p className="text-slate-300 text-xs leading-relaxed">
                Esta importação é destinada apenas ao <strong>cadastro e atualização de produtos</strong> no catálogo (preços, descrições, NCM).
                <br/><br/>
                <strong>Nenhum dado financeiro, venda ou comissão será gerado</strong> a partir deste arquivo. Para importar vendas, utilize o módulo "Fechamento Mensal".
            </p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 shadow-xl">
        
        {/* Upload Area */}
        {status === 'IDLE' || status === 'PARSING' || status === 'ERROR' ? (
           <div className="border-2 border-dashed border-slate-600 hover:border-amber-500 rounded-xl p-10 text-center transition-colors relative bg-slate-900/50">
             <input 
                type="file" 
                accept=".xml" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={status === 'PARSING'}
             />
             {status === 'PARSING' ? (
                <div className="flex flex-col items-center">
                    <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mb-3" />
                    <p className="text-amber-300 font-bold">Processando XML...</p>
                </div>
             ) : (
                <div className="flex flex-col items-center">
                    <UploadCloud className="w-12 h-12 text-slate-500 mb-3" />
                    <p className="text-slate-300 font-bold text-lg">Clique ou arraste o XML aqui</p>
                    <p className="text-slate-500 text-sm mt-1">Exportação de Produtos (Optimus)</p>
                </div>
             )}
           </div>
        ) : (
           <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-amber-900/20 rounded-lg">
                    <FileCode className="w-8 h-8 text-amber-400" />
                 </div>
                 <div>
                    <p className="text-white font-bold text-lg">{file?.name}</p>
                    <p className="text-slate-500 text-sm">{(file?.size ? (file.size/1024).toFixed(1) : 0)} KB</p>
                 </div>
              </div>
              {status === 'READY' && (
                 <button onClick={() => { setStatus('IDLE'); setFile(null); setProdutos([]); }} className="text-xs text-red-400 hover:text-red-300 underline">
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
                {(status === 'READY' || status === 'SYNCING') && <Database className="w-5 h-5 shrink-0" />}
                <span className="font-medium">{msg}</span>
            </div>
        )}

        {/* Sync Button */}
        {status === 'READY' && (
            <button 
                onClick={handleSync}
                className="w-full mt-6 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-lg shadow-lg shadow-amber-900/30 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
                <RefreshCw className="w-5 h-5" /> Atualizar Catálogo
            </button>
        )}

        {/* Syncing State */}
        {status === 'SYNCING' && (
            <div className="w-full mt-6 py-4 bg-slate-700 text-slate-300 font-bold rounded-lg flex items-center justify-center gap-2 cursor-wait">
                <RefreshCw className="w-5 h-5 animate-spin" /> Atualizando...
            </div>
        )}

        {/* Success Action */}
        {status === 'SUCCESS' && (
            <button 
                onClick={onBack}
                className="w-full mt-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
            >
                Voltar ao Catálogo
            </button>
        )}

      </div>
    </div>
  );
};

export default ImportProductsStep;
