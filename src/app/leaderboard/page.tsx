'use client';

import { useState } from 'react';
import { leaderboard } from '@/data/mock-data';
import LeaderboardTable, { LeaderboardPodium } from '@/components/leaderboard/LeaderboardTable';

type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'all';

export default function LeaderboardPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  // In a real app, you'd fetch different data based on time filter
  // For now, we'll use the same data with slight modifications
  const getFilteredLeaderboard = () => {
    // Simulate different data for different time periods
    if (timeFilter === 'daily') {
      return leaderboard.map(entry => ({
        ...entry,
        totalProfit: entry.totalProfit * 0.02, // ~2% of total
        totalBets: Math.floor(entry.totalBets * 0.01),
      }));
    }
    if (timeFilter === 'weekly') {
      return leaderboard.map(entry => ({
        ...entry,
        totalProfit: entry.totalProfit * 0.15,
        totalBets: Math.floor(entry.totalBets * 0.1),
      }));
    }
    if (timeFilter === 'monthly') {
      return leaderboard.map(entry => ({
        ...entry,
        totalProfit: entry.totalProfit * 0.4,
        totalBets: Math.floor(entry.totalBets * 0.3),
      }));
    }
    return leaderboard;
  };

  const filteredLeaderboard = getFilteredLeaderboard();

  // Stats
  const totalTraders = leaderboard.length;
  const totalVolume = leaderboard.reduce((acc, e) => acc + e.totalProfit, 0);
  const avgWinRate = leaderboard.reduce((acc, e) => acc + e.winRate, 0) / leaderboard.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8 animate-slide-up">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Leaderboard</h1>
        <p className="text-[var(--text-secondary)]">Top traders on CS:GO Predictions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="gaming-card p-5">
          <div className="text-sm text-[var(--text-muted)] mb-1">Total Traders</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{totalTraders}</div>
        </div>
        <div className="gaming-card p-5">
          <div className="text-sm text-[var(--text-muted)] mb-1">Total Profits</div>
          <div className="text-2xl font-bold text-[var(--neon-green)]">
            ${(totalVolume / 1000).toFixed(1)}k
          </div>
        </div>
        <div className="gaming-card p-5">
          <div className="text-sm text-[var(--text-muted)] mb-1">Avg Win Rate</div>
          <div className="text-2xl font-bold text-[#00b8ff]">{avgWinRate.toFixed(1)}%</div>
        </div>
        <div className="gaming-card p-5">
          <div className="text-sm text-[var(--text-muted)] mb-1">Your Rank</div>
          <div className="text-2xl font-bold text-[var(--neon-purple)]">#--</div>
          <div className="text-xs text-[var(--text-muted)]">Connect wallet</div>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <LeaderboardPodium entries={filteredLeaderboard} />
      </div>

      {/* Time Filter */}
      <div className="flex items-center justify-between mb-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Rankings</h2>
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly', 'all'] as TimeFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                timeFilter === filter
                  ? 'bg-[#00b8ff]/10 text-[#00b8ff] border border-[#00b8ff]/30'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              {filter === 'all' ? 'All Time' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <LeaderboardTable entries={filteredLeaderboard} />
      </div>

      {/* Info Section */}
      <div className="mt-8 gaming-card p-6 animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">How Rankings Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">💰</span>
              <span className="font-medium text-[var(--text-primary)]">Total Profit</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Rankings are based on total profit earned from predictions. Higher profits mean higher rank.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🎯</span>
              <span className="font-medium text-[var(--text-primary)]">Win Rate</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Your win rate shows the percentage of successful predictions out of total settled bets.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🏆</span>
              <span className="font-medium text-[var(--text-primary)]">Badges</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Earn special badges for achievements like Top 10, High Volume trading, and winning streaks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
