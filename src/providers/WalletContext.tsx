'use client';

import { createContext, useContext, useMemo, ReactNode, useCallback, useState } from 'react';
import { useAccount, usePublicClient, useWalletClient, useConnect, useDisconnect } from 'wagmi';
import { PublicClient, WalletClient } from 'viem';
import { providers, Signer } from 'ethers';

export interface WalletContextType {
  eoaAddress: `0x${string}` | undefined;
  walletClient: WalletClient | null;
  ethersSigner: Signer | null;
  publicClient: PublicClient;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
  isConnecting: boolean;
}

export const WalletContext = createContext<WalletContextType | null>(null);

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}

interface WalletProviderProps {
  children: ReactNode;
}

export default function WalletProvider({ children }: WalletProviderProps) {
  const { address, isConnected, isConnecting } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const [isConnectingState, setIsConnectingState] = useState(false);

  const ethersSigner = useMemo(() => {
    if (!walletClient) return null;
    try {
      const provider = new providers.Web3Provider(walletClient as any);
      return provider.getSigner() as any;
    } catch (err) {
      console.error('[WalletProvider] Failed to convert wallet client to signer:', err);
      return null;
    }
  }, [walletClient]);

  const connect = useCallback(async () => {
    try {
      setIsConnectingState(true);
      const connector = connectors[0];
      if (connector) {
        await connectAsync({ connector });
      }
    } catch (err) {
      console.error('[WalletProvider] Connect error:', err);
      throw err;
    } finally {
      setIsConnectingState(false);
    }
  }, [connectAsync, connectors]);

  const disconnect = useCallback(async () => {
    try {
      await disconnectAsync();
    } catch (err) {
      console.error('[WalletProvider] Disconnect error:', err);
      throw err;
    }
  }, [disconnectAsync]);

  const value: WalletContextType = {
    eoaAddress: address,
    walletClient: walletClient || null,
    ethersSigner,
    publicClient: publicClient!,
    connect,
    disconnect,
    isConnected,
    isConnecting: isConnecting || isConnectingState,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}