'use client';

import Image from 'next/image';
import type { Team } from '@/data/mock-data';

interface TeamBadgeProps {
  team: Team;
  size?: 'sm' | 'md' | 'lg';
  showRanking?: boolean;
  showWinRate?: boolean;
  showPlayers?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: {
    logo: 'w-8 h-8',
    name: 'text-sm',
    ranking: 'text-xs',
    container: 'gap-2',
  },
  md: {
    logo: 'w-12 h-12',
    name: 'text-base',
    ranking: 'text-sm',
    container: 'gap-3',
  },
  lg: {
    logo: 'w-16 h-16',
    name: 'text-lg',
    ranking: 'text-base',
    container: 'gap-4',
  },
};

export default function TeamBadge({
  team,
  size = 'md',
  showRanking = true,
  showWinRate = false,
  showPlayers = false,
  className = '',
}: TeamBadgeProps) {
  const sizes = sizeClasses[size];

  return (
    <div className={`flex flex-col items-center ${sizes.container} ${className}`}>
      {/* Team Logo */}
      <div className={`${sizes.logo} relative rounded-lg bg-[var(--bg-elevated)] p-2 flex items-center justify-center`}>
        {team.logo ? (
          <Image
            src={team.logo}
            alt={team.name}
            fill
            className="object-contain p-1"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = `<span class="text-xl font-bold text-[#00b8ff]">${team.shortName.charAt(0)}</span>`;
            }}
          />
        ) : (
          <span className="text-xl font-bold text-[#00b8ff]">
            {team.shortName.charAt(0)}
          </span>
        )}
      </div>

      {/* Team Name */}
      <div className="text-center">
        <h3 className={`font-bold text-[var(--text-primary)] ${sizes.name}`}>
          {team.shortName}
        </h3>

        {/* World Ranking */}
        {showRanking && (
          <div className={`text-[var(--text-secondary)] ${sizes.ranking} flex items-center justify-center gap-1`}>
            <span className="text-[var(--neon-yellow)]">#{team.worldRanking}</span>
            <span>World</span>
          </div>
        )}

        {/* Win Rate */}
        {showWinRate && (
          <div className={`text-[var(--neon-green)] ${sizes.ranking} mt-1`}>
            {team.winRate}% WR
          </div>
        )}
      </div>

      {/* Recent Form */}
      {showWinRate && team.recentForm && (
        <div className="flex gap-1 mt-1">
          {team.recentForm.map((result, idx) => (
            <span
              key={idx}
              className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center ${
                result === 'W'
                  ? 'bg-[var(--win-green)]/20 text-[var(--win-green)]'
                  : 'bg-[var(--loss-red)]/20 text-[var(--loss-red)]'
              }`}
            >
              {result}
            </span>
          ))}
        </div>
      )}

      {/* Players */}
      {showPlayers && (
        <div className="mt-2 space-y-1">
          {team.players.slice(0, 5).map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
            >
              <span>{player.countryFlag}</span>
              <span className="font-medium text-[var(--text-primary)]">{player.nickname}</span>
              <span className="text-[#00b8ff]">{player.rating.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact inline version
export function TeamBadgeInline({
  team,
  showRanking = false,
  className = '',
}: {
  team: Team;
  showRanking?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-6 h-6 relative rounded bg-[var(--bg-elevated)] flex items-center justify-center overflow-hidden">
        {team.logo ? (
          <Image
            src={team.logo}
            alt={team.name}
            fill
            className="object-contain p-0.5"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : (
          <span className="text-xs font-bold text-[#00b8ff]">
            {team.shortName.charAt(0)}
          </span>
        )}
      </div>
      <span className="font-medium text-[var(--text-primary)]">{team.shortName}</span>
      {showRanking && (
        <span className="text-xs text-[var(--neon-yellow)]">#{team.worldRanking}</span>
      )}
    </div>
  );
}
