# Web3 Wallet Monitor MVP

A read-only EVM wallet and market-data dashboard for Ethereum Mainnet, Base Mainnet and BNB Smart Chain. It includes public wallet balances, CoinGecko market prices, GeckoTerminal trending pools, and BNB Chain on-chain DEX analytics through CoinGecko. This MVP does not connect to wallets, sign transactions, or move funds.

## Setup on Chromebook Linux

1. Install Node.js 20 or later and Git.
2. Clone the repository and switch to the feature branch:
   ```bash
   git clone https://github.com/bperry080-maker/web3-crypto-exchange.git
   cd web3-crypto-exchange
   git switch feature/wallet-intelligence-circle-cpn
   npm install
   ```
3. Create a local environment file for the Next.js app:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```
4. Edit `apps/web/.env.local` and add your own HTTPS RPC endpoint URLs and CoinGecko Demo or Pro API key. Use provider dashboard secrets, not URLs or keys copied into source code.
5. Run the frontend:
   ```bash
   npm run dev:web
   ```
6. Open `http://localhost:3000`, enter a public EVM address and generate the report.

## Server-side environment variables

Configure these in `apps/web/.env.local` for local testing and in Netlify site environment variables for deployment:

- `ETHEREUM_RPC_URL`: HTTPS Ethereum Mainnet JSON-RPC endpoint.
- `BASE_RPC_URL`: HTTPS Base Mainnet JSON-RPC endpoint.
- `BNB_RPC_URL`: HTTPS BNB Smart Chain JSON-RPC endpoint.
- `ETHEREUM_TOKENS`, `BASE_TOKENS`, `BNB_TOKENS`: optional comma-separated, server-approved token entries in `contractAddress:SYMBOL:DECIMALS` format.
- `COINGECKO_DEMO_API_KEY` or `COINGECKO_PRO_API_KEY`: optional server-side CoinGecko key used for market prices, token lookup and BNB Chain on-chain DEX analytics. Keep the key private; never use a `NEXT_PUBLIC_` prefix. Your CoinGecko plan must permit the requested on-chain DEX endpoints.

Example token format only (not a recommended contract): `0x0000000000000000000000000000000000000000:EXAMPLE:18`. Do not use the zero address as a real token. Independently verify each contract on the correct chain before allowlisting it. The endpoint accepts at most 20 configured token entries per network.

Never prefix RPC variables or API keys with `NEXT_PUBLIC_`. Never commit `.env.local` or API keys. Rotate any key accidentally committed to Git history.

## What the dashboard provides

- Checks the configured RPC chain ID before querying public wallet balances.
- Reads native coin quantities with `eth_getBalance`.
- Reads optional ERC-20 quantities only for server-configured token contracts.
- Shows CoinGecko spot market prices for BTC, ETH, LINK and USDT when available.
- Shows global GeckoTerminal trending pools.
- Requests BNB Smart Chain trending pools from CoinGecko's on-chain DEX API using the `bsc` network identifier.
- Displays reported pool price change, 24-hour volume, reserve/liquidity and DEX where returned.
- Labels missing or failed data instead of silently treating it as zero.

Market and pool metrics are third-party data and may be delayed, incomplete, unavailable on some API plans, or subject to upstream rate limits. A displayed pool reserve is not a guarantee that liquidity can be withdrawn at the displayed value.

## Current limitations and launch checklist

This MVP does not calculate wallet USD valuations, discover every wallet token automatically, authenticate business customers, save reports, execute payments, or provide abuse protection/rate limiting. The BNB DEX addition is market-data only; it does not change wallet RPC configuration or enable transfers.

Before public launch, run a production build, test each RPC against the official chain ID, compare balances with an independent explorer, confirm CoinGecko plan access, add request throttling and usage monitoring, set provider billing alerts, and publish privacy and service terms. This MVP is a technical demonstration, not an audited financial service.
