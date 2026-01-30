'use client';

import type { Match } from '@/data/mock-data';
import { formatOdds, calculateProbability } from '@/data/mock-data';
import TeamBadge from '@/components/teams/TeamBadge';

interface LiveMatchCardProps {
  match: Match;
  featured?: boolean;
  onBet?: (matchId: string, teamId: string) => void;
}

export default function LiveMatchCard({ match, featured = false, onBet }: LiveMatchCardProps) {
  const team1Prob = calculateProbability(match.team1Odds);
  const team2Prob = calculateProbability(match.team2Odds);

  if (match.status !== 'live') return null;

  return (
    <div
      className={`gaming-card overflow-hidden ${
        featured ? 'border-[var(--live-red)]/50' : ''
      }`}
    >
      {/* Live Banner */}
      <div className="bg-gradient-to-r from-[var(--live-red)]/20 to-transparent px-4 py-2 flex items-center justify-between border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <span className="badge badge-live">Live</span>
          <span className="text-sm font-medium text-[var(--text-primary)]">{match.tournament}</span>
        </div>
        <span className="text-xs text-[var(--text-muted)]">{match.stage}</span>
      </div>

      {/* Match Content */}
      <div className={`p-4 ${featured ? 'p-6' : ''}`}>
        {/* Score Section */}
        <div className="flex items-center justify-between">
          {/* Team 1 */}
          <div className="flex-1 text-center">
            <TeamBadge team={match.team1} size={featured ? 'lg' : 'md'} showRanking />
            <div className="mt-3">
              <span className={`font-bold text-[#00b8ff] ${featured ? 'text-5xl' : 'text-3xl'}`}>
                {match.team1Score ?? 0}
              </span>
            </div>
          </div>

          {/* Center Info */}
          <div className="px-6 flex flex-col items-center">
            <div className="text-[var(--text-muted)] font-bold text-lg mb-2">VS</div>
            {match.currentMap && (
              <div className="text-center">
                <div className="px-3 py-1 rounded-full bg-[var(--bg-elevated)] text-sm font-medium text-[var(--text-primary)]">
                  {match.currentMap}
                </div>
                {match.currentRound && (
                  <div className="mt-1 text-xs text-[#5c6c8a] animate-live-pulse">
                    Round {match.currentRound}
                  </div>
                )}
              </div>
            )}
            <div className="mt-2 text-xs text-[var(--text-muted)]">
              BO{match.bestOf}
            </div>
          </div>

          {/* Team 2 */}
          <div className="flex-1 text-center">
            <TeamBadge team={match.team2} size={featured ? 'lg' : 'md'} showRanking />
            <div className="mt-3">
              <span className={`font-bold text-[#5c6c8a] ${featured ? 'text-5xl' : 'text-3xl'}`}>
                {match.team2Score ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Live Odds */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#00b8ff]">{formatOdds(match.team1Odds)}</span>
              <span className="text-xs text-[var(--text-muted)]">({team1Prob}%)</span>
            </div>
            <div className="text-xs text-[var(--text-muted)]">Live Odds</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">({team2Prob}%)</span>
              <span className="text-lg font-bold text-[#5c6c8a]">{formatOdds(match.team2Odds)}</span>
            </div>
          </div>

          {/* Animated Odds Bar */}
          <div className="relative h-3 rounded-full overflow-hidden bg-[var(--bg-elevated)]">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#00b8ff] to-[#00b8ff]/70 transition-all duration-500"
              style={{ width: `${team1Prob}%` }}
            />
            <div
              className="absolute right-0 top-0 h-full bg-gradient-to-l from-[#5c6c8a] to-[#5c6c8a]/70 transition-all duration-500"
              style={{ width: `${team2Prob}%` }}
            />
            {/* Center divider with glow */}
            <div
              className="absolute top-0 h-full w-0.5 bg-[var(--bg-primary)] shadow-lg transition-all duration-500"
              style={{ left: `${team1Prob}%` }}
            />
          </div>
        </div>

        {/* Quick Bet Buttons */}
        {onBet && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => onBet(match.id, match.team1.id)}
              className="flex-1 py-3 rounded-lg bg-[#00b8ff]/10 border border-[#00b8ff]/30 text-[#00b8ff] font-semibold hover:bg-[#00b8ff]/20 transition-all"
            >
              Bet {match.team1.shortName}
            </button>
            <button
              onClick={() => onBet(match.id, match.team2.id)}
              className="flex-1 py-3 rounded-lg bg-[#5c6c8a]/10 border border-[#5c6c8a]/30 text-[#5c6c8a] font-semibold hover:bg-[#5c6c8a]/20 transition-all"
            >
              Bet {match.team2.shortName}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact live match item for sidebar/list
export function LiveMatchItem({ match, onClick }: { match: Match; onClick?: () => void }) {
  if (match.status !== 'live') return null;

  return (
    <div
      onClick={onClick}
      className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--live-red)]/30 cursor-pointer transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="badge badge-live text-[10px] py-0.5 px-2">Live</span>
        <span className="text-[10px] text-[var(--text-muted)]">{match.currentMap}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">{match.team1.shortName}</span>
          <span className="text-lg font-bold text-[#00b8ff]">{match.team1Score}</span>
        </div>
        <span className="text-[var(--text-muted)]">-</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[#5c6c8a]">{match.team2Score}</span>
          <span className="text-sm font-medium text-[var(--text-primary)]">{match.team2.shortName}</span>
        </div>
      </div>
    </div>
  );
}
