import Link from 'next/link';
import Image from 'next/image';
import { Position } from '../types';

interface PositionRowProps {
  position: Position;
}

export function PositionRow({ position }: PositionRowProps) {
  const isProfitable = position.pnl >= 0;

  return (
    <Link
      href={position.slug ? `/event/${position.eventSlug}` : '#'}
      className="flex items-center gap-4 p-4 transition-colors hover:bg-[var(--bg-card-hover)]"
    >
      {/* Market Image */}
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-[var(--bg-elevated)]">
        {position.image ? (
          <Image
            src={position.image}
            alt={position.question || 'Market'}
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
        )}
      </div>

      {/* Market Info */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium text-[var(--text-primary)]">
          {position.question || `Market ${position.tokenId.slice(0, 8)}...`}
        </h3>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              position.outcome === 'Yes'
                ? 'bg-green-500/10 text-[var(--win-green)]'
                : 'bg-red-500/10 text-[var(--loss-red)]'
            }`}
          >
            {position.outcome}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {position.size.toFixed(2)} shares @ {(position.avgPrice * 100).toFixed(1)}¢
          </span>
        </div>
      </div>

      {/* Current Price */}
      <div className="hidden text-right sm:block">
        <p className="text-xs text-[var(--text-muted)]">Current</p>
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {(position.currentPrice * 100).toFixed(1)}¢
        </p>
      </div>

      {/* Value */}
      <div className="text-right">
        <p className="text-xs text-[var(--text-muted)]">Value</p>
        <p className="text-sm font-bold text-[var(--text-primary)]">${position.value.toFixed(2)}</p>
      </div>

      {/* P&L */}
      <div className="min-w-[80px] text-right">
        <p className="text-xs text-[var(--text-muted)]">P&L</p>
        <p
          className={`text-sm font-bold ${
            isProfitable ? 'text-[var(--win-green)]' : 'text-[var(--loss-red)]'
          }`}
        >
          {isProfitable ? '+' : ''}
          {position.pnl.toFixed(2)}
        </p>
        <p
          className={`text-xs ${
            isProfitable ? 'text-[var(--win-green)]/70' : 'text-[var(--loss-red)]/70'
          }`}
        >
          {isProfitable ? '+' : ''}
          {(position.pnlPercent / 100).toFixed(1)}%
        </p>
      </div>

      {/* Arrow */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="flex-shrink-0 text-[var(--text-muted)]"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </Link>
  );
}
