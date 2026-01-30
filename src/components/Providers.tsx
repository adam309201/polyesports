'use client';

import { ReactNode, useMemo } from 'react';
import { createConfig, WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'viem';
import { polygon } from 'viem/chains';
import { metaMask, walletConnect, coinbaseWallet, injected } from 'wagmi/connectors';
import WalletProvider from '@/providers/WalletContext';
import TradingProvider from '@/providers/TradingProvider';
import { PolymarketProvider } from '@/contexts/PolymarketContext';
import { ConnectWalletModalProvider } from '@/hooks/useConnectWalletModal';
import AuthFlowManager from './AuthFlowManager';
import { createTheme, ThemeProvider } from '@mui/material';
import { basicTheme } from '@/theme';

// WalletConnect Project ID
const WALLETCONNECT_PROJECT_ID = '44dbb693da67b69818f9aa8a80ad8bd3';

// Create wagmi config with connectors
const config = createConfig({
  chains: [polygon],
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'Polyme',
        url: 'https://polyme.market',
        iconUrl: 'https://www.polyme.market/favicon_64_64.png',
      },
    }),
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      metadata: {
        name: 'Polyme',
        description: 'Polymarket Trading Interface',
        url: 'https://polyme.market',
        icons: ['https://www.polyme.market/favicon_64_64.png'],
      },
      showQrModal: true,
    }),
    coinbaseWallet({
      appName: 'Polyme',
      appLogoUrl: 'https://www.polyme.market/favicon_64_64.png',
    }),
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [polygon.id]: http(),
  },
});

const queryClient = new QueryClient();

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const theme = useMemo(() => {
    return createTheme(basicTheme);
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <WalletProvider>
            <TradingProvider>
              <PolymarketProvider>
                <ConnectWalletModalProvider>
                  <AuthFlowManager />
                  {children}
                </ConnectWalletModalProvider>
              </PolymarketProvider>
            </TradingProvider>
          </WalletProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}