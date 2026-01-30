'use client';

import { getLiveMatches } from '@/data/mock-data';
import LiveMatchCard from '@/components/matches/LiveMatchCard';
import Link from 'next/link';

export default function LivePage() {
  const liveMatches = getLiveMatches();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8 animate-slide-up">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-3 h-3 bg-[var(--live-red)] rounded-full animate-live-pulse" />
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Live Matches</h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          {liveMatches.length} match{liveMatches.length !== 1 ? 'es' : ''} currently live
        </p>
      </div>

      {/* Live Matches */}
      {liveMatches.length > 0 ? (
        <div className="grid gap-6">
          {liveMatches.map((match, idx) => (
            <div key={match.id} className="animate-slide-up" style={{ animationDelay: `${0.1 * idx}s` }}>
              <LiveMatchCard match={match} featured={idx === 0} />
            </div>
          ))}
        </div>
      ) : (
        <div className="gaming-card p-12 text-center animate-fade-in">
          <div className="text-6xl mb-4">🎮</div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No Live Matches</h2>
          <p className="text-[var(--text-secondary)] mb-6">
            There are no matches currently live. Check back soon or browse upcoming matches.
          </p>
          <Link href="/matches" className="btn-neon btn-neon-cyan">
            View Upcoming Matches
          </Link>
        </div>
      )}

      {/* Live Stats */}
      {liveMatches.length > 0 && (
        <div className="mt-8 gaming-card p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Live Betting Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--live-red)]">{liveMatches.length}</div>
              <div className="text-sm text-[var(--text-muted)]">Live Matches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#00b8ff]">$12.5k</div>
              <div className="text-sm text-[var(--text-muted)]">Volume Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--neon-green)]">342</div>
              <div className="text-sm text-[var(--text-muted)]">Active Bets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--neon-purple)]">89</div>
              <div className="text-sm text-[var(--text-muted)]">Active Traders</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
