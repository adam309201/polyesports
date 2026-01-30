'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useTeamLogos } from '@/hooks/useTeamLogos';
import { useRealtimePrice } from '@/hooks/useRealtimePrice';
import { useTrading } from '@/providers/TradingProvider';
import { useWallet } from '@/providers/WalletContext';
import { useConnectWalletModal } from '@/hooks/useConnectWalletModal';
import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';

const USDC_DECIMALS = 6;

interface Market {
  id: string;
  question: string;
  outcomes: string[] | string;
  outcomePrices: string[] | string;
  volumeNum: number;
  liquidityNum: number;
  bestBid: number;
  bestAsk: number;
  clobTokenIds: string[] | string;
  gameStartTime?: string;
  negRisk?: boolean;
  tickSize?: string;
  groupItemTitle?: string;
}

interface PolymarketEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  liquidity: number;
  volume: number;
  volume24hr: number;
  openInterest: number;
  markets: Market[];
  tags: Array<{ id: string; slug: string; label: string }>;
}

interface TradeBoxProps {
  event: PolymarketEvent | null;
  selectedTeam?: 0 | 1;
  onTeamChange?: (team: 0 | 1) => void;
}

type OrderAction = 'buy' | 'sell';
type TradeMode = 'market' | 'limit';

const parseMarketData = (market: Market) => {
  let prices: number[] = [];
  let outcomes: string[] = ['Yes', 'No'];

  try {
    if (typeof market.outcomePrices === 'string') {
      prices = JSON.parse(market.outcomePrices).map((p: string) => parseFloat(p));
    } else if (Array.isArray(market.outcomePrices)) {
      prices = market.outcomePrices.map(p => parseFloat(p));
    }
  } catch {
    prices = [];
  }

  try {
    if (typeof market.outcomes === 'string') {
      outcomes = JSON.parse(market.outcomes);
    } else if (Array.isArray(market.outcomes)) {
      outcomes = market.outcomes;
    }
  } catch {
    outcomes = ['Yes', 'No'];
  }

  return { prices, outcomes };
};

const formatVolume = (vol: number | undefined | null) => {
  const safeVol = vol ?? 0;
  if (safeVol >= 1000000) return `$${(safeVol / 1000000).toFixed(1)}M`;
  if (safeVol >= 1000) return `$${(safeVol / 1000).toFixed(1)}K`;
  return `$${safeVol.toFixed(0)}`;
};

const formatNumberBalance = (num: number | undefined | null, decimals: number = 2) => {
  const safeNum = num ?? 0;
  return safeNum.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const getTeamInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
};

// Check if outcomes are team-based (not over/under/yes/no)
const isTeamBasedMarket = (market: Market) => {
  const { outcomes } = parseMarketData(market);
  if (outcomes.length !== 2) return false;
  const nonTeamOutcomes = ['yes', 'no', 'over', 'under', 'draw', 'tie'];
  return !outcomes.some(o => nonTeamOutcomes.includes(o.toLowerCase().trim()));
};

// Get the best market to display (prioritize team-based markets)
const getPrimaryMarket = (markets: Market[] | undefined): Market | undefined => {
  if (!markets || markets.length === 0) return undefined;
  const teamMarket = markets.find(isTeamBasedMarket);
  if (teamMarket) return teamMarket;
  return markets[0];
};

export default function TradeBox({ event, selectedTeam: externalSelectedTeam, onTeamChange }: TradeBoxProps) {
  const [internalSelectedTeam, setInternalSelectedTeam] = useState<0 | 1>(externalSelectedTeam ?? 0);
  const [orderAction, setOrderAction] = useState<OrderAction>('buy');
  const [tradeMode, setTradeMode] = useState<TradeMode>('market');
  const [amount, setAmount] = useState<number>(0);
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [isTrading, setIsTrading] = useState(false);
  const [tradeResult, setTradeResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync with external selectedTeam prop
  useEffect(() => {
    if (externalSelectedTeam !== undefined) {
      setInternalSelectedTeam(externalSelectedTeam);
    }
  }, [externalSelectedTeam]);

  // Handle team selection
  const handleSelectTeam = (team: 0 | 1) => {
    setInternalSelectedTeam(team);
    onTeamChange?.(team);
  };

  const selectedTeam = internalSelectedTeam;

  const { isConnected } = useWallet();
  const { openConnectModal } = useConnectWalletModal();
  const {
    isTradingSessionComplete,
    getBalances,
    getPositionBalance,
    submitOrder,
    isSubmitting,
  } = useTrading();

  const market = getPrimaryMarket(event?.markets);
  const { prices, outcomes } = market ? parseMarketData(market) : { prices: [], outcomes: [] };

  const team1 = outcomes[0] || 'Team A';
  const team2 = outcomes[1] || 'Team B';
  const team1Price = prices[0] || 0.5;
  const team2Price = prices[1] || 0.5;

  // Get token IDs - parse if it's a JSON string
  const tokenIds = useMemo(() => {
    if (!market?.clobTokenIds) return [];
    if (Array.isArray(market.clobTokenIds)) return market.clobTokenIds;
    try {
      return JSON.parse(market.clobTokenIds);
    } catch {
      return [];
    }
  }, [market?.clobTokenIds]);
  const tokenId = tokenIds[selectedTeam];
  const token0 = tokenIds[0];

  // Get realtime price from WebSocket (only for team1, calculate team2 as 1 - team1)
  const { price: realtimePrice0, isConnected: isPriceConnected } = useRealtimePrice(token0);

  // Use realtime price if available, otherwise fallback to static price
  // Team2 price = 1 - Team1 price (they must sum to 1)
  const displayPrice0 = realtimePrice0 > 0 ? realtimePrice0 : team1Price;
  const displayPrice1 = realtimePrice0 > 0 ? (1 - realtimePrice0) : team2Price;
  const isPriceRealtime = isPriceConnected && realtimePrice0 > 0;

  // Fetch team logos
  const teamNames = useMemo(() => [team1, team2].filter(Boolean), [team1, team2]);
  const { logos: teamLogos } = useTeamLogos(teamNames);

  // Fetch trading balance
  const { data: tradingBalance = 0, refetch: refetchBalance } = useQuery({
    queryKey: ['TradeBoxBalance'],
    queryFn: async () => {
      try {
        const result = await getBalances();
        if (!result || !result.usdc) return 0;
        const balance = Number(formatUnits(BigInt(result.usdc), USDC_DECIMALS));
        return Number((Math.floor(balance * 100) / 100).toFixed(2));
      } catch {
        return 0;
      }
    },
    enabled: isTradingSessionComplete,
    refetchInterval: 5000,
  });

  // Fetch position balance
  const { data: positionBalance = 0, refetch: refetchPosition } = useQuery({
    queryKey: ['TradeBoxPosition', tokenId],
    queryFn: async () => {
      try {
        if (!tokenId) return 0;
        const balance = await getPositionBalance(tokenId);
        if (!balance) return 0;
        return Number((Math.floor(Number(balance) * 100) / 100).toFixed(2));
      } catch {
        return 0;
      }
    },
    enabled: isTradingSessionComplete && !!tokenId,
    refetchInterval: 5000,
  });

  // Price calculations - use realtime prices
  const marketPrice = selectedTeam === 0 ? displayPrice0 : displayPrice1;
  const effectivePrice = tradeMode === 'limit' && limitPrice
    ? parseFloat(limitPrice) / 100
    : marketPrice;

  const inputAmount = amount || 0;
  const numShares = orderAction === 'buy'
    ? (effectivePrice > 0 ? inputAmount / effectivePrice : 0)
    : inputAmount;

  // Potential profit calculation
  const potentialPayout = numShares;
  const potentialProfit = potentialPayout - inputAmount;
  const returnPercent = inputAmount > 0 ? (potentialProfit / inputAmount) * 100 : 0;

  const selectedOutcome = selectedTeam === 0 ? team1 : team2;

  const handleTrade = useCallback(async () => {
    if (!isConnected) {
      openConnectModal();
      return;
    }

    if (!isTradingSessionComplete) {
      setTradeResult({ success: false, message: 'Initializing trading...' });
      return;
    }

    if (!tokenId || !amount || amount <= 0) {
      setTradeResult({ success: false, message: 'Enter a valid amount' });
      return;
    }

    setIsTrading(true);
    setTradeResult(null);

    try {
      const isMarketOrder = tradeMode === 'market';
      let price: number | undefined;
      let size: number;

      if (isMarketOrder) {
        size = amount;
      } else {
        price = parseFloat(limitPrice) / 100;
        if (isNaN(price) || price <= 0 || price >= 1) {
          setTradeResult({ success: false, message: 'Price must be between 1¢ and 99¢' });
          setIsTrading(false);
          return;
        }

        if (orderAction === 'buy') {
          size = amount / price;
        } else {
          size = amount;
        }
      }

      const result = await submitOrder({
        tokenId,
        size,
        price,
        side: orderAction === 'buy' ? 'BUY' : 'SELL',
        negRisk: market?.negRisk ?? false,
        isMarketOrder,
        tickSize: market?.tickSize || '0.01',
      });

      if (result.success) {
        setTradeResult({ success: true, message: 'Order placed!' });
        setAmount(0);
        setTimeout(() => {
          refetchBalance();
          refetchPosition();
        }, 3000);
      } else {
        setTradeResult({ success: false, message: 'Order failed' });
      }
    } catch (err) {
      setTradeResult({
        success: false,
        message: err instanceof Error ? err.message : 'Order failed',
      });
    } finally {
      setIsTrading(false);
    }
  }, [
    isConnected,
    isTradingSessionComplete,
    tokenId,
    amount,
    tradeMode,
    limitPrice,
    orderAction,
    market?.negRisk,
    market?.tickSize,
    submitOrder,
    openConnectModal,
    refetchBalance,
    refetchPosition,
  ]);

  if (!event) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
        <div className="text-center text-[var(--text-secondary)] py-8">
          Select a match to place a bet
        </div>
      </div>
    );
  }


  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/50">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold truncate">{market?.groupItemTitle}</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Buy/Sell & Market/Limit Toggle */}
        <div className="flex gap-2">
          <div className="flex flex-1 rounded-xl bg-[var(--bg-secondary)] p-1">
            <button
              onClick={() => setOrderAction('buy')}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                orderAction === 'buy'
                  ? 'bg-[var(--win-green)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setOrderAction('sell')}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                orderAction === 'sell'
                  ? 'bg-[var(--loss-red)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Sell
            </button>
          </div>
          <div className="flex rounded-xl bg-[var(--bg-secondary)] p-1">
            <button
              onClick={() => setTradeMode('market')}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                tradeMode === 'market'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Market
            </button>
            <button
              onClick={() => setTradeMode('limit')}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                tradeMode === 'limit'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Limit
            </button>
          </div>
        </div>

        {/* Team Selection */}
        <div>

          <div className="grid grid-cols-2 gap-2">
            {[0, 1].map((idx) => {
              const team = idx === 0 ? team1 : team2;
              const price = idx === 0 ? displayPrice0 : displayPrice1;
              const cents = (price * 100).toFixed(1);
              const isSelected = selectedTeam === idx;
              const teamColor = idx === 0 ? '#00b8ff' : '#5c6c8a';

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectTeam(idx as 0 | 1)}
                  className={`p-3 rounded-xl border transition-all ${
                    isSelected
                      ? idx === 0
                        ? 'border-[#00b8ff] bg-[#00b8ff]/10'
                        : 'border-[#5c6c8a] bg-[#5c6c8a]/10'
                      : 'border-[var(--border-default)] hover:border-[var(--border-hover)]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs overflow-hidden bg-[var(--bg-elevated)] mx-auto mb-2">
                    {teamLogos[team] ? (
                      <Image
                        src={teamLogos[team]!}
                        alt={team}
                        width={40}
                        height={40}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : event.image ? (
                      <Image
                        src={event.image}
                        alt={team}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getTeamInitials(team)
                    )}
                  </div>
                  <div className="font-semibold text-sm text-[var(--text-primary)] truncate">{team}</div>
                  <div className="text-lg font-bold" style={{ color: teamColor }}>{cents}¢</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Limit Price Input */}
        {tradeMode === 'limit' && (
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
              Limit Price
            </label>
            <div className="relative">
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder={(marketPrice * 100).toFixed(0)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">¢</span>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-[var(--text-secondary)]">
              {orderAction === 'buy' ? 'Amount (USDC)' : 'Shares'}
            </label>
            {isTradingSessionComplete && (
              <span className="text-xs text-[var(--text-muted)]">
                {orderAction === 'buy'
                  ? `Balance: $${tradingBalance}`
                  : `Position: ${formatNumberBalance(positionBalance, 2)}`}
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
            <input
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full px-4 pl-8 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
            />
          </div>
          <div className="flex gap-2 mt-2">
            {(orderAction === 'buy' ? [10, 25, 50, 100] : [25, 50, 75, 100]).map((val) => (
              <button
                key={val}
                onClick={() => {
                  if (orderAction === 'buy') {
                    setAmount(val);
                  } else {
                    setAmount(Number(((positionBalance * val) / 100).toFixed(2)));
                  }
                }}
                className="flex-1 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                {orderAction === 'buy' ? `$${val}` : `${val}%`}
              </button>
            ))}
            <button
              onClick={() => {
                setAmount(orderAction === 'buy' ? tradingBalance : positionBalance);
              }}
              className="flex-1 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Max
            </button>
          </div>
        </div>

        {/* Summary - only show when amount > 0 */}
        {inputAmount > 0 && (
          <div className="rounded-xl bg-[var(--bg-secondary)] p-4 space-y-2">
            {orderAction === 'buy' ? (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Potential Return</span>
                <span className="text-[var(--win-green)] font-semibold">
                  ${formatNumberBalance(potentialPayout, 2)}
                  <span className="text-xs ml-1 opacity-70">
                    (+{formatNumberBalance(returnPercent, 0)}%)
                  </span>
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-sm ">
                  <span className="text-[var(--text-secondary)]">You&apos;ll receive</span>
                  <span className="text-[var(--win-green)] font-semibold">
                    ${formatNumberBalance(amount * effectivePrice, 2)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Trade Result Message */}
        {tradeResult && (
          <div
            className={`rounded-xl p-3 text-sm font-medium ${
              tradeResult.success
                ? 'border border-[var(--win-green)]/30 bg-[var(--win-green)]/10 text-[var(--win-green)]'
                : 'border border-[var(--loss-red)]/30 bg-[var(--loss-red)]/10 text-[var(--loss-red)]'
            }`}
          >
            {tradeResult.message}
          </div>
        )}

        {/* Trade Button */}
        <button
          onClick={handleTrade}
          disabled={isTrading || isSubmitting}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-center transition-all ${
            isTrading || isSubmitting
              ? 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed'
              : 'bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90'
          }`}
        >
          {isTrading || isSubmitting
            ? 'Processing...'
            : !isConnected
              ? 'Connect Wallet'
              : `Trade`}
        </button>
      </div>
    </div>
  );
}
