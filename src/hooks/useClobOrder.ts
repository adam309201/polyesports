import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Side, OrderType } from '@polymarket/clob-client';
import type { ClobClient, UserOrder, UserMarketOrder, TickSize } from '@polymarket/clob-client';

// Valid tick sizes as per Polymarket API
const VALID_TICK_SIZES: TickSize[] = ['0.1', '0.01', '0.001', '0.0001'];

function normalizeTickSize(tickSize: string | undefined): TickSize {
  if (tickSize && VALID_TICK_SIZES.includes(tickSize as TickSize)) {
    return tickSize as TickSize;
  }
  return '0.01'; // Default
}

export type OrderParams = {
  tokenId: string;
  size: number;
  price?: number;
  side: 'BUY' | 'SELL';
  negRisk?: boolean;
  isMarketOrder?: boolean;
  tickSize?: string;
};

export default function useClobOrder(
  clobClient: ClobClient | null,
  walletAddress: string | undefined
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const submitOrder = useCallback(
    async (params: OrderParams) => {
      if (!walletAddress) {
        throw new Error('Wallet not connected');
      }
      if (!clobClient) {
        throw new Error('CLOB client not initialized');
      }

      setIsSubmitting(true);
      setError(null);
      setOrderId(null);

      try {
        const side = params.side === 'BUY' ? Side.BUY : Side.SELL;
        let response;

        if (params.isMarketOrder) {
          // Use createAndPostMarketOrder for market orders
          // This method handles price calculation automatically
          const marketOrder: UserMarketOrder = {
            tokenID: params.tokenId,
            // For BUY: amount is in dollars
            // For SELL: amount is in shares
            amount: params.size,
            side,
            feeRateBps: 0,
          };

          const tickSize = normalizeTickSize(params.tickSize);

          console.log('[useClobOrder] Submitting market order:', {
            tokenId: params.tokenId,
            amount: params.size,  marketAmount: 1,
            side: params.side,
            negRisk: params.negRisk,
            tickSize,
          });

          // Use FOK (Fill-or-Kill) for market orders
          // This ensures the order is either fully filled or cancelled
          response = await clobClient.createAndPostMarketOrder(
            marketOrder,
            { negRisk: params.negRisk, tickSize },
            OrderType.FOK
          );
        } else {
          if (!params.price) {
            throw new Error('Price required for limit orders');
          }

          // Round size to avoid precision issues (max 2 decimal places)
          const roundedSize = Math.floor(params.size * 100) / 100;

          const limitOrder: UserOrder = {
            tokenID: params.tokenId,
            price: params.price,
            size: roundedSize,
            side,
            feeRateBps: 0,
            expiration: 0,
            taker: '0x0000000000000000000000000000000000000000',
          };

          const tickSize = normalizeTickSize(params.tickSize);

          console.log('[useClobOrder] Submitting limit order:', {
            tokenId: params.tokenId,
            price: params.price,
            size: roundedSize,
            side: params.side,
            negRisk: params.negRisk,
            tickSize,
          });

          response = await clobClient.createAndPostOrder(
            limitOrder,
            { negRisk: params.negRisk, tickSize },
            OrderType.GTC
          );

          console.log('[useClobOrder] Limit order response:', response);
        }

        console.log('[useClobOrder] Order response:', response);

        if (response.orderID) {
          setOrderId(response.orderID);
          queryClient.invalidateQueries({ queryKey: ['active-orders'] });
          queryClient.invalidateQueries({ queryKey: ['polymarket-positions'] });
          return { success: true, orderId: response.orderID };
        } else if (response.errorMsg || response.error) {
          throw new Error(response.errorMsg || response.error || 'Order submission failed');
        } else {
          throw new Error('Order submission failed - no order ID returned');
        }
      } catch (err: any) {
        console.error('[useClobOrder] Order error:', err);
        const errorMessage = err?.response?.data?.error || err?.message || 'Failed to submit order';
        const error = new Error(errorMessage);
        setError(error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [clobClient, walletAddress, queryClient]
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      if (!clobClient) {
        throw new Error('CLOB client not initialized');
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await clobClient.cancelOrder({ orderID: orderId });
        queryClient.invalidateQueries({ queryKey: ['active-orders'] });
        return { success: true };
      } catch (err: any) {
        const error = err instanceof Error ? err : new Error('Failed to cancel order');
        setError(error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [clobClient, queryClient]
  );

  const cancelAllOrders = useCallback(async () => {
    if (!clobClient) {
      throw new Error('CLOB client not initialized');
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await clobClient.cancelAll();
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      return { success: true };
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error('Failed to cancel all orders');
      setError(error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [clobClient, queryClient]);

  return {
    submitOrder,
    cancelOrder,
    cancelAllOrders,
    isSubmitting,
    error,
    orderId,
  };
}