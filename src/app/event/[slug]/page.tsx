'use client';

import {useState, useEffect, useMemo} from 'react';
import {useParams} from 'next/navigation';
import Link from 'next/link';
import TradeBox from '@/components/matches/TradeBox';
import {useTeamLogos} from '@/hooks/useTeamLogos';
import {useMatchLiveData} from '@/hooks/useMatchLiveData';
import {useRealtimePrice} from '@/hooks/useRealtimePrice';
import {
  EventHeader,
  SeriesMatchBox,
  NonSeriesMatchBox,
  SeriesMarketList,
  NonSeriesMarketList,
  StreamModal,
  CommentsTab,
  TopHoldersTab,
  ActivityTab,
  EventPositions,
} from '@/components/event';
import {
  Market,
  PolymarketEvent,
  parseMarketData,
  formatVolume,
  isGameLive,
  getPrimaryMarket,
  groupMarketsByType,
  MARKET_TYPE_ORDER,
} from '@/components/event/event-utils';

export default function EventDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [event, setEvent] = useState<PolymarketEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [selectedOutcomeIndex, setSelectedOutcomeIndex] = useState<0 | 1>(0);
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [showMobileTradeBox, setShowMobileTradeBox] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'top_holders' | 'activity'>('comments');

  const handleSelectMarket = (market: Market, outcomeIndex?: 0 | 1) => {
    setSelectedMarket(market);
    if (outcomeIndex !== undefined) {
      setSelectedOutcomeIndex(outcomeIndex);
    }
  };

  // Fetch event by slug
  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/polymarket/event?slug=${slug}`);
        if (!response.ok) {
          throw new Error('Failed to fetch event');
        }
        const data = await response.json();
        setEvent(data);

        // Set first market from first grouped type as selected
        const grouped = groupMarketsByType(data.markets);
        const types = Object.keys(grouped);
        const sortedTypes = types.sort((a, b) => {
          const aIndex = MARKET_TYPE_ORDER.indexOf(a);
          const bIndex = MARKET_TYPE_ORDER.indexOf(b);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });

        if (sortedTypes.length > 0 && grouped[sortedTypes[0]]?.length > 0) {
          setSelectedMarket(grouped[sortedTypes[0]][0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchEvent();
    }
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

  // Primary market data
  const primaryMarket = useMemo(() => getPrimaryMarket(event?.markets), [event?.markets]);
  const {prices, outcomes} = primaryMarket ? parseMarketData(primaryMarket) : {prices: [], outcomes: []};
  const team1 = outcomes[0] || 'Team A';
  const team2 = outcomes[1] || 'Team B';
  const gameStartTime = primaryMarket?.gameStartTime;
  const isLive = isGameLive(gameStartTime);

  const isEnded = useMemo(() => {
    if (!event) return false;
    if (event.closed) return true;
    if (event.endDate) {
      return new Date(event.endDate) < new Date();
    }
    return false;
  }, [event]);

  // Realtime price
  const clobTokenIds = useMemo(() => {
    if (!primaryMarket?.clobTokenIds) return [];
    if (typeof primaryMarket.clobTokenIds === 'string') {
      try {
        return JSON.parse(primaryMarket.clobTokenIds);
      } catch {
        return [];
      }
    }
    return primaryMarket.clobTokenIds;
  }, [primaryMarket?.clobTokenIds]);

  const {price: realtimePrice0} = useRealtimePrice(clobTokenIds[0]);

  const team1Price = realtimePrice0 > 0 ? realtimePrice0 : (prices[0] || 0.5);
  const team2Price = realtimePrice0 > 0 ? (1 - realtimePrice0) : (prices[1] || 0.5);
  const team1Percent = (team1Price * 100).toFixed(0);
  const team2Percent = (team2Price * 100).toFixed(0);

  // Team logos
  const teamNames = useMemo(() => [team1, team2].filter(Boolean), [team1, team2]);
  const {logos: teamLogos} = useTeamLogos(teamNames);

  // Game type
  const gameType = useMemo(() => {
    if (!event) return 'cs2';
    const tags = event.tags?.map(t => t.slug.toLowerCase()) || [];
    const title = event.title.toLowerCase();
    if (tags.includes('cs2') || tags.includes('csgo') || title.includes('cs2') || title.includes('counter-strike')) return 'cs2';
    if (tags.includes('dota2') || tags.includes('dota') || title.includes('dota')) return 'dota2';
    if (tags.includes('lol') || tags.includes('league-of-legends') || title.includes('league')) return 'lol';
    if (tags.includes('valorant') || title.includes('valorant')) return 'valorant';
    return 'cs2';
  }, [event]);

  // Live match data
  const {data: liveMatch, found: liveMatchFound} = useMatchLiveData(team1, team2, gameType, !!team1 && !!team2);

  // Grouped markets
  const groupedMarkets = useMemo(() => groupMarketsByType(event?.markets), [event?.markets]);

  const sortedMarketTypes = useMemo(() => {
    const types = Object.keys(groupedMarkets);
    return types.sort((a, b) => {
      const aIndex = MARKET_TYPE_ORDER.indexOf(a);
      const bIndex = MARKET_TYPE_ORDER.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [groupedMarkets]);

  // TradeBox event
  const eventForTradeBox = useMemo(() => {
    if (!event) return null;
    return {
      ...event,
      markets: selectedMarket ? [selectedMarket] : event.markets,
    };
  }, [event, selectedMarket]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-[var(--bg-elevated)] rounded mb-4"/>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-64 bg-[var(--bg-elevated)] rounded-2xl"/>
              <div className="h-48 bg-[var(--bg-elevated)] rounded-2xl"/>
            </div>
            <div className="h-96 bg-[var(--bg-elevated)] rounded-2xl"/>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl border border-[var(--loss-red)]/30 bg-[var(--bg-card)] p-8 text-center">
          <div className="text-lg font-semibold text-[var(--text-primary)] mb-1">Failed to Load</div>
          <div className="text-[var(--text-secondary)]">{error || 'Event not found'}</div>
          <Link
            href="/matches"
            className="inline-block mt-4 px-4 py-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            Back to Matches
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link href="/" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              Home
            </Link>
          </li>
          <li className="text-[var(--text-muted)]">/</li>
          <li>
            <Link href="/matches" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              Matches
            </Link>
          </li>
          <li className="text-[var(--text-muted)]">/</li>
          <li className="text-[var(--text-primary)] font-medium truncate max-w-[200px]">{event.title}</li>
        </ol>
      </nav>

      {/* Main Content - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Header Card */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 sm:p-6">
            <EventHeader
              title={event.title}
              isEnded={isEnded}
              isLive={isLive}
              gameStartTime={gameStartTime}
            />

            <div className="bg-[var(--bg-secondary)] rounded-xl p-3 sm:p-6">
              {event.seriesSlug ? (
                <SeriesMatchBox
                  team1={team1}
                  team2={team2}
                  team1Percent={team1Percent}
                  team2Percent={team2Percent}
                  teamLogos={teamLogos}
                  eventImage={event.image}
                  isLive={isLive}
                  liveMatch={liveMatch}
                  liveMatchFound={liveMatchFound}
                  onShowStream={() => setShowStreamModal(true)}
                />
              ) : (
                <NonSeriesMatchBox
                  image={event.image}
                  title={event.title}
                  volume={event.volume}
                  endDate={event.endDate}
                />
              )}
            </div>

            {/* Stats */}
            {event.seriesSlug && (
              <div className="flex items-center gap-6 mt-4 text-sm">
                <div>
                  <span className="text-[var(--text-muted)]">Volume: </span>
                  <span className="text-[var(--text-primary)] font-semibold">{formatVolume(event.volume)}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Liquidity: </span>
                  <span className="text-[var(--text-primary)] font-semibold">{formatVolume(event.liquidity)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Your Positions */}
          <EventPositions event={event} />

          {/* Markets */}
          {event.seriesSlug ? (
            <SeriesMarketList
              groupedMarkets={groupedMarkets}
              sortedMarketTypes={sortedMarketTypes}
              selectedMarket={selectedMarket}
              selectedOutcomeIndex={selectedOutcomeIndex}
              onSelectMarket={handleSelectMarket}
            />
          ) : (
            <NonSeriesMarketList
              markets={event.markets}
              selectedMarket={selectedMarket}
              selectedOutcomeIndex={selectedOutcomeIndex}
              onSelectMarket={handleSelectMarket}
            />
          )}

          {/* Tabs: Comments / Top Holders / Activity */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
            {/* Tab Headers */}
            <div className="flex border-b border-[var(--border-default)]">
              {([
                {key: 'comments' as const, label: 'Comments', icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                )},
                {key: 'top_holders' as const, label: 'Top Holders', icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                )},
                {key: 'activity' as const, label: 'Activity', icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                )},
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                    activeTab === tab.key
                      ? 'border-[#00b8ff] text-[#00b8ff]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="max-h-[500px] overflow-y-auto">
              {activeTab === 'comments' && (
                <CommentsTab eventId={event.id} />
              )}
              {activeTab === 'top_holders' && (
                <TopHoldersTab conditionId={primaryMarket?.conditionId} outcomes={outcomes} />
              )}
              {activeTab === 'activity' && (
                <ActivityTab eventId={event.id} />
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Trade Box (desktop only) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-20">
            <TradeBox
              event={eventForTradeBox}
              selectedTeam={selectedOutcomeIndex}
              onTeamChange={(team) => setSelectedOutcomeIndex(team)}
            />
          </div>
        </div>
      </div>

      {/* Mobile Price Buttons - Fixed Bottom Bar */}
      {!loading && event && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-[var(--border-default)] bg-[var(--bg-card)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex gap-2 px-4 py-3">
            <button
              onClick={() => { setSelectedOutcomeIndex(0); setShowMobileTradeBox(true); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold bg-[#00b8ff]/10 text-[#00b8ff] active:bg-[#00b8ff]/20 transition-colors"
            >
              <span className="truncate">{team1}</span>
              <span className="whitespace-nowrap">{(team1Price * 100).toFixed(1)}¢</span>
            </button>
            <button
              onClick={() => { setSelectedOutcomeIndex(1); setShowMobileTradeBox(true); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold bg-[#5c6c8a]/10 text-[#5c6c8a] active:bg-[#5c6c8a]/20 transition-colors"
            >
              <span className="truncate">{team2}</span>
              <span className="whitespace-nowrap">{(team2Price * 100).toFixed(1)}¢</span>
            </button>
          </div>
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
              event={eventForTradeBox}
              selectedTeam={selectedOutcomeIndex}
              onTeamChange={(team) => setSelectedOutcomeIndex(team)}
            />
          </div>
        </div>
      </div>

      {/* Stream Modal */}
      <StreamModal
        show={showStreamModal}
        onClose={() => setShowStreamModal(false)}
        team1={team1}
        team2={team2}
        liveMatch={liveMatch}
        liveMatchFound={liveMatchFound}
      />
    </div>
  );
}
