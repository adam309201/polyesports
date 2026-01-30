'use client';

import { useState, useEffect } from 'react';

interface Trade {
  id: string;
  side: 'BUY' | 'SELL';
  size: number;
  price: number;
  timestamp: string;
  outcome: string;
  outcomeIndex: number;
  pseudonym?: string;
  proxyWallet?: string;
  profileImage?: string;
  name?: string;
  title?: string;
}

interface ActivityTabProps {
  eventId: string;
}

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const shortenAddress = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const formatUsd = (val: number) => {
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
};

export default function ActivityTab({ eventId }: ActivityTabProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrades = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/polymarket/trades?eventId=${eventId}&limit=50`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setTrades(Array.isArray(data) ? data : []);
      } catch {
        setError('Failed to load activity');
      } finally {
        setLoading(false);
      }
    };
    if (eventId) fetchTrades();
  }, [eventId]);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-16 h-5 rounded bg-[var(--bg-elevated)]" />
            <div className="flex-1 h-4 rounded bg-[var(--bg-elevated)]" />
            <div className="w-14 h-4 rounded bg-[var(--bg-elevated)]" />
            <div className="w-12 h-4 rounded bg-[var(--bg-elevated)]" />
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

  if (trades.length === 0) {
    return (
      <div className="p-8 text-center">
        <svg className="mx-auto mb-3 text-[var(--text-muted)]" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <div className="text-sm text-[var(--text-muted)]">No recent activity</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border-default)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        <span className="w-12">Side</span>
        <span className="flex-1">User</span>
        <span className="w-24">Outcome</span>
        <span className="w-16 text-right">Amount</span>
        <span className="w-14 text-right">Price</span>
        <span className="w-16 text-right">Time</span>
      </div>
      {trades.map((trade, idx) => {
        const isBuy = trade.side === 'BUY';
        const displayName = trade.pseudonym || trade.name || (trade.proxyWallet ? shortenAddress(trade.proxyWallet) : 'Unknown');
        const amount = trade.size * trade.price;

        return (
          <div key={trade.id || idx} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)]/50 transition-colors text-sm">
            {/* Side */}
            <span className={`w-12 text-xs font-bold px-1.5 py-0.5 rounded text-center ${
              isBuy
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-[var(--live-red)]/10 text-[var(--live-red)]'
            }`}>
              {trade.side}
            </span>
            {/* User */}
            <span className="flex-1 min-w-0 text-[var(--text-primary)] font-medium truncate">
              {displayName}
            </span>
            {/* Outcome */}
            <span className={`w-24 text-xs font-semibold truncate ${
              trade.outcomeIndex === 0 ? 'text-[#00b8ff]' : 'text-[#5c6c8a]'
            }`}>
              {trade.outcome}
            </span>
            {/* Amount */}
            <span className="w-16 text-right text-[var(--text-primary)] font-medium">
              {formatUsd(amount)}
            </span>
            {/* Price */}
            <span className="w-14 text-right text-[var(--text-secondary)]">
              {(trade.price * 100).toFixed(0)}¢
            </span>
            {/* Time */}
            <span className="w-16 text-right text-[10px] text-[var(--text-muted)]">
              {timeAgo(trade.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
