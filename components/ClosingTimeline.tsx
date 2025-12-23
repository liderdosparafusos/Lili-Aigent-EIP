
import React from 'react';
import { CheckCircle, Clock, AlertTriangle, User, FileText, Lock, RotateCcw, AlertOctagon } from 'lucide-react';
import { ClosingEvent, ClosingEventType } from '../types';

interface ClosingTimelineProps {
  events: ClosingEvent[];
}

const ClosingTimeline: React.FC<ClosingTimelineProps> = ({ events }) => {
  // Sort events descending
  const sortedEvents = [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getIcon = (type: ClosingEventType) => {
      switch(type) {
          case 'IMPORT': return <FileText className="w-4 h-4 text-blue-400" />;
          case 'CONCILIATION': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
          case 'DIVERGENCE': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
          case 'COMMISSION': return <User className="w-4 h-4 text-purple-400" />;
          case 'VALIDATION': return <CheckCircle className="w-4 h-4 text-cyan-400" />;
          case 'CLOSE': return <Lock className="w-4 h-4 text-emerald-500" />;
          case 'REOPEN': return <RotateCcw className="w-4 h-4 text-red-400" />;
          case 'ALERT': return <AlertOctagon className="w-4 h-4 text-amber-500" />;
          default: return <Clock className="w-4 h-4 text-slate-400" />;
      }
  };

  const fmtDate = (iso: string) => {
      const d = new Date(iso);
      return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="relative border-l border-slate-700 ml-3 space-y-6 py-2">
        {sortedEvents.length === 0 && (
            <p className="text-slate-500 text-sm ml-6">Nenhum evento registrado na linha do tempo.</p>
        )}
        {sortedEvents.map((event) => (
            <div key={event.id} className="relative pl-6 animate-[fadeIn_0.3s_ease-out]">
                <div className="absolute -left-[9px] top-0 p-1 bg-slate-900 border border-slate-700 rounded-full">
                    {getIcon(event.type)}
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-slate-500 font-mono">{fmtDate(event.timestamp)}</span>
                    <p className={`text-sm font-medium ${event.type === 'ALERT' ? 'text-amber-300' : 'text-slate-200'}`}>
                        {event.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                            {event.user.split('@')[0]}
                        </span>
                        {event.type === 'CLOSE' && (
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-800">
                                BLOQUEADO
                            </span>
                        )}
                    </div>
                </div>
            </div>
        ))}
    </div>
  );
};

export default ClosingTimeline;
