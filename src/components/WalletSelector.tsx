'use client';

import { useCallback } from 'react';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { Connector } from 'wagmi';
import { shouldUseWalletConnect } from '@/utils';

// Wallet icons as SVG
const WalletIcons = {
  metaMask: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path
        d="M25.5 4.5L15.5 12L17.2 7.5L25.5 4.5Z"
        fill="#E2761B"
        stroke="#E2761B"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 4.5L12.4 12.1L10.8 7.5L2.5 4.5Z"
        fill="#E4761B"
        stroke="#E4761B"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 18.9L19.5 22.9L25 24.4L26.5 19L22 18.9Z"
        fill="#E4761B"
        stroke="#E4761B"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.5 19L3 24.4L8.5 22.9L6 18.9L1.5 19Z"
        fill="#E4761B"
        stroke="#E4761B"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 12.4L6.8 14.5L12.3 14.8L12.1 8.9L8.2 12.4Z"
        fill="#E4761B"
        stroke="#E4761B"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.8 12.4L15.8 8.8L15.7 14.8L21.2 14.5L19.8 12.4Z"
        fill="#E4761B"
        stroke="#E4761B"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 22.9L12 21.2L9 19L8.5 22.9Z"
        fill="#E4761B"
        stroke="#E4761B"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 21.2L19.5 22.9L19 19L16 21.2Z"
        fill="#E4761B"
        stroke="#E4761B"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  walletConnect: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#3B99FC" />
      <path
        d="M8.5 11C11.5 8 16.5 8 19.5 11L20 11.5C20.2 11.7 20.2 12 20 12.2L18.7 13.5C18.6 13.6 18.4 13.6 18.3 13.5L17.6 12.8C15.6 10.8 12.4 10.8 10.4 12.8L9.6 13.6C9.5 13.7 9.3 13.7 9.2 13.6L7.9 12.3C7.7 12.1 7.7 11.8 7.9 11.6L8.5 11ZM21.8 13.3L23 14.5C23.2 14.7 23.2 15 23 15.2L18.5 19.7C18.3 19.9 18 19.9 17.8 19.7L14.7 16.6C14.65 16.55 14.55 16.55 14.5 16.6L11.4 19.7C11.2 19.9 10.9 19.9 10.7 19.7L6.2 15.2C6 15 6 14.7 6.2 14.5L7.4 13.3C7.6 13.1 7.9 13.1 8.1 13.3L11.2 16.4C11.25 16.45 11.35 16.45 11.4 16.4L14.5 13.3C14.7 13.1 15 13.1 15.2 13.3L18.3 16.4C18.35 16.45 18.45 16.45 18.5 16.4L21.6 13.3C21.8 13.1 22.1 13.1 22.3 13.3L21.8 13.3Z"
        fill="white"
      />
    </svg>
  ),
  coinbase: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#0052FF" />
      <path
        d="M14 5C9 5 5 9 5 14C5 19 9 23 14 23C19 23 23 19 23 14C23 9 19 5 14 5ZM11.5 16.5C10.7 16.5 10 15.8 10 15V13C10 12.2 10.7 11.5 11.5 11.5H16.5C17.3 11.5 18 12.2 18 13V15C18 15.8 17.3 16.5 16.5 16.5H11.5Z"
        fill="white"
      />
    </svg>
  ),
  injected: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
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

interface WalletSelectorProps {
  onConnect?: () => void;
}

export default function WalletSelector({ onConnect }: WalletSelectorProps) {
  const { connect, connectors, isPending } = useConnect();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();

  const handleConnect = useCallback(
    (connector: Connector) => {
      // On mobile (normal browser), use WalletConnect so it deeplinks
      // to the wallet app for approval then returns to this browser.
      if (shouldUseWalletConnect(connector.id)) {
        const wcConnector = connectors.find(c => c.id.toLowerCase().includes('walletconnect'));
        if (wcConnector) {
          connect(
            { connector: wcConnector },
            { onSuccess: () => { onConnect?.(); } }
          );
          return;
        }
      }
      connect(
        { connector },
        {
          onSuccess: () => {
            onConnect?.();
          },
        }
      );
    },
    [connect, connectors, onConnect]
  );

  // Filter out duplicate injected connectors, prioritize specific wallets
  const filteredConnectors = connectors.filter((connector, index, self) => {
    // Keep MetaMask, WalletConnect, Coinbase
    const id = connector.id.toLowerCase();
    if (id.includes('metamask') || id.includes('walletconnect') || id.includes('coinbase')) {
      return true;
    }
    // Skip generic injected if we have specific ones
    if (id === 'injected') {
      const hasSpecificWallets = self.some(
        (c) => c.id.toLowerCase().includes('metamask') || c.id.toLowerCase().includes('coinbase')
      );
      return !hasSpecificWallets;
    }
    return false;
  });

  if (isConnected && address) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
              <svg
                width="20"
                height="20"
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
              <p className="text-sm font-medium text-slate-900">Connected</p>
              <p className="text-xs text-slate-500">
                {address.slice(0, 6)}...{address.slice(-4)}
              </p>
            </div>
          </div>
          <button
            onClick={() => disconnect()}
            className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-300"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filteredConnectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => handleConnect(connector)}
          disabled={isPending}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition-all hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
            {getConnectorIcon(connector)}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-slate-900">{getConnectorName(connector)}</p>
            <p className="text-xs text-slate-500">
              {connector.id.toLowerCase().includes('walletconnect')
                ? 'Scan QR code'
                : 'Connect via browser'}
            </p>
          </div>
          {isPending && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
          )}
        </button>
      ))}
    </div>
  );
}