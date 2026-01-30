'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTeamLogos } from '@/hooks/useTeamLogos';

interface Market {
  id: string;
  question: string;
  outcomes: string[] | string;
  outcomePrices: string[] | string;
  volumeNum: number;
  liquidityNum: number;
  bestBid: number;
  bestAsk: number;
  lastTradePrice: number;
  clobTokenIds: string[];
  gameStartTime?: string;
  sportsMarketType?: string;
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

interface EventsListProps {
  events: PolymarketEvent[];
  selectedEvent: PolymarketEvent | null;
  onSelectEvent: (event: PolymarketEvent, outcomeIndex: 0 | 1) => void;
  selectedOutcomeIndex?: 0 | 1;
  isFinished?: boolean;
}

const formatVolume = (vol: number) => {
  if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}M`;
  if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}K`;
  return `$${vol.toFixed(0)}`;
};

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

const getTeamInitials = (name: string) => {
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 3);
};

const formatStartTime = (dateString: string) => {
  const date = new Date(dateString);
  const diffMs = date.getTime() - Date.now();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours > 0 && diffHours < 24) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays > 0 && diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const isGameLive = (gameStartTime: string | undefined) => {
  if (!gameStartTime) return false;
  return new Date() >= new Date(gameStartTime);
};

const isTeamBasedMarket = (market: Market) => {
  const { outcomes } = parseMarketData(market);
  if (outcomes.length !== 2) return false;
  const skip = ['yes', 'no', 'over', 'under', 'draw', 'tie'];
  return !outcomes.some(o => skip.includes(o.toLowerCase().trim()));
};

const getMoneylineMarket = (markets: Market[] | undefined): Market | undefined => {
  if (!markets || markets.length === 0) return undefined;
  const ml = markets.find(m => m.sportsMarketType === 'moneyline');
  if (ml) return ml;
  return markets.find(m => {
    const q = m.question.toLowerCase();
    if (/map\s*\d+/i.test(q)) return false;
    if (q.includes('handicap') || /[+-]\d+\.?\d*/.test(q)) return false;
    if (q.includes('total') || q.includes('over') || q.includes('under') ||
        q.includes('kills') || q.includes('rounds') || q.includes('first blood') ||
        q.includes('pistol')) return false;
    return isTeamBasedMarket(m);
  }) || markets.find(m => isTeamBasedMarket(m)) || markets[0];
};

export default function EventsList({ events, selectedEvent, onSelectEvent, selectedOutcomeIndex = 0, isFinished = false }: EventsListProps) {
  const teamNames = useMemo(() => {
    const names: string[] = [];
    events.forEach((event) => {
      const market = getMoneylineMarket(event.markets);
      if (market) {
        const { outcomes } = parseMarketData(market);
        outcomes.forEach((o) => { if (o && !names.includes(o)) names.push(o); });
      }
    });
    return names;
  }, [events]);

  const { logos: teamLogos } = useTeamLogos(teamNames);

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-12 text-center">
        <div className="text-xl font-bold text-[var(--text-primary)] mb-2">No Events</div>
        <div className="text-[var(--text-secondary)]">No active markets for this game.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const displayMarket = getMoneylineMarket(event.markets);
        const { prices, outcomes } = displayMarket ? parseMarketData(displayMarket) : { prices: [], outcomes: [] };
        const team1 = outcomes[0] || 'Team A';
        const team2 = outcomes[1] || 'Team B';
        const team1Price = prices[0] || 0.5;
        const team2Price = prices[1] || 0.5;
        const team1Percent = (team1Price * 100).toFixed(0);
        const team2Percent = (team2Price * 100).toFixed(0);

        const gameStartTime = displayMarket?.gameStartTime;
        const isLive = isGameLive(gameStartTime);
        const isSelected = selectedEvent?.id === event.id;

        return (
          <div
            key={event.id}
            className={`rounded-2xl border bg-[var(--bg-card)] transition-all ${
              isSelected
                ? 'border-[var(--border-hover)] shadow-md'
                : 'border-[var(--border-default)] hover:border-[var(--border-hover)]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2">
              <Link href={`/event/${event.slug}`} className="hover:underline text-xs sm:text-base font-medium truncate max-w-[200px] sm:max-w-[400px]">
                {event.title}
              </Link>
              <div className="flex items-center  gap-2">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  {formatVolume(event.volume || 0)}
                </span>
                {isFinished ? (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--text-muted)]/10 text-[var(--text-muted)] text-[10px] font-bold">
                    FINISHED
                  </span>
                ) : isLive ? (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--live-red)]/10 text-[var(--live-red)] text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[var(--live-red)] rounded-full animate-live-pulse" />
                    LIVE
                  </span>
                ) : gameStartTime ? (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[10px] font-medium">
                    {formatStartTime(gameStartTime)}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Teams */}
            <div className="px-4 pb-3 mt-3">
              {displayMarket && prices.length >= 2 && (
                <div className="flex items-center gap-3">
                  {/* Team 1 */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs overflow-hidden bg-[var(--bg-elevated)] flex-shrink-0">
                      {teamLogos[team1] ? (
                        <Image src={teamLogos[team1]!} alt={team1} width={40} height={40} className="w-full h-full object-contain p-1" />
                      ) : event.image ? (
                        <Image src={event.image} alt={team1} width={40} height={40} className="w-full h-full object-cover" />
                      ) : (
                        getTeamInitials(team1)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate text-[var(--text-primary)]">{team1}</div>
                      {isFinished ? (
                        <div className={`text-sm font-bold ${team1Price > 0.99 ? 'text-[var(--win-green)]' : 'text-[var(--text-muted)]'}`}>
                          {team1Price > 0.99 ? 'Winner' : 'Lost'}
                        </div>
                      ) : (
                        <div className="text-lg font-bold text-[#00b8ff]">{team1Percent}¢</div>
                      )}
                    </div>
                  </div>

                  {/* VS */}
                  <div className="text-xs font-medium text-[var(--text-muted)] px-2">VS</div>

                  {/* Team 2 */}
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate text-[var(--text-primary)]">{team2}</div>
                      {isFinished ? (
                        <div className={`text-sm font-bold ${team2Price > 0.99 ? 'text-[var(--win-green)]' : 'text-[var(--text-muted)]'}`}>
                          {team2Price > 0.99 ? 'Winner' : 'Lost'}
                        </div>
                      ) : (
                        <div className="text-lg font-bold text-[#5c6c8a]">{team2Percent}¢</div>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs overflow-hidden bg-[var(--bg-elevated)] flex-shrink-0">
                      {teamLogos[team2] ? (
                        <Image src={teamLogos[team2]!} alt={team2} width={40} height={40} className="w-full h-full object-contain p-1" />
                      ) : event.image ? (
                        <Image src={event.image} alt={team2} width={40} height={40} className="w-full h-full object-cover" />
                      ) : (
                        getTeamInitials(team2)
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Outcome Buttons + View */}
            {displayMarket && prices.length >= 2 && (
              <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={() => onSelectEvent(event, 0)}
                  className={`flex-1 flex justify-center gap-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                    isSelected && selectedOutcomeIndex === 0
                      ? 'bg-[#00b8ff] text-white'
                      : 'bg-[#00b8ff]/10 text-[#00b8ff] hover:bg-[#00b8ff]/20'
                  }`}
                >
                  <span className={'truncate max-w-16'}>{team1}</span> {team1Percent}¢
                </button>
                <button
                  onClick={() => onSelectEvent(event, 1)}
                  className={`flex-1 flex justify-center gap-1 items-center py-3 rounded-lg text-sm font-semibold transition-all ${
                    isSelected && selectedOutcomeIndex === 1
                      ? 'bg-[#5c6c8a] text-white'
                      : 'bg-[#5c6c8a]/10 text-[#5c6c8a] hover:bg-[#5c6c8a]/20'
                  }`}
                >
                  <span className={'truncate max-w-16'}>{team2}</span> {team2Percent}¢
                </button>
                <Link
                  href={`/event/${event.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-3 py-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center"
                  title="Game View"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
