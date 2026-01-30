'use client';

import { useState, useEffect } from 'react';

interface Holder {
  proxyWallet: string;
  pseudonym?: string;
  amount: number;
  outcomeIndex: number;
  profileImage?: string;
}

interface TokenHolders {
  token: string;
  holders: Holder[];
}

interface TopHoldersTabProps {
  conditionId: string | undefined;
  outcomes: string[];
}

const formatAmount = (amount: number) => {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
};

const shortenAddress = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

export default function TopHoldersTab({ conditionId, outcomes }: TopHoldersTabProps) {
  const [holdersData, setHoldersData] = useState<TokenHolders[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOutcome, setActiveOutcome] = useState(0);

  useEffect(() => {
    const fetchHolders = async () => {
      if (!conditionId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/polymarket/holders?market=${conditionId}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setHoldersData(Array.isArray(data) ? data : []);
      } catch {
        setError('Failed to load holders');
      } finally {
        setLoading(false);
      }
    };
    fetchHolders();
  }, [conditionId]);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-6 h-4 rounded bg-[var(--bg-elevated)]" />
            <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)]" />
            <div className="flex-1 h-4 rounded bg-[var(--bg-elevated)]" />
            <div className="w-16 h-4 rounded bg-[var(--bg-elevated)]" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-[var(--text-muted)] text-sm">{error}</div>
    );
  }

  if (!conditionId) {
    return (
      <div className="p-8 text-center text-sm text-[var(--text-muted)]">No market data available</div>
    );
  }

  const currentHolders = holdersData[activeOutcome]?.holders || [];

  return (
    <div>
      {/* Outcome Toggle */}
      {outcomes.length >= 2 && (
        <div className="flex gap-1 p-3 border-b border-[var(--border-default)]">
          {outcomes.map((outcome, idx) => (
            <button
              key={idx}
              onClick={() => setActiveOutcome(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeOutcome === idx
                  ? idx === 0
                    ? 'bg-[#00b8ff]/15 text-[#00b8ff]'
                    : 'bg-[#5c6c8a]/15 text-[#5c6c8a]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {outcome}
            </button>
          ))}
        </div>
      )}

      {/* Holders List */}
      {currentHolders.length === 0 ? (
        <div className="p-8 text-center">
          <svg className="mx-auto mb-3 text-[var(--text-muted)]" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <div className="text-sm text-[var(--text-muted)]">No holders data</div>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-default)]">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            <span className="w-6 text-center">#</span>
            <span className="flex-1">Holder</span>
            <span className="w-20 text-right">Amount</span>
          </div>
          {currentHolders.map((holder, idx) => (
            <div key={holder.proxyWallet} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)]/50 transition-colors">
              {/* Rank */}
              <span className={`w-6 text-center text-xs font-bold ${
                idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-600' : 'text-[var(--text-muted)]'
              }`}>
                {idx + 1}
              </span>
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] shrink-0">
                {(holder.pseudonym || holder.proxyWallet)?.[0]?.toUpperCase() || '?'}
              </div>
              {/* Name */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-[var(--text-primary)] truncate block">
                  {holder.pseudonym || shortenAddress(holder.proxyWallet)}
                </span>
              </div>
              {/* Amount */}
              <span className="w-20 text-right text-sm font-semibold text-[var(--text-primary)]">
                {formatAmount(holder.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
