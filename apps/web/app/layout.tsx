import './globals.css';
import type { Metadata } from 'next';
import Web3Providers from '../components/Web3Providers';

export const metadata: Metadata = {
  title: 'Chainlink Wallet Monitor | Web3 Crypto Exchange',
  description: 'Wallet connection, user-approved transactions, and public EVM balance reports for Ethereum, Base and BNB Chain.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Web3Providers>{children}</Web3Providers>
      </body>
    </html>
  );
}
