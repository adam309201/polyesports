'use client';

import { createContext, useContext, useMemo, useEffect, ReactNode, useCallback, useState } from 'react';
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
  const { address, isConnected, isConnecting, connector } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const [isConnectingState, setIsConnectingState] = useState(false);

  // Get EIP-1193 provider directly from the active connector.
  // This is critical for WalletConnect on mobile — walletClient.transport
  // is an HTTP fallback that can't deep-link to the wallet app for signing.
  // connector.getProvider() returns the real WalletConnect provider.
  const [eip1193Provider, setEip1193Provider] = useState<any>(null);

  useEffect(() => {
    if (!connector || !isConnected) {
      setEip1193Provider(null);
      return;
    }
    let cancelled = false;
    connector.getProvider().then((provider) => {
      if (!cancelled) setEip1193Provider(provider);
    }).catch(() => {
      if (!cancelled) setEip1193Provider(null);
    });
    return () => { cancelled = true; };
  }, [connector, isConnected]);

  const ethersSigner = useMemo(() => {
    if (!walletClient || !address) return null;
    const { chain } = walletClient;
    const network = {
      chainId: chain.id,
      name: chain.name,
      ensAddress: chain.contracts?.ensRegistry?.address,
    };
    try {
      // Prefer the connector's EIP-1193 provider (works with WalletConnect deep-link)
      if (eip1193Provider) {
        const provider = new providers.Web3Provider(eip1193Provider, network);
        return provider.getSigner(address) as any;
      }
      // Fallback: viem transport then walletClient
      const { transport } = walletClient;
      let provider: providers.Web3Provider;
      try {
        provider = new providers.Web3Provider(transport, network);
      } catch {
        provider = new providers.Web3Provider(walletClient as any, network);
      }
      return provider.getSigner(address) as any;
    } catch (err) {
      console.error('[WalletProvider] Failed to create ethers signer:', err);
      return null;
    }
  }, [walletClient, address, eip1193Provider]);

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