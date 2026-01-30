'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { polygon } from 'viem/chains';
import { useTrading } from '@/providers/TradingProvider';
import { useConnectModal } from '@rainbow-me/rainbowkit';

type AuthStep = 'connect' | 'initialize' | 'complete';
type StepStatus = 'pending' | 'loading' | 'success' | 'error';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export default function AuthModal({ isOpen, onClose, onComplete }: AuthModalProps) {
  const [currentStep, setCurrentStep] = useState<AuthStep>('connect');
  const [stepStatus, setStepStatus] = useState<StepStatus>('pending');
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedInit, setHasAttemptedInit] = useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);

  const { isConnected, address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();

  const { openConnectModal } = useConnectModal();

  const {
    isTradingSessionComplete,
    currentStep: tradingStep,
    sessionError,
    initializeTradingSession,
  } = useTrading();

  // Alias for compatibility
  const isInitialized = isTradingSessionComplete;
  const polymarketLoading = tradingStep !== 'idle' && tradingStep !== 'complete';
  const polymarketError = sessionError?.message || null;

  const initializeRef = useRef(initializeTradingSession);
  initializeRef.current = initializeTradingSession;

  // Check if on wrong network
  const isWrongNetwork = isConnected && chainId !== polygon.id;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setStepStatus('pending');
      setHasAttemptedInit(false);
    }
  }, [isOpen]);

  // Reset init state when address changes (wallet switched)
  const prevAddressRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      address &&
      prevAddressRef.current &&
      address.toLowerCase() !== prevAddressRef.current.toLowerCase()
    ) {
      setHasAttemptedInit(false);
      setStepStatus('pending');
      setError(null);
    }
    prevAddressRef.current = address?.toLowerCase() || null;
  }, [address]);

  // Determine current step based on state (only if no error)
  useEffect(() => {
    if (!isOpen) return;

    // Don't change step if there's an error - stay on current step
    if (stepStatus === 'error') return;

    let newStep: AuthStep;
    if (!isConnected || !address) {
      newStep = 'connect';
    } else if (!isInitialized) {
      newStep = 'initialize';
    } else {
      newStep = 'complete';
      setStepStatus('success');
    }

    if (newStep !== currentStep) {
      setCurrentStep(newStep);
      // Reset status when changing steps (except for complete)
      if (newStep !== 'complete') {
        setStepStatus('pending');
        setError(null);
      }
    }
  }, [isConnected, address, isInitialized, currentStep, isOpen, stepStatus]);

  // Initialize Trading Session when on initialize step
  useEffect(() => {
    const initTradingSession = async () => {
      if (!isOpen) return;
      if (currentStep !== 'initialize') return;
      if (!isConnected || !address) return;
      if (isWrongNetwork) {
        return;
      }
      if (!walletClient) {
        return;
      }

      // Verify walletClient matches connected address
      const walletClientAddress = walletClient.account?.address?.toLowerCase();
      const connectedAddress = address?.toLowerCase();
      if (walletClientAddress !== connectedAddress) {
        return;
      }

      if (isInitialized) return;
      if (stepStatus === 'loading' || stepStatus === 'error') return;
      if (hasAttemptedInit) return;

      setHasAttemptedInit(true);
      setStepStatus('loading');
      setError(null);

      try {
        // Initialize trading session - hooks handle signer internally
        await initializeRef.current();
      } catch (err) {
        console.error('[AuthModal] Failed to initialize trading session:', err);
        const message = err instanceof Error ? err.message : 'Failed to initialize';

        // Check if user rejected/cancelled
        const isUserRejection =
          message.toLowerCase().includes('reject') ||
          message.toLowerCase().includes('denied') ||
          message.toLowerCase().includes('cancel') ||
          message.toLowerCase().includes('user refused');

        setStepStatus('error');
        setError(isUserRejection ? 'You cancelled the signature request.' : message);
      }
    };

    initTradingSession();
  }, [
    currentStep,
    isConnected,
    address,
    isWrongNetwork,
    walletClient,
    isInitialized,
    isOpen,
    stepStatus,
    hasAttemptedInit,
    tradingStep,
  ]);

  // Auto-close when complete
  useEffect(() => {
    if (currentStep === 'complete' && stepStatus === 'success' && isOpen) {
      const timer = setTimeout(() => {
        onComplete?.();
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, stepStatus, onClose, onComplete, isOpen]);

  const handleRetry = useCallback(() => {
    setStepStatus('pending');
    setError(null);
    setHasAttemptedInit(false);
  }, []);

  const handleSwitchNetwork = useCallback(async () => {
    if (!switchChain) return;

    setIsSwitchingChain(true);
    setError(null);

    try {
      await switchChain({ chainId: polygon.id });
      // Reset init attempt after switching
      setHasAttemptedInit(false);
    } catch (err) {
      console.error('[AuthModal] Failed to switch network:', err);
      setError('Failed to switch network. Please switch to Polygon manually.');
    } finally {
      setIsSwitchingChain(false);
    }
  }, [switchChain]);

  const handleClose = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      onClose();
    },
    [onClose]
  );

  if (!isOpen) return null;

  const steps = [
    { id: 'connect', label: 'Connect', number: 1 },
    { id: 'initialize', label: 'Sign', number: 2 },
    { id: 'complete', label: 'Done', number: 3 },
  ];

  const getStepState = (stepId: string) => {
    const stepOrder = ['connect', 'initialize', 'complete'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepId);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) {
      if (stepStatus === 'error') return 'error';
      if (stepStatus === 'loading') return 'loading';
      if (stepStatus === 'success') return 'completed';
      return 'current';
    }
    return 'pending';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all hover:bg-slate-200 hover:text-slate-900"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="px-6 pt-8 pb-4 text-center">
          <h2 className="text-xl font-bold text-slate-900">Setup Trading</h2>
          <p className="mt-1 text-sm text-slate-500">Complete the steps to start trading</p>
        </div>

        {/* Steps Progress */}
        <div className="px-8 pb-6">
          <div className="relative flex items-center justify-between">
            {/* Progress Line Background */}
            <div className="absolute top-5 right-[20%] left-[20%] h-0.5 bg-slate-200" />

            {/* Progress Line Active */}
            <div
              className="absolute top-5 left-[20%] h-0.5 bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-500"
              style={{
                width:
                  currentStep === 'connect' ? '0%' : currentStep === 'initialize' ? '30%' : '60%',
              }}
            />

            {steps.map((step) => {
              const state = getStepState(step.id);
              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                      state === 'completed'
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : state === 'error'
                          ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                          : state === 'loading'
                            ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                            : state === 'current'
                              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                              : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {state === 'completed' ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    ) : state === 'error' ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    ) : state === 'loading' ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium transition-colors ${
                      state === 'completed'
                        ? 'text-emerald-600'
                        : state === 'error'
                          ? 'text-red-500'
                          : state === 'current' || state === 'loading'
                            ? 'text-sky-500'
                            : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            {/* Step 1: Connect Wallet */}
            {currentStep === 'connect' && (
              <div className="space-y-4 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-sky-400"
                  >
                    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4Z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-900">Connect Wallet</h3>
                <p className="mt-1 text-sm text-slate-500">Choose your wallet to continue</p>
                <button
                  onClick={openConnectModal}
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:from-sky-600 hover:to-indigo-600"
                >
                  Connect Wallet
                </button>
              </div>
            )}

            {/* Step 2: Initialize Polymarket */}
            {currentStep === 'initialize' && (
              <div className="space-y-4 text-center">
                <div
                  className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
                    stepStatus === 'error' || isWrongNetwork
                      ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20'
                      : 'bg-gradient-to-br from-sky-500/20 to-indigo-500/20'
                  }`}
                >
                  {stepStatus === 'loading' || isSwitchingChain ? (
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400" />
                  ) : stepStatus === 'error' ? (
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-red-400"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                  ) : isWrongNetwork ? (
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-orange-400"
                    >
                      <path d="M12 9v4M12 17h.01" />
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    </svg>
                  ) : !walletClient ? (
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400" />
                  ) : (
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-sky-400"
                    >
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {isWrongNetwork
                      ? 'Wrong Network'
                      : stepStatus === 'error'
                        ? 'Signature Failed'
                        : stepStatus === 'loading'
                          ? 'Waiting for Signature...'
                          : isSwitchingChain
                            ? 'Switching Network...'
                            : !walletClient
                              ? 'Preparing...'
                              : 'Sign Message'}
                  </h3>
                  <p
                    className={`mt-1 text-sm ${stepStatus === 'error' ? 'text-red-500' : isWrongNetwork ? 'text-orange-500' : 'text-slate-500'}`}
                  >
                    {isWrongNetwork
                      ? 'Please switch to Polygon network to continue'
                      : stepStatus === 'error'
                        ? polymarketError || error || 'Initialization failed. Please try again.'
                        : stepStatus === 'loading'
                          ? 'Please sign the message in your wallet'
                          : isSwitchingChain
                            ? 'Confirm the network switch in your wallet'
                            : !walletClient
                              ? 'Waiting for wallet connection...'
                              : 'Sign to create your trading credentials'}
                  </p>
                </div>
                {isWrongNetwork && (
                  <button
                    onClick={handleSwitchNetwork}
                    disabled={isSwitchingChain}
                    className="mt-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50"
                  >
                    {isSwitchingChain ? 'Switching...' : 'Switch to Polygon'}
                  </button>
                )}
                {stepStatus === 'error' && !isWrongNetwork && (
                  <button
                    onClick={handleRetry}
                    className="mt-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:from-sky-600 hover:to-indigo-600"
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}

            {/* Step 3: Complete */}
            {currentStep === 'complete' && (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-emerald-400"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Ready to Trade!</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Your account is set up. Happy trading!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <p className="text-center text-xs text-slate-400">
            {currentStep === 'connect' && 'Secure connection via Polygon network'}
            {currentStep === 'initialize' &&
              (isWrongNetwork
                ? 'Polymarket requires Polygon network'
                : stepStatus === 'error'
                  ? 'Click "Try Again" to retry'
                  : 'One-time setup for Polymarket trading')}
            {currentStep === 'complete' && 'Closing automatically...'}
          </p>
        </div>
      </div>
    </div>
  );
}