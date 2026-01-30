'use client';

import {useState, useEffect, useMemo, Suspense} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
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
  tags: Array<{ id: string; slug: string; label: string }>;
  seriesSlug?: string;
  _seriesId?: number; // injected by API for game filtering
  _gameSlug?: string; // injected client-side for filtering
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

const isEventLive = (event: PolymarketEvent): boolean => {
  if (event.closed || event.ended) return false;
  const market = getMoneylineMarket(event.markets);
  const gameStartTime = market?.gameStartTime;
  if (!gameStartTime) return false;
  const now = new Date();
  if (now < new Date(gameStartTime)) return false;
  if (event.endDate && now > new Date(event.endDate)) return false;
  return true;
};

const isEventUpcoming = (event: PolymarketEvent): boolean => {
  if (event.closed || event.ended) return false;
  const market = getMoneylineMarket(event.markets);
  const gameStartTime = market?.gameStartTime;
  if (!gameStartTime) return true;
  return new Date() < new Date(gameStartTime);
};

const isTeamBasedMarket = (market: Market): boolean => {
  const {outcomes} = parseMarketData(market);
  if (outcomes.length !== 2) return false;
  const skip = ['yes', 'no', 'over', 'under', 'draw', 'tie'];
  return !outcomes.some(o => skip.includes(o.toLowerCase().trim()));
};

// Find the match-winner (moneyline) market, excluding map/handicap/total markets
const getMoneylineMarket = (markets: Market[] | undefined): Market | undefined => {
  if (!markets || markets.length === 0) return undefined;
  // Prefer sportsMarketType moneyline
  const ml = markets.find(m => m.sportsMarketType === 'moneyline');
  if (ml) return ml;
  // Find team-based series winner (not map, not handicap, not totals)
  const seriesWinner = markets.find(m => {
    const q = m.question.toLowerCase();
    if (/map\s*\d+/i.test(q)) return false;
    if (q.includes('handicap') || /[+-]\d+\.?\d*/.test(q)) return false;
    if (q.includes('total') || q.includes('over') || q.includes('under') ||
        q.includes('kills') || q.includes('rounds') || q.includes('first blood') ||
        q.includes('pistol')) return false;
    return isTeamBasedMarket(m);
  });
  if (seriesWinner) return seriesWinner;
  // Fallback: any team-based market
  return markets.find(m => isTeamBasedMarket(m)) || markets[0];
};

// --- Component ---

type StatusFilter = 'all' | 'live' | 'upcoming';
type SortOption = 'default' | 'volume_desc' | 'volume_asc' | 'newest';

export default function MatchesPage() {
  return (
    <Suspense>
      <MatchesContent />
    </Suspense>
  );
}

function MatchesContent() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<PolymarketEvent[]>([]);
  const [games, setGames] = useState<EsportsGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState(searchParams.get('game') || 'all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('upcoming');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Fetch games + events on mount
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
          // Tag each event with _gameSlug using _seriesId from API
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

  // Count events per game, filter out games with 0 events
  const gamesWithEvents = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => { if (e._gameSlug) counts[e._gameSlug] = (counts[e._gameSlug] || 0) + 1; });
    return games.filter(g => (counts[g.slug] || 0) > 0).map(g => ({...g, eventCount: counts[g.slug] || 0}));
  }, [games, events]);

  // Extract team names for logos
  const teamNames = useMemo(() => {
    const names: string[] = [];
    events.forEach(e => {
      const m = getMoneylineMarket(e.markets);
      if (m) {
        const {outcomes} = parseMarketData(m);
        outcomes.forEach(o => {
          if (o && !names.includes(o)) names.push(o);
        });
      }
    });
    return names;
  }, [events]);

  const {logos: teamLogos} = useTeamLogos(teamNames);

  // Step 1: Filter by game (used for status counts + further filtering)
  const gameFilteredEvents = useMemo(() => {
    if (activeGame === 'all') return events;
    return events.filter(e => e._gameSlug === activeGame);
  }, [events, activeGame]);

  // Stats based on game-filtered events
  const liveCount = useMemo(() =>
    gameFilteredEvents.filter(isEventLive).length,
  [gameFilteredEvents]);

  const upcomingCount = useMemo(() =>
    gameFilteredEvents.filter(isEventUpcoming).length,
  [gameFilteredEvents]);

  // Step 2: Apply status, search, sort on game-filtered events
  const filteredEvents = useMemo(() => {
    let filtered = gameFilteredEvents;

    // Status filter
    if (statusFilter === 'live') {
      filtered = filtered.filter(isEventLive);
    } else if (statusFilter === 'upcoming') {
      filtered = filtered.filter(isEventUpcoming);
    }

    // Search filter
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

    // Sort
    if (sortBy === 'volume_desc') {
      filtered = [...filtered].sort((a, b) => (b.volume || 0) - (a.volume || 0));
    } else if (sortBy === 'volume_asc') {
      filtered = [...filtered].sort((a, b) => (a.volume || 0) - (b.volume || 0));
    } else if (sortBy === 'newest') {
      filtered = [...filtered].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }

    return filtered;
  }, [gameFilteredEvents, statusFilter, sortBy, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedEvents = filteredEvents.slice(
    (safeCurrentPage - 1) * EVENTS_PER_PAGE,
    safeCurrentPage * EVENTS_PER_PAGE
  );

  // Reset page on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeGame, statusFilter, sortBy, searchQuery]);

  // Close sort dropdown on outside click
  useEffect(() => {
    if (!showSortDropdown) return;
    const handler = () => setShowSortDropdown(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showSortDropdown]);

  // Page numbers to show
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
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">Matches</h1>
        <p className="text-[var(--text-secondary)]">Browse and trade on esports prediction markets</p>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-6">
        {/* Row 1: Game tabs */}
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

        {/* Row 2: Status + Sort + Search */}
        <div className="px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Status Filters */}
          <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] rounded-lg p-1">
            {([
              {key: 'all' as StatusFilter, label: 'All', count: gameFilteredEvents.length},
              {key: 'live' as StatusFilter, label: 'Live', count: liveCount},
              {key: 'upcoming' as StatusFilter, label: 'Upcoming', count: upcomingCount},
            ]).map(item => (
              <button
                key={item.key}
                onClick={() => setStatusFilter(item.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  statusFilter === item.key
                    ? item.key === 'live'
                      ? 'bg-[var(--live-red)] text-white shadow-sm'
                      : 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {item.key === 'live' && (
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    statusFilter === 'live' ? 'bg-white' : 'bg-[var(--live-red)]'
                  } ${item.count > 0 ? 'animate-live-pulse' : ''}`}/>
                )}
                {item.label}
                <span className={`text-[10px] ${
                  statusFilter === item.key
                    ? item.key === 'live' ? 'text-white/70' : 'text-[var(--text-muted)]'
                    : 'text-[var(--text-muted)]'
                }`}>
                  {item.count}
                </span>
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowSortDropdown(!showSortDropdown); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M6 12h12M9 18h6"/>
              </svg>
              {sortBy === 'default' && 'Sort: Default'}
              {sortBy === 'volume_desc' && 'Volume: High to Low'}
              {sortBy === 'volume_asc' && 'Volume: Low to High'}
              {sortBy === 'newest' && 'Sort: Newest'}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {showSortDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] shadow-xl z-20 overflow-hidden">
                {([
                  {key: 'default' as SortOption, label: 'Default'},
                  {key: 'volume_desc' as SortOption, label: 'Volume: High to Low'},
                  {key: 'volume_asc' as SortOption, label: 'Volume: Low to High'},
                  {key: 'newest' as SortOption, label: 'Newest First'},
                ]).map(item => (
                  <button
                    key={item.key}
                    onClick={(e) => { e.stopPropagation(); setSortBy(item.key); setShowSortDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${
                      sortBy === item.key
                        ? 'bg-[#00b8ff]/10 text-[#00b8ff]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {item.label}
                    {sortBy === item.key && (
                      <svg className="inline ml-2" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1"/>

          {/* Search */}
          <div className="relative w-full sm:w-64">
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
            Showing {filteredEvents.length === 0 ? 0 : (safeCurrentPage - 1) * EVENTS_PER_PAGE + 1}–{Math.min(safeCurrentPage * EVENTS_PER_PAGE, filteredEvents.length)} of {filteredEvents.length} results
          </p>
          {/* Active filter tags */}
          {(activeGame !== 'all' || statusFilter !== 'all' || sortBy !== 'default' || searchQuery) && (
            <button
              onClick={() => { setActiveGame('all'); setStatusFilter('all'); setSortBy('default'); setSearchQuery(''); }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--live-red)] transition-colors flex items-center gap-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-20 rounded bg-[var(--bg-elevated)]"/>
                <div className="h-5 w-16 rounded bg-[var(--bg-elevated)]"/>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)]"/>
                  <div className="flex-1 h-4 rounded bg-[var(--bg-elevated)]"/>
                  <div className="w-14 h-6 rounded bg-[var(--bg-elevated)]"/>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)]"/>
                  <div className="flex-1 h-4 rounded bg-[var(--bg-elevated)]"/>
                  <div className="w-14 h-6 rounded bg-[var(--bg-elevated)]"/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Events Grid */}
      {!loading && paginatedEvents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginatedEvents.map(event => {
            const market = getMoneylineMarket(event.markets);
            const {prices, outcomes} = market ? parseMarketData(market) : {prices: [], outcomes: []};
            const team1 = outcomes[0] || 'Team A';
            const team2 = outcomes[1] || 'Team B';
            const team1Percent = ((prices[0] || 0.5) * 100).toFixed(0);
            const team2Percent = ((prices[1] || 0.5) * 100).toFixed(0);
            const gameStartTime = market?.gameStartTime;
            const live = isEventLive(event);

            return (
              <Link
                key={event.id}
                href={`/event/${event.slug}`}
                className="group block rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--border-hover)] hover:shadow-md transition-all overflow-hidden"
              >
                {/* Card Header */}
                <div className="px-5 py-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {event.image && (
                      <div className="relative w-5 h-5 rounded overflow-hidden">
                        <Image src={event.image} alt="" fill className="object-cover"/>
                      </div>
                    )}
                    <span className="text-xs font-medium text-[var(--text-secondary)] truncate max-w-[150px]">
                      {event.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">
                      {formatVolume(event.volume || 0)}
                    </span>
                    {live ? (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--live-red)]/10 text-[var(--live-red)] text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-[var(--live-red)] rounded-full animate-live-pulse"/>
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
                <div className="p-5">
                  {market && prices.length >= 2 ? (
                    <div className="space-y-3">
                      {/* Team 1 */}
                      <div className="flex items-center gap-4 p-3 rounded-xl transition-colors bg-[var(--bg-secondary)]">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm overflow-hidden bg-[var(--bg-elevated)]">
                          {teamLogos[team1] ? (
                            <Image src={teamLogos[team1]!} alt={team1} width={48} height={48} className="w-full h-full object-contain p-1"/>
                          ) : event.image ? (
                            <Image src={event.image} alt={team1} width={48} height={48} className="w-full h-full object-cover"/>
                          ) : (
                            getTeamInitials(team1)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate text-[var(--text-primary)]">{team1}</div>
                        </div>
                        <div className="text-xl font-bold text-[#00b8ff]">{team1Percent}%</div>
                      </div>

                      {/* VS Divider */}
                      <div className="flex items-center gap-3 px-3">
                        <div className="flex-1 h-px bg-[var(--border-default)]"/>
                        <span className="text-xs font-medium text-[var(--text-muted)]">VS</span>
                        <div className="flex-1 h-px bg-[var(--border-default)]"/>
                      </div>

                      {/* Team 2 */}
                      <div className="flex items-center gap-4 p-3 rounded-xl transition-colors bg-[var(--bg-secondary)]">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm overflow-hidden bg-[var(--bg-elevated)]">
                          {teamLogos[team2] ? (
                            <Image src={teamLogos[team2]!} alt={team2} width={48} height={48} className="w-full h-full object-contain p-1"/>
                          ) : event.image ? (
                            <Image src={event.image} alt={team2} width={48} height={48} className="w-full h-full object-cover"/>
                          ) : (
                            getTeamInitials(team2)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate text-[var(--text-primary)]">{team2}</div>
                        </div>
                        <div className="text-xl font-bold text-[#5c6c8a]">{team2Percent}%</div>
                      </div>

                      {/* Odds Bar */}
                      <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden flex mt-2">
                        <div className="h-full bg-[#00b8ff] transition-all duration-500" style={{width: `${team1Percent}%`}}/>
                        <div className="h-full bg-[#5c6c8a] transition-all duration-500" style={{width: `${team2Percent}%`}}/>
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
      {!loading && filteredEvents.length === 0 && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-12 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <div className="text-xl font-bold text-[var(--text-primary)] mb-2">No Matches Found</div>
          <div className="text-[var(--text-secondary)]">
            {searchQuery
              ? `No matches found for "${searchQuery}"`
              : activeGame !== 'all'
                ? `No active markets for this game`
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
