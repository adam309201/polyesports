import { useCallback, useMemo } from 'react';
import { useWallet } from '@/providers/WalletContext';
import { RelayClient } from '@polymarket/builder-relayer-client';
import { deriveSafe } from '@polymarket/builder-relayer-client/dist/builder/derive';
import { getContractConfig } from '@polymarket/builder-relayer-client/dist/config';

const POLYGON_CHAIN_ID = 137;

export default function useSafeDeployment() {
  const { eoaAddress, isConnected, publicClient } = useWallet();

  // Derive Safe address from EOA address
  const derivedSafeAddressFromEoa = useMemo(() => {
    if (!eoaAddress || !isConnected) return null;

    try {
      const config = getContractConfig(POLYGON_CHAIN_ID);
      const derived = deriveSafe(eoaAddress, config.SafeContracts.SafeFactory);
      console.log('[useSafeDeployment] Derived Safe address:', derived, 'from EOA:', eoaAddress);
      return derived;
    } catch (error) {
      console.error('[useSafeDeployment] Error deriving Safe address:', error);
      return null;
    }
  }, [eoaAddress, isConnected]);

  // Check if Safe is deployed
  const isSafeDeployed = useCallback(
    async (relayClient: RelayClient, safeAddr: string): Promise<boolean> => {
      try {
        // Try relayClient first
        const deployed = await (relayClient as any).getDeployed(safeAddr);
        return deployed;
      } catch (err) {
        console.warn('[useSafeDeployment] API check failed, falling back to RPC', err);

        // Fallback to RPC
        if (publicClient) {
          const code = await publicClient.getBytecode({
            address: safeAddr as `0x${string}`,
          });
          return code !== undefined && code !== '0x' && code.length > 2;
        }

        return false;
      }
    },
    [publicClient]
  );

  // Deploy Safe using relayClient
  const deploySafe = useCallback(async (relayClient: RelayClient): Promise<string> => {
    try {
      const response = await relayClient.deploy();
      const result = await response.wait();

      if (!result) {
        throw new Error('Safe deployment failed');
      }

      return result.proxyAddress;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to deploy Safe');
      throw error;
    }
  }, []);

  return {
    derivedSafeAddressFromEoa,
    isSafeDeployed,
    deploySafe,
  };
}