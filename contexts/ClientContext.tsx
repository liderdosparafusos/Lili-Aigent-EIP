
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Cliente } from '../types';

interface ClientContextType {
  activeClient: Cliente | null;
  setActiveClient: (client: Cliente | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeClient, setActiveClient] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <ClientContext.Provider value={{ activeClient, setActiveClient, isLoading, setIsLoading }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClientContext = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClientContext must be used within a ClientProvider');
  }
  return context;
};
