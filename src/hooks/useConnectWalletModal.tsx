'use client';

import { ReactNode } from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';

// Provider is now a passthrough — RainbowKit manages its own modal
export function ConnectWalletModalProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useConnectWalletModal() {
  const { openConnectModal } = useConnectModal();
  return {
    openConnectModal: openConnectModal ?? (() => {}),
  };
}
