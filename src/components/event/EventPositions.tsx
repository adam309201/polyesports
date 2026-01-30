'use client';

import { useQuery } from '@tanstack/react-query';
import { useTrading } from '@/providers/TradingProvider';
import type { PolymarketEvent } from './event-utils';

interface Position {
  id: string;
  tokenId: string;
  conditionId: string;
  outcomeIndex: number;
  outcome: string;
  size: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  question?: string;
  resolved?: boolean;
  isWinner?: boolean;
}

interface EventPositionsProps {
  event: PolymarketEvent;
}

const formatUsd = (val: number) => {
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
};

export default function EventPositions({ event }: EventPositionsProps) {
  const { safeAddress, isTradingSessionComplete } = useTrading();

  // Collect all conditionIds from this event's markets
  const conditionIds = new Set<string>();
  event.markets?.forEach(m => {
    if (m.conditionId) conditionIds.add(m.conditionId);
  });

  const { data: positions = [], isLoading } = useQuery({
    queryKey: ['EventPositions', safeAddress, event.id],
    queryFn: async () => {
      const res = await fetch(`/api/positions?address=${safeAddress}`);
      if (!res.ok) return [];
      const data = await res.json();
      const all: Position[] = data.positions || [];
      // Filter to positions belonging to this event's markets
      return all.filter(p => conditionIds.has(p.conditionId));
    },
    enabled: !!safeAddress && isTradingSessionComplete && conditionIds.size > 0,
    refetchInterval: 10000,
  });

  // Don't render anything if not connected or no positions
  if (!isTradingSessionComplete || isLoading || positions.length === 0) {
    return null;
  }

  const totalValue = positions.reduce((s, p) => s + p.value, 0);
  const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-5 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Your Positions</span>
          <span className="text-xs text-[var(--text-muted)]">({positions.length})</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)]">Value</span>
          <span className="text-sm font-bold text-[var(--text-primary)]">{formatUsd(totalValue)}</span>
          <span className={`text-xs font-semibold ${totalPnl >= 0 ? 'text-[var(--win-green)]' : 'text-[var(--loss-red)]'}`}>
            {totalPnl >= 0 ? '+' : ''}{formatUsd(totalPnl)}
          </span>
        </div>
      </div>

      {/* Positions */}
      <div className="divide-y divide-[var(--border-default)]">
        {positions.map(pos => {
          const cost = pos.size * pos.avgPrice;
          const isProfit = pos.pnl >= 0;
          const teamColor = pos.outcomeIndex === 0 ? '#00b8ff' : '#5c6c8a';

          return (
            <div key={pos.id} className="px-4 sm:px-5 py-3 flex items-center gap-3">
              {/* Outcome badge */}
              <div
                className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: teamColor }}
              >
                {pos.outcome}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                {pos.question && (
                  <div className="text-[11px] text-[var(--text-muted)] truncate mb-0.5">{pos.question}</div>
                )}
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span>{pos.size.toFixed(2)} shares</span>
                  <span className="text-[var(--text-muted)]">@</span>
                  <span>{(pos.avgPrice * 100).toFixed(1)}¢</span>
                  <span className="text-[var(--text-muted)]">→</span>
                  <span className="font-medium text-[var(--text-primary)]">{(pos.currentPrice * 100).toFixed(1)}¢</span>
                </div>
              </div>

              {/* Value & PnL */}
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-[var(--text-primary)]">{formatUsd(pos.value)}</div>
                <div className={`text-xs font-medium ${isProfit ? 'text-[var(--win-green)]' : 'text-[var(--loss-red)]'}`}>
                  {isProfit ? '+' : ''}{formatUsd(pos.pnl)}
                  <span className="ml-1 opacity-70">
                    ({isProfit ? '+' : ''}{pos.pnlPercent.toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
