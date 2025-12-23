
import React from 'react';
import { AlertTriangle, ArrowRight, User, CheckCircle, Calendar, ArrowLeft } from 'lucide-react';
import { NFData } from '../types';
import { getVendedorLabel } from '../services/logic';

interface ResolutionStepProps {
  divergence: NFData;
  currentIndex: number;
  totalDivergences: number;
  onResolve: (decision: string) => void;
  onGoBack?: () => void;
}

const ResolutionStep: React.FC<ResolutionStepProps> = ({ 
  divergence, 
  currentIndex, 
  totalDivergences, 
  onResolve,
  onGoBack
}) => {
  
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Verifica o tipo de divergência
  const isDateDivergence = divergence.tipo_divergencia?.includes('DATA');
  const isVendorDivergence = divergence.tipo_divergencia?.includes('VENDEDOR');

  return (
    <div className="max-w-3xl mx-auto mt-4 md:mt-6 px-4 md:px-0 pb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {currentIndex > 0 && onGoBack && (
            <button 
              onClick={onGoBack}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors text-sm font-bold"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" />
            Resolução de Divergências
          </h2>
        </div>
        <span className="text-xs md:text-sm font-medium px-3 py-1 bg-slate-100 rounded-full text-slate-600">
          {currentIndex + 1} de {totalDivergences}
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
        {/* Header Info */}
        <div className="bg-slate-50 p-4 md:p-6 border-b border-slate-100 flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Nota Fiscal</p>
            <h3 className="text-2xl md:text-3xl font-black text-slate-800">{divergence.numero}</h3>
            <p className="text-xs md:text-sm text-slate-500 mt-1">Cliente: {divergence.cliente || 'Consumidor Final'}</p>
          </div>
          <div className="text-right">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Valor</p>
             <p className="text-xl md:text-2xl font-bold text-green-600">{fmt(divergence.valor)}</p>
             <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
               {divergence.tipo === 'PAGA_NO_DIA' ? 'Paga no Dia' : 'Faturada'}
             </div>
          </div>
        </div>

        {/* Conflict Details */}
        <div className="p-4 md:p-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h4 className="text-amber-800 font-semibold mb-1 flex items-center gap-2 text-sm md:text-base">
               <AlertTriangle className="w-4 h-4" /> Motivo da Divergência
            </h4>
            <p className="text-amber-900 text-sm md:text-base">{divergence.motivo_divergencia}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className={`p-4 rounded-lg border relative overflow-hidden ${isDateDivergence ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
              <div className="absolute top-0 right-0 bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 rounded-bl">MOVIMENTO</div>
              <p className="text-xs text-slate-500 mb-1">Registro de Caixa</p>
              
              <div className="font-bold text-base md:text-lg flex items-center gap-2 text-slate-700">
                <User className="w-5 h-5 text-blue-500" />
                {getVendedorLabel(divergence.vendedor_movimento)}
              </div>
              <div className="font-mono text-sm text-slate-600 mt-1 flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-slate-400" />
                 {divergence.data_pagamento_calculada || '-'}
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${isDateDivergence ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-100'}`}>
              <p className="text-xs text-slate-500 mb-1">Arquivo XML (NFe)</p>
              
              <div className="font-bold text-base md:text-lg flex items-center gap-2 text-slate-700">
                <FileArchive className="w-5 h-5 text-purple-500" />
                {getVendedorLabel(divergence.vendedor_xml)}
              </div>
              <div className="font-mono text-sm text-slate-600 mt-1 flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-slate-400" />
                 {divergence.data_emissao || '-'}
              </div>
            </div>
          </div>

          {/* Sugestões Automáticas - LÓGICA CONDICIONAL */}
          <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider border-b border-slate-100 pb-2">Ações Rápidas</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            {isDateDivergence ? (
               // --- OPÇÕES PARA DIVERGÊNCIA DE DATA ---
               <>
                 <button 
                  onClick={() => onResolve('DATE_MOV')}
                  className="flex items-center justify-between p-4 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all text-left group"
                 >
                  <div>
                    <span className="block font-bold text-blue-900 group-hover:text-blue-700 text-sm md:text-base">Usar Data Movimento</span>
                    <span className="text-xs md:text-sm text-blue-600">Considerar {divergence.data_pagamento_calculada}</span>
                  </div>
                  <CheckCircle className="w-5 h-5 text-blue-400 group-hover:text-blue-600" />
                 </button>

                 <button 
                  onClick={() => onResolve('DATE_XML')}
                  className="flex items-center justify-between p-4 border border-purple-200 bg-purple-50 rounded-lg hover:bg-purple-100 hover:border-purple-300 transition-all text-left group"
                 >
                  <div>
                    <span className="block font-bold text-purple-900 group-hover:text-purple-700 text-sm md:text-base">Usar Data Emissão</span>
                    <span className="text-xs md:text-sm text-purple-600">Considerar {divergence.data_emissao}</span>
                  </div>
                  <CheckCircle className="w-5 h-5 text-purple-400 group-hover:text-purple-600" />
                 </button>
               </>
            ) : (
               // --- OPÇÕES PADRÃO (VENDEDOR) ---
               <>
                <button 
                  onClick={() => onResolve('1')}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                >
                  <div>
                    <span className="block font-bold text-slate-800 group-hover:text-blue-700 text-sm md:text-base">Manter Movimento</span>
                    <span className="text-xs md:text-sm text-slate-500">Confirmar Vendedor {getVendedorLabel(divergence.vendedor_movimento)}</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
                </button>

                <button 
                  onClick={() => onResolve('3')}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
                >
                  <div>
                    <span className="block font-bold text-slate-800 group-hover:text-purple-700 text-sm md:text-base">Usar XML</span>
                    <span className="text-xs md:text-sm text-slate-500">Confirmar Vendedor {getVendedorLabel(divergence.vendedor_xml)}</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500" />
                </button>
               </>
            )}
          </div>

          {/* Seleção Manual (Ocultar se for divergência apenas de Data) */}
          {(!isDateDivergence || isVendorDivergence) && (
            <>
              <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider border-b border-slate-100 pb-2">Selecionar Vendedor Manualmente</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <button onClick={() => onResolve('E')} className="p-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800 font-medium text-sm transition-colors text-slate-600">
                    ENEIAS
                </button>
                <button onClick={() => onResolve('C')} className="p-3 border border-slate-200 rounded-lg hover:bg-pink-50 hover:border-pink-300 hover:text-pink-800 font-medium text-sm transition-colors text-slate-600">
                    CARLOS
                </button>
                <button onClick={() => onResolve('T')} className="p-3 border border-slate-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 hover:text-orange-800 font-medium text-sm transition-colors text-slate-600">
                    TARCISIO
                </button>
                <button onClick={() => onResolve('B')} className="p-3 border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-800 font-medium text-sm transition-colors text-slate-600">
                    BRAGA
                </button>
              </div>
            </>
          )}

          <div className="border-t border-slate-100 pt-4">
            <button 
                onClick={() => onResolve('4')}
                className="w-full text-center text-sm text-red-500 hover:text-red-700 font-medium p-2 hover:bg-red-50 rounded transition-colors"
              >
                Ignorar esta divergência
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

const FileArchive = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V4c0-.5.2-1 .6-1.4C5 2.2 5.5 2 6 2h12c.5 0 1 .2 1.4.6.4.4.6.9.6 1.4v18c0 .5-.2 1-.6 1.4-.4.4-.9.6-1.4.6H6c-.5 0-1-.2-1.4-.6C4.2 23 4 22.5 4 22z"/><path d="M10 2v2"/><path d="M14 2v2"/><path d="M9 14h6"/><path d="M9 10h6"/><path d="M9 18h6"/></svg>
);

export default ResolutionStep;
