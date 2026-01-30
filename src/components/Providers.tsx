'use client';

import { ReactNode, useMemo } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { polygon } from 'viem/chains';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import WalletProvider from '@/providers/WalletContext';
import TradingProvider from '@/providers/TradingProvider';
import { PolymarketProvider } from '@/contexts/PolymarketContext';
import { ConnectWalletModalProvider } from '@/hooks/useConnectWalletModal';
import AuthFlowManager from './AuthFlowManager';
import { createTheme, ThemeProvider } from '@mui/material';
import { basicTheme } from '@/theme';

const config = getDefaultConfig({
  appName: 'Polyme',
  projectId: '44dbb693da67b69818f9aa8a80ad8bd3',
  chains: [polygon],
  ssr: true,
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
        <RainbowKitProvider locale={'en'} modalSize={'compact'}>
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
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}