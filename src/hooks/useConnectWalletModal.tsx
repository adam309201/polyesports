'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ConnectWalletModal from '@/components/ConnectWalletModal';

interface ConnectWalletModalContextType {
  isOpen: boolean;
  openConnectModal: () => void;
  closeConnectModal: () => void;
}

const ConnectWalletModalContext = createContext<ConnectWalletModalContextType | null>(null);

export function ConnectWalletModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openConnectModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeConnectModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <ConnectWalletModalContext.Provider value={{ isOpen, openConnectModal, closeConnectModal }}>
      {children}
      <ConnectWalletModal isOpen={isOpen} onClose={closeConnectModal} />
    </ConnectWalletModalContext.Provider>
  );
}

export function useConnectWalletModal() {
  const context = useContext(ConnectWalletModalContext);
  if (!context) {
    throw new Error('useConnectWalletModal must be used within ConnectWalletModalProvider');
  }
  return context;
}