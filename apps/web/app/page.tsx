import WalletMonitor from '../components/WalletMonitor';
import WalletPanel from '../components/WalletPanel';
import MarketDashboard from '../components/MarketDashboard';
import TokenLookup from '../components/TokenLookup';

export default function HomePage() {
  return (
    <main className="page-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">Wallet connection · public-chain data</div>
          <h1>Chainlink Wallet Monitor</h1>
          <p className="muted">Connect a wallet, review native-coin balances, and approve transfers only through your wallet.</p>
        </div>
        <span className="chip">User approval required</span>
      </header>
      <WalletPanel />
      <WalletMonitor />
      <MarketDashboard />
      <TokenLookup />
      <footer className="footer-note">
        Wallet connection does not move funds. Transfers are submitted only after the user reviews the details and approves the request in their wallet. The public-address monitor and market tools remain read-only. Token transfers, swaps, automatic payments and background transfers are not enabled.
      </footer>
    </main>
  );
}
