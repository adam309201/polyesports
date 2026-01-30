'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import EventsList from '@/components/matches/EventsList';
import TradeBox from '@/components/matches/TradeBox';
import {BagIcon} from "@/components/icons";

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
  ended?: boolean;
  liquidity: number;
  volume: number;
  volume24hr: number;
  openInterest: number;
  markets: Market[];
  tags: Array<{ id: string; slug: string; label: string }>;
}

interface EsportsGame {
  id: number;
  name: string;
  slug: string;
  image: string;
  seriesId: number;
}

// Check if game is live based on gameStartTime
const isGameLive = (gameStartTime: string | undefined) => {
  if (!gameStartTime) return false;
  const now = new Date();
  const start = new Date(gameStartTime);
  return now >= start;
};

// Get primary market's gameStartTime from event
const getEventGameStartTime = (event: PolymarketEvent): string | undefined => {
  if (!event.markets || event.markets.length === 0) return undefined;
  // Find the first market with gameStartTime
  const marketWithTime = event.markets.find(m => m.gameStartTime);
  return marketWithTime?.gameStartTime;
};

// Check if event is live
const isEventLive = (event: PolymarketEvent): boolean => {
  const gameStartTime = getEventGameStartTime(event);
  return isGameLive(gameStartTime);
};

// Check if event has ended
const isEventEnded = (event: PolymarketEvent): boolean => {
  if (event.closed) return true;
  if (event.ended) return true;
  if (event.endDate) {
    return new Date(event.endDate) < new Date();
  }
  return false;
};

// Sort events: not ended first, then live, then by gameStartTime
const sortEvents = (events: PolymarketEvent[]): PolymarketEvent[] => {
  return [...events].sort((a, b) => {
    const aEnded = isEventEnded(a);
    const bEnded = isEventEnded(b);

    // Not ended events come first
    if (!aEnded && bEnded) return -1;
    if (aEnded && !bEnded) return 1;

    const aIsLive = isEventLive(a);
    const bIsLive = isEventLive(b);

    // Live events come first
    if (aIsLive && !bIsLive) return -1;
    if (!aIsLive && bIsLive) return 1;

    // Within same category, sort by gameStartTime then volume
    const aTime = getEventGameStartTime(a);
    const bTime = getEventGameStartTime(b);

    if (aTime && bTime) {
      const timeDiff = new Date(aTime).getTime() - new Date(bTime).getTime();
      if (timeDiff !== 0) return timeDiff;
    }
    if (aTime && !bTime) return -1;
    if (!aTime && bTime) return 1;

    // Same time or no time, sort by volume (highest first)
    return (b.volume || 0) - (a.volume || 0);
  });
};

// Map slug to series ID
const SLUG_TO_SERIES: Record<string, number> = {
  'cs2': 10310,
  'val': 10369,
  'lol': 10311,
  'dota2': 10309,
  'cod': 10427,
  'ow': 10430,
  'ml': 10426,
  'wr': 10429,
  'hok': 10434,
  'pubg': 10431,
  'r6': 10432,
  'rl': 10433,
  'sc2': 10435,
  'sc': 10436,
  'eafc': 10428,
};

// Filter events that have valid team match markets
const filterTeamEvents = (data: PolymarketEvent[]) => {
  return data.filter((event: PolymarketEvent) => {
    if (!event.markets || event.markets.length === 0) return false;
    return event.markets.some((market: Market) => {
      let outcomes: string[] = [];
      try {
        if (typeof market.outcomes === 'string') {
          outcomes = JSON.parse(market.outcomes);
        } else if (Array.isArray(market.outcomes)) {
          outcomes = market.outcomes;
        }
      } catch {
        return false;
      }
      if (outcomes.length !== 2) return false;
      const nonTeam = ['yes', 'no', 'over', 'under', 'draw', 'tie'];
      return !outcomes.some(o => nonTeam.includes(o.toLowerCase().trim()));
    });
  });
};

type TabType = 'active' | 'finished';

export default function GameMatchesPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [activeEvents, setActiveEvents] = useState<PolymarketEvent[]>([]);
  const [finishedEvents, setFinishedEvents] = useState<PolymarketEvent[]>([]);
  const [game, setGame] = useState<EsportsGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFinished, setLoadingFinished] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<PolymarketEvent | null>(null);
  const [selectedOutcomeIndex, setSelectedOutcomeIndex] = useState<0 | 1>(0);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [showMobileTradeBox, setShowMobileTradeBox] = useState(false);

  // Fetch game info
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const response = await fetch('/api/polymarket/sports');
        if (!response.ok) throw new Error('Failed to fetch games');
        const games: EsportsGame[] = await response.json();
        const foundGame = games.find(g => g.slug === slug);
        if (foundGame) {
          setGame(foundGame);
        }
      } catch {
        // Failed to fetch game info
      }
    };
    fetchGame();
  }, [slug]);

  // Fetch active events
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);

      const seriesId = SLUG_TO_SERIES[slug];
      if (!seriesId) {
        setError('Unknown game');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/polymarket/events?series_id=${seriesId}&limit=100&closed=false&ended=false`);
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        const data = await response.json();

        const filteredEvents = filterTeamEvents(data).filter(
          (event: PolymarketEvent) => !isEventEnded(event)
        );

        const sortedEvents = sortEvents(filteredEvents);
        setActiveEvents(sortedEvents);
        if (sortedEvents.length > 0) {
          setSelectedEvent(sortedEvents[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [slug]);

  // Fetch finished events
  useEffect(() => {
    const fetchFinished = async () => {
      setLoadingFinished(true);
      const seriesId = SLUG_TO_SERIES[slug];
      if (!seriesId) {
        setLoadingFinished(false);
        return;
      }

      try {
        const response = await fetch(`/api/polymarket/events?series_id=${seriesId}&limit=50&closed=true`);
        if (!response.ok) {
          setLoadingFinished(false);
          return;
        }
        const data = await response.json();
        const filtered = filterTeamEvents(data);
        // Sort finished: most recently ended first
        filtered.sort((a: PolymarketEvent, b: PolymarketEvent) => {
          const aEnd = a.endDate ? new Date(a.endDate).getTime() : 0;
          const bEnd = b.endDate ? new Date(b.endDate).getTime() : 0;
          return bEnd - aEnd;
        });
        setFinishedEvents(filtered);
      } catch {
        // silently fail for finished events
      } finally {
        setLoadingFinished(false);
      }
    };

    fetchFinished();
  }, [slug]);

  // Lock body scroll when mobile trade sheet is open
  useEffect(() => {
    if (showMobileTradeBox) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showMobileTradeBox]);

  const gameName = game?.name || slug.toUpperCase();
  const events = activeTab === 'active' ? activeEvents : finishedEvents;
  const isLoading = activeTab === 'active' ? loading : loadingFinished;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-3xl font-bold text-[var(--text-primary)] mb-1 sm:mb-2">{gameName} Matches</h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
          {activeEvents.length} active{finishedEvents.length > 0 ? ` · ${finishedEvents.length} finished` : ''} prediction markets
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-secondary)] w-fit mb-6">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'active'
              ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Active
          {activeEvents.length > 0 && (
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'active'
                ? 'bg-[#00b8ff]/15 text-[#00b8ff]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
            }`}>
              {activeEvents.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('finished')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'finished'
              ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Finished
          {finishedEvents.length > 0 && (
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'finished'
                ? 'bg-[var(--text-muted)]/15 text-[var(--text-secondary)]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
            }`}>
              {finishedEvents.length}
            </span>
          )}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-2xl border border-[var(--loss-red)]/30 bg-[var(--bg-card)] p-8 text-center">
          <div className="text-lg font-semibold text-[var(--text-primary)] mb-1">Failed to Load</div>
          <div className="text-[var(--text-secondary)]">{error}</div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 animate-pulse">
                <div className="h-6 w-48 rounded bg-[var(--bg-elevated)] mb-4" />
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)]" />
                  <div className="flex-1 h-4 rounded bg-[var(--bg-elevated)]" />
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 animate-pulse h-96" />
          </div>
        </div>
      )}

      {/* Main Content - 2 Column Layout */}
      {!isLoading && !error && events.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Events List */}
          <div className="lg:col-span-2">
            <EventsList
              events={events}
              selectedEvent={selectedEvent}
              selectedOutcomeIndex={selectedOutcomeIndex}
              onSelectEvent={(event, outcomeIndex) => {
                setSelectedEvent(event);
                setSelectedOutcomeIndex(outcomeIndex);
                setShowMobileTradeBox(true);
              }}
              isFinished={activeTab === 'finished'}
            />
          </div>

          {/* Right Column - Trade Box (desktop only) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24">
              <TradeBox
                event={selectedEvent}
                selectedTeam={selectedOutcomeIndex}
                onTeamChange={(team) => setSelectedOutcomeIndex(team)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && events.length === 0 && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-12 text-center">
          <div className="text-4xl flex justify-center mb-6"><BagIcon/></div>
          <div className="text-xl font-bold text-[var(--text-primary)] mb-2">
            {activeTab === 'active' ? 'No Active Markets' : 'No Finished Markets'}
          </div>
          <div className="text-[var(--text-secondary)] mb-6">
            {activeTab === 'active'
              ? `There are no ${gameName} prediction markets available right now. Check back later!`
              : `No finished ${gameName} markets found.`
            }
          </div>
          {activeTab === 'active' ? (
            <Link
              href="/matches"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00b8ff]/10 text-[#00b8ff] font-medium text-sm hover:bg-[#00b8ff]/20 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Browse All Games
            </Link>
          ) : (
            <button
              onClick={() => setActiveTab('active')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00b8ff]/10 text-[#00b8ff] font-medium text-sm hover:bg-[#00b8ff]/20 transition-colors"
            >
              View Active Markets
            </button>
          )}
        </div>
      )}

      {/* Mobile Trade Bottom Sheet */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          showMobileTradeBox ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowMobileTradeBox(false)}
        />
        <div
          className={`absolute bottom-0 left-0 right-0 bg-[var(--bg-card)] rounded-t-2xl transition-transform duration-300 ease-out ${
            showMobileTradeBox ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ maxHeight: '85vh', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Drag Handle */}
          <div
            className="flex justify-center pt-3 pb-1 cursor-pointer"
            onClick={() => setShowMobileTradeBox(false)}
          >
            <div className="w-10 h-1 rounded-full bg-[var(--text-muted)]/30" />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 24px)' }}>
            <TradeBox
              event={selectedEvent}
              selectedTeam={selectedOutcomeIndex}
              onTeamChange={(team) => setSelectedOutcomeIndex(team)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
