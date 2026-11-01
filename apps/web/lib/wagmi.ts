'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, bsc, mainnet } from 'wagmi/chains';

export const supportedChains = [mainnet, base, bsc] as const;

export const wagmiConfig = getDefaultConfig({
  appName: 'Chainlink Wallet Monitor',
  // WalletConnect QR/deep-link connections require a project ID from cloud.walletconnect.com.
  // Injected wallet connections can still be tested while this is unset.
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_WALLETCONNECT_PROJECT_ID',
  chains: supportedChains,
  ssr: true,
});
