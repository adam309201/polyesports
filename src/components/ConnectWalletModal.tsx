'use client';

import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConnect, useAccount } from 'wagmi';
import { Connector } from 'wagmi';
import { MetamaskIcon } from '@/components/icons';
import { isMobile } from '@/utils';

// Wallet icons
const WalletIcons = {
  metaMask: <MetamaskIcon />,
  walletConnect: (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#3B99FC" />
      <path
        d="M8.5 11C11.5 8 16.5 8 19.5 11L20 11.5C20.2 11.7 20.2 12 20 12.2L18.7 13.5C18.6 13.6 18.4 13.6 18.3 13.5L17.6 12.8C15.6 10.8 12.4 10.8 10.4 12.8L9.6 13.6C9.5 13.7 9.3 13.7 9.2 13.6L7.9 12.3C7.7 12.1 7.7 11.8 7.9 11.6L8.5 11ZM21.8 13.3L23 14.5C23.2 14.7 23.2 15 23 15.2L18.5 19.7C18.3 19.9 18 19.9 17.8 19.7L14.7 16.6C14.65 16.55 14.55 16.55 14.5 16.6L11.4 19.7C11.2 19.9 10.9 19.9 10.7 19.7L6.2 15.2C6 15 6 14.7 6.2 14.5L7.4 13.3C7.6 13.1 7.9 13.1 8.1 13.3L11.2 16.4C11.25 16.45 11.35 16.45 11.4 16.4L14.5 13.3C14.7 13.1 15 13.1 15.2 13.3L18.3 16.4C18.35 16.45 18.45 16.45 18.5 16.4L21.6 13.3C21.8 13.1 22.1 13.1 22.3 13.3L21.8 13.3Z"
        fill="white"
      />
    </svg>
  ),
  coinbase: (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#0052FF" />
      <path
        d="M14 5C9 5 5 9 5 14C5 19 9 23 14 23C19 23 23 19 23 14C23 9 19 5 14 5ZM11.5 16.5C10.7 16.5 10 15.8 10 15V13C10 12.2 10.7 11.5 11.5 11.5H16.5C17.3 11.5 18 12.2 18 13V15C18 15.8 17.3 16.5 16.5 16.5H11.5Z"
        fill="white"
      />
    </svg>
  ),
  injected: (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#627EEA" />
      <path d="M14 4L13.8 4.6V17.5L14 17.7L19.8 14.3L14 4Z" fill="white" fillOpacity="0.6" />
      <path d="M14 4L8.2 14.3L14 17.7V11.4V4Z" fill="white" />
      <path d="M14 18.9L13.9 19V23.4L14 23.7L19.8 15.5L14 18.9Z" fill="white" fillOpacity="0.6" />
      <path d="M14 23.7V18.9L8.2 15.5L14 23.7Z" fill="white" />
      <path d="M14 17.7L19.8 14.3L14 11.4V17.7Z" fill="white" fillOpacity="0.2" />
      <path d="M8.2 14.3L14 17.7V11.4L8.2 14.3Z" fill="white" fillOpacity="0.6" />
    </svg>
  ),
};

function getConnectorIcon(connector: Connector) {
  const id = connector.id.toLowerCase();
  if (id.includes('metamask')) return WalletIcons.metaMask;
  if (id.includes('walletconnect')) return WalletIcons.walletConnect;
  if (id.includes('coinbase')) return WalletIcons.coinbase;
  return WalletIcons.injected;
}

function getConnectorName(connector: Connector) {
  if (connector.id.toLowerCase().includes('metamask')) return 'MetaMask';
  if (connector.id.toLowerCase().includes('walletconnect')) return 'WalletConnect';
  if (connector.id.toLowerCase().includes('coinbase')) return 'Coinbase Wallet';
  return connector.name;
}

function getConnectorDescription(connector: Connector) {
  const id = connector.id.toLowerCase();
  if (id.includes('metamask')) return 'Popular browser extension';
  if (id.includes('walletconnect')) return 'Scan with mobile wallet';
  if (id.includes('coinbase')) return 'Coinbase Wallet app';
  return 'Browser extension';
}

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  const { connect, connectors, isPending } = useConnect();
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // Handle client-side mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Mobile: auto-trigger WalletConnect when modal opens
  useEffect(() => {
    if (!isOpen || !mounted || isConnected) return;
    if (!isMobile()) return;
    const wcConnector = connectors.find(c => c.id.toLowerCase().includes('walletconnect'));
    if (wcConnector && !isPending) {
      setConnectingId(wcConnector.uid);
      connect({ connector: wcConnector });
    }
  }, [isOpen, mounted, isConnected, connectors, isPending, connect]);

  // Close modal when connected
  useEffect(() => {
    if (isConnected && isOpen) {
      setConnectingId(null);
      onClose();
    }
  }, [isConnected, isOpen, onClose]);

  // Reset connecting state when pending ends
  useEffect(() => {
    if (!isPending) {
      setConnectingId(null);
    }
  }, [isPending]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleConnect = useCallback(
    (connector: Connector) => {
      const id = connector.id.toLowerCase();
      // Mobile: use WalletConnect to deeplink to wallet app then return to browser
      if (isMobile() && !id.includes('walletconnect')) {
        const wcConnector = connectors.find(c => c.id.toLowerCase().includes('walletconnect'));
        if (wcConnector) {
          setConnectingId(connector.uid);
          connect({ connector: wcConnector });
          return;
        }
      }
      // Desktop: connect directly via native connector (extension)
      setConnectingId(connector.uid);
      connect({ connector });
    },
    [connect, connectors]
  );

  // Filter connectors
  const filteredConnectors = connectors.filter((connector) => {
    const id = connector.id.toLowerCase();
    if (id.includes('metamask') || id.includes('walletconnect') || id.includes('coinbase')) {
      return true;
    }
    if (id === 'injected') {
      const hasSpecificWallets = connectors.some(
        (c) => c.id.toLowerCase().includes('metamask') || c.id.toLowerCase().includes('coinbase')
      );
      return !hasSpecificWallets;
    }
    return false;
  });

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="animate-in fade-in absolute inset-0 bg-black/60 backdrop-blur-sm duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="animate-in zoom-in-95 fade-in relative w-full max-w-md duration-200">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all hover:bg-slate-200 hover:text-slate-900"
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

            {/* Icon */}
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-emerald-500"
                >
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4Z" />
                </svg>
              </div>
            </div>

            <h2 className="text-center text-xl font-bold text-slate-900">Connect Wallet</h2>
            <p className="mt-1 text-center text-sm text-slate-500">
              Choose your preferred wallet to continue
            </p>
          </div>

          {/* Wallet options */}
          <div className="space-y-3 px-6 pb-6">
            {filteredConnectors.map((connector) => {
              const isConnecting = connectingId === connector.uid;
              return (
                <button
                  key={connector.uid}
                  onClick={() => handleConnect(connector)}
                  disabled={isPending}
                  className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all duration-200 hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {/* Icon container */}
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-slate-100 transition-colors group-hover:bg-slate-200">
                    {getConnectorIcon(connector)}
                  </div>

                  {/* Text */}
                  <div className="flex-1 text-left">
                    <p className="text-base font-semibold text-slate-900 transition-colors">
                      {getConnectorName(connector)}
                    </p>
                    <p className="text-sm text-slate-500 transition-colors group-hover:text-slate-600">
                      {isConnecting ? 'Connecting...' : getConnectorDescription(connector)}
                    </p>
                  </div>

                  {/* Arrow or loading */}
                  {isConnecting ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" />
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-slate-400 transition-all group-hover:translate-x-1 group-hover:text-slate-600"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-6 pt-2 pb-6">
            <p className="text-center text-xs text-slate-400">
              By connecting, you agree to our Terms of Service
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}