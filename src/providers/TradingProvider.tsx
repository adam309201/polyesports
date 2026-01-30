'use client';

import { createContext, useContext, ReactNode, useCallback } from 'react';
import type { ClobClient } from '@polymarket/clob-client';
import type { RelayClient } from '@polymarket/builder-relayer-client';
import { useWallet } from './WalletContext';
import useClobClient from '@/hooks/useClobClient';
import useTradingSession from '@/hooks/useTradingSession';
import useSafeDeployment from '@/hooks/useSafeDeployment';
import useClobOrder, { OrderParams } from '@/hooks/useClobOrder';
import { TradingSession, SessionStep } from '@/utils/session';
import { createPublicClient, http, erc20Abi } from 'viem';
import { polygon } from 'viem/chains';
import { formatUnits } from 'viem';

const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const CTF_CONTRACT = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const POLYGON_RPC_URL = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com';

const ERC1155_ABI = [
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Note: CTF_REDEEM_ABI not needed as we encode calldata manually

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(POLYGON_RPC_URL),
});

// Order types
interface OpenOrder {
  id: string;
  asset_id: string;
  side: string;
  price: string;
  original_size: string;
  size_matched: string;
  created_at: number;
  status?: string;
  outcome?: string;
}

interface TradeRecord {
  id: string;
  asset_id: string;
  side: string;
  price: string;
  size: string;
  status: string;
  match_time: number;
  outcome?: string;
  transaction_hash?: string;
}

interface TradingContextType {
  // Session state
  tradingSession: TradingSession | null;
  currentStep: SessionStep;
  sessionError: Error | null;
  isTradingSessionComplete: boolean;

  // Session actions
  initializeTradingSession: () => Promise<void>;
  endTradingSession: () => void;

  // Clients
  clobClient: ClobClient | null;
  relayClient: RelayClient | null;

  // Addresses
  eoaAddress: string | undefined;
  safeAddress: string | undefined;

  // Order actions
  submitOrder: (params: OrderParams) => Promise<{ success: boolean; orderId?: string }>;
  cancelOrder: (orderId: string) => Promise<{ success: boolean }>;
  cancelAllOrders: () => Promise<{ success: boolean }>;
  isSubmitting: boolean;
  orderError: Error | null;

  // Balance
  getBalances: () => Promise<{ usdc: string } | null>;
  getEoaUsdcBalance: () => Promise<string | null>;
  getPositionBalance: (tokenId: string) => Promise<string | null>;

  // Orders & History
  getOpenOrders: (assetIds?: string[]) => Promise<OpenOrder[]>;
  getTrades: (assetIds?: string[]) => Promise<TradeRecord[]>;

  // Withdraw
  withdrawToWallet: (
    amount: string
  ) => Promise<{ success: boolean; txHash?: string; error?: string }>;

  // Redeem
  redeemPositions: (
    conditionId: string,
    indexSets: number[]
  ) => Promise<{ success: boolean; txHash?: string; error?: string }>;
}

const TradingContext = createContext<TradingContextType | null>(null);

export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error('useTrading must be used within TradingProvider');
  return ctx;
}

export default function TradingProvider({ children }: { children: ReactNode }) {
  const { eoaAddress } = useWallet();
  const { derivedSafeAddressFromEoa } = useSafeDeployment();

  const {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete,
    initializeTradingSession,
    endTradingSession,
    relayClient,
  } = useTradingSession();

  const { clobClient } = useClobClient(tradingSession, isTradingSessionComplete);

  const {
    submitOrder,
    cancelOrder,
    cancelAllOrders,
    isSubmitting,
    error: orderError,
  } = useClobOrder(clobClient, derivedSafeAddressFromEoa || undefined);

  // Get USDC balance from Safe wallet
  const getBalances = useCallback(async (): Promise<{ usdc: string } | null> => {
    if (!derivedSafeAddressFromEoa) {
      return null;
    }

    try {
      const balance = await publicClient.readContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [derivedSafeAddressFromEoa as `0x${string}`],
      });

      const balanceFormatted = formatUnits(balance, 6);
      // Return in raw units (multiply by 1e6 for compatibility)
      return {
        usdc: (parseFloat(balanceFormatted) * 1_000_000).toString(),
      };
    } catch (err) {
      console.error('[TradingProvider] getBalances error:', err);
      return null;
    }
  }, [derivedSafeAddressFromEoa]);

  // Get USDC balance from EOA wallet
  const getEoaUsdcBalance = useCallback(async (): Promise<string | null> => {
    if (!eoaAddress) {
      return null;
    }

    try {
      const balance = await publicClient.readContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [eoaAddress as `0x${string}`],
      });

      const balanceFormatted = formatUnits(balance, 6);
      return balanceFormatted;
    } catch (err) {
      console.error('[TradingProvider] getEoaUsdcBalance error:', err);
      return null;
    }
  }, [eoaAddress]);

  // Get position balance (ERC1155) from Safe wallet
  const getPositionBalance = useCallback(
    async (tokenId: string): Promise<string | null> => {
      if (!derivedSafeAddressFromEoa || !tokenId) {
        console.log('[TradingProvider] getPositionBalance: missing params', {
          derivedSafeAddressFromEoa,
          tokenId,
        });
        return null;
      }

      try {
        const balance = await publicClient.readContract({
          address: CTF_CONTRACT as `0x${string}`,
          abi: ERC1155_ABI,
          functionName: 'balanceOf',
          args: [derivedSafeAddressFromEoa as `0x${string}`, BigInt(tokenId)],
        });

        // CTF tokens have 6 decimals like USDC
        const balanceFormatted = formatUnits(balance, 6);
        return balanceFormatted;
      } catch (err) {
        console.error('[TradingProvider] getPositionBalance error:', err);
        return null;
      }
    },
    [derivedSafeAddressFromEoa]
  );

  // Get open orders for specific asset IDs
  const getOpenOrders = useCallback(
    async (assetIds?: string[]): Promise<OpenOrder[]> => {
      if (!clobClient) {
        return [];
      }

      try {
        const orders = await clobClient.getOpenOrders();

        // Filter by asset IDs if provided
        let filteredOrders = orders as OpenOrder[];
        if (assetIds && assetIds.length > 0) {
          filteredOrders = filteredOrders.filter((order) => assetIds.includes(order.asset_id));
        }

        return filteredOrders;
      } catch (err) {
        console.error('[TradingProvider] getOpenOrders error:', err);
        return [];
      }
    },
    [clobClient]
  );

  // Get trade history for specific asset IDs
  const getTrades = useCallback(
    async (assetIds?: string[]): Promise<TradeRecord[]> => {
      if (!clobClient) {
        return [];
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await (clobClient as any).getTrades();
        console.log('[TradingProvider] getTrades: raw response', response);

        // Handle different response formats
        let trades: TradeRecord[] = [];
        if (Array.isArray(response)) {
          trades = response;
        } else if (response?.trades && Array.isArray(response.trades)) {
          trades = response.trades;
        } else if (response?.data && Array.isArray(response.data)) {
          trades = response.data;
        }

        // Filter by asset IDs if provided
        let filteredTrades = trades;
        if (assetIds && assetIds.length > 0) {
          filteredTrades = filteredTrades.filter((trade) => assetIds.includes(trade.asset_id));
        }

        // Sort by match_time descending (newest first)
        filteredTrades.sort((a, b) => (b.match_time || 0) - (a.match_time || 0));

        return filteredTrades;
      } catch (err) {
        console.error('[TradingProvider] getTrades error:', err);
        return [];
      }
    },
    [clobClient]
  );

  // Withdraw USDC from Safe wallet to EOA wallet
  const withdrawToWallet = useCallback(
    async (amount: string): Promise<{ success: boolean; txHash?: string; error?: string }> => {
      if (!relayClient) {
        return { success: false, error: 'Trading session not initialized' };
      }

      if (!eoaAddress) {
        return { success: false, error: 'Wallet not connected' };
      }

      try {
        // Convert amount to USDC units (6 decimals)
        const amountInUnits = BigInt(Math.floor(parseFloat(amount) * 1_000_000));

        // Create ERC20 transfer calldata
        const transferData = `0xa9059cbb${eoaAddress.slice(2).padStart(64, '0')}${amountInUnits.toString(16).padStart(64, '0')}`;

        // Execute transfer through relay client
        const tx = {
          to: USDC_ADDRESS,
          data: transferData,
          value: '0',
        };

        const response = await relayClient.execute([tx], `Withdraw ${amount} USDC to wallet`);
        const receipt = await response.wait();

        return {
          success: true,
          txHash: receipt?.transactionHash || response.hash,
        };
      } catch (err) {
        console.error('[TradingProvider] withdrawToWallet error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Withdraw failed';
        return { success: false, error: errorMessage };
      }
    },
    [relayClient, eoaAddress]
  );

  // Redeem positions for resolved markets
  // Following Polymarket docs: https://docs.polymarket.com
  const redeemPositions = useCallback(
    async (
      conditionId: string,
      indexSets: number[]
    ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
      console.log('[TradingProvider] redeemPositions called:', { conditionId, indexSets });

      if (!relayClient) {
        console.error('[TradingProvider] relayClient not available');
        return { success: false, error: 'Trading session not initialized' };
      }

      try {
        const { encodeFunctionData } = await import('viem');

        // Following exact format from Polymarket docs
        const parentCollectionId = '0x0000000000000000000000000000000000000000000000000000000000000000';
        const conditionIdHex = conditionId.startsWith('0x') ? conditionId : `0x${conditionId}`;

        const redeemTx = {
          to: CTF_CONTRACT,
          data: encodeFunctionData({
            abi: [{
              name: 'redeemPositions',
              type: 'function',
              inputs: [
                { name: 'collateralToken', type: 'address' },
                { name: 'parentCollectionId', type: 'bytes32' },
                { name: 'conditionId', type: 'bytes32' },
                { name: 'indexSets', type: 'uint256[]' }
              ],
              outputs: []
            }],
            functionName: 'redeemPositions',
            args: [USDC_ADDRESS, parentCollectionId, conditionIdHex, indexSets.map(BigInt)]
          }),
          value: '0'
        };

        console.log('[TradingProvider] redeemTx:', redeemTx);

        const response = await relayClient.execute([redeemTx], 'Redeem positions');
        console.log('[TradingProvider] Response:', response);

        const receipt = await response.wait();
        console.log('[TradingProvider] Receipt:', receipt);

        return {
          success: true,
          txHash: receipt?.transactionHash || response.hash,
        };
      } catch (err) {
        console.error('[TradingProvider] redeemPositions error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Redeem failed';
        return { success: false, error: errorMessage };
      }
    },
    [relayClient]
  );

  return (
    <TradingContext.Provider
      value={{
        tradingSession,
        currentStep,
        sessionError,
        isTradingSessionComplete,
        initializeTradingSession,
        endTradingSession,
        clobClient,
        relayClient,
        eoaAddress,
        safeAddress: derivedSafeAddressFromEoa || undefined,
        submitOrder,
        cancelOrder,
        cancelAllOrders,
        isSubmitting,
        orderError,
        getBalances,
        getEoaUsdcBalance,
        getPositionBalance,
        getOpenOrders,
        getTrades,
        withdrawToWallet,
        redeemPositions,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}