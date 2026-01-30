'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useConnect } from 'wagmi';
import ConnectWalletModal from '@/components/ConnectWalletModal';
import { isMobile } from '@/utils';

interface ConnectWalletModalContextType {
  isOpen: boolean;
  openConnectModal: () => void;
  closeConnectModal: () => void;
}

const ConnectWalletModalContext = createContext<ConnectWalletModalContextType | null>(null);

export function ConnectWalletModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { connect, connectors } = useConnect();

  const openConnectModal = useCallback(() => {
    // Mobile: skip modal, open WalletConnect directly
    if (isMobile()) {
      const wcConnector = connectors.find(c => c.id.toLowerCase().includes('walletconnect'));
      if (wcConnector) {
        connect({ connector: wcConnector });
        return;
      }
    }
    // Desktop: show wallet selection modal
    setIsOpen(true);
  }, [connect, connectors]);

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