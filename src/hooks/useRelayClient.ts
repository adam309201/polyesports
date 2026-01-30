import { useState, useCallback } from 'react';
import { useWallet } from '@/providers/WalletContext';
import { BuilderConfig } from '@polymarket/builder-signing-sdk';
import { RelayClient } from '@polymarket/builder-relayer-client';

const RELAYER_URL = 'https://relayer-v2.polymarket.com/';
const POLYGON_CHAIN_ID = 137;

// Remote signing URL for builder authentication
const getRemoteSigningUrl = () =>
  typeof window !== 'undefined'
    ? `${window.location.origin}/api/polymarket/sign`
    : '/api/polymarket/sign';

export default function useRelayClient() {
  const [relayClient, setRelayClient] = useState<RelayClient | null>(null);
  const { eoaAddress, ethersSigner } = useWallet();

  const initializeRelayClient = useCallback(async () => {
    if (!eoaAddress || !ethersSigner) {
      throw new Error('Wallet not connected');
    }

    try {
      // Builder config for remote signing
      const builderConfig = new BuilderConfig({
        remoteBuilderConfig: {
          url: getRemoteSigningUrl(),
        },
      });

      // Create relay client for Safe operations
      const client = new RelayClient(
        RELAYER_URL,
        POLYGON_CHAIN_ID,
        ethersSigner as any,
        builderConfig
      );

      setRelayClient(client);
      return client;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize relay client');
      throw error;
    }
  }, [eoaAddress, ethersSigner]);

  const clearRelayClient = useCallback(() => {
    setRelayClient(null);
  }, []);

  return {
    relayClient,
    initializeRelayClient,
    clearRelayClient,
  };
}