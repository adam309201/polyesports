export interface Position {
  id: string;
  tokenId: string;
  conditionId: string;
  outcomeIndex: number;
  outcome: string;
  size: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  question?: string;
  slug?: string;
  eventSlug?: string;
  image?: string;
  endDate?: string;
  resolved?: boolean;
  winningOutcome?: string;
  isWinner?: boolean;
  payout?: number;
}

export interface Order {
  id: string;
  asset_id: string;
  side: 'BUY' | 'SELL';
  price: number;
  original_size: number;
  size_matched: number;
  outcome?: string;
  question?: string;
  slug?: string;
  image?: string;
}

export interface Trade {
  id: string;
  asset_id: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  timestamp: string;
  outcome?: string;
  question?: string;
  slug?: string;
  image?: string;
}

export type TabType = 'positions' | 'resolved' | 'orders' | 'history';
