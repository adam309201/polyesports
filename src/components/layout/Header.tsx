'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useDisconnect } from 'wagmi';
import { useConnectWalletModal } from '@/hooks/useConnectWalletModal';
import { useTrading } from '@/providers/TradingProvider';
import { useBalance } from '@/hooks/useBalance';
import { formatNumberBalance } from '@/utils';
import Image from "next/image";
import { useGlideDeposit } from '@paywithglide/glide-react';

const NAV_LINKS = [
  { name: 'Games', href: '/' },
  { name: 'Matches', href: '/matches' },
  { name: 'Tournaments', href: '/tournaments' },
  { name: 'Articles', href: '/articles' },
];

function WalletButton() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { isTradingSessionComplete, safeAddress } = useTrading();
  const { openConnectModal } = useConnectWalletModal();
  const { tradingBalance, positionBalance } = useBalance();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedOwner, setCopiedOwner] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayAddress = isTradingSessionComplete && safeAddress ? safeAddress : address;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copySafeAddress = async () => {
    if (safeAddress) {
      await navigator.clipboard.writeText(safeAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyOwnerAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopiedOwner(true);
      setTimeout(() => setCopiedOwner(false), 2000);
    }
  };

  const handleDisconnect = () => {
    setIsOpen(false);
    disconnect();
  };

  const { openGlideDeposit } = useGlideDeposit({
    app: 'john1906',
    recipient: safeAddress,
    mode: 'deposit',
  });

  if (!isConnected || !address) {
    return (
      <button
        onClick={openConnectModal}
        className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00b8ff] to-[var(--neon-purple)] font-semibold text-white text-sm hover:shadow-lg hover:shadow-[#00b8ff]/25 transition-all"
      >
        <span className="hidden sm:inline">Connect Wallet</span>
        <span className="sm:hidden">Connect</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-3">
      {isTradingSessionComplete && (
        <div className="hidden sm:flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1.5">
          <div className="flex flex-col">
            <span className="text-xs text-[var(--text-muted)]">Cash</span>
            <span className="text-sm font-semibold text-[var(--neon-green)]">
              ${formatNumberBalance(tradingBalance, 2)}
            </span>
          </div>
          <div className="h-4 w-px bg-[var(--border-default)]" />
          <div className="flex flex-col">
            <span className="text-xs text-[var(--text-muted)]">Portfolio</span>
            <span className="text-sm font-semibold text-[var(--neon-green)]">
              ${formatNumberBalance(positionBalance, 2)}
            </span>
          </div>
        </div>
      )}
      {isTradingSessionComplete && (
        <button
          onClick={() => openGlideDeposit()}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--neon-cyan)] px-3 py-2 text-sm font-semibold text-white transition-all hover:opacity-90"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12l7-7 7 7" />
          </svg>
          <span className="hidden sm:inline">Deposit</span>
        </button>
      )}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-xl border border-transparent p-1.5 hover:border-[var(--border-default)] hover:bg-[var(--bg-secondary)] transition-all"
        >
          <div className="relative">
            <div
              className="w-8 h-8 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #0891b2 0%, #9333ea 100%)',
              }}
            />
            <div className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full bg-[var(--bg-primary)] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[var(--neon-green)] animate-pulse" />
            </div>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

      {isOpen && (
        <div className="absolute top-full right-0 z-50 mt-2 w-72 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-xl">
          {/* Wallet Info */}
          <div className="p-4 border-b border-[var(--border-default)]">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #0891b2 0%, #9333ea 100%)',
                }}
              />
              <div className="flex-1 min-w-0">
                {isTradingSessionComplete && safeAddress && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-[var(--text-muted)]">Safe:</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {formatAddress(safeAddress)}
                    </span>
                    <button
                      onClick={copySafeAddress}
                      className="p-1 rounded hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      {copied ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--win-green)" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)]">
                          <rect width="14" height="14" x="8" y="8" rx="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">Owner:</span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {formatAddress(address)}
                  </span>
                  <button
                    onClick={copyOwnerAddress}
                    className="p-1 rounded hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    {copiedOwner ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--win-green)" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)]">
                        <rect width="14" height="14" x="8" y="8" rx="2" />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-2">
            <Link
              href="/portfolio"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
              Portfolio
            </Link>

            <div className="my-1 h-px bg-[var(--border-default)]" />

            <button
              onClick={handleDisconnect}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--loss-red)] hover:bg-[var(--loss-red)]/10 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              Disconnect
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-[var(--bg-primary)] border-b border-[var(--border-default)]">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image className={'w-8 h-8 sm:w-10 sm:h-10'} src={require("@/common/assets/images/logo.png")} alt={''}/>
            <div className="">
              <h1 className="text-sm sm:text-lg font-bold text-[var(--text-primary)]">
                Poly<span className="text-[#00b8ff]">Esports</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-[var(--text-muted)] -mt-0.5">Prediction Markets</p>
            </div>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#00b8ff]/10 text-[#00b8ff]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Section */}
          <div className="flex items-center">
            {/* Wallet Button */}
            <WalletButton />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden  rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu */}
          <nav className="fixed top-16 left-0 right-0 bg-[var(--bg-primary)] border-b border-[var(--border-default)] shadow-lg">
            <div className="px-4 py-2">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#00b8ff]/10 text-[#00b8ff]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
