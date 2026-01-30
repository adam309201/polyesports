'use client';

import {useState, useEffect, useMemo} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {useTeamLogos} from '@/hooks/useTeamLogos';

// --- Types ---

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
  startDate: string;
  endDate: string;
  image: string;
  active: boolean;
  closed: boolean;
  ended?: boolean;
  volume: number;
  markets: Market[];
  _seriesId?: number;
  _gameSlug?: string;
}

interface EsportsGame {
  id: number;
  name: string;
  slug: string;
  image: string;
  seriesId: number;
}

// --- Helpers ---

const EVENTS_PER_PAGE = 24;

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
  return {prices, outcomes};
};

const getTeamInitials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);

const formatStartTime = (dateString: string) => {
  const date = new Date(dateString);
  const diffMs = date.getTime() - Date.now();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffHours > 0 && diffHours < 24) return date.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
  if (diffDays > 0 && diffDays < 7) return date.toLocaleDateString('en-US', {weekday: 'short', hour: '2-digit', minute: '2-digit'});
  return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
};

const isGameLive = (t: string | undefined) => t ? new Date() >= new Date(t) : false;

const getMoneylineMarket = (markets: Market[] | undefined): Market | undefined => {
  if (!markets || markets.length === 0) return undefined;
  const ml = markets.find(m => m.sportsMarketType === 'moneyline');
  if (ml) return ml;
  return markets.find(m => {
    const {outcomes} = parseMarketData(m);
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

// --- Component ---

export default function TournamentsPage() {
  const [events, setEvents] = useState<PolymarketEvent[]>([]);
  const [games, setGames] = useState<EsportsGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch games + events
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [gamesRes, eventsRes] = await Promise.all([
          fetch('/api/polymarket/sports'),
          fetch('/api/polymarket/events?all_esports=true&limit=200'),
        ]);

        let gamesData: EsportsGame[] = [];
        if (gamesRes.ok) {
          gamesData = await gamesRes.json();
          setGames(gamesData);
        }

        if (eventsRes.ok) {
          const eventsData: PolymarketEvent[] = await eventsRes.json();
          // Build seriesId -> gameSlug map
          const seriesToSlug: Record<number, string> = {};
          gamesData.forEach(g => { if (g.seriesId) seriesToSlug[g.seriesId] = g.slug; });
          // Tag each event with _gameSlug
          const tagged = eventsData.map(e => ({
            ...e,
            _gameSlug: e._seriesId ? seriesToSlug[e._seriesId] || undefined : undefined,
          }));
          setEvents(tagged);
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Games with events
  const gamesWithEvents = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => { if (e._gameSlug) counts[e._gameSlug] = (counts[e._gameSlug] || 0) + 1; });
    return games.filter(g => (counts[g.slug] || 0) > 0).map(g => ({...g, eventCount: counts[g.slug] || 0}));
  }, [games, events]);

  // Team names for logos
  const teamNames = useMemo(() => {
    const names: string[] = [];
    events.forEach(e => {
      const m = getMoneylineMarket(e.markets);
      if (m) {
        const {outcomes} = parseMarketData(m);
        outcomes.forEach(o => { if (o && !names.includes(o)) names.push(o); });
      }
    });
    return names;
  }, [events]);

  const {logos: teamLogos} = useTeamLogos(teamNames);

  // Filter by game first
  const gameFilteredEvents = useMemo(() => {
    if (activeGame === 'all') return events;
    return events.filter(e => e._gameSlug === activeGame);
  }, [events, activeGame]);

  // Apply search
  const filteredEvents = useMemo(() => {
    let filtered = gameFilteredEvents;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => {
        if (e.title.toLowerCase().includes(q)) return true;
        const m = getMoneylineMarket(e.markets);
        if (m) {
          const {outcomes} = parseMarketData(m);
          if (outcomes.some(o => o.toLowerCase().includes(q))) return true;
        }
        return false;
      });
    }

    return filtered;
  }, [gameFilteredEvents, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedEvents = filteredEvents.slice(
    (safeCurrentPage - 1) * EVENTS_PER_PAGE,
    safeCurrentPage * EVENTS_PER_PAGE
  );

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeGame, searchQuery]);

  // Page numbers
  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push('...');
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeCurrentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">Tournaments</h1>
        <p className="text-[var(--text-secondary)]">All esports prediction markets across every game</p>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-6">
        {/* Game Tabs */}
        <div className="px-5 py-3 border-b border-[var(--border-default)] overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            <button
              onClick={() => setActiveGame('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeGame === 'all'
                  ? 'bg-[var(--text-primary)] text-[var(--bg-card)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              All Games
              <span className={`ml-1.5 text-[10px] ${activeGame === 'all' ? 'opacity-60' : 'text-[var(--text-muted)]'}`}>
                {events.length}
              </span>
            </button>
            {gamesWithEvents.map(game => (
              <button
                key={game.id}
                onClick={() => setActiveGame(game.slug)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeGame === game.slug
                    ? 'bg-[#00b8ff] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                {game.image && (
                  <Image src={game.image} alt={game.name} width={14} height={14} className="w-3.5 h-3.5 rounded object-cover"/>
                )}
                {game.name}
                <span className={`text-[10px] ${activeGame === game.slug ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>
                  {game.eventCount}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-5 py-3">
          <div className="relative w-full sm:w-72">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              placeholder="Search teams or events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#00b8ff] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results info */}
      {!loading && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {filteredEvents.length === 0 ? 0 : (safeCurrentPage - 1) * EVENTS_PER_PAGE + 1}–{Math.min(safeCurrentPage * EVENTS_PER_PAGE, filteredEvents.length)} of {filteredEvents.length} events
          </p>
          {(activeGame !== 'all' || searchQuery) && (
            <button
              onClick={() => { setActiveGame('all'); setSearchQuery(''); }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--live-red)] transition-colors flex items-center gap-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)]"/>
                <div className="flex-1 h-4 rounded bg-[var(--bg-elevated)]"/>
              </div>
              <div className="h-4 w-24 rounded bg-[var(--bg-elevated)] mb-4"/>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)]"/>
                <div className="flex-1 h-4 rounded bg-[var(--bg-elevated)]"/>
              </div>
              <div className="h-1 rounded-full bg-[var(--bg-elevated)] my-2"/>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)]"/>
                <div className="flex-1 h-4 rounded bg-[var(--bg-elevated)]"/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Events Grid - GameEvents card style */}
      {!loading && paginatedEvents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedEvents.map(event => {
            const market = getMoneylineMarket(event.markets);
            const {prices, outcomes} = market ? parseMarketData(market) : {prices: [], outcomes: []};
            const team1 = outcomes[0] || 'Team A';
            const team2 = outcomes[1] || 'Team B';
            const t1Pct = ((prices[0] || 0.5) * 100).toFixed(0);
            const t2Pct = ((prices[1] || 0.5) * 100).toFixed(0);
            const startTime = market?.gameStartTime;
            const live = isGameLive(startTime);
            const endTime = event.endDate;

            return (
              <Link
                key={event.id}
                href={`/event/${event.slug}`}
                className="group block rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--border-hover)] hover:shadow-md transition-all overflow-hidden"
              >
                {/* Header */}
                <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    {event.image && (
                      <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                        <Image src={event.image} alt="" width={32} height={32} className="w-full h-full object-cover"/>
                      </div>
                    )}
                    <span className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 leading-tight">{event.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">{formatVolume(event.volume || 0)} Vol.</span>
                    {live ? (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--live-red)]/10 text-[var(--live-red)] text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-[var(--live-red)] rounded-full animate-live-pulse"/>LIVE
                      </span>
                    ) : endTime ? (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[10px] font-medium">
                        Ends {formatStartTime(endTime)}
                      </span>
                    ) : startTime ? (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[10px] font-medium">
                        {formatStartTime(startTime)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Market Body */}
                <div className="p-4">
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
                              <Image src={teamLogos[team1]!} alt={team1} width={40} height={40} className="w-full h-full object-contain p-1"/>
                            ) : <span className="text-[var(--text-muted)]">{getTeamInitials(team1)}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate text-[var(--text-primary)]">{team1}</div>
                          </div>
                          <div className="text-lg font-bold text-[#00b8ff]">{t1Pct}%</div>
                        </div>
                        <div className="h-1 rounded-full bg-[var(--bg-elevated)] overflow-hidden flex my-2">
                          <div className="h-full bg-[#00b8ff] transition-all duration-500" style={{width: `${t1Pct}%`}}/>
                          <div className="h-full bg-[#5c6c8a] transition-all duration-500" style={{width: `${t2Pct}%`}}/>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs overflow-hidden bg-[var(--bg-elevated)] flex-shrink-0">
                            {teamLogos[team2] ? (
                              <Image src={teamLogos[team2]!} alt={team2} width={40} height={40} className="w-full h-full object-contain p-1"/>
                            ) : <span className="text-[var(--text-muted)]">{getTeamInitials(team2)}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate text-[var(--text-primary)]">{team2}</div>
                          </div>
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

      {/* Empty State */}
      {!loading && filteredEvents.length === 0 && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-12 text-center">
          <div className="text-xl font-bold text-[var(--text-primary)] mb-2">No Events Found</div>
          <div className="text-[var(--text-secondary)]">
            {searchQuery
              ? `No events found for "${searchQuery}"`
              : activeGame !== 'all'
                ? 'No active markets for this game'
                : 'Check back later for new prediction markets.'}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={safeCurrentPage === 1}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          {getPageNumbers().map((page, idx) =>
            page === '...' ? (
              <span key={`dots-${idx}`} className="px-2 text-[var(--text-muted)]">...</span>
            ) : (
              <button
                key={page}
                onClick={() => setCurrentPage(page as number)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                  safeCurrentPage === page
                    ? 'bg-[#00b8ff] text-white'
                    : 'border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                {page}
              </button>
            )
          )}

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage === totalPages}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
