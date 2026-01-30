import {formatStartTime} from './event-utils';

interface EventHeaderProps {
  title: string;
  isEnded: boolean;
  isLive: boolean;
  gameStartTime: string | undefined;
}

export default function EventHeader({title, isEnded, isLive, gameStartTime}: EventHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
      <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate min-w-0">{title}</h1>
      {isEnded ? (
        <span
          className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[var(--text-muted)]/10 text-[var(--text-muted)] text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 shrink-0">
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          FINAL
        </span>
      ) : isLive ? (
        <span
          className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[var(--live-red)]/10 text-[var(--live-red)] text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[var(--live-red)] rounded-full animate-live-pulse"/>
          LIVE
        </span>
      ) : (
        <span
          className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 shrink-0">
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          {formatStartTime(gameStartTime)}
        </span>
      )}
    </div>
  );
}
