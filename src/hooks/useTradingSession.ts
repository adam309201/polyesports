import { useState, useCallback, useEffect, useRef } from 'react';
import { useWallet } from '@/providers/WalletContext';
import useUserApiCredentials from '@/hooks/useUserApiCredentials';
import useTokenApprovals from '@/hooks/useTokenApprovals';
import useSafeDeployment from '@/hooks/useSafeDeployment';
import useRelayClient from '@/hooks/useRelayClient';
import {
  loadSession,
  saveSession,
  clearSession as clearStoredSession,
  TradingSession,
  SessionStep,
} from '@/utils/session';

// Main coordination hook that manages the user's trading session
// Orchestrates steps for initializing clob and relay clients
// Creates, stores, and loads user's L2 credentials (API credentials)
// Deploys Safe and sets token approvals for CTF Exchange

export default function useTradingSession() {
  const [tradingSession, setTradingSession] = useState<TradingSession | null>(null);
  const [currentStep, setCurrentStep] = useState<SessionStep>('idle');
  const [sessionError, setSessionError] = useState<Error | null>(null);

  const { eoaAddress, walletClient } = useWallet();
  const { createOrDeriveUserApiCredentials } = useUserApiCredentials();
  const { checkAllTokenApprovals, setAllTokenApprovals } = useTokenApprovals();
  const { derivedSafeAddressFromEoa, isSafeDeployed, deploySafe } = useSafeDeployment();
  const { relayClient, initializeRelayClient, clearRelayClient } = useRelayClient();
  const isInitializingRef = useRef(false);

  // Step 0: Check for existing session when wallet connects
  useEffect(() => {
    if (!eoaAddress) {
      setTradingSession(null);
      setCurrentStep('idle');
      setSessionError(null);
      return;
    }

    const stored = loadSession(eoaAddress);
    setTradingSession(stored);

    if (!stored) {
      setCurrentStep('idle');
      setSessionError(null);
    }
  }, [eoaAddress]);

  // Restore relay client when session exists and wallet is ready
  useEffect(() => {
    if (tradingSession && !relayClient && eoaAddress && walletClient) {
      initializeRelayClient().catch((err) => {
        console.error('[useTradingSession] Failed to restore relay client:', err);
      });
    }
  }, [tradingSession, relayClient, eoaAddress, walletClient, initializeRelayClient]);

  // Main function to orchestrate trading session initialization
  const initializeTradingSession = useCallback(async () => {
    if (isInitializingRef.current) return;
    if (!eoaAddress) {
      throw new Error('Wallet not connected');
    }

    isInitializingRef.current = true;
    setCurrentStep('checking');
    setSessionError(null);

    try {
      // Step 0: Load existing session
      const existingSession = loadSession(eoaAddress);

      // Step 1: Initialize relayClient
      const initializedRelayClient = await initializeRelayClient();

      // Step 2: Get Safe address
      if (!derivedSafeAddressFromEoa) {
        throw new Error('Failed to derive Safe address');
      }

      // Step 3: Check if Safe is deployed
      let isDeployed = await isSafeDeployed(initializedRelayClient, derivedSafeAddressFromEoa);

      // Step 4: Deploy Safe if needed
      if (!isDeployed) {
        setCurrentStep('deploying');
        await deploySafe(initializedRelayClient);
      }

      // Step 5: Get User API Credentials
      let apiCreds = existingSession?.apiCredentials;
      if (
        !existingSession?.hasApiCredentials ||
        !apiCreds ||
        !apiCreds.key ||
        !apiCreds.secret ||
        !apiCreds.passphrase
      ) {
        setCurrentStep('credentials');
        apiCreds = await createOrDeriveUserApiCredentials();
      }

      // Step 6: Set token approvals
      setCurrentStep('approvals');
      const approvalStatus = await checkAllTokenApprovals(derivedSafeAddressFromEoa);

      let hasApprovals = false;
      if (approvalStatus.allApproved) {
        hasApprovals = true;
      } else {
        hasApprovals = await setAllTokenApprovals(initializedRelayClient);
      }

      // Step 7: Create and save session
      const newSession: TradingSession = {
        eoaAddress: eoaAddress,
        safeAddress: derivedSafeAddressFromEoa,
        isSafeDeployed: true,
        hasApiCredentials: true,
        hasApprovals,
        apiCredentials: apiCreds,
        lastChecked: Date.now(),
      };

      setTradingSession(newSession);
      saveSession(eoaAddress, newSession);
      setCurrentStep('complete');
    } catch (err) {
      console.error('[useTradingSession] Session initialization error:', err);
      const error = err instanceof Error ? err : new Error('Unknown error');
      setSessionError(error);
      setCurrentStep('idle');
    } finally {
      isInitializingRef.current = false;
    }
  }, [
    eoaAddress,
    derivedSafeAddressFromEoa,
    initializeRelayClient,
    isSafeDeployed,
    deploySafe,
    createOrDeriveUserApiCredentials,
    checkAllTokenApprovals,
    setAllTokenApprovals,
  ]);

  // End trading session
  const endTradingSession = useCallback(() => {
    if (!eoaAddress) return;

    clearStoredSession(eoaAddress);
    setTradingSession(null);
    clearRelayClient();
    setCurrentStep('idle');
    setSessionError(null);
  }, [eoaAddress, clearRelayClient]);

  // Ensure boolean result — also verify actual credential values exist
  // (guards against corrupted localStorage where flags are true but values are missing)
  const isTradingSessionComplete = Boolean(
    tradingSession?.isSafeDeployed &&
    tradingSession?.hasApiCredentials &&
    tradingSession?.hasApprovals &&
    tradingSession?.apiCredentials?.key &&
    tradingSession?.apiCredentials?.secret &&
    tradingSession?.apiCredentials?.passphrase
  );

  return {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete,
    initializeTradingSession,
    endTradingSession,
    relayClient,
  };
}