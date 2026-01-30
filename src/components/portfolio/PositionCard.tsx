'use client';

import type { Position } from '@/data/mock-data';
import { formatOdds } from '@/data/mock-data';
import { TeamBadgeInline } from '@/components/teams/TeamBadge';

interface PositionCardProps {
  position: Position;
  onSell?: (positionId: string) => void;
}

export default function PositionCard({ position, onSell }: PositionCardProps) {
  const pnl = position.currentValue - position.amount;
  const pnlPercent = ((pnl / position.amount) * 100).toFixed(1);
  const isProfit = pnl >= 0;

  const getStatusBadge = () => {
    switch (position.status) {
      case 'active':
        return (
          <span className="badge badge-upcoming">
            Active
          </span>
        );
      case 'won':
        return <span className="badge badge-win">Won</span>;
      case 'lost':
        return <span className="badge badge-loss">Lost</span>;
    }
  };

  return (
    <div className="gaming-card p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <span className="text-sm text-[var(--text-secondary)]">{position.match.tournament}</span>
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          {position.timestamp.toLocaleDateString()}
        </span>
      </div>

      {/* Match Info */}
      <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-[var(--bg-elevated)]">
        <TeamBadgeInline team={position.match.team1} />
        <div className="px-3">
          <span className="text-sm text-[var(--text-muted)]">vs</span>
          {position.match.status === 'live' && (
            <div className="text-xs text-[var(--live-red)] animate-live-pulse">LIVE</div>
          )}
        </div>
        <TeamBadgeInline team={position.match.team2} />
      </div>

      {/* Position Details */}
      <div className="space-y-3">
        {/* Bet On */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-muted)]">Bet On</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#00b8ff]">
              {position.teamBetOn.shortName}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
              @{formatOdds(position.odds)}
            </span>
          </div>
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-muted)]">Amount</span>
          <span className="font-medium text-[var(--text-primary)]">
            ${position.amount.toFixed(2)}
          </span>
        </div>

        {/* Current Value */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-muted)]">Current Value</span>
          <span className="font-medium text-[var(--text-primary)]">
            ${position.currentValue.toFixed(2)}
          </span>
        </div>

        {/* P&L */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-default)]">
          <span className="text-sm text-[var(--text-muted)]">P&L</span>
          <div className="flex items-center gap-2">
            <span
              className={`font-bold ${isProfit ? 'text-[var(--win-green)]' : 'text-[var(--loss-red)]'}`}
            >
              {isProfit ? '+' : ''}{pnlPercent}%
            </span>
            <span
              className={`font-semibold ${isProfit ? 'text-[var(--win-green)]' : 'text-[var(--loss-red)]'}`}
            >
              {isProfit ? '+' : ''}${pnl.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Potential Payout (for active) */}
        {position.status === 'active' && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">Potential Payout</span>
            <span className="text-[var(--neon-green)] font-semibold">
              ${position.potentialPayout.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      {position.status === 'active' && onSell && (
        <button
          onClick={() => onSell(position.id)}
          className="mt-4 w-full btn-outline hover:border-[#5c6c8a] hover:text-[#5c6c8a] hover:bg-[#5c6c8a]/10"
        >
          Sell Position
        </button>
      )}
    </div>
  );
}

// Compact position row for tables
export function PositionRow({ position }: { position: Position }) {
  const pnl = position.currentValue - position.amount;
  const pnlPercent = ((pnl / position.amount) * 100).toFixed(1);
  const isProfit = pnl >= 0;

  return (
    <tr className="hover:bg-[var(--bg-card-hover)] transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <TeamBadgeInline team={position.teamBetOn} />
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
        {position.match.team1.shortName} vs {position.match.team2.shortName}
      </td>
      <td className="py-3 px-4 text-sm">${position.amount.toFixed(2)}</td>
      <td className="py-3 px-4 text-sm">{formatOdds(position.odds)}</td>
      <td className="py-3 px-4">
        <span
          className={`font-semibold ${isProfit ? 'text-[var(--win-green)]' : 'text-[var(--loss-red)]'}`}
        >
          {isProfit ? '+' : ''}{pnlPercent}%
        </span>
      </td>
      <td className="py-3 px-4">
        {position.status === 'active' && <span className="badge badge-upcoming text-xs">Active</span>}
        {position.status === 'won' && <span className="badge badge-win text-xs">Won</span>}
        {position.status === 'lost' && <span className="badge badge-loss text-xs">Lost</span>}
      </td>
    </tr>
  );
}
