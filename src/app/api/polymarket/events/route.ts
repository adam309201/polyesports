import { NextRequest, NextResponse } from 'next/server';

// Esports series IDs
const ESPORTS_SERIES_IDS = [
  10310, // Counter-Strike 2
  10369, // Valorant
  10311, // League of Legends
  10309, // Dota 2
  10427, // Call of Duty
  10430, // Overwatch
  10426, // Mobile Legends
  10429, // Wild Rift
  10434, // Honor of Kings
  10431, // PUBG
  10432, // Rainbow Six Siege
  10433, // Rocket League
  10435, // StarCraft 2
  10436, // StarCraft
  10428, // EA Sports FC
];

interface Market {
  outcomes: string | string[];
  outcomePrices: string | string[];
  [key: string]: unknown;
}

interface PolymarketEvent {
  id: string;
  volume: number;
  active: boolean;
  closed: boolean;
  ended?: boolean;
  startDate?: string;
  endDate?: string;
  markets?: Market[];
  [key: string]: unknown;
}

// Non-team outcomes to filter out
const NON_TEAM_OUTCOMES = ['yes', 'no', 'over', 'under', 'draw', 'tie'];

// Check if market has valid team outcomes (not yes/no, over/under)
const isTeamMatchMarket = (market: Market): boolean => {
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

  // Must have exactly 2 outcomes for a team vs team match
  if (outcomes.length !== 2) return false;

  // Check if any outcome is a non-team outcome
  const hasNonTeamOutcome = outcomes.some(outcome =>
    NON_TEAM_OUTCOMES.includes(outcome.toLowerCase().trim())
  );

  return !hasNonTeamOutcome;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const seriesId = searchParams.get('series_id');
  const allEsports = searchParams.get('all_esports');
  const active = searchParams.get('active') ?? 'true';
  const closed = searchParams.get('closed') ?? 'false';
  const ended = searchParams.get('ended');
  const limit = parseInt(searchParams.get('limit') ?? '20');

  try {
    // Fetch all esports events
    if (allEsports === 'true') {
      const fetchPromises = ESPORTS_SERIES_IDS.map(async (id) => {
        const url = `https://gamma-api.polymarket.com/events?series_id=${id}&active=${active}&closed=${closed}&limit=50`;
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 60 },
        });
        if (!response.ok) return [];
        const events = await response.json();
        // Tag each event with its series ID for client-side game filtering
        return events.map((e: PolymarketEvent) => ({ ...e, _seriesId: id }));
      });

      const results = await Promise.all(fetchPromises);
      const allEvents: PolymarketEvent[] = results.flat();

      // Filter: only active events that haven't ended and have valid team markets
      const activeEvents = allEvents.filter((event) => {
        if (event.closed) return false;
        if (event.ended) return false;
        if (event.active === false) return false;
        if (!event.markets || event.markets.length === 0) return false;
        return event.markets.some(isTeamMatchMarket);
      });

      // Filter markets within each event to only include valid team markets
      const eventsWithFilteredMarkets = activeEvents.map((event) => ({
        ...event,
        markets: event.markets?.filter(isTeamMatchMarket) || [],
      }));

      // Sort by startDate (nearest first), fallback to volume
      const sortedEvents = eventsWithFilteredMarkets
        .sort((a, b) => {
          const aStart = a.startDate ? new Date(a.startDate as string).getTime() : Infinity;
          const bStart = b.startDate ? new Date(b.startDate as string).getTime() : Infinity;

          // If both have start dates, sort by nearest
          if (aStart !== Infinity && bStart !== Infinity) {
            return aStart - bStart;
          }

          // Fallback to volume
          return (b.volume || 0) - (a.volume || 0);
        })
        .slice(0, limit);

      return NextResponse.json(sortedEvents);
    }

    // Fetch by tag_id
    const tagId = searchParams.get('tag_id');
    if (tagId) {
      const relatedTags = searchParams.get('related_tags') ?? 'true';
      const excludeTagId = searchParams.get('exclude_tag_id') ?? '';
      const url = `https://gamma-api.polymarket.com/events?tag_id=${tagId}&related_tags=${relatedTags}&closed=${closed}${ended !== null ? `&ended=${ended}` : ''}&limit=${limit}${excludeTagId ? `&exclude_tag_id=${excludeTagId}` : ''}`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 60 },
      });

      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    // Fetch single series
    if (!seriesId) {
      return NextResponse.json({ error: 'series_id or tag_id is required' }, { status: 400 });
    }

    const url = `https://gamma-api.polymarket.com/events?series_id=${seriesId}&active=${active}&closed=${closed}${ended !== null ? `&ended=${ended}` : ''}&limit=${limit}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Polymarket API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events from Polymarket' },
      { status: 500 }
    );
  }
}
