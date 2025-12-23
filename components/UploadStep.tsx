
import React, { useState } from 'react';
import { Upload, FileArchive, Edit3, AlertCircle } from 'lucide-react';

interface UploadStepProps {
  onFilesSelected: (movFile: File | null, xmlFile: File | null) => void;
  isEditing?: boolean;
}

const UploadStep: React.FC<UploadStepProps> = ({ onFilesSelected, isEditing = false }) => {
  const [movFile, setMovFile] = useState<File | null>(null);
  const [xmlFile, setXmlFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (movFile || xmlFile) {
      onFilesSelected(movFile, xmlFile);
    }
  };

  const FileInput = ({ label, file, setFile }: { label: string, file: File | null, setFile: (f: File | null) => void }) => (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-4 md:p-6 hover:bg-slate-50 transition-colors bg-white">
        <input
          type="file"
          accept=".zip"
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center justify-center pointer-events-none">
          {file ? (
            <>
              <FileArchive className="w-8 h-8 md:w-10 md:h-10 text-blue-500 mb-2" />
              <p className="text-sm text-slate-900 font-semibold text-center break-all px-2">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 md:w-10 md:h-10 text-slate-400 mb-2" />
              <p className="text-sm text-slate-500 text-center">Clique ou arraste o arquivo .zip</p>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto mt-4 md:mt-10 p-4 md:p-8 bg-white rounded-2xl shadow-xl border border-slate-100">
      <div className="flex items-center gap-3 mb-2">
          {isEditing && <Edit3 className="w-6 h-6 text-amber-500" />}
          <h2 className="text-2xl font-bold text-slate-800">
              {isEditing ? 'Editar Fechamento' : 'Importação de Arquivos'}
          </h2>
      </div>
      
      {isEditing ? (
         <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex gap-3 text-sm text-amber-800">
             <AlertCircle className="w-5 h-5 shrink-0" />
             <p>
                 Você está editando um fechamento existente. Novos arquivos serão <b>incorporados</b> ao relatório atual. 
                 Envie apenas o que deseja adicionar ou corrigir.
             </p>
         </div>
      ) : (
         <p className="text-slate-500 mb-8 text-sm md:text-base">Envie os arquivos compactados para iniciar a conciliação.</p>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <FileInput 
          label={isEditing ? "1) Atualizar Movimentos (.xlsx)" : "1) Movimentos Diários (ZIP contendo .xlsx)"}
          file={movFile} 
          setFile={setMovFile} 
        />
        
        <FileInput 
          label={isEditing ? "2) Adicionar/Atualizar XMLs (NFe)" : "2) XML das Notas Fiscais (ZIP)"} 
          file={xmlFile} 
          setFile={setXmlFile} 
        />

        <button
          type="submit"
          disabled={!movFile && !xmlFile}
          className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-all flex items-center justify-center gap-2 ${
            movFile || xmlFile 
              ? isEditing ? 'bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20' 
              : 'bg-slate-300 cursor-not-allowed'
          }`}
        >
          {isEditing ? "Atualizar Fechamento" : "Iniciar Processamento"}
        </button>
      </form>
    </div>
  );
};

export default UploadStep;
