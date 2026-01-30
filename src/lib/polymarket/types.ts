import { SignatureType } from './constants';
import { Side, OrderType } from '@polymarket/clob-client/dist/types';

// API Credentials returned by Polymarket
export interface ApiCredentials {
  apiKey: string;
  secret: string;
  passphrase: string;
}

// Order creation parameters
export interface CreateOrderParams {
  tokenId: string;
  price: number; // Price between 0 and 1
  size: number; // Number of shares
  side: Side;
  orderType?: OrderType;
  expiration?: number; // Unix timestamp for GTD orders
}

// Re-export for convenience
export { Side, OrderType };

// Market order parameters
export interface MarketOrderParams {
  tokenId: string;
  amount: number; // Amount in USDC for buy, shares for sell
  side: Side;
}

// Order response from CLOB
export interface OrderResponse {
  id: string;
  status: string;
  owner: string;
  market: string;
  asset_id: string;
  side: string;
  original_size: string;
  size_matched: string;
  price: string;
  outcome: string;
  created_at: number;
  expiration: number;
  type: string;
}

// Trade execution response
export interface TradeResponse {
  success: boolean;
  orderId?: string;
  transactionHash?: string;
  message?: string;
  error?: string;
  order?: OrderResponse;
}

// User's open orders
export interface OpenOrder {
  id: string;
  market: string;
  asset_id: string;
  side: Side;
  price: string;
  original_size: string;
  size_matched: string;
  created_at: number;
  expiration: number;
  type: string;
}

// User's trade history
export interface Trade {
  id: string;
  taker_order_id: string;
  market: string;
  asset_id: string;
  side: string;
  size: string;
  fee_rate_bps: string;
  price: string;
  status: string;
  match_time: number;
  last_update: number;
  outcome: string;
  owner: string;
  maker_address: string;
  transaction_hash: string;
  bucket_index: number;
  type: string;
}

// Balance information
export interface BalanceInfo {
  usdc: string;
  positions: PositionBalance[];
}

export interface PositionBalance {
  asset_id: string;
  balance: string;
  market: string;
  outcome: string;
}

// Client configuration
export interface PolymarketClientConfig {
  host: string;
  chainId: number;
  signer: unknown;
  credentials?: ApiCredentials;
  signatureType?: SignatureType;
  funder?: string;
}

// Proxy wallet info
export interface ProxyWalletInfo {
  address: string;
  isDeployed: boolean;
  factory: 'gnosis' | 'polymarket';
}

// Order book from CLOB
export interface ClobOrderBook {
  market: string;
  asset_id: string;
  hash: string;
  timestamp: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
}

// Market info from CLOB
export interface ClobMarket {
  condition_id: string;
  question_id: string;
  tokens: Array<{
    token_id: string;
    outcome: string;
    price: string;
    winner: boolean;
  }>;
  rewards: {
    rates: Array<{ asset_address: string; rewards_daily_rate: number }>;
    min_size: number;
    max_spread: number;
  };
  minimum_order_size: string;
  minimum_tick_size: string;
  description: string;
  category: string;
  end_date_iso: string;
  game_start_time: string;
  question: string;
  market_slug: string;
  min_incentive_size: string;
  max_incentive_spread: string;
  active: boolean;
  closed: boolean;
  seconds_delay: number;
  icon: string;
  fpmm: string;
  accepting_orders: boolean;
  accepting_order_timestamp: string;
  neg_risk: boolean;
  neg_risk_market_id: string;
  neg_risk_request_id: string;
  is_50_50_outcome: boolean;
  notifications_enabled: boolean;
}