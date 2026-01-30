'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, erc20Abi } from 'viem';
import { useTrading } from '@/providers/TradingProvider';
import { useConnectWalletModal } from '@/hooks/useConnectWalletModal';
import Link from 'next/link';
import { ReloadIcon } from '@/components/icons';
import { Position, Order, Trade, TabType } from './types';
import {
  PositionRow,
  ResolvedPositionRow,
  OrderRow,
  TradeRow,
  WithdrawModal,
  DepositModal,
  PortfolioStats,
} from './components';

const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as const;

export default function PortfolioPage() {
  const { isConnected, address } = useAccount();
  const {
    safeAddress,
    isTradingSessionComplete,
    getBalances,
    getEoaUsdcBalance,
    getOpenOrders,
    cancelOrder,
    withdrawToWallet,
    redeemPositions,
  } = useTrading();
  const { openConnectModal } = useConnectWalletModal();

  // Wagmi write contract for deposit
  const {
    writeContract,
    data: depositTxHash,
    isPending: isDepositPending,
    reset: resetDeposit,
  } = useWriteContract();
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({
      hash: depositTxHash,
    });

  const [activeTab, setActiveTab] = useState<TabType>('positions');
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Withdraw state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState<{
    success: boolean;
    message: string;
    txHash?: string;
  } | null>(null);

  // Deposit state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [eoaUsdcBalance, setEoaUsdcBalance] = useState<string | null>(null);
  const [depositResult, setDepositResult] = useState<{
    success: boolean;
    message: string;
    txHash?: string;
  } | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!isTradingSessionComplete) return;

    try {
      const balances = await getBalances();
      if (balances?.usdc) {
        const balance = parseFloat(balances.usdc) / 1_000_000;
        setUsdcBalance(balance.toFixed(2));
      }
    } catch (err) {
      console.error('[Portfolio] Failed to fetch balance:', err);
    }
  }, [isTradingSessionComplete, getBalances]);

  const fetchEoaBalance = useCallback(async () => {
    if (!isConnected) return;

    try {
      const balance = await getEoaUsdcBalance();
      if (balance) {
        setEoaUsdcBalance(parseFloat(balance).toFixed(2));
      }
    } catch (err) {
      console.error('[Portfolio] Failed to fetch EOA balance:', err);
    }
  }, [isConnected, getEoaUsdcBalance]);

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
    if (parseFloat(withdrawAmount) > parseFloat(usdcBalance || '0')) {
      setWithdrawResult({ success: false, message: 'Insufficient balance' });
      return;
    }

    setIsWithdrawing(true);
    setWithdrawResult(null);

    try {
      const result = await withdrawToWallet(withdrawAmount);
      if (result.success) {
        setWithdrawResult({
          success: true,
          message: 'Withdrawal successful!',
          txHash: result.txHash,
        });
        fetchBalance();
        setTimeout(() => {
          setWithdrawAmount('');
          setWithdrawResult(null);
          setShowWithdrawModal(false);
        }, 3000);
      } else {
        setWithdrawResult({ success: false, message: result.error || 'Withdrawal failed' });
      }
    } catch {
      setWithdrawResult({ success: false, message: 'Withdrawal failed' });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleDeposit = () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    if (parseFloat(depositAmount) > parseFloat(eoaUsdcBalance || '0')) {
      setDepositResult({ success: false, message: 'Insufficient wallet balance' });
      return;
    }
    if (!safeAddress) {
      setDepositResult({ success: false, message: 'Trading wallet not initialized' });
      return;
    }

    setDepositResult(null);

    writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [safeAddress as `0x${string}`, parseUnits(depositAmount, 6)],
    });
  };

  const handleCloseWithdrawModal = () => {
    setShowWithdrawModal(false);
    setWithdrawAmount('');
    setWithdrawResult(null);
  };

  const handleCloseDepositModal = () => {
    setShowDepositModal(false);
    setDepositAmount('');
    setDepositResult(null);
    resetDeposit();
  };

  // Handle deposit success
  useEffect(() => {
    if (isDepositSuccess && depositTxHash) {
      setDepositResult({ success: true, message: 'Deposit successful!', txHash: depositTxHash });
      fetchBalance();
      fetchEoaBalance();
      setTimeout(() => {
        setDepositAmount('');
        setDepositResult(null);
        setShowDepositModal(false);
        resetDeposit();
      }, 3000);
    }
  }, [isDepositSuccess, depositTxHash, fetchBalance, fetchEoaBalance, resetDeposit]);

  // Fetch EOA balance when modal opens
  useEffect(() => {
    if (showDepositModal) {
      fetchEoaBalance();
    }
  }, [showDepositModal, fetchEoaBalance]);

  const fetchPositions = useCallback(async () => {
    if (!safeAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/positions?address=${safeAddress}`);

      if (!response.ok) {
        setError(`API error: ${response.status}`);
        return;
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setPositions(data.positions || []);
      }
    } catch (err) {
      setError('Failed to fetch positions');
      console.error('[Portfolio] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [safeAddress]);

  const fetchOrders = useCallback(async () => {
    if (!isTradingSessionComplete) return;

    setIsLoadingOrders(true);
    try {
      const openOrders = await getOpenOrders();

      if (openOrders && Array.isArray(openOrders) && openOrders.length > 0) {
        const tokenIds = [...new Set(openOrders.map((o: any) => o.asset_id))];

        let marketMap: Record<string, any> = {};
        try {
          const marketRes = await fetch(`/api/markets-by-tokens?tokenIds=${tokenIds.join(',')}`);
          const data = await marketRes.json();

          if (data.tokenMap) {
            marketMap = data.tokenMap;
          }
        } catch (err) {
          console.error('[Portfolio] Failed to fetch market info:', err);
        }

        const formattedOrders = openOrders.map((o: any) => {
          const marketInfo = marketMap[o.asset_id] || {};
          return {
            id: o.id || o.order_id,
            asset_id: o.asset_id,
            side: o.side || 'BUY',
            price: Number(o.price) || 0,
            original_size: Number(o.original_size || o.size) || 0,
            size_matched: Number(o.size_matched) || 0,
            outcome: marketInfo.outcome,
            question: marketInfo.question,
            slug: marketInfo.slug,
            image: marketInfo.image,
          };
        });
        setOrders(formattedOrders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('[Portfolio] Failed to fetch orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [isTradingSessionComplete, getOpenOrders]);

  const fetchTradeHistory = useCallback(async () => {
    if (!safeAddress) return;

    setIsLoadingTrades(true);
    try {
      const response = await fetch(`/api/trade-history?address=${safeAddress}`);
      const data = await response.json();

      if (data.trades && Array.isArray(data.trades)) {
        setTrades(data.trades);
      } else {
        setTrades([]);
      }
    } catch (err) {
      console.error('[Portfolio] Failed to fetch trade history:', err);
      setTrades([]);
    } finally {
      setIsLoadingTrades(false);
    }
  }, [safeAddress]);

  const handleCancelOrder = async (orderId: string) => {
    if (!cancelOrder) return;
    setCancellingId(orderId);
    try {
      const result = await cancelOrder(orderId);
      if (result.success) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      }
    } catch (err) {
      console.error('[Portfolio] Failed to cancel order:', err);
    } finally {
      setCancellingId(null);
    }
  };

  const handleClaimPosition = async (position: Position) => {
    if (!redeemPositions) return;

    setClaimingId(position.id);
    try {
      const indexSet = position.outcomeIndex === 0 ? 1 : 2;
      const result = await redeemPositions(position.conditionId, [indexSet]);

      if (result.success) {
        fetchPositions();
        fetchBalance();
      } else {
        alert(`Claim failed: ${result.error}`);
      }
    } catch (err) {
      console.error('[Portfolio] Failed to claim position:', err);
      alert(`Claim error: ${err}`);
    } finally {
      setClaimingId(null);
    }
  };

  const handleRefresh = () => {
    fetchPositions();
    fetchBalance();
    fetchOrders();
    fetchTradeHistory();
  };

  useEffect(() => {
    if (safeAddress) {
      fetchPositions();
      fetchBalance();
    }
  }, [safeAddress, fetchPositions, fetchBalance]);

  useEffect(() => {
    if (isTradingSessionComplete) {
      fetchOrders();
    }
  }, [isTradingSessionComplete, fetchOrders]);

  useEffect(() => {
    if (safeAddress) {
      fetchTradeHistory();
    }
  }, [safeAddress, fetchTradeHistory]);

  // Separate active and resolved positions
  const activePositions = positions.filter((p) => !p.resolved);
  const resolvedPositions = positions.filter((p) => p.resolved);

  const totalValue = activePositions.reduce((sum, p) => sum + p.value, 0);
  const totalPnl = activePositions.reduce((sum, p) => sum + p.pnl, 0);
  const totalInvested = activePositions.reduce((sum, p) => sum + p.size * p.avgPrice, 0);
  const totalPnlPercent =
    totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;

  const claimableAmount = resolvedPositions
    .filter((p) => p.isWinner && p.payout && p.payout > 0)
    .reduce((sum, p) => sum + (p.payout || 0), 0);

  if (!isConnected) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--bg-elevated)]">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-[var(--text-muted)]"
            >
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
            Connect Your Wallet
          </h2>
          <p className="mb-6 text-[var(--text-secondary)]">
            Connect your wallet to view your portfolio and trading positions.
          </p>
          <button
            onClick={openConnectModal}
            className="btn-neon btn-neon-cyan rounded-xl px-6 py-3 font-semibold text-white"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (!isTradingSessionComplete) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--bg-elevated)]">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-[var(--border-default)] border-t-[var(--neon-cyan)]" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
            Initialize Trading
          </h2>
          <p className="mb-6 text-[var(--text-secondary)]">
            Please complete the trading setup to view your portfolio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-6 min-h-screen max-w-6xl space-y-6 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Portfolio</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Your active positions and performance
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading || isLoadingOrders || isLoadingTrades}
          className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-2.5 text-sm transition-all hover:bg-[var(--bg-card-hover)] disabled:opacity-50"
        >
          <ReloadIcon />
        </button>
      </div>

      {/* Stats Cards */}
      <PortfolioStats
        usdcBalance={usdcBalance}
        totalValue={totalValue}
        totalPnl={totalPnl}
        totalPnlPercent={totalPnlPercent}
        onDepositClick={() => setShowDepositModal(true)}
        onWithdrawClick={() => setShowWithdrawModal(true)}
      />

      {/* Tabs */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
        <div className="flex border-b border-[var(--border-default)]">
          {(['positions', 'resolved', 'orders', 'history'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {tab === 'positions' && `Positions (${activePositions.length})`}
              {tab === 'resolved' && (
                <span className="flex items-center gap-1.5">
                  Resolved ({resolvedPositions.length})
                  {claimableAmount > 0 && (
                    <span className="rounded-full bg-green-500/20 px-1.5 py-0.5 text-xs text-[var(--win-green)]">
                      ${claimableAmount.toFixed(2)}
                    </span>
                  )}
                </span>
              )}
              {tab === 'orders' && `Orders (${orders.length})`}
              {tab === 'history' && `History (${trades.length})`}
              {activeTab === tab && (
                <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-[var(--neon-cyan)]" />
              )}
            </button>
          ))}
        </div>

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <PositionsTabContent
            positions={activePositions}
            isLoading={isLoading}
            error={error}
            onRetry={fetchPositions}
          />
        )}

        {/* Resolved Tab */}
        {activeTab === 'resolved' && (
          <ResolvedTabContent
            positions={resolvedPositions}
            isLoading={isLoading}
            claimingId={claimingId}
            onClaim={handleClaimPosition}
          />
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <OrdersTabContent
            orders={orders}
            isLoading={isLoadingOrders}
            cancellingId={cancellingId}
            onCancelOrder={handleCancelOrder}
          />
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <HistoryTabContent trades={trades} isLoading={isLoadingTrades} />
        )}
      </div>

      {/* Modals */}
      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={handleCloseWithdrawModal}
        usdcBalance={usdcBalance}
        withdrawAmount={withdrawAmount}
        setWithdrawAmount={setWithdrawAmount}
        isWithdrawing={isWithdrawing}
        withdrawResult={withdrawResult}
        onWithdraw={handleWithdraw}
        destinationAddress={address}
      />

      <DepositModal
        isOpen={showDepositModal}
        onClose={handleCloseDepositModal}
        eoaUsdcBalance={eoaUsdcBalance}
        depositAmount={depositAmount}
        setDepositAmount={setDepositAmount}
        isDepositPending={isDepositPending}
        isDepositConfirming={isDepositConfirming}
        depositResult={depositResult}
        onDeposit={handleDeposit}
        safeAddress={safeAddress}
      />
    </div>
  );
}

// Tab Content Components
function PositionsTabContent({
  positions,
  isLoading,
  error,
  onRetry,
}: {
  positions: Position[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (isLoading && positions.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--neon-cyan)]" />
        <p className="text-[var(--text-muted)]">Loading positions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--loss-red)]">{error}</p>
        <button
          onClick={onRetry}
          className="mt-3 text-sm text-[var(--neon-cyan)] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-elevated)]">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-[var(--text-muted)]"
          >
            <path d="M3 3h18v18H3zM21 9H3M9 21V9" />
          </svg>
        </div>
        <p className="mb-2 text-[var(--text-secondary)]">No positions yet</p>
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Start trading to see your positions here
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--neon-cyan)]/10 px-4 py-2 text-sm font-medium text-[var(--neon-cyan)] transition-colors hover:bg-[var(--neon-cyan)]/20"
        >
          Explore Markets
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border-default)]">
      {positions.map((position) => (
        <PositionRow key={position.id} position={position} />
      ))}
    </div>
  );
}

function OrdersTabContent({
  orders,
  isLoading,
  cancellingId,
  onCancelOrder,
}: {
  orders: Order[];
  isLoading: boolean;
  cancellingId: string | null;
  onCancelOrder: (orderId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--neon-cyan)]" />
        <p className="text-[var(--text-muted)]">Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-elevated)]">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-[var(--text-muted)]"
          >
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="mb-2 text-[var(--text-secondary)]">No open orders</p>
        <p className="text-sm text-[var(--text-muted)]">Your limit orders will appear here</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border-default)]">
      {orders.map((order) => (
        <OrderRow
          key={order.id}
          order={order}
          onCancel={onCancelOrder}
          isCancelling={cancellingId === order.id}
        />
      ))}
    </div>
  );
}

const ITEMS_PER_PAGE = 10;

function HistoryTabContent({ trades, isLoading }: { trades: Trade[]; isLoading: boolean }) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(trades.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTrades = trades.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--neon-cyan)]" />
        <p className="text-[var(--text-muted)]">Loading trade history...</p>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-elevated)]">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-[var(--text-muted)]"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <p className="mb-2 text-[var(--text-secondary)]">No trade history</p>
        <p className="text-sm text-[var(--text-muted)]">
          Your completed trades will appear here
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-[var(--border-default)]">
        {paginatedTrades.map((trade) => (
          <TradeRow key={trade.id} trade={trade} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border-default)] px-4 py-3">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, trades.length)} of{' '}
            {trades.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {(() => {
                const pages: (number | string)[] = [];
                if (totalPages <= 5) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (currentPage > 3) pages.push('...');
                  for (
                    let i = Math.max(2, currentPage - 1);
                    i <= Math.min(totalPages - 1, currentPage + 1);
                    i++
                  ) {
                    pages.push(i);
                  }
                  if (currentPage < totalPages - 2) pages.push('...');
                  pages.push(totalPages);
                }
                return pages.map((page, idx) =>
                  typeof page === 'string' ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-[var(--text-muted)]">
                      {page}
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`h-8 w-8 rounded-lg text-sm transition-colors ${
                        currentPage === page
                          ? 'bg-[var(--neon-cyan)] text-white'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {page}
                    </button>
                  )
                );
              })()}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResolvedTabContent({
  positions,
  isLoading,
  claimingId,
  onClaim,
}: {
  positions: Position[];
  isLoading: boolean;
  claimingId: string | null;
  onClaim: (position: Position) => void;
}) {
  if (isLoading && positions.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--neon-cyan)]" />
        <p className="text-[var(--text-muted)]">Loading resolved positions...</p>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-elevated)]">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-[var(--text-muted)]"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <path d="m9 11 3 3L22 4" />
          </svg>
        </div>
        <p className="mb-2 text-[var(--text-secondary)]">No resolved positions</p>
        <p className="text-sm text-[var(--text-muted)]">
          Markets that have ended will appear here with their results
        </p>
      </div>
    );
  }

  const winners = positions.filter((p) => p.isWinner);
  const losers = positions.filter((p) => !p.isWinner);

  return (
    <div className="divide-y divide-[var(--border-default)]">
      {/* Winners section */}
      {winners.length > 0 && (
        <div>
          <div className="flex items-center gap-2 border-b border-[var(--border-default)] bg-green-500/5 px-4 py-2">
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
            <span className="text-sm font-medium text-[var(--win-green)]">
              Won ({winners.length})
            </span>
          </div>
          {winners.map((position) => (
            <ResolvedPositionRow
              key={position.id}
              position={position}
              onClaim={onClaim}
              isClaiming={claimingId === position.id}
            />
          ))}
        </div>
      )}

      {/* Losers section */}
      {losers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 border-b border-[var(--border-default)] bg-red-500/5 px-4 py-2">
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
            <span className="text-sm font-medium text-[var(--loss-red)]">
              Lost ({losers.length})
            </span>
          </div>
          {losers.map((position) => (
            <ResolvedPositionRow
              key={position.id}
              position={position}
              onClaim={onClaim}
              isClaiming={claimingId === position.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
