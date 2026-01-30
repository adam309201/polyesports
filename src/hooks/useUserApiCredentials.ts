import { useCallback } from 'react';
import { useWallet } from '@/providers/WalletContext';
import { ClobClient } from '@polymarket/clob-client';

const CLOB_API_URL = 'https://clob.polymarket.com';
const POLYGON_CHAIN_ID = 137;

export interface UserApiCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

export default function useUserApiCredentials() {
  const { eoaAddress, ethersSigner } = useWallet();

  // Creates temporary clobClient to derive or create API credentials
  const createOrDeriveUserApiCredentials = useCallback(async (): Promise<UserApiCredentials> => {
    if (!eoaAddress || !ethersSigner) throw new Error('Wallet not connected');

    const tempClient = new ClobClient(CLOB_API_URL, POLYGON_CHAIN_ID, ethersSigner as any);

    try {
      // Try to derive existing credentials first
      const derivedCreds = await tempClient.deriveApiKey().catch(() => null);

      if (derivedCreds?.key && derivedCreds?.secret && derivedCreds?.passphrase) {
        console.log('[useUserApiCredentials] Successfully derived existing credentials');
        return derivedCreds;
      }

      // Derive failed - create new credentials
      console.log('[useUserApiCredentials] Creating new credentials...');
      const newCreds = await tempClient.createApiKey();
      console.log('[useUserApiCredentials] Successfully created new credentials');
      return newCreds;
    } catch (err) {
      console.error('[useUserApiCredentials] Failed to get credentials:', err);
      throw err;
    }
  }, [eoaAddress, ethersSigner]);

  return { createOrDeriveUserApiCredentials };
}