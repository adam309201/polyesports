export interface Market {
  id: string;
  question: string;
  conditionId?: string;
  outcomes: string[] | string;
  outcomePrices: string[] | string;
  volumeNum: number;
  liquidityNum: number;
  bestBid: number;
  bestAsk: number;
  lastTradePrice: number;
  clobTokenIds: string[] | string;
  gameStartTime?: string;
  negRisk?: boolean;
  tickSize?: string;
  groupItemTitle?: string;
  sportsMarketType?: string;
}

export interface PolymarketEvent {
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
  seriesSlug?: string;
}

export interface GroupedMarkets {
  [sportsMarketType: string]: Market[];
}

export const MARKET_TYPE_ORDER = [
  'moneyline',
  'child_moneyline',
  'map_handicap',
  'totals',
  'round_handicap_match',
  'round_over_under_match',
  'kill_handicap_match',
  'kill_over_under_match',
];

export const parseMarketData = (market: Market) => {
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

  return {prices, outcomes};
};

export const formatVolume = (vol: number | undefined | null) => {
  const safeVol = vol ?? 0;
  if (safeVol >= 1000000) return `$${(safeVol / 1000000).toFixed(1)}M`;
  if (safeVol >= 1000) return `$${(safeVol / 1000).toFixed(1)}K`;
  return `$${safeVol.toFixed(0)}`;
};

export const getTeamInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
};

export const isGameLive = (gameStartTime: string | undefined) => {
  if (!gameStartTime) return false;
  const now = new Date();
  const start = new Date(gameStartTime);
  return now >= start;
};

export const getStreamEmbedUrl = (streamUrl: string | null | undefined): string | null => {
  if (!streamUrl) return null;

  const kickMatch = streamUrl.match(/kick\.com\/([^/?#]+)/i);
  if (kickMatch) {
    return `https://player.kick.com/${kickMatch[1]}`;
  }

  const twitchMatch = streamUrl.match(/twitch\.tv\/(\w+)/i);
  if (twitchMatch) {
    const parent = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${parent}&muted=false`;
  }

  const youtubeMatch = streamUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/i);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1`;
  }

  return null;
};

export const formatStartTime = (dateString: string | undefined) => {
  if (!dateString) return 'TBD';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 0) {
    return 'Started';
  }

  if (diffHours < 24) {
    return date.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
  }

  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', {weekday: 'short', hour: '2-digit', minute: '2-digit'});
  }

  return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
};

export const isTeamBasedMarket = (market: Market) => {
  const {outcomes} = parseMarketData(market);
  if (outcomes.length !== 2) return false;
  const nonTeamOutcomes = ['yes', 'no', 'over', 'under', 'draw', 'tie'];
  return !outcomes.some(o => nonTeamOutcomes.includes(o.toLowerCase().trim()));
};

export const getPrimaryMarket = (markets: Market[] | undefined): Market | undefined => {
  if (!markets || markets.length === 0) return undefined;

  const moneylineMarket = markets.find(m => m.sportsMarketType === 'moneyline');
  if (moneylineMarket) return moneylineMarket;

  const teamMarket = markets.find(isTeamBasedMarket);
  if (teamMarket) return teamMarket;
  return markets[0];
};

export const groupMarketsByType = (markets: Market[] | undefined): GroupedMarkets => {
  const groups: GroupedMarkets = {};

  if (!markets || markets.length === 0) return groups;

  markets.forEach(market => {
    const type = market.sportsMarketType || 'other';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(market);
  });

  return groups;
};

export const getSectionHeader = (sportsMarketType: string): string | null => {
  const sectionHeaders: Record<string, string> = {
    'round_handicap_match': 'Series Objective Handicaps',
    'round_over_under_match': 'Series Totals',
    'kill_handicap_match': 'Series Objective Handicaps',
    'kill_over_under_match': 'Series Totals',
  };
  return sectionHeaders[sportsMarketType] || null;
};

export const getMarketTypeTitle = (market: Market): string => {
  if (market.groupItemTitle) return market.groupItemTitle;

  const typeToTitle: Record<string, string> = {
    'moneyline': 'Moneyline',
    'child_moneyline': 'Map Winner',
    'map_handicap': 'Game Handicap',
    'totals': 'Total Maps',
    'round_handicap_match': 'Round Handicap',
    'round_over_under_match': 'Round Total',
    'kill_handicap_match': 'Kill Handicap',
    'kill_over_under_match': 'Kill Total',
  };

  return typeToTitle[market.sportsMarketType || ''] || market.question;
};
