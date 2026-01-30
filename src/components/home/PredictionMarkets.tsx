'use client';

import { useState, useEffect, useMemo } from 'react';
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

// Get team initials for logo placeholder
const getTeamInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
};

// Format start time for display
const formatStartTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // If less than 24 hours, show time
  if (diffHours < 24 && diffHours > 0) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  // If less than 7 days, show day and time
  if (diffDays < 7 && diffDays > 0) {
    return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // Otherwise show date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Check if event is live based on gameStartTime, closed, ended, endDate
const isEventLive = (event: PolymarketEvent) => {
  if (event.closed) return false;
  const gameStartTime = event.markets?.[0]?.gameStartTime;
  if (!gameStartTime) return false;
  const now = new Date();
  if (now < new Date(gameStartTime)) return false;
  if (event.endDate && now > new Date(event.endDate)) return false;
  return true;
};

// Sort events: live first, then upcoming (by gameStartTime soonest), then by volume
const sortEvents = (events: PolymarketEvent[]): PolymarketEvent[] => {
  return [...events].sort((a, b) => {
    const aLive = isEventLive(a);
    const bLive = isEventLive(b);

    // Live first
    if (aLive && !bLive) return -1;
    if (!aLive && bLive) return 1;

    // Then upcoming (has gameStartTime in the future), soonest first
    const aTime = a.markets?.[0]?.gameStartTime;
    const bTime = b.markets?.[0]?.gameStartTime;
    const now = Date.now();
    const aUpcoming = !aLive && aTime && new Date(aTime).getTime() > now;
    const bUpcoming = !bLive && bTime && new Date(bTime).getTime() > now;

    if (aUpcoming && !bUpcoming) return -1;
    if (!aUpcoming && bUpcoming) return 1;
    if (aUpcoming && bUpcoming) {
      return new Date(aTime!).getTime() - new Date(bTime!).getTime();
    }

    // Then by volume
    return (b.volume || 0) - (a.volume || 0);
  });
};

export default function PredictionMarkets() {
  const [events, setEvents] = useState<PolymarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/polymarket/events?all_esports=true&limit=10');
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        const data = await response.json();
        setEvents(sortEvents(data));
      } catch (err) {
        console.log('err',err)
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Extract all team names from events for logo fetching
  const teamNames = useMemo(() => {
    const names: string[] = [];
    events.forEach((event) => {
      const market = event.markets?.[0];
      if (market) {
        const { outcomes } = parseMarketData(market);
        outcomes.forEach((outcome) => {
          if (outcome && !names.includes(outcome)) {
            names.push(outcome);
          }
        });
      }
    });
    return names;
  }, [events]);

  // Fetch team logos
  const { logos: teamLogos } = useTeamLogos(teamNames);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-[var(--text-primary)]">Prediction Markets</h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">Active esports events you can trade on</p>
        </div>
        <Link
          href="/markets"
          className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-[#00b8ff] hover:bg-[#00b8ff]/10 transition-all shrink-0"
        >
          View All →
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-20 rounded bg-[var(--bg-elevated)]" />
                <div className="h-5 w-16 rounded bg-[var(--bg-elevated)]" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)]" />
                  <div className="flex-1 h-4 rounded bg-[var(--bg-elevated)]" />
                  <div className="w-14 h-6 rounded bg-[var(--bg-elevated)]" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)]" />
                  <div className="flex-1 h-4 rounded bg-[var(--bg-elevated)]" />
                  <div className="w-14 h-6 rounded bg-[var(--bg-elevated)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-2xl border border-[var(--loss-red)]/30 bg-[var(--bg-card)] p-8 text-center">
          <div className="text-lg font-semibold text-[var(--text-primary)] mb-1">Failed to Load</div>
          <div className="text-[var(--text-secondary)]">{error}</div>
        </div>
      )}

      {/* Match Cards Grid */}
      {!loading && !error && events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event) => {
            const market = event.markets?.[0];
            const { prices, outcomes } = market ? parseMarketData(market) : { prices: [], outcomes: [] };
            const team1 = outcomes[0] || 'Team A';
            const team2 = outcomes[1] || 'Team B';
            const team1Price = prices[0] || 0.5;
            const team2Price = prices[1] || 0.5;
            const team1Percent = (team1Price * 100).toFixed(0);
            const team2Percent = (team2Price * 100).toFixed(0);
            const gameStartTime = market?.gameStartTime;
            const isLive = isEventLive(event);

            return (
              <Link
                key={event.id}
                href={`/event/${event.slug}`}
                className="group block rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--border-hover)] hover:shadow-md transition-all overflow-hidden"
              >
                {/* Card Header */}
                <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {event.image && (
                      <div className="relative w-5 h-5 rounded overflow-hidden shrink-0">
                        <Image src={event.image} alt="" fill className="object-cover" />
                      </div>
                    )}
                    <span className="text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] truncate">
                      {event.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)]">
                      {formatVolume(event.volume || 0)}
                    </span>
                    {isLive ? (
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

                {/* Match Content */}
                <div className="p-3 sm:p-5">
                  {market && prices.length >= 2 ? (
                    <div className="space-y-2 sm:space-y-3">
                      {/* Team 1 */}
                      <div className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-xl transition-colors bg-[var(--bg-secondary)]">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-sm overflow-hidden bg-[var(--bg-elevated)] shrink-0">
                          {teamLogos[team1] ? (
                            <Image
                              src={teamLogos[team1]!}
                              alt={team1}
                              width={48}
                              height={48}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : event.image ? (
                            <Image
                              src={event.image}
                              alt={team1}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getTeamInitials(team1)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm sm:text-base truncate text-[var(--text-primary)]">
                            {team1}
                          </div>
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-[#00b8ff]">
                          {team1Percent}%
                        </div>
                      </div>

                      {/* VS Divider */}
                      <div className="flex items-center gap-3 px-3">
                        <div className="flex-1 h-px bg-[var(--border-default)]" />
                        <span className="text-xs font-medium text-[var(--text-muted)]">VS</span>
                        <div className="flex-1 h-px bg-[var(--border-default)]" />
                      </div>

                      {/* Team 2 */}
                      <div className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-xl transition-colors bg-[var(--bg-secondary)]">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-sm overflow-hidden bg-[var(--bg-elevated)] shrink-0">
                          {teamLogos[team2] ? (
                            <Image
                              src={teamLogos[team2]!}
                              alt={team2}
                              width={48}
                              height={48}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : event.image ? (
                            <Image
                              src={event.image}
                              alt={team2}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getTeamInitials(team2)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm sm:text-base truncate text-[var(--text-primary)]">
                            {team2}
                          </div>
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-[#5c6c8a]">
                          {team2Percent}%
                        </div>
                      </div>

                      {/* Odds Bar */}
                      <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden flex mt-2">
                        <div
                          className="h-full bg-[#00b8ff] transition-all duration-500"
                          style={{ width: `${team1Percent}%` }}
                        />
                        <div
                          className="h-full bg-[#5c6c8a] transition-all duration-500"
                          style={{ width: `${team2Percent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-[var(--text-muted)]">
                      No market data available
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && events.length === 0 && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-12 text-center">
          <div className="text-xl font-bold text-[var(--text-primary)] mb-2">No Active Markets</div>
          <div className="text-[var(--text-secondary)]">Check back later for new prediction markets.</div>
        </div>
      )}
    </section>
  );
}
