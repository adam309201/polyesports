'use client';

import { useState } from 'react';
import type { Match } from '@/data/mock-data';
import { formatOdds, calculateProbability, formatTimeUntil } from '@/data/mock-data';
import TeamBadge from '@/components/teams/TeamBadge';

interface MatchCardProps {
  match: Match;
  onBet?: (matchId: string, teamId: string, amount: number) => void;
  showBettingPanel?: boolean;
}

export default function MatchCard({ match, onBet, showBettingPanel = true }: MatchCardProps) {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<string>('');

  const team1Prob = calculateProbability(match.team1Odds);
  const team2Prob = calculateProbability(match.team2Odds);

  const handleBet = (teamId: string) => {
    if (onBet && betAmount) {
      onBet(match.id, teamId, parseFloat(betAmount));
      setBetAmount('');
      setSelectedTeam(null);
    }
  };

  const getStatusBadge = () => {
    switch (match.status) {
      case 'live':
        return <span className="badge badge-live">Live</span>;
      case 'upcoming':
        return <span className="badge badge-upcoming">{formatTimeUntil(match.startTime)}</span>;
      case 'finished':
        return <span className="badge badge-finished">Finished</span>;
    }
  };

  return (
    <div className="gaming-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <span className="text-sm text-[var(--text-secondary)]">{match.tournament}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">{match.stage}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
            BO{match.bestOf}
          </span>
        </div>
      </div>

      {/* Teams */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Team 1 */}
          <div
            className={`flex-1 cursor-pointer p-3 rounded-lg transition-all ${
              selectedTeam === match.team1.id
                ? 'bg-[#00b8ff]/10 border border-[#00b8ff]/30'
                : 'hover:bg-[var(--bg-card-hover)]'
            }`}
            onClick={() => setSelectedTeam(match.team1.id)}
          >
            <TeamBadge team={match.team1} size="md" showRanking showWinRate={false} />
            {match.status === 'live' && match.team1Score !== undefined && (
              <div className="mt-2 text-center">
                <span className="text-2xl font-bold text-[#00b8ff]">
                  {match.team1Score}
                </span>
              </div>
            )}
            {match.status === 'finished' && match.winner === match.team1.id && (
              <div className="mt-2 text-center">
                <span className="badge badge-win">Winner</span>
              </div>
            )}
          </div>

          {/* VS */}
          <div className="px-4 flex flex-col items-center">
            <span className="text-2xl font-bold text-[var(--text-muted)]">VS</span>
            {match.status === 'live' && match.currentMap && (
              <div className="mt-1 text-center">
                <div className="text-xs text-[var(--text-muted)]">{match.currentMap}</div>
                <div className="text-xs text-[#5c6c8a]">Round {match.currentRound}</div>
              </div>
            )}
          </div>

          {/* Team 2 */}
          <div
            className={`flex-1 cursor-pointer p-3 rounded-lg transition-all ${
              selectedTeam === match.team2.id
                ? 'bg-[#5c6c8a]/10 border border-[#5c6c8a]/30'
                : 'hover:bg-[var(--bg-card-hover)]'
            }`}
            onClick={() => setSelectedTeam(match.team2.id)}
          >
            <TeamBadge team={match.team2} size="md" showRanking showWinRate={false} />
            {match.status === 'live' && match.team2Score !== undefined && (
              <div className="mt-2 text-center">
                <span className="text-2xl font-bold text-[#5c6c8a]">
                  {match.team2Score}
                </span>
              </div>
            )}
            {match.status === 'finished' && match.winner === match.team2.id && (
              <div className="mt-2 text-center">
                <span className="badge badge-win">Winner</span>
              </div>
            )}
          </div>
        </div>

        {/* Odds Bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <div className="text-left">
              <span className="text-lg font-bold text-[#00b8ff]">{formatOdds(match.team1Odds)}</span>
              <span className="text-xs text-[var(--text-muted)] ml-1">({team1Prob}%)</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-[#5c6c8a]">{formatOdds(match.team2Odds)}</span>
              <span className="text-xs text-[var(--text-muted)] ml-1">({team2Prob}%)</span>
            </div>
          </div>
          <div className="odds-bar">
            <div
              className="odds-fill odds-fill-team1"
              style={{ width: `${team1Prob}%` }}
            />
          </div>
        </div>
      </div>

      {/* Betting Panel */}
      {showBettingPanel && match.status !== 'finished' && (
        <div className="px-4 pb-4">
          {selectedTeam ? (
            <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[var(--text-secondary)]">
                  Betting on{' '}
                  <span className="font-bold text-[var(--text-primary)]">
                    {selectedTeam === match.team1.id ? match.team1.shortName : match.team2.shortName}
                  </span>
                </span>
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    placeholder="Amount"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="input-gaming pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">
                    USDC
                  </span>
                </div>
                <button
                  onClick={() => handleBet(selectedTeam)}
                  disabled={!betAmount || parseFloat(betAmount) <= 0}
                  className={`btn-neon ${
                    selectedTeam === match.team1.id ? 'btn-neon-cyan' : 'btn-neon-orange'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Place Bet
                </button>
              </div>

              {betAmount && parseFloat(betAmount) > 0 && (
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Potential payout:</span>
                  <span className="text-[var(--neon-green)] font-bold">
                    ${(parseFloat(betAmount) * (selectedTeam === match.team1.id ? match.team1Odds : match.team2Odds)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTeam(match.team1.id)}
                className="flex-1 btn-outline hover:border-[#00b8ff] hover:text-[#00b8ff] hover:bg-[#00b8ff]/10"
              >
                Bet {match.team1.shortName}
              </button>
              <button
                onClick={() => setSelectedTeam(match.team2.id)}
                className="flex-1 btn-outline hover:border-[#5c6c8a] hover:text-[#5c6c8a] hover:bg-[#5c6c8a]/10"
              >
                Bet {match.team2.shortName}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
