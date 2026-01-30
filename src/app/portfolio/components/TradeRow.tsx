import Link from 'next/link';
import Image from 'next/image';
import { Trade } from '../types';

function getTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

interface TradeRowProps {
  trade: Trade;
}

export function TradeRow({ trade }: TradeRowProps) {
  const isBuy = trade.side === 'BUY';
  const total = trade.price * trade.size;
  const timeAgo = getTimeAgo(trade.timestamp);

  const content = (
    <>
      {/* Market Image */}
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-[var(--bg-elevated)]">
        {trade.image ? (
          <Image
            src={trade.image}
            alt={trade.question || 'Market'}
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center ${
              isBuy ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={isBuy ? 'text-[var(--win-green)]' : 'text-[var(--loss-red)]'}
            >
              {isBuy ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M5 12l7 7 7-7" />}
            </svg>
          </div>
        )}
      </div>

      {/* Trade Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold ${
              isBuy
                ? 'bg-green-500/10 text-[var(--win-green)]'
                : 'bg-red-500/10 text-[var(--loss-red)]'
            }`}
          >
            {trade.side}
          </span>
          {trade.outcome && (
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                ['Yes', 'Up'].includes(trade.outcome)
                  ? 'bg-green-500/10 text-[var(--win-green)]'
                  : 'bg-red-500/10 text-[var(--loss-red)]'
              }`}
            >
              {trade.outcome}
            </span>
          )}
        </div>
        {trade.question ? (
          <p className="mt-1 truncate text-sm text-[var(--text-primary)]">{trade.question}</p>
        ) : (
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Token: {trade.asset_id?.slice(0, 8)}...{trade.asset_id?.slice(-6)}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="hidden text-right sm:block">
        <p className="text-xs text-[var(--text-muted)]">Price</p>
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {(trade.price * 100).toFixed(1)}¢
        </p>
      </div>

      {/* Size */}
      <div className="text-right">
        <p className="text-xs text-[var(--text-muted)]">Shares</p>
        <p className="text-sm font-bold text-[var(--text-primary)]">{trade.size.toFixed(2)}</p>
      </div>

      {/* Total */}
      <div className="min-w-[80px] text-right">
        <p className="text-xs text-[var(--text-muted)]">Total</p>
        <p className="text-sm font-bold text-[var(--text-primary)]">${total.toFixed(2)}</p>
        <p className="text-xs text-[var(--text-muted)]">{timeAgo}</p>
      </div>
    </>
  );

  return (
    <div className="flex items-center gap-4 p-4 transition-colors hover:bg-[var(--bg-card-hover)]">
      {trade.slug ? (
        <Link href={`/event/${trade.slug}`} className="flex min-w-0 flex-1 items-center gap-4">
          {content}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-4">{content}</div>
      )}
    </div>
  );
}
