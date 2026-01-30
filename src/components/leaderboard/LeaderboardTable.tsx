'use client';

import type { LeaderboardEntry } from '@/data/mock-data';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  highlightAddress?: string;
  limit?: number;
}

export default function LeaderboardTable({
  entries,
  highlightAddress,
  limit,
}: LeaderboardTableProps) {
  const displayEntries = limit ? entries.slice(0, limit) : entries;

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]';
  };

  const formatProfit = (profit: number) => {
    if (profit >= 1000) {
      return `$${(profit / 1000).toFixed(1)}k`;
    }
    return `$${profit.toFixed(0)}`;
  };

  return (
    <div className="gaming-card overflow-hidden">
      <table className="table-gaming">
        <thead>
          <tr>
            <th className="w-16">Rank</th>
            <th>Trader</th>
            <th className="text-right">Profit</th>
            <th className="text-right hidden sm:table-cell">Win Rate</th>
            <th className="text-right hidden md:table-cell">Bets</th>
            <th className="text-right hidden lg:table-cell">ROI</th>
          </tr>
        </thead>
        <tbody>
          {displayEntries.map((entry) => {
            const isHighlighted = highlightAddress && entry.address === highlightAddress;

            return (
              <tr
                key={entry.rank}
                className={`transition-colors ${
                  isHighlighted
                    ? 'bg-[#00b8ff]/10 border-l-2 border-[#00b8ff]'
                    : 'hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                {/* Rank */}
                <td className="py-4 px-4">
                  <span className={`rank-badge ${getRankStyle(entry.rank)}`}>
                    {entry.rank}
                  </span>
                </td>

                {/* Trader */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{entry.avatar}</span>
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">
                        {entry.displayName}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {entry.address}
                      </div>
                      {/* Badges */}
                      {entry.badges.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {entry.badges.slice(0, 2).map((badge, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--neon-purple)]/20 text-[var(--neon-purple)] border border-[var(--neon-purple)]/30"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Profit */}
                <td className="py-4 px-4 text-right">
                  <span className="font-bold text-[var(--neon-green)] text-lg">
                    {formatProfit(entry.totalProfit)}
                  </span>
                </td>

                {/* Win Rate */}
                <td className="py-4 px-4 text-right hidden sm:table-cell">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--neon-green)]"
                        style={{ width: `${entry.winRate}%` }}
                      />
                    </div>
                    <span className="text-sm text-[var(--text-primary)] font-medium w-12">
                      {entry.winRate.toFixed(1)}%
                    </span>
                  </div>
                </td>

                {/* Total Bets */}
                <td className="py-4 px-4 text-right hidden md:table-cell">
                  <span className="text-[var(--text-secondary)]">{entry.totalBets}</span>
                </td>

                {/* ROI */}
                <td className="py-4 px-4 text-right hidden lg:table-cell">
                  <span className="font-semibold text-[#00b8ff]">
                    +{entry.roi.toFixed(1)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Top 3 Podium Component
export function LeaderboardPodium({ entries }: { entries: LeaderboardEntry[] }) {
  const top3 = entries.slice(0, 3);
  if (top3.length < 3) return null;

  const podiumOrder = [top3[1], top3[0], top3[2]]; // 2nd, 1st, 3rd

  return (
    <div className="flex items-end justify-center gap-4 mb-8">
      {podiumOrder.map((entry, idx) => {
        const isFirst = idx === 1;
        const heights = ['h-24', 'h-32', 'h-20'];
        const bgColors = [
          'from-gray-400/20 to-gray-500/10',
          'from-yellow-400/20 to-yellow-500/10',
          'from-orange-400/20 to-orange-500/10',
        ];

        return (
          <div
            key={entry.rank}
            className={`flex flex-col items-center ${isFirst ? 'animate-float' : ''}`}
          >
            {/* Avatar & Name */}
            <div className="text-center mb-3">
              <span className="text-4xl block mb-1">{entry.avatar}</span>
              <div className="font-bold text-[var(--text-primary)]">{entry.displayName}</div>
              <div className="text-sm text-[var(--neon-green)] font-semibold">
                ${entry.totalProfit.toLocaleString()}
              </div>
            </div>

            {/* Podium */}
            <div
              className={`w-24 ${heights[idx]} rounded-t-lg bg-gradient-to-b ${bgColors[idx]} border border-[var(--border-default)] border-b-0 flex items-center justify-center`}
            >
              <span
                className={`rank-badge ${
                  entry.rank === 1 ? 'rank-1' : entry.rank === 2 ? 'rank-2' : 'rank-3'
                } scale-125`}
              >
                {entry.rank}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Compact leaderboard for sidebar
export function LeaderboardCompact({ entries, limit = 5 }: { entries: LeaderboardEntry[]; limit?: number }) {
  return (
    <div className="space-y-2">
      {entries.slice(0, limit).map((entry) => (
        <div
          key={entry.rank}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors"
        >
          <span className={`rank-badge text-xs ${
            entry.rank === 1 ? 'rank-1' : entry.rank === 2 ? 'rank-2' : entry.rank === 3 ? 'rank-3' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
          }`}>
            {entry.rank}
          </span>
          <span className="text-lg">{entry.avatar}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[var(--text-primary)] truncate">
              {entry.displayName}
            </div>
          </div>
          <span className="text-sm font-semibold text-[var(--neon-green)]">
            +${(entry.totalProfit / 1000).toFixed(1)}k
          </span>
        </div>
      ))}
    </div>
  );
}
