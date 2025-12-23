
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
}

interface NotificationContextType {
  notify: (title: string, message?: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((title: string, message?: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, type, title, message }]);

    // Auto dismiss
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'error': return <AlertOctagon className="w-5 h-5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getStyles = (type: NotificationType) => {
    switch (type) {
      case 'success': return 'bg-slate-900 border-emerald-500/50 shadow-emerald-900/20';
      case 'error': return 'bg-slate-900 border-red-500/50 shadow-red-900/20';
      case 'warning': return 'bg-slate-900 border-amber-500/50 shadow-amber-900/20';
      default: return 'bg-slate-900 border-blue-500/50 shadow-blue-900/20';
    }
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md min-w-[300px] max-w-md animate-[fadeIn_0.3s_ease-out] transition-all ${getStyles(n.type)}`}
          >
            <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white">{n.title}</h4>
              {n.message && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.message}</p>}
            </div>
            <button 
              onClick={() => removeNotification(n.id)}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
