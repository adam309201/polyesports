import Link from 'next/link';
import Image from 'next/image';
import { Order } from '../types';

interface OrderRowProps {
  order: Order;
  onCancel: (orderId: string) => void;
  isCancelling: boolean;
}

export function OrderRow({ order, onCancel, isCancelling }: OrderRowProps) {
  const isBuy = order.side === 'BUY';
  const filled = order.size_matched || 0;
  const fillPercent = order.original_size > 0 ? (filled / order.original_size) * 100 : 0;

  const content = (
    <>
      {/* Market Image */}
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-[var(--bg-elevated)]">
        {order.image ? (
          <Image
            src={order.image}
            alt={order.question || 'Market'}
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

      {/* Order Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold ${
              isBuy
                ? 'bg-green-500/10 text-[var(--win-green)]'
                : 'bg-red-500/10 text-[var(--loss-red)]'
            }`}
          >
            {order.side}
          </span>
          {order.outcome && (
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                order.outcome === 'Yes'
                  ? 'bg-green-500/10 text-[var(--win-green)]'
                  : 'bg-red-500/10 text-[var(--loss-red)]'
              }`}
            >
              {order.outcome}
            </span>
          )}
        </div>
        {order.question ? (
          <p className="mt-1 truncate text-sm text-[var(--text-primary)]">{order.question}</p>
        ) : (
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Token: {order.asset_id?.slice(0, 8)}...{order.asset_id?.slice(-6)}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="hidden text-right sm:block">
        <p className="text-xs text-[var(--text-muted)]">Price</p>
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {(order.price * 100).toFixed(1)}¢
        </p>
      </div>

      {/* Size */}
      <div className="text-right">
        <p className="text-xs text-[var(--text-muted)]">Size</p>
        <p className="text-sm font-bold text-[var(--text-primary)]">
          {order.original_size.toFixed(2)}
        </p>
      </div>

      {/* Filled */}
      <div className="min-w-[70px] text-right">
        <p className="text-xs text-[var(--text-muted)]">Filled</p>
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          {fillPercent.toFixed(0)}%
        </p>
        <div className="mt-1 h-1 w-full rounded-full bg-[var(--bg-elevated)]">
          <div
            className="h-full rounded-full bg-[var(--neon-cyan)]"
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="flex items-center gap-4 p-4 transition-colors hover:bg-[var(--bg-card-hover)]">
      {order.slug ? (
        <Link href={`/event/${order.slug}`} className="flex min-w-0 flex-1 items-center gap-4">
          {content}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-4">{content}</div>
      )}

      {/* Cancel Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCancel(order.id);
        }}
        disabled={isCancelling}
        className="flex-shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-[var(--loss-red)] transition-colors hover:bg-red-500/10 disabled:opacity-50"
      >
        {isCancelling ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400/30 border-t-red-500" />
        ) : (
          'Cancel'
        )}
      </button>
    </div>
  );
}
