// Polymarket CLOB API endpoints
export const POLYMARKET_HOST = 'https://clob.polymarket.com';
export const POLYGON_CHAIN_ID = 137;

// Contract addresses on Polygon
export const POLYMARKET_CONTRACTS = {
  // Exchange contract for trading
  EXCHANGE: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
  // Conditional Tokens (ERC1155)
  CTF: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045',
  // USDC on Polygon
  USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  // Gnosis Safe Factory (for MetaMask users)
  GNOSIS_SAFE_FACTORY: '0xaacfeea03eb1561c4e67d661e40682bd20e3541b',
  // Polymarket Proxy Factory (for MagicLink users)
  PROXY_FACTORY: '0xaB45c5A4B0c941a2F231C04C3f49182e1A254052',
} as const;

// Signature types for Polymarket
export enum SignatureType {
  EOA = 0, // Standard EOA wallet (MetaMask, etc.)
  POLY_PROXY = 1, // Polymarket proxy wallet (Magic/Email login)
  POLY_GNOSIS_SAFE = 2, // Gnosis Safe multisig
}

// Note: Side and OrderType are exported from @polymarket/clob-client via types.ts

// Tick sizes for different markets
export const TICK_SIZES = {
  DEFAULT: '0.01',
  PRECISE: '0.001',
  ULTRA_PRECISE: '0.0001',
} as const;