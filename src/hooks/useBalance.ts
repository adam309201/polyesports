import { useQuery } from '@tanstack/react-query';
import { useTrading } from '@/providers/TradingProvider';
import { useAccount } from 'wagmi';

export const useBalance = () => {
  const { getBalances, safeAddress } = useTrading();
  const { isConnected, address } = useAccount();

  const {
    data: { tradingBalance = 0, positionBalance = 0 } = {},
    refetch: refetchPositionBalance,
  } = useQuery({
    queryKey: ['GetUserBalance', safeAddress, isConnected, address],
    queryFn: async () => {
      const [balanceResult, positionsRes] = await Promise.all([
        getBalances(),
        fetch(`/api/positions?address=${safeAddress}`)
          .then((r) => r.json())
          .catch(() => ({ positions: [] })),
      ]);

      const tradingBalance = Number(balanceResult?.usdc ?? 0) / 1_000_000;
      const positionBalance = positionsRes.positions.reduce(
        (sum: number, pos: { value?: number }) => sum + (pos.value || 0),
        0
      );
      return { tradingBalance, positionBalance };
    },
    enabled: !!safeAddress,
    refetchInterval: 5000,
  });

  return { refetchPositionBalance, tradingBalance, positionBalance };
};
