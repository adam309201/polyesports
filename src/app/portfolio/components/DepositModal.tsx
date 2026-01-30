interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  eoaUsdcBalance: string | null;
  depositAmount: string;
  setDepositAmount: (amount: string) => void;
  isDepositPending: boolean;
  isDepositConfirming: boolean;
  depositResult: { success: boolean; message: string; txHash?: string } | null;
  onDeposit: () => void;
  safeAddress?: string | null;
}

export function DepositModal({
  isOpen,
  onClose,
  eoaUsdcBalance,
  depositAmount,
  setDepositAmount,
  isDepositPending,
  isDepositConfirming,
  depositResult,
  onDeposit,
  safeAddress,
}: DepositModalProps) {
  if (!isOpen) return null;

  const isProcessing = isDepositPending || isDepositConfirming;

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-2xl">
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4">
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-all hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-elevated)]">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-[var(--neon-cyan)]"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </div>
            </div>

            <h2 className="text-center text-xl font-bold text-[var(--text-primary)]">
              Deposit USDC
            </h2>
            <p className="mt-1 text-center text-sm text-[var(--text-secondary)]">
              Transfer from wallet to trading account
            </p>
            <p className="mt-2 px-4 text-center text-xs text-[var(--pending-yellow)]">
              Note: You need USDC.e (Polygon) in your wallet
            </p>
          </div>

          {/* Content */}
          <div className="space-y-4 px-6 pb-6">
            {/* Wallet Balance */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3">
              <p className="mb-1 text-xs text-[var(--text-muted)]">Wallet Balance</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                ${eoaUsdcBalance || '0.00'}
              </p>
            </div>

            {/* Amount Input */}
            <div>
              <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                Amount to deposit
              </label>
              <div className="relative">
                <span className="absolute top-1/2 left-4 -translate-y-1/2 font-medium text-[var(--text-muted)]">
                  $
                </span>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={isProcessing}
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] py-3 pr-4 pl-8 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--neon-cyan)] focus:ring-1 focus:ring-[var(--neon-cyan)]/30 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((percent) => (
                <button
                  key={percent}
                  onClick={() => {
                    const amount = (
                      (parseFloat(eoaUsdcBalance || '0') * percent) /
                      100
                    ).toFixed(2);
                    setDepositAmount(amount);
                  }}
                  disabled={isProcessing}
                  className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-card-hover)] disabled:opacity-50"
                >
                  {percent}%
                </button>
              ))}
            </div>

            {/* Destination Address */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/50 p-3">
              <p className="mb-1 text-xs text-[var(--text-muted)]">Trading Account</p>
              <p className="truncate font-mono text-sm text-[var(--text-primary)]">
                {safeAddress
                  ? `${safeAddress.slice(0, 10)}...${safeAddress.slice(-8)}`
                  : 'Not initialized'}
              </p>
            </div>

            {/* Result Message */}
            {depositResult && (
              <div
                className={`rounded-xl p-3 ${
                  depositResult.success
                    ? 'border border-green-500/30 bg-green-500/10'
                    : 'border border-red-500/30 bg-red-500/10'
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    depositResult.success
                      ? 'text-[var(--win-green)]'
                      : 'text-[var(--loss-red)]'
                  }`}
                >
                  {depositResult.message}
                </p>
                {depositResult.txHash && (
                  <a
                    href={`https://polygonscan.com/tx/${depositResult.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-xs text-[var(--neon-cyan)] hover:underline"
                  >
                    View on PolygonScan
                  </a>
                )}
              </div>
            )}

            {/* Confirm Button */}
            <button
              onClick={onDeposit}
              disabled={
                isProcessing ||
                !depositAmount ||
                parseFloat(depositAmount) <= 0 ||
                parseFloat(depositAmount) > parseFloat(eoaUsdcBalance || '0')
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--neon-cyan)] py-3 font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {isDepositPending ? 'Confirm in Wallet...' : 'Processing...'}
                </>
              ) : (
                'Confirm Deposit'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
