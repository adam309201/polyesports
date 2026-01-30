'use client';

import { useMatchLiveData, MatchLiveData } from '@/hooks/useMatchLiveData';
import Image from 'next/image';

interface LiveMatchInfoProps {
  team1: string;
  team2: string;
  game?: string;
}

function ScoreDisplay({ match }: { match: MatchLiveData }) {
  return (
    <div className="flex items-center justify-center gap-4">
      {/* Team 1 */}
      <div className="flex items-center gap-2">
        {match.team1.logo && (
          <Image
            src={match.team1.logo}
            alt={match.team1.name}
            width={24}
            height={24}
            className="w-6 h-6 object-contain"
          />
        )}
        <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[80px]">
          {match.team1.acronym || match.team1.name}
        </span>
      </div>

      {/* Score */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--bg-elevated)]">
        <span className="text-lg font-bold text-[#00b8ff]">{match.team1.score}</span>
        <span className="text-[var(--text-muted)]">-</span>
        <span className="text-lg font-bold text-[#5c6c8a]">{match.team2.score}</span>
      </div>

      {/* Team 2 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[80px]">
          {match.team2.acronym || match.team2.name}
        </span>
        {match.team2.logo && (
          <Image
            src={match.team2.logo}
            alt={match.team2.name}
            width={24}
            height={24}
            className="w-6 h-6 object-contain"
          />
        )}
      </div>
    </div>
  );
}

function MapScores({ games }: { games: MatchLiveData['games'] }) {
  if (games.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-1 mt-2">
      {games.map((game, idx) => (
        <div
          key={idx}
          className={`w-6 h-6 rounded text-xs font-medium flex items-center justify-center ${
            game.status === 'finished'
              ? game.winner
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
              : game.status === 'running'
              ? 'bg-[var(--win-green)]/20 text-[var(--win-green)] animate-pulse'
              : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
          }`}
          title={game.winner ? `Map ${game.position}: ${game.winner}` : `Map ${game.position}`}
        >
          {game.position}
        </div>
      ))}
    </div>
  );
}

function StreamButton({ stream }: { stream: MatchLiveData['stream'] }) {
  if (!stream.url) return null;

  return (
    <a
      href={stream.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#9146FF]/20 text-[#9146FF] text-xs font-medium hover:bg-[#9146FF]/30 transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
      </svg>
      Watch Live
    </a>
  );
}

export default function LiveMatchInfo({ team1, team2, game }: LiveMatchInfoProps) {
  const { data: match, isLoading, found } = useMatchLiveData(team1, team2, game);

  if (isLoading) {
    return (
      <div className="p-3 rounded-xl bg-[var(--bg-secondary)] animate-pulse">
        <div className="h-6 w-32 mx-auto bg-[var(--bg-elevated)] rounded" />
      </div>
    );
  }

  if (!found || !match) {
    return null; // Don't show anything if match not found
  }

  return (
    <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)]">
      {/* Live indicator */}
      {match.isLive && (
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span className="w-2 h-2 bg-[var(--loss-red)] rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-[var(--loss-red)] uppercase">Live</span>
        </div>
      )}

      {/* Score */}
      <ScoreDisplay match={match} />

      {/* Map scores */}
      <MapScores games={match.games} />

      {/* Tournament info */}
      {match.tournament.name && (
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-[var(--text-muted)]">
          {match.tournament.leagueLogo && (
            <Image
              src={match.tournament.leagueLogo}
              alt={match.tournament.league}
              width={16}
              height={16}
              className="w-4 h-4 object-contain"
            />
          )}
          <span className="truncate">{match.tournament.name}</span>
        </div>
      )}

      {/* Watch button */}
      {match.isLive && match.stream.url && (
        <div className="flex justify-center mt-3">
          <StreamButton stream={match.stream} />
        </div>
      )}
    </div>
  );
}
