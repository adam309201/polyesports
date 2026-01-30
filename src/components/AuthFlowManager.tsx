'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useTrading } from '@/providers/TradingProvider';
import AuthModal from './AuthModal';

const STORAGE_KEY_PREFIX = 'polymarket_trading_session_';

// Helper to check stored session
function getStoredSessionAddress(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    // Check all session keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const session = JSON.parse(stored);
          return session.eoaAddress?.toLowerCase() || null;
        }
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// Helper to clear stored session
function clearStoredSession(address?: string) {
  if (typeof window === 'undefined') return;
  try {
    if (address) {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${address.toLowerCase()}`);
    } else {
      // Clear all session keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }
  } catch {
    // Ignore
  }
}

/**
 * AuthFlowManager - Manages the auth flow state and shows AuthModal when needed
 * This component should be placed at the app level (in Providers or layout)
 */

export default function AuthFlowManager() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [sdkHasLoaded, setSdkHasLoaded] = useState(false);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  const { isConnected, address, isConnecting, isReconnecting } = useAccount();
  const { data: walletClient } = useWalletClient();

  const { isTradingSessionComplete, tradingSession, initializeTradingSession, endTradingSession } =
    useTrading();

  // Alias for compatibility
  const isInitialized = isTradingSessionComplete;
  const clearSession = endTradingSession;

  const prevWalletAddressRef = useRef<string | null>(null);
  const userDismissedRef = useRef(false);
  const authCompletedRef = useRef(false);
  const hasAttemptedRestoreRef = useRef(false);
  const sessionMatchesWalletRef = useRef(false);
  const wasConnectedRef = useRef(false);

  // Wait for connection to be stable (not connecting or reconnecting)
  const isConnectionStable = !isConnecting && !isReconnecting;

  useEffect(() => {
    setSdkHasLoaded(true);
  }, []);

  // Handle wallet disconnect
  useEffect(() => {
    if (!sdkHasLoaded) return;

    if (prevWalletAddressRef.current && !isConnected) {
      console.log('[AuthFlowManager] Wallet disconnected, clearing session');
      clearSession();
      prevWalletAddressRef.current = null;
      userDismissedRef.current = false;
      authCompletedRef.current = false;
      hasAttemptedRestoreRef.current = false;
      sessionMatchesWalletRef.current = false;
      setHasCheckedSession(false);
      setShowAuthModal(false);
    }
  }, [sdkHasLoaded, isConnected, clearSession]);

  // Listen for wallet account changes (MetaMask event)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      const newAddress = accounts[0]?.toLowerCase() || null;
      const prevAddress = prevWalletAddressRef.current?.toLowerCase() || null;

      if (prevAddress && prevAddress !== newAddress) {
        // Clear old session from localStorage and context
        clearStoredSession();
        clearSession();

        // Reset all tracking flags
        userDismissedRef.current = false;
        authCompletedRef.current = false;
        hasAttemptedRestoreRef.current = false;
        sessionMatchesWalletRef.current = false;

        // Reset hasCheckedSession so Step 1 will run again for new wallet
        setHasCheckedSession(false);

        // Update prevWalletAddressRef to new address
        prevWalletAddressRef.current = newAddress;

        if (!newAddress) {
          setShowAuthModal(false);
        } else {
          // New wallet connected - show auth modal
          setShowAuthModal(true);
        }
      }
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    return () => {
      ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
    };
  }, [clearSession]);

  // Detect wallet change via wagmi address change
  useEffect(() => {
    if (!sdkHasLoaded) return;
    if (!address) return;

    const currentAddress = address.toLowerCase();
    const prevAddress = prevWalletAddressRef.current?.toLowerCase();

    // First time seeing an address
    if (!prevAddress) {
      prevWalletAddressRef.current = currentAddress;
      return;
    }

    // Address changed
    if (prevAddress !== currentAddress) {
      // Clear old session
      clearStoredSession(prevAddress);
      clearSession();

      // Reset all tracking flags
      userDismissedRef.current = false;
      authCompletedRef.current = false;
      hasAttemptedRestoreRef.current = false;
      sessionMatchesWalletRef.current = false;
      setHasCheckedSession(false);

      // Update ref
      prevWalletAddressRef.current = currentAddress;

      // Show auth modal for new wallet
      setShowAuthModal(true);
    }
  }, [sdkHasLoaded, address, clearSession]);

  // STEP 1: Check session validity when connection is stable
  // This runs BEFORE trying to restore, just checks if session matches wallet
  useEffect(() => {
    if (!sdkHasLoaded) return;
    if (hasCheckedSession) return; // Only check once per connection
    if (!isConnectionStable) {
      return;
    }
    if (!isConnected || !address) return;

    const currentWalletAddress = address.toLowerCase();

    // Check if trading session matches current wallet
    const sessionAddress = tradingSession?.eoaAddress?.toLowerCase();
    const sessionMatchesCurrent = sessionAddress === currentWalletAddress;

    // If already initialized AND session matches current wallet, we're done
    if (isInitialized && sessionMatchesCurrent) {
      authCompletedRef.current = true;
      setHasCheckedSession(true);
      return;
    }

    // If initialized but session doesn't match, need to re-auth
    if (isInitialized && !sessionMatchesCurrent) {
      clearSession();
    }

    const storedAddress = getStoredSessionAddress();

    // Update prevWalletAddressRef
    if (!prevWalletAddressRef.current) {
      prevWalletAddressRef.current = currentWalletAddress;
    }

    // Check if stored session matches current wallet
    if (storedAddress && storedAddress === currentWalletAddress) {
      // Session matches! We'll try to restore it
      console.log('[AuthFlowManager] Step 1: Session matches wallet, will try to restore');
      sessionMatchesWalletRef.current = true;
    } else {
      // No session or session doesn't match
      if (storedAddress && storedAddress !== currentWalletAddress) {
        console.log('[AuthFlowManager] Step 1: Session is for different wallet, clearing');
        clearStoredSession(storedAddress);
      } else {
        console.log('[AuthFlowManager] Step 1: No stored session found');
      }
      sessionMatchesWalletRef.current = false;

      // Show auth modal immediately since there's no valid session
      if (!userDismissedRef.current && !authCompletedRef.current && !showAuthModal) {
        console.log('[AuthFlowManager] Step 1: No valid session, showing auth modal');
        setShowAuthModal(true);
      }
    }

    setHasCheckedSession(true);
  }, [
    sdkHasLoaded,
    hasCheckedSession,
    isConnectionStable,
    isConnecting,
    isReconnecting,
    isConnected,
    address,
    isInitialized,
    tradingSession,
    clearSession,
    showAuthModal,
  ]);

  // STEP 2: Check if session is already restored (trading session exists)
  useEffect(() => {
    if (!sdkHasLoaded) return;
    if (!hasCheckedSession) return;
    if (!sessionMatchesWalletRef.current) return;
    if (!isConnected || !address) return;
    if (!walletClient) {
      console.log('[AuthFlowManager] Step 2: Waiting for walletClient...');
      return;
    }
    if (isInitialized) {
      console.log('[AuthFlowManager] Step 2: Session already initialized');
      authCompletedRef.current = true;
      return;
    }
    if (hasAttemptedRestoreRef.current) return;

    // Trading session exists from localStorage - it will auto-restore via useTradingSession
    if (tradingSession) {
      console.log('[AuthFlowManager] Step 2: Trading session found, waiting for auto-restore...');
      hasAttemptedRestoreRef.current = true;
      // The useTradingSession hook will automatically restore the relay client
      // Just wait for isInitialized to become true
      return;
    }

    // No session found, show auth modal
    console.log('[AuthFlowManager] Step 2: No trading session, showing auth modal');
    hasAttemptedRestoreRef.current = true;
    setShowAuthModal(true);
  }, [
    sdkHasLoaded,
    hasCheckedSession,
    isConnected,
    address,
    walletClient,
    isInitialized,
    tradingSession,
  ]);

  // Safety net: detect connection transition and ensure auth modal shows
  // This catches mobile WalletConnect flows where STEP 1 may miss due to isConnectionStable timing
  useEffect(() => {
    if (!sdkHasLoaded) return;

    const wasConnected = wasConnectedRef.current;

    if (isConnected && address) {
      wasConnectedRef.current = true;

      // Fresh connection: was not connected, now connected
      if (!wasConnected) {
        if (isInitialized) {
          authCompletedRef.current = true;
          return;
        }
        if (userDismissedRef.current || authCompletedRef.current) return;
        if (showAuthModal) return;

        // Wait briefly for session restore, then show modal if still needed
        const timer = setTimeout(() => {
          if (
            !authCompletedRef.current &&
            !userDismissedRef.current
          ) {
            console.log('[AuthFlowManager] Safety: fresh connect detected, showing auth modal');
            setShowAuthModal(true);
          }
        }, 1500);
        return () => clearTimeout(timer);
      }
    } else {
      wasConnectedRef.current = false;
    }
  }, [sdkHasLoaded, isConnected, address, isInitialized, showAuthModal]);

  // Handle when initialization completes (close modal)
  useEffect(() => {
    if (isInitialized && isConnected && address) {
      authCompletedRef.current = true;
      if (showAuthModal) {
        console.log('[AuthFlowManager] Initialization complete, closing modal');
        setShowAuthModal(false);
      }
    }
  }, [isInitialized, isConnected, address, showAuthModal]);

  const handleClose = useCallback(() => {
    userDismissedRef.current = true;
    setShowAuthModal(false);
  }, []);

  const handleComplete = useCallback(() => {
    authCompletedRef.current = true;
    setShowAuthModal(false);
  }, []);

  return <AuthModal isOpen={showAuthModal} onClose={handleClose} onComplete={handleComplete} />;
}