# Chainlink Wallet Monitor

A Next.js wallet dashboard for Ethereum Mainnet, Base Mainnet and BNB Smart Chain. It combines RainbowKit wallet connection, Wagmi/Viem wallet reads and user-approved native-coin transfers with the existing read-only public wallet report, CoinGecko market prices, GeckoTerminal trending pools and BNB Chain DEX analytics.

## Setup on Chromebook Linux

1. Install Node.js 20 or later and Git.
2. Clone the existing repository and use the main branch:
   ```bash
   git clone https://github.com/bperry080-maker/web3-crypto-exchange.git
   cd web3-crypto-exchange
   git switch main
   npm install
   ```
3. Create a local environment file:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```
4. Add your public WalletConnect Cloud project ID to `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` if you want QR/deep-link wallet connections. Create the ID at https://cloud.walletconnect.com/. It is a public client identifier, not a private key.
5. Add your own HTTPS QuickNode RPC endpoint URLs to `ETHEREUM_RPC_URL`, `BASE_RPC_URL` and `BNB_RPC_URL` for the server-side public-address report. Keep these server-side; never use a `NEXT_PUBLIC_` prefix.
6. Run the frontend:
   ```bash
   npm run dev:web
   ```
7. Open http://localhost:3000.

## Wallet behavior and safety

- RainbowKit provides wallet connection and account/network UI.
- Wagmi and Viem read the connected account's native coin balance on Ethereum, Base or BNB Smart Chain.
- Native-coin transfers require the user to review the destination and amount, click the explicit confirmation button, and approve the request in the connected wallet.
- The wallet shows the network fee before the user approves. Keep additional native coin available for gas.
- The app does not store private keys or recovery phrases.
- No automatic/background transfers, token transfers, swaps, contract approvals or payment automation are enabled.
- A submitted transaction can be irreversible. Verify the destination, amount, network and fee before approving.

The wallet connection layer uses the wallet's selected provider for interactive account operations. The existing server-side public-address report continues to use the private server environment variables below. No Alchemy endpoint is configured by this integration.

## Server-side environment variables

Configure these in `apps/web/.env.local` for local testing and in Netlify site environment variables only when separately approved for deployment:

- `ETHEREUM_RPC_URL`: HTTPS Ethereum Mainnet JSON-RPC endpoint.
- `BASE_RPC_URL`: HTTPS Base Mainnet JSON-RPC endpoint.
- `BNB_RPC_URL`: HTTPS BNB Smart Chain JSON-RPC endpoint.
- `ETHEREUM_TOKENS`, `BASE_TOKENS`, `BNB_TOKENS`: optional comma-separated, server-approved token entries in `contractAddress:SYMBOL:DECIMALS` format.
- `COINGECKO_DEMO_API_KEY` or `COINGECKO_PRO_API_KEY`: optional server-side CoinGecko key. Keep private; never use a `NEXT_PUBLIC_` prefix.

Example token format only (not a recommended contract): `0x0000000000000000000000000000000000000000:EXAMPLE:18`. Do not use the zero address as a real token. Independently verify each contract on the correct chain before allowlisting it. The endpoint accepts at most 20 configured token entries per network.

Never commit `.env.local` or API keys. Rotate any key accidentally committed to Git history.

## Existing read-only dashboard

- Checks the configured server RPC chain ID before querying public wallet balances.
- Reads native coin quantities with `eth_getBalance`.
- Reads optional ERC-20 quantities only for server-configured token contracts.
- Shows CoinGecko spot market prices for BTC, ETH, LINK and USDT when available.
- Shows GeckoTerminal trending pools and BNB Chain DEX analytics when available.
- Labels missing or failed data instead of silently treating them as zero.

Market and pool metrics are third-party data and may be delayed, incomplete or unavailable on some API plans. This MVP is a technical demonstration, not an audited financial service.

## Test before any deployment

Run `npm install`, `npm run build:web`, then test wallet connection and network switching on all three supported networks. Use a test wallet with no valuable funds first. Confirm a small test transaction only if you explicitly choose to do so. Compare balance results with independent explorers, add request throttling and monitoring, set provider billing alerts, and publish privacy and service terms before public launch.

No deployment, merge, or real transaction is performed by this setup change.
