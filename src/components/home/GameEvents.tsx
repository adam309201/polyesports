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
  clobTokenIds: string[];
  gameStartTime?: string;
  sportsMarketType?: string;
}

interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  endDate: string;
  image: string;
  active: boolean;
  closed: boolean;
  ended?: boolean;
  volume: number;
  markets: Market[];
}

// Game tag configs for Polymarket API
const GAME_TAGS = [
  { tagId: '100780', excludeTagId: '100639' }, // CS2
  { tagId: '102366', excludeTagId: '' },        // Dota 2
  { tagId: '65', excludeTagId: '' },            // LoL
  { tagId: '101672', excludeTagId: '' },        // Valorant
];

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
  } catch { prices = []; }
  try {
    if (typeof market.outcomes === 'string') {
      outcomes = JSON.parse(market.outcomes);
    } else if (Array.isArray(market.outcomes)) {
      outcomes = market.outcomes;
    }
  } catch { outcomes = ['Yes', 'No']; }
  return { prices, outcomes };
};

const getTeamInitials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);

const formatStartTime = (dateString: string) => {
  const date = new Date(dateString);
  const diffMs = date.getTime() - Date.now();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffHours > 0 && diffHours < 24) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (diffDays > 0 && diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const isGameLive = (t: string | undefined) => t ? new Date() >= new Date(t) : false;

const getMoneylineMarket = (markets: Market[] | undefined): Market | undefined => {
  if (!markets || markets.length === 0) return undefined;
  const ml = markets.find(m => m.sportsMarketType === 'moneyline');
  if (ml) return ml;
  return markets.find(m => {
    const { outcomes } = parseMarketData(m);
    if (outcomes.length !== 2) return false;
    const skip = ['yes', 'no', 'over', 'under', 'draw', 'tie'];
    return !outcomes.some(o => skip.includes(o.toLowerCase().trim()));
  }) || markets[0];
};

const isYesNoMarket = (outcomes: string[]) => {
  if (outcomes.length !== 2) return false;
  const lower = outcomes.map(o => o.toLowerCase().trim());
  return lower.includes('yes') && lower.includes('no');
};

const isEventEnded = (e: PolymarketEvent) =>
  e.closed || e.ended || (e.endDate && new Date(e.endDate) < new Date());

export default function GameEvents() {
  const [events, setEvents] = useState<PolymarketEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const results = await Promise.all(
        GAME_TAGS.map(async (g) => {
          const params = new URLSearchParams({ tag_id: g.tagId, closed: 'false', ended: 'false', limit: '6' });
          if (g.excludeTagId) params.set('exclude_tag_id', g.excludeTagId);
          try {
            const res = await fetch(`/api/polymarket/events?${params}`);
            if (!res.ok) return [];
            return res.json();
          } catch { return []; }
        })
      );

      // Merge, deduplicate by id, filter ended, sort by volume
      const all: PolymarketEvent[] = results.flat();
      const unique = Array.from(new Map(all.map(e => [e.id, e])).values());
      const filtered = unique
        .filter(e => !isEventEnded(e))
        .sort((a, b) => (b.volume || 0) - (a.volume || 0));

      setEvents(filtered);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const teamNames = useMemo(() => {
    const names: string[] = [];
    events.forEach(e => {
      const m = getMoneylineMarket(e.markets);
      if (m) {
        const { outcomes } = parseMarketData(m);
        outcomes.forEach(o => { if (o && !names.includes(o)) names.push(o); });
      }
    });
    return names;
  }, [events]);

  const { logos: teamLogos } = useTeamLogos(teamNames);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-[var(--text-primary)]">Game Events</h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">Browse upcoming and live matches across all games</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)]" />
                <div className="flex-1 h-4 rounded bg-[var(--bg-elevated)]" />
              </div>
              <div className="h-1 rounded-full bg-[var(--bg-elevated)] my-2" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)]" />
                <div className="flex-1 h-4 rounded bg-[var(--bg-elevated)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Events Grid */}
      {!loading && events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(event => {
            const market = getMoneylineMarket(event.markets);
            const { prices, outcomes } = market ? parseMarketData(market) : { prices: [], outcomes: [] };
            const team1 = outcomes[0] || 'Team A';
            const team2 = outcomes[1] || 'Team B';
            const t1Pct = ((prices[0] || 0.5) * 100).toFixed(0);
            const t2Pct = ((prices[1] || 0.5) * 100).toFixed(0);
            const startTime = market?.gameStartTime;
            const live = isGameLive(startTime);
            const endTime = event.endDate;

            return (
              <Link key={event.id} href={`/event/${event.slug}`}
                className="group block rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--border-hover)] hover:shadow-md transition-all overflow-hidden">
                {/* Header */}
                <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    {event.image && (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded overflow-hidden flex-shrink-0">
                        <Image src={event.image} alt="" width={32} height={32} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] line-clamp-2 leading-tight">{event.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">{formatVolume(event.volume || 0)} Vol.</span>
                    {live ? (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--live-red)]/10 text-[var(--live-red)] text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-[var(--live-red)] rounded-full animate-live-pulse" />LIVE
                      </span>
                    ) : endTime ? (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[10px] font-medium">
                        Ends {formatStartTime(endTime)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Market Body */}
                <div className="p-3 sm:p-4">
                  {market && prices.length >= 2 ? (
                    isYesNoMarket(outcomes) ? (() => {
                      const yesIdx = outcomes.findIndex(o => o.toLowerCase().trim() === 'yes');
                      const noIdx = outcomes.findIndex(o => o.toLowerCase().trim() === 'no');
                      const yesPct = ((prices[yesIdx] || 0.5) * 100).toFixed(0);
                      const noPct = ((prices[noIdx] || 0.5) * 100).toFixed(0);
                      return (
                        <div className="flex gap-3">
                          <div className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-center">
                            <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">Yes</div>
                            <div className="text-lg font-bold text-[#00b8ff]">{yesPct}%</div>
                          </div>
                          <div className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-center">
                            <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">No</div>
                            <div className="text-lg font-bold text-[#5c6c8a]">{noPct}%</div>
                          </div>
                        </div>
                      );
                    })() : (
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs overflow-hidden bg-[var(--bg-elevated)] flex-shrink-0">
                            {teamLogos[team1] ? (
                              <Image src={teamLogos[team1]!} alt={team1} width={40} height={40} className="w-full h-full object-contain p-1" />
                            ) : <span className="text-[var(--text-muted)]">{getTeamInitials(team1)}</span>}
                          </div>
                          <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate text-[var(--text-primary)]">{team1}</div></div>
                          <div className="text-lg font-bold text-[#00b8ff]">{t1Pct}%</div>
                        </div>
                        <div className="h-1 rounded-full bg-[var(--bg-elevated)] overflow-hidden flex my-2">
                          <div className="h-full bg-[#00b8ff] transition-all duration-500" style={{ width: `${t1Pct}%` }} />
                          <div className="h-full bg-[#5c6c8a] transition-all duration-500" style={{ width: `${t2Pct}%` }} />
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs overflow-hidden bg-[var(--bg-elevated)] flex-shrink-0">
                            {teamLogos[team2] ? (
                              <Image src={teamLogos[team2]!} alt={team2} width={40} height={40} className="w-full h-full object-contain p-1" />
                            ) : <span className="text-[var(--text-muted)]">{getTeamInitials(team2)}</span>}
                          </div>
                          <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate text-[var(--text-primary)]">{team2}</div></div>
                          <div className="text-lg font-bold text-[#5c6c8a]">{t2Pct}%</div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-4 text-[var(--text-muted)] text-sm">No market data</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Empty */}
      {!loading && events.length === 0 && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-12 text-center">
          <div className="text-xl font-bold text-[var(--text-primary)] mb-2">No Active Markets</div>
          <div className="text-[var(--text-secondary)]">Check back later for new prediction markets.</div>
        </div>
      )}
    </section>
  );
}
