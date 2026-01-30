'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { ClobClient } from '@polymarket/clob-client';
import { Side, OrderType, AssetType } from '@polymarket/clob-client/dist/types';
import { SignatureType } from '@polymarket/order-utils';
import {
  deriveSafe,
  deriveProxyWallet,
} from '@polymarket/builder-relayer-client/dist/builder/derive';
import { getContractConfig } from '@polymarket/builder-relayer-client/dist/config';
import { RelayClient } from '@polymarket/builder-relayer-client';
import { RelayerTxType } from '@polymarket/builder-relayer-client/dist/types';
import { Wallet } from '@ethersproject/wallet';
import { JsonRpcSigner, Web3Provider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { parseUnits, formatUnits } from '@ethersproject/units';
import { POLYMARKET_HOST, POLYGON_CHAIN_ID, TICK_SIZES } from '@/lib/polymarket/constants';
import { ApiCredentials, CreateOrderParams, TradeResponse } from '@/lib/polymarket/types';

const STORAGE_KEY = 'polymarket_session';

// Contract addresses on Polygon
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // USDC.e (bridged)
const CTF_EXCHANGE_ADDRESS = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';

// Get Polymarket contract config for Polygon
const polymarketConfig = getContractConfig(POLYGON_CHAIN_ID);

// Polymarket Relayer URL
const RELAYER_URL = 'https://relayer-v2.polymarket.com';

// ERC20 ABI for approve, allowance, balanceOf
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
];

// Conditional Token Framework (CTF) Exchange addresses
const NEG_RISK_CTF_EXCHANGE = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
const NEG_RISK_ADAPTER = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296';

// CTF Contract (ERC-1155 for outcome tokens/positions)
const CTF_CONTRACT = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';

// ERC1155 ABI for position balance and approval
const ERC1155_ABI = [
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function isApprovedForAll(address account, address operator) view returns (bool)',
  'function setApprovalForAll(address operator, bool approved)',
];

// Max approval amount (unlimited)
const MAX_ALLOWANCE =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935';

// ERC20 approve function interface for encoding
// eslint-disable-next-line @typescript-eslint/no-require-imports
const APPROVE_INTERFACE = new (require('@ethersproject/abi').Interface)([
  'function approve(address spender, uint256 amount) returns (bool)',
]);

// Get Polymarket proxy address - try API first, fallback to compute Safe proxy
async function getPolymarketProxyAddress(eoaAddress: string): Promise<string | null> {
  try {
    // First try to get from API (user's registered proxy)
    const response = await fetch(
      `https://gamma-api.polymarket.com/users/${eoaAddress.toLowerCase()}`
    );
    if (response.ok) {
      const data = await response.json();
      if (data?.proxyWallet) {
        console.log('[PolymarketContext] Found proxy wallet from API:', data.proxyWallet);
        return data.proxyWallet;
      }
    }
  } catch (err) {
    console.log('[PolymarketContext] API fetch failed:', err);
  }

  // Fallback: compute Safe proxy address
  try {
    const safeProxy = deriveSafe(eoaAddress, polymarketConfig.SafeContracts.SafeFactory);
    console.log('[PolymarketContext] Computed Safe proxy address:', safeProxy);
    return safeProxy;
  } catch (err) {
    console.error('[PolymarketContext] Failed to compute proxy address:', err);
    return null;
  }
}

interface StoredSession {
  address: string;
  credentials: ApiCredentials;
  timestamp: number;
}

interface WalletBalances {
  walletUsdc: string; // USDC.e in wallet
  tradingBalance: string; // Available for trading (approved to exchange)
  allowance: string; // Current allowance to CTF Exchange
}

interface PolymarketContextValue {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  credentials: ApiCredentials | null;
  proxyAddress: string | null; // Polymarket proxy wallet address
  initialize: (signer: JsonRpcSigner | Wallet) => Promise<boolean>;
  restoreSession: (signer: JsonRpcSigner | Wallet) => Promise<boolean>;
  clearSession: () => void;
  placeOrder: (params: CreateOrderParams, negRisk?: boolean) => Promise<TradeResponse>;
  placeMarketOrder: (
    tokenId: string,
    side: Side,
    amount: number,
    negRisk?: boolean
  ) => Promise<TradeResponse>;
  cancelOrder: (orderId: string) => Promise<boolean>;
  cancelAllOrders: () => Promise<boolean>;
  getOpenOrders: (market?: string) => Promise<unknown[]>;
  getBalances: () => Promise<{ usdc: string } | null>;
  getPositionBalance: (tokenId: string) => Promise<string | null>;
  // Deposit/Withdraw functions
  getWalletBalances: () => Promise<WalletBalances | null>;
  deposit: (amount: number) => Promise<{ success: boolean; error?: string; txHash?: string }>;
  withdraw: () => Promise<{ success: boolean; error?: string; txHash?: string }>;
  // Token approval via relayer
  approveTokensViaRelayer: (negRisk?: boolean) => Promise<{ success: boolean; error?: string }>;
}

const PolymarketContext = createContext<PolymarketContextValue | null>(null);

interface PolymarketProviderProps {
  children: ReactNode;
  funderAddress?: string;
  signatureType?: SignatureType;
}

// Helper to safely access localStorage
const getStoredSession = (): StoredSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored) as StoredSession;
    // Check if session is not too old (30 days)
    const maxAge = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - session.timestamp > maxAge) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
};

const saveSession = (address: string, credentials: ApiCredentials) => {
  if (typeof window === 'undefined') return;
  try {
    const session: StoredSession = {
      address: address.toLowerCase(),
      credentials,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('[PolymarketProvider] Failed to save session:', err);
  }
};

const clearStoredSession = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
};

export function PolymarketProvider({
  children,
  funderAddress,
  signatureType = SignatureType.POLY_GNOSIS_SAFE, // Use POLY_GNOSIS_SAFE for Safe wallet (MetaMask users)
}: PolymarketProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<ApiCredentials | null>(null);
  const [proxyAddress, setProxyAddress] = useState<string | null>(null);

  const clientRef = useRef<ClobClient | null>(null);
  const signerRef = useRef<JsonRpcSigner | Wallet | null>(null);
  const relayClientRef = useRef<RelayClient | null>(null);

  // Try to restore session from localStorage (no signature required)
  const restoreSession = useCallback(
    async (signer: JsonRpcSigner | Wallet): Promise<boolean> => {
      // Skip if already initialized
      if (isInitialized && clientRef.current) {
        return true;
      }

      try {
        const signerAddress = await signer.getAddress();
        const stored = getStoredSession();

        // Check if we have stored credentials for this wallet
        if (!stored || stored.address !== signerAddress.toLowerCase()) {
          console.log('[PolymarketProvider] No stored session for this wallet');
          return false;
        }

        setIsLoading(true);
        setError(null);

        signerRef.current = signer;

        // Get proxy address FIRST - this is the funder (where USDC is held)
        const proxy = await getPolymarketProxyAddress(signerAddress);
        const actualFunder = proxy || funderAddress || signerAddress;
        console.log(
          '[PolymarketProvider] Restoring session with funder:',
          actualFunder,
          '(proxy:',
          proxy,
          ')'
        );

        if (proxy) {
          setProxyAddress(proxy);
        }

        // Create client with stored credentials (no signature needed)
        const creds = {
          key: stored.credentials.apiKey,
          secret: stored.credentials.secret,
          passphrase: stored.credentials.passphrase,
        };

        const client = new ClobClient(
          POLYMARKET_HOST,
          POLYGON_CHAIN_ID,
          signer as Wallet,
          creds,
          signatureType,
          actualFunder
        );

        // Verify credentials are still valid by making a test API call
        try {
          await client.getBalanceAllowance({ asset_type: AssetType.COLLATERAL });
          console.log('[PolymarketProvider] Credentials verified successfully');
        } catch (verifyError) {
          console.warn(
            '[PolymarketProvider] Stored credentials invalid, clearing session:',
            verifyError
          );
          clearStoredSession();
          setIsLoading(false);
          return false;
        }

        clientRef.current = client;
        setCredentials(stored.credentials);

        // Create RelayClient for proxy wallet transactions
        try {
          relayClientRef.current = new RelayClient(
            RELAYER_URL,
            POLYGON_CHAIN_ID,
            signer as Wallet,
            undefined,
            RelayerTxType.SAFE
          );
          console.log('[PolymarketProvider] RelayClient restored successfully');
        } catch (relayErr) {
          console.warn('[PolymarketProvider] Failed to restore RelayClient:', relayErr);
        }

        setIsInitialized(true);

        setIsLoading(false);
        return true;
      } catch (err) {
        console.error('[PolymarketProvider] Restore session error:', err);
        clearStoredSession();
        setIsLoading(false);
        return false;
      }
    },
    [funderAddress, signatureType, isInitialized]
  );

  // Initialize with new signature (creates/derives new credentials)
  const initialize = useCallback(
    async (signer: JsonRpcSigner | Wallet): Promise<boolean> => {
      // Skip if already initialized
      if (isInitialized && clientRef.current) {
        return true;
      }

      setIsLoading(true);
      setError(null);

      try {
        signerRef.current = signer;

        const signerAddress = await signer.getAddress();
        const funder = funderAddress || signerAddress;

        // Create initial client for credential derivation
        const initialClient = new ClobClient(POLYMARKET_HOST, POLYGON_CHAIN_ID, signer as Wallet);

        const creds = await initialClient.createOrDeriveApiKey();
        const apiCreds: ApiCredentials = {
          apiKey: process.env.POLYMARKET_BUILDER_API_KEY as string,
          secret: process.env.POLYMARKET_BUILDER_SECRET as string,
          passphrase: process.env.POLYMARKET_BUILDER_PASSPHRASE as string,
        };

        // Save to localStorage for future sessions
        saveSession(signerAddress, apiCreds);
        setCredentials(apiCreds);

        // Get proxy address FIRST - this is the funder (where USDC is held)
        const proxy = await getPolymarketProxyAddress(signerAddress);
        const actualFunder = proxy || funder;
        console.log(
          '[PolymarketProvider] Using funder address:',
          actualFunder,
          '(proxy:',
          proxy,
          ')'
        );

        if (proxy) {
          setProxyAddress(proxy);
        }

        // Create full client with credentials and PROXY as funder
        clientRef.current = new ClobClient(
          POLYMARKET_HOST,
          POLYGON_CHAIN_ID,
          signer as Wallet,
          creds,
          signatureType,
          actualFunder
        );

        // Create RelayClient for proxy wallet transactions
        try {
          relayClientRef.current = new RelayClient(
            RELAYER_URL,
            POLYGON_CHAIN_ID,
            signer as Wallet,
            undefined,
            RelayerTxType.SAFE
          );
          console.log('[PolymarketProvider] RelayClient created successfully');
        } catch (relayErr) {
          console.warn('[PolymarketProvider] Failed to create RelayClient:', relayErr);
        }

        setIsInitialized(true);

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to initialize Polymarket client';
        setError(message);
        console.error('[PolymarketProvider] Initialize error:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [funderAddress, signatureType, isInitialized]
  );

  // Clear session (logout)
  const clearSession = useCallback(() => {
    clearStoredSession();
    clientRef.current = null;
    signerRef.current = null;
    setCredentials(null);
    setProxyAddress(null);
    setIsInitialized(false);
    setError(null);
  }, []);

  // Place a limit order
  const placeOrder = useCallback(
    async (params: CreateOrderParams, negRisk = false): Promise<TradeResponse> => {
      if (!clientRef.current) {
        return { success: false, error: 'Client not initialized' };
      }
      setIsLoading(true);
      setError(null);
      try {
        const { tokenId, price, size, side, orderType = OrderType.GTC, expiration } = params;

        if (price <= 0 || price >= 1) {
          return { success: false, error: 'Price must be between 0 and 1' };
        }

        // Update balance/allowance with Polymarket API before placing order
        try {
          await clientRef.current.updateBalanceAllowance({ asset_type: AssetType.COLLATERAL });
          console.log('[PolymarketProvider] Balance/allowance synced with Polymarket');
        } catch (syncErr) {
          console.warn('[PolymarketProvider] Failed to sync balance:', syncErr);
        }

        // For SELL orders, check CTF token approval and position balance
        if (side === Side.SELL && signerRef.current && proxyAddress) {
          try {
            const signer = signerRef.current;
            let provider;
            if ('provider' in signer && signer.provider) {
              provider = signer.provider;
            }
            if (provider) {
              const ctfContract = new Contract(CTF_CONTRACT, ERC1155_ABI, provider);
              const exchangeAddress = negRisk ? NEG_RISK_CTF_EXCHANGE : CTF_EXCHANGE_ADDRESS;

              // Check position balance
              const positionBalance = await ctfContract.balanceOf(proxyAddress, tokenId);
              const positionNum = parseFloat(formatUnits(positionBalance, 6));
              console.log(
                '[PolymarketProvider] Position balance:',
                positionNum,
                'shares, need:',
                size
              );

              if (positionNum < size) {
                return {
                  success: false,
                  error: `Insufficient position. You have ${positionNum.toFixed(2)} shares, need ${size.toFixed(2)}.`,
                };
              }

              // Check if CTF Exchange is approved to transfer tokens
              const isApproved = await ctfContract.isApprovedForAll(proxyAddress, exchangeAddress);
              console.log(
                '[PolymarketProvider] CTF approval status:',
                isApproved,
                'for exchange:',
                exchangeAddress
              );

              if (!isApproved) {
                console.log(
                  '[PolymarketProvider] CTF tokens not approved for exchange. User needs to approve on Polymarket.'
                );
                return {
                  success: false,
                  error: `CTF tokens not approved. Please approve the exchange on polymarket.com to sell positions. Exchange: ${exchangeAddress}`,
                };
              }
            }
          } catch (checkErr) {
            console.error('[PolymarketProvider] Failed to check sell prerequisites:', checkErr);
            // Continue anyway
          }
        }

        // Round price to 2 decimal places (tick size 0.01)
        const roundedPrice = Math.round(price * 100) / 100;
        const priceCents = Math.round(roundedPrice * 100); // price in cents (1-99)

        // Helper: Greatest Common Divisor
        const gcd = (a: number, b: number): number => {
          let x = Math.abs(a);
          let y = Math.abs(b);
          while (y !== 0) {
            [x, y] = [y, x % y];
          }
          return x;
        };

        let roundedSize: number;

        if (side === Side.BUY) {
          const d = gcd(priceCents, 1000000);
          const sizeDivisor = 1000000 / d;
          const finalDivisor = Math.max(sizeDivisor, 10);
          const sizeRaw = Math.floor(size * 1e6);
          const finalSizeRaw = Math.floor(sizeRaw / finalDivisor) * finalDivisor;
          roundedSize = finalSizeRaw / 1e6;

          const finalMakerAmount = (finalSizeRaw * priceCents) / 100;

          console.log('[PolymarketProvider] BUY limit order calculation:', {
            originalSize: size,
            priceCents,
            gcdValue: d,
            sizeDivisor,
            finalDivisor,
            sizeRaw,
            finalSizeRaw,
            roundedSize,
            finalMakerAmount,
            finalMakerAmountUSDC: finalMakerAmount / 1e6,
            makerAmountValid: finalMakerAmount % 10000 === 0,
            takerAmountValid: finalSizeRaw % 10 === 0,
          });
        } else {
          const d = gcd(priceCents, 1000);
          const takerDivisor = 1000 / d;
          const finalDivisor = Math.max(10000, takerDivisor);
          const sizeRaw = Math.floor(size * 1e6);
          const finalSizeRaw = Math.floor(sizeRaw / finalDivisor) * finalDivisor;
          roundedSize = finalSizeRaw / 1e6;

          const takerAmount = (finalSizeRaw * priceCents) / 100;

          console.log('[PolymarketProvider] SELL limit order calculation:', {
            originalSize: size,
            priceCents,
            gcdValue: d,
            takerDivisor,
            finalDivisor,
            sizeRaw,
            finalSizeRaw,
            roundedSize,
            takerAmount,
            takerAmountUSDC: takerAmount / 1e6,
            makerAmountValid: finalSizeRaw % 10000 === 0,
            takerAmountValid: takerAmount % 10 === 0,
          });
        }

        if (roundedSize <= 0) {
          return { success: false, error: 'Order size too small. Minimum is 0.01 shares.' };
        }

        console.log('[PolymarketProvider] Creating limit order with params:', {
          tokenID: tokenId,
          price: roundedPrice,
          side,
          size: roundedSize,
          expiration,
          negRisk,
          orderType,
        });

        // First create the signed order
        const signedOrder = await clientRef.current.createOrder(
          {
            tokenID: tokenId,
            price: roundedPrice,
            side: side as Side,
            size: roundedSize,
            feeRateBps: 0,
            expiration,
          },
          {
            tickSize: TICK_SIZES.DEFAULT,
            negRisk,
          }
        );

        console.log('[PolymarketProvider] Signed order created:', signedOrder);

        // Then post the order
        const response = await clientRef.current.postOrder(
          signedOrder,
          orderType as OrderType.GTC | OrderType.GTD
        );

        console.log(
          '[PolymarketProvider] Limit order response:',
          JSON.stringify(response, null, 2)
        );

        // Check if response contains error
        const respAny = response as Record<string, unknown>;
        if (
          respAny.error ||
          respAny.errorMsg ||
          respAny.status === 'error' ||
          respAny.success === false
        ) {
          const errorMsg = (respAny.error ||
            respAny.errorMsg ||
            respAny.message ||
            'Order failed') as string;
          console.error('[PolymarketProvider] Order error:', errorMsg);
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }

        // Check for empty or invalid response
        if (
          !response ||
          (!respAny.id && !respAny.orderID && !respAny.orderIds && !respAny.success)
        ) {
          console.error('[PolymarketProvider] Invalid response, no order ID found');
          const errorMsg = 'Order may not have been placed. Please check your positions.';
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }

        const orderId = (respAny.id ||
          respAny.orderID ||
          (respAny.orderIds as string[])?.[0]) as string;
        console.log('[PolymarketProvider] Order placed successfully, ID:', orderId);

        return {
          success: true,
          orderId,
          message: `Limit order placed: ${size.toFixed(2)} shares at ${(price * 100).toFixed(1)}c`,
          order: response,
        };
      } catch (err) {
        console.error('[PolymarketProvider] Place order error:', err);
        const message = err instanceof Error ? err.message : 'Failed to place order';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Place a market order
  const placeMarketOrder = useCallback(
    async (
      tokenId: string,
      side: Side,
      amount: number,
      negRisk = false
    ): Promise<TradeResponse> => {
      if (!clientRef.current) {
        return { success: false, error: 'Client not initialized' };
      }

      setIsLoading(true);
      setError(null);

      try {
        // Check allowance and approve if needed
        if (signerRef.current && proxyAddress) {
          try {
            const signer = signerRef.current;
            const eoaAddress = await signer.getAddress();
            let provider;
            if ('provider' in signer && signer.provider) {
              provider = signer.provider;
            }
            if (provider) {
              const usdcContract = new Contract(USDC_ADDRESS, ERC20_ABI, provider);
              const exchangeAddress = negRisk ? NEG_RISK_CTF_EXCHANGE : CTF_EXCHANGE_ADDRESS;

              const [balance, allowance] = await Promise.all([
                usdcContract.balanceOf(proxyAddress),
                usdcContract.allowance(proxyAddress, exchangeAddress),
              ]);

              const balanceNum = parseFloat(formatUnits(balance, 6));
              const allowanceNum = parseFloat(formatUnits(allowance, 6));

              console.log('[PolymarketProvider] Proxy wallet status:', {
                proxyAddress,
                balance: balanceNum,
                allowance: allowanceNum,
                exchangeAddress,
                amountNeeded: amount,
                negRisk,
              });

              if (side === Side.BUY) {
                if (allowanceNum < amount) {
                  console.error('[PolymarketProvider] Insufficient allowance!', {
                    allowance: allowanceNum,
                    needed: amount,
                    exchangeAddress,
                    negRisk,
                  });
                  return {
                    success: false,
                    error: `Insufficient USDC allowance. Current: $${allowanceNum.toFixed(2)}, Needed: $${amount}. Exchange: ${negRisk ? 'NegRisk' : 'CTF'}. Please approve USDC on polymarket.com for ${exchangeAddress}`,
                  };
                }

                if (balanceNum < amount) {
                  console.error('[PolymarketProvider] Insufficient balance!', {
                    balance: balanceNum,
                    needed: amount,
                  });
                  return {
                    success: false,
                    error: `Insufficient USDC balance in proxy wallet. Current: $${balanceNum.toFixed(2)}, Needed: $${amount}. Please deposit USDC to your proxy wallet: ${proxyAddress}`,
                  };
                }
              } else {
                const ctfContract = new Contract(CTF_CONTRACT, ERC1155_ABI, provider);
                const positionBalance = await ctfContract.balanceOf(proxyAddress, tokenId);
                const positionNum = parseFloat(formatUnits(positionBalance, 6));

                console.log(
                  '[PolymarketProvider] SELL check - Position balance:',
                  positionNum,
                  'shares, need:',
                  amount
                );

                if (positionNum < amount) {
                  return {
                    success: false,
                    error: `Insufficient position. You have ${positionNum.toFixed(2)} shares, need ${amount.toFixed(2)}.`,
                  };
                }

                const isApproved = await ctfContract.isApprovedForAll(
                  proxyAddress,
                  exchangeAddress
                );
                console.log(
                  '[PolymarketProvider] CTF approval status:',
                  isApproved,
                  'for exchange:',
                  exchangeAddress
                );

                if (!isApproved) {
                  return {
                    success: false,
                    error: `CTF tokens not approved. Please approve on polymarket.com first.`,
                  };
                }
              }
            }
          } catch (approveErr) {
            console.error('[PolymarketProvider] Failed to check prerequisites:', approveErr);
          }
        }

        // Update balance/allowance with Polymarket API before placing order
        try {
          await clientRef.current.updateBalanceAllowance({ asset_type: AssetType.COLLATERAL });
          console.log('[PolymarketProvider] Balance/allowance synced with Polymarket');
        } catch (syncErr) {
          console.warn('[PolymarketProvider] Failed to sync balance:', syncErr);
        }

        const SLIPPAGE = 0.02;
        let marketPrice: number;
        let orderSize: number;

        if (side === Side.BUY) {
          const estimatedShares = 1;
          try {
            marketPrice = await clientRef.current.calculateMarketPrice(
              tokenId,
              side,
              estimatedShares,
              OrderType.FOK
            );
            console.log('[PolymarketProvider] Market price for reference:', marketPrice);
          } catch (priceErr) {
            console.error('[PolymarketProvider] Failed to calculate market price:', priceErr);
            return {
              success: false,
              error: 'Could not get market price. Market may have no liquidity.',
            };
          }

          const priceWithSlippage = Math.min(0.99, marketPrice * (1 + SLIPPAGE));
          orderSize = amount / priceWithSlippage;

          console.log('[PolymarketProvider] BUY order conversion:', {
            usdcAmount: amount,
            marketPrice,
            priceWithSlippage,
            calculatedShares: orderSize,
          });
        } else {
          orderSize = amount;

          try {
            marketPrice = await clientRef.current.calculateMarketPrice(
              tokenId,
              side,
              orderSize,
              OrderType.FOK
            );
            console.log('[PolymarketProvider] Calculated market price for sell:', marketPrice);
          } catch (priceErr) {
            console.error('[PolymarketProvider] Failed to calculate market price:', priceErr);
            return {
              success: false,
              error: 'Could not get market price. Market may have no liquidity.',
            };
          }
        }

        let priceWithSlippage: number;
        if (side === Side.BUY) {
          priceWithSlippage = Math.min(0.99, marketPrice * (1 + SLIPPAGE));
        } else {
          const percentSlippage = marketPrice * 0.1;
          const minSlippage = 0.01;
          const slippageAmount = Math.max(percentSlippage, minSlippage);
          priceWithSlippage = Math.max(0.01, marketPrice - slippageAmount);
        }

        priceWithSlippage = Math.round(priceWithSlippage * 100) / 100;

        const priceCents = Math.round(priceWithSlippage * 100);

        const gcd = (a: number, b: number): number => {
          a = Math.abs(a);
          b = Math.abs(b);
          while (b !== 0) {
            [a, b] = [b, a % b];
          }
          return a;
        };

        let roundedAmount: number;

        if (side === Side.BUY) {
          const d = gcd(priceCents, 1000000);
          const sizeDivisor = 1000000 / d;
          const finalDivisor = Math.max(sizeDivisor, 10);
          const sizeExact = orderSize;
          const sizeRaw = Math.floor(sizeExact * 1e6);
          const finalSizeRaw = Math.floor(sizeRaw / finalDivisor) * finalDivisor;
          roundedAmount = finalSizeRaw / 1e6;

          const makerAmount = (finalSizeRaw * priceCents) / 100;

          if (makerAmount < 1000000) {
            const minSizeRaw = Math.ceil((1000000 * 100) / priceCents);
            const validMinSizeRaw = Math.ceil(minSizeRaw / finalDivisor) * finalDivisor;
            const minUSDC = (validMinSizeRaw * priceCents) / 100 / 1e6;
            return {
              success: false,
              error: `Order too small ($${(makerAmount / 1e6).toFixed(2)}). Minimum is $${minUSDC.toFixed(2)} at this price.`,
            };
          }

          console.log('[PolymarketProvider] Market BUY calculation:', {
            usdcInput: amount,
            priceWithSlippage,
            priceCents,
            gcdValue: d,
            sizeDivisor,
            finalDivisor,
            sizeExact,
            sizeRaw,
            finalSizeRaw,
            roundedAmount,
            makerAmount,
            makerAmountUSDC: makerAmount / 1e6,
            makerAmountValid: makerAmount % 10000 === 0,
            takerAmountValid: finalSizeRaw % 10 === 0,
          });
        } else {
          const d = gcd(priceCents, 1000);
          const takerDivisor = 1000 / d;
          const finalDivisor = Math.max(10000, takerDivisor);
          const sizeRaw = Math.floor(orderSize * 1e6);
          const finalSizeRaw = Math.floor(sizeRaw / finalDivisor) * finalDivisor;
          roundedAmount = finalSizeRaw / 1e6;

          const takerAmount = (finalSizeRaw * priceCents) / 100;

          console.log('[PolymarketProvider] Market SELL calculation:', {
            originalAmount: orderSize,
            priceCents,
            priceWithSlippage,
            gcdValue: d,
            takerDivisor,
            finalDivisor,
            sizeRaw,
            finalSizeRaw,
            roundedAmount,
            takerAmount,
            takerAmountUSDC: takerAmount / 1e6,
            makerAmountValid: finalSizeRaw % 10000 === 0,
            takerAmountValid: takerAmount % 10 === 0,
          });
        }

        if (roundedAmount <= 0) {
          return { success: false, error: 'Order size too small. Minimum is 0.01.' };
        }

        console.log('[PolymarketProvider] *** FINAL ORDER PARAMS ***:', {
          tokenId,
          price: priceWithSlippage,
          size: roundedAmount,
          side: side === Side.BUY ? 'BUY' : 'SELL',
          negRisk,
        });

        const signedOrder = await clientRef.current.createOrder(
          {
            tokenID: tokenId,
            price: priceWithSlippage,
            size: roundedAmount,
            side,
            feeRateBps: 0,
          },
          {
            tickSize: TICK_SIZES.DEFAULT,
            negRisk,
          }
        );

        console.log('[PolymarketProvider] Signed order:', JSON.stringify(signedOrder, null, 2));

        const orderType = side === Side.SELL ? OrderType.GTC : OrderType.FOK;
        console.log(
          '[PolymarketProvider] Using order type:',
          orderType === OrderType.GTC ? 'GTC' : 'FOK'
        );

        const response = await clientRef.current.postOrder(signedOrder, orderType);

        console.log('[PolymarketProvider] Market order response:', response);

        const respAny = response as Record<string, unknown>;
        if (
          respAny.error ||
          respAny.errorMsg ||
          respAny.status === 'error' ||
          respAny.success === false
        ) {
          const errorMsg = (respAny.error ||
            respAny.errorMsg ||
            respAny.message ||
            'Order failed') as string;
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }

        if (!response || (!respAny.id && !respAny.orderID && !respAny.orderIds)) {
          const errorMsg = 'Order may not have been placed. Please check your positions.';
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }

        return {
          success: true,
          orderId: (respAny.id || respAny.orderID || (respAny.orderIds as string[])?.[0]) as string,
          message: `Market ${side.toLowerCase()} executed`,
          order: response,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to execute market order';
        setError(message);
        console.error('[PolymarketProvider] Market order error:', err);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [proxyAddress]
  );

  // Cancel a specific order
  const cancelOrder = useCallback(async (orderId: string): Promise<boolean> => {
    if (!clientRef.current) {
      setError('Client not initialized');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await clientRef.current.cancelOrder({ orderID: orderId });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel order';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cancel all open orders
  const cancelAllOrders = useCallback(async (): Promise<boolean> => {
    if (!clientRef.current) {
      setError('Client not initialized');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await clientRef.current.cancelAll();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel all orders';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get open orders
  const getOpenOrders = useCallback(async (market?: string): Promise<unknown[]> => {
    if (!clientRef.current) {
      setError('Client not initialized');
      return [];
    }

    try {
      const response = market
        ? await clientRef.current.getOpenOrders({ market })
        : await clientRef.current.getOpenOrders();

      return response as unknown[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get open orders';
      setError(message);
      return [];
    }
  }, []);

  // Get USDC.e balance from proxy wallet (on-chain)
  const getBalances = useCallback(async (): Promise<{ usdc: string } | null> => {
    if (!signerRef.current || !proxyAddress) {
      console.log('[PolymarketProvider] getBalances: No signer or proxyAddress');
      return null;
    }

    try {
      const signer = signerRef.current;

      let provider;
      if ('provider' in signer && signer.provider) {
        provider = signer.provider;
      } else {
        console.error('[PolymarketProvider] Provider not available');
        return null;
      }

      const usdcContract = new Contract(USDC_ADDRESS, ERC20_ABI, provider);

      const balance = await usdcContract.balanceOf(proxyAddress);
      const balanceFormatted = formatUnits(balance, 6);

      console.log('[PolymarketProvider] Proxy wallet USDC.e balance:', balanceFormatted);

      return {
        usdc: (parseFloat(balanceFormatted) * 1_000_000).toString(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get balances';
      console.error('[PolymarketProvider] getBalances error:', err);
      return null;
    }
  }, [proxyAddress]);

  // Get position balance (outcome tokens) for a specific tokenId
  const getPositionBalance = useCallback(
    async (tokenId: string): Promise<string | null> => {
      if (!signerRef.current || !proxyAddress) {
        console.log('[PolymarketProvider] getPositionBalance: No signer or proxyAddress');
        return null;
      }

      try {
        const signer = signerRef.current;

        let provider;
        if ('provider' in signer && signer.provider) {
          provider = signer.provider;
        } else {
          console.error('[PolymarketProvider] Provider not available');
          return null;
        }

        const ctfContract = new Contract(CTF_CONTRACT, ERC1155_ABI, provider);

        const balance = await ctfContract.balanceOf(proxyAddress, tokenId);
        const balanceFormatted = formatUnits(balance, 6);

        console.log('[PolymarketProvider] Position balance for', tokenId, ':', balanceFormatted);

        return balanceFormatted;
      } catch (err) {
        console.error('[PolymarketProvider] getPositionBalance error:', err);
        return null;
      }
    },
    [proxyAddress]
  );

  // Get wallet balances (USDC in wallet + allowance to exchange)
  const getWalletBalances = useCallback(async (): Promise<WalletBalances | null> => {
    if (!signerRef.current) {
      setError('Signer not available');
      return null;
    }

    try {
      const signer = signerRef.current;
      const address = await signer.getAddress();

      let provider;
      if ('provider' in signer && signer.provider) {
        provider = signer.provider;
      } else {
        setError('Provider not available');
        return null;
      }

      const usdcContract = new Contract(USDC_ADDRESS, ERC20_ABI, provider);

      const [walletBalance, allowance] = await Promise.all([
        usdcContract.balanceOf(address),
        usdcContract.allowance(address, CTF_EXCHANGE_ADDRESS),
      ]);

      let tradingBalance = '0';
      if (clientRef.current) {
        try {
          const balanceAllowance = await clientRef.current.getBalanceAllowance({
            asset_type: AssetType.COLLATERAL,
          });
          tradingBalance = balanceAllowance.balance || '0';
        } catch {
          // Ignore error, use 0
        }
      }

      return {
        walletUsdc: formatUnits(walletBalance, 6),
        tradingBalance: (parseFloat(tradingBalance) / 1_000_000).toString(),
        allowance: formatUnits(allowance, 6),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get wallet balances';
      setError(message);
      console.error('[PolymarketProvider] getWalletBalances error:', err);
      return null;
    }
  }, []);

  // Deposit (Approve USDC.e to CTF Exchange)
  const deposit = useCallback(
    async (amount: number): Promise<{ success: boolean; error?: string; txHash?: string }> => {
      if (!signerRef.current) {
        return { success: false, error: 'Signer not available' };
      }

      if (amount <= 0) {
        return { success: false, error: 'Amount must be greater than 0' };
      }

      setIsLoading(true);
      setError(null);

      try {
        const signer = signerRef.current;
        const address = await signer.getAddress();

        let provider;
        if ('provider' in signer && signer.provider) {
          provider = signer.provider;
        } else {
          return { success: false, error: 'Provider not available' };
        }

        const usdcContract = new Contract(USDC_ADDRESS, ERC20_ABI, provider);
        const usdcWithSigner = usdcContract.connect(signer);

        const walletBalance = await usdcContract.balanceOf(address);
        const amountInUnits = parseUnits(amount.toString(), 6);

        if (walletBalance.lt(amountInUnits)) {
          const available = parseFloat(formatUnits(walletBalance, 6)).toFixed(2);
          return { success: false, error: `Insufficient USDC.e balance. Available: $${available}` };
        }

        console.log('[PolymarketProvider] Approving USDC.e to CTF Exchange:', {
          amount,
          amountInUnits: amountInUnits.toString(),
          spender: CTF_EXCHANGE_ADDRESS,
        });

        const tx = await usdcWithSigner.approve(CTF_EXCHANGE_ADDRESS, amountInUnits);
        console.log('[PolymarketProvider] Approval tx submitted:', tx.hash);

        const receipt = await tx.wait();
        console.log('[PolymarketProvider] Approval confirmed:', receipt.transactionHash);

        if (clientRef.current) {
          try {
            await clientRef.current.updateBalanceAllowance({ asset_type: AssetType.COLLATERAL });
            console.log('[PolymarketProvider] Balance allowance updated on Polymarket');
          } catch (err) {
            console.warn('[PolymarketProvider] Failed to update balance allowance:', err);
          }
        }

        return {
          success: true,
          txHash: receipt.transactionHash || tx.hash,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to deposit';
        setError(message);
        console.error('[PolymarketProvider] Deposit error:', err);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Withdraw (Revoke approval - set to 0)
  const withdraw = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
    txHash?: string;
  }> => {
    if (!signerRef.current) {
      return { success: false, error: 'Signer not available' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const signer = signerRef.current;

      let provider;
      if ('provider' in signer && signer.provider) {
        provider = signer.provider;
      } else {
        return { success: false, error: 'Provider not available' };
      }

      const usdcContract = new Contract(USDC_ADDRESS, ERC20_ABI, provider);
      const usdcWithSigner = usdcContract.connect(signer);

      console.log('[PolymarketProvider] Revoking USDC.e approval from CTF Exchange');

      const tx = await usdcWithSigner.approve(CTF_EXCHANGE_ADDRESS, 0);
      console.log('[PolymarketProvider] Revoke tx submitted:', tx.hash);

      const receipt = await tx.wait();
      console.log('[PolymarketProvider] Revoke confirmed:', receipt.transactionHash);

      if (clientRef.current) {
        try {
          await clientRef.current.updateBalanceAllowance({ asset_type: AssetType.COLLATERAL });
          console.log('[PolymarketProvider] Balance allowance updated on Polymarket');
        } catch (err) {
          console.warn('[PolymarketProvider] Failed to update balance allowance:', err);
        }
      }

      return {
        success: true,
        txHash: receipt.transactionHash || tx.hash,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to withdraw';
      setError(message);
      console.error('[PolymarketProvider] Withdraw error:', err);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Approve tokens via relayer for proxy wallet
  const approveTokensViaRelayer = useCallback(
    async (negRisk = false): Promise<{ success: boolean; error?: string }> => {
      if (!relayClientRef.current) {
        return { success: false, error: 'Relayer client not initialized' };
      }

      if (!signerRef.current) {
        return { success: false, error: 'Signer not available' };
      }

      setIsLoading(true);
      setError(null);

      try {
        const approveData = APPROVE_INTERFACE.encodeFunctionData('approve', [
          negRisk ? NEG_RISK_CTF_EXCHANGE : CTF_EXCHANGE_ADDRESS,
          MAX_ALLOWANCE,
        ]);

        const ctfApproveData = APPROVE_INTERFACE.encodeFunctionData('approve', [
          CTF_CONTRACT,
          MAX_ALLOWANCE,
        ]);

        const transactions = [
          {
            to: USDC_ADDRESS,
            data: approveData,
            value: '0',
          },
          {
            to: USDC_ADDRESS,
            data: ctfApproveData,
            value: '0',
          },
        ];

        if (negRisk) {
          const negRiskApproveData = APPROVE_INTERFACE.encodeFunctionData('approve', [
            NEG_RISK_CTF_EXCHANGE,
            MAX_ALLOWANCE,
          ]);
          transactions.push({
            to: USDC_ADDRESS,
            data: negRiskApproveData,
            value: '0',
          });
        }

        console.log('[PolymarketProvider] Approving tokens via relayer:', {
          exchange: negRisk ? NEG_RISK_CTF_EXCHANGE : CTF_EXCHANGE_ADDRESS,
          transactions: transactions.length,
        });

        const response = await relayClientRef.current.execute(
          transactions,
          'Approve USDC for trading'
        );

        console.log('[PolymarketProvider] Relayer response:', response);

        const result = await response.wait();
        console.log('[PolymarketProvider] Transaction mined:', result);

        if (clientRef.current) {
          try {
            await clientRef.current.updateBalanceAllowance({ asset_type: AssetType.COLLATERAL });
            console.log('[PolymarketProvider] Balance allowance updated on Polymarket');
          } catch (err) {
            console.warn('[PolymarketProvider] Failed to update balance allowance:', err);
          }
        }

        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to approve tokens';
        console.error('[PolymarketProvider] Approve tokens error:', err);
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const value: PolymarketContextValue = {
    isInitialized,
    isLoading,
    error,
    credentials,
    proxyAddress,
    initialize,
    restoreSession,
    clearSession,
    placeOrder,
    placeMarketOrder,
    cancelOrder,
    cancelAllOrders,
    getOpenOrders,
    getBalances,
    getPositionBalance,
    getWalletBalances,
    deposit,
    withdraw,
    approveTokensViaRelayer,
  };

  return <PolymarketContext.Provider value={value}>{children}</PolymarketContext.Provider>;
}

export function usePolymarket() {
  const context = useContext(PolymarketContext);
  if (!context) {
    throw new Error('usePolymarket must be used within a PolymarketProvider');
  }
  return context;
}

// Re-export Side and OrderType for convenience
export { Side, OrderType };