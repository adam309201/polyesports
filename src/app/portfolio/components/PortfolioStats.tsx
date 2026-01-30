interface PortfolioStatsProps {
  usdcBalance: string | null;
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  onDepositClick: () => void;
  onWithdrawClick: () => void;
}

export function PortfolioStats({
  usdcBalance,
  totalValue,
  totalPnl,
  totalPnlPercent,
  onDepositClick,
  onWithdrawClick,
}: PortfolioStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 sm:p-8 lg:col-span-7">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs tracking-wide text-[var(--text-muted)] uppercase">Total Net Worth</p>
        </div>
        <p className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
          ${usdcBalance || '0.00'}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium ${
                totalPnl >= 0
                  ? 'bg-green-500/10 text-[var(--win-green)]'
                  : 'bg-red-500/10 text-[var(--loss-red)]'
              }`}
            >
              {totalPnl >= 0 ? '+' : ''}
              {totalPnl.toFixed(2)}
            </div>
            <span className="text-sm text-[var(--text-secondary)]">Total P&L</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onDepositClick}
              className="flex min-w-[104px] items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] sm:px-4"
            >
              Deposit
            </button>
            <button
              onClick={onWithdrawClick}
              disabled={!usdcBalance || parseFloat(usdcBalance) <= 0}
              className="flex min-w-[80px] items-center justify-center gap-2 rounded-xl bg-[var(--win-green)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
            >
              Withdraw
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-row gap-4 lg:col-span-5 lg:flex-col">
        <div className="flex-1 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 transition-all hover:border-[var(--border-highlight)]">
          <p className="mb-1 text-xs tracking-wide text-[var(--text-muted)] uppercase">
            Positions Value
          </p>
          <p className="text-xl font-bold text-[var(--text-primary)]">${totalValue.toFixed(2)}</p>
        </div>
        <div className="flex-1 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 transition-all hover:border-[var(--border-highlight)]">
          <p className="mb-1 text-xs tracking-wide text-[var(--text-muted)] uppercase">Return</p>
          <p
            className={`text-xl font-bold ${
              totalPnlPercent >= 0 ? 'text-[var(--win-green)]' : 'text-[var(--loss-red)]'
            }`}
          >
            {totalPnlPercent >= 0 ? '+' : ''}
            {totalPnlPercent.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
