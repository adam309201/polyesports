import { useMemo } from 'react';
import { TradingSession } from '@/utils/session';
import { ClobClient } from '@polymarket/clob-client';
import { useWallet } from '@/providers/WalletContext';
import useSafeDeployment from '@/hooks/useSafeDeployment';
import { BuilderConfig } from '@polymarket/builder-signing-sdk';

const CLOB_API_URL = 'https://clob.polymarket.com';
const POLYGON_CHAIN_ID = 137;

// Remote signing URL
const getRemoteSigningUrl = () =>
  typeof window !== 'undefined'
    ? `${window.location.origin}/api/polymarket/sign`
    : '/api/polymarket/sign';

// Creates authenticated clobClient with User API Credentials
// and builder config, only after trading session is initialized

export default function useClobClient(
  tradingSession: TradingSession | null,
  isTradingSessionComplete: boolean | undefined
) {
  const { eoaAddress, ethersSigner } = useWallet();
  const { derivedSafeAddressFromEoa } = useSafeDeployment();

  const clobClient = useMemo(() => {
    if (
      !ethersSigner ||
      !eoaAddress ||
      !derivedSafeAddressFromEoa ||
      !isTradingSessionComplete ||
      !tradingSession?.apiCredentials?.key ||
      !tradingSession?.apiCredentials?.secret ||
      !tradingSession?.apiCredentials?.passphrase
    ) {
      return null;
    }

    // Builder config for order attribution
    const builderConfig = new BuilderConfig({
      remoteBuilderConfig: {
        url: getRemoteSigningUrl(),
      },
    });

    // Authenticated clobClient for creating and posting orders
    return new ClobClient(
      CLOB_API_URL,
      POLYGON_CHAIN_ID,
      ethersSigner as any,
      tradingSession.apiCredentials,
      2, // signatureType = 2 for Safe funder
      derivedSafeAddressFromEoa,
      undefined, // mandatory placeholder
      false,
      builderConfig
    );
  }, [
    eoaAddress,
    ethersSigner,
    derivedSafeAddressFromEoa,
    isTradingSessionComplete,
    tradingSession?.apiCredentials,
  ]);

  return { clobClient };
}