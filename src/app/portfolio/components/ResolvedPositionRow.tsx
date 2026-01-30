import Image from 'next/image';
import { Position } from '../types';

interface ResolvedPositionRowProps {
  position: Position;
  onClaim: (position: Position) => void;
  isClaiming: boolean;
}

export function ResolvedPositionRow({ position, onClaim, isClaiming }: ResolvedPositionRowProps) {
  const isWinner = position.isWinner;
  const canClaim = isWinner && position.payout && position.payout > 0;

  return (
    <div className="flex items-center gap-4 p-4 transition-colors hover:bg-[var(--bg-card-hover)]">
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

      {/* Result */}
      <div className="text-right">
        <p className="text-xs text-[var(--text-muted)]">Result</p>
        <div className="flex items-center gap-1.5">
          {isWinner ? (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-[var(--win-green)]"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="m9 11 3 3L22 4" />
              </svg>
              <span className="text-sm font-medium text-[var(--win-green)]">Won</span>
            </>
          ) : (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-[var(--loss-red)]"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6M9 9l6 6" />
              </svg>
              <span className="text-sm font-medium text-[var(--loss-red)]">Lost</span>
            </>
          )}
        </div>
      </div>

      {/* Winning Outcome */}
      <div className="hidden text-right sm:block">
        <p className="text-xs text-[var(--text-muted)]">Winner</p>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            position.winningOutcome === 'Yes'
              ? 'bg-green-500/10 text-[var(--win-green)]'
              : 'bg-red-500/10 text-[var(--loss-red)]'
          }`}
        >
          {position.winningOutcome || 'N/A'}
        </span>
      </div>

      {/* Payout */}
      <div className="min-w-[80px] text-right">
        <p className="text-xs text-[var(--text-muted)]">{isWinner ? 'Payout' : 'Loss'}</p>
        <p
          className={`text-sm font-bold ${
            isWinner ? 'text-[var(--win-green)]' : 'text-[var(--loss-red)]'
          }`}
        >
          {isWinner
            ? `+$${(position.payout || 0).toFixed(2)}`
            : `-$${(position.size * position.avgPrice).toFixed(2)}`}
        </p>
      </div>

      {/* Claim Button */}
      <div className="min-w-[90px]">
        {canClaim ? (
          <button
            onClick={() => onClaim(position)}
            disabled={isClaiming}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-2 text-sm font-medium text-[var(--win-green)] transition-colors hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isClaiming ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-400/30 border-t-green-500" />
                <span>Claiming</span>
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span>Claim</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex w-full items-center justify-center rounded-lg bg-red-500/10 px-3 py-2 text-sm text-[var(--loss-red)]/70">
            No payout
          </div>
        )}
      </div>
    </div>
  );
}
