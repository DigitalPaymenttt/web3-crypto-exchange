'use client';

import { useEffect, useState } from 'react';

type MarketPrice = {
  id: string; name: string; symbol: string; current_price: number | null;
  market_cap: number | null; total_volume: number | null;
  price_change_percentage_24h: number | null; last_updated: string | null;
};
type Pool = {
  id: string; network: string; name: string; address: string;
  baseTokenPriceUsd: number | null; quoteTokenPriceUsd: number | null;
  priceChange24h: number | null; volume24hUsd: number | null;
  reserveUsd: number | null; dex: string | null;
};
type DashboardData = {
  generatedAt: string; priceSource: string; prices: MarketPrice[];
  pools: Pool[]; warnings: string[]; safetyNote: string;
};

const money = (value: number | null, digits = 2) => value == null || !Number.isFinite(value)
  ? 'Unavailable'
  : value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits });
const compactMoney = (value: number | null) => value == null || !Number.isFinite(value)
  ? 'Unavailable'
  : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(value);

export default function MarketDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/market-dashboard', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? 'Market data request failed.');
      setData(payload as DashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Market data request failed.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  return <section className="panel">
    <div className="section-heading">
      <div>
        <h2>Live market data &amp; trending pools</h2>
        <p className="muted">CoinGecko market prices, GeckoTerminal trending pools, and BNB Chain DEX analytics. Read-only.</p>
      </div>
      <button className="secondary-button" type="button" onClick={() => void refresh()} disabled={loading}>
        {loading ? 'Refreshing…' : 'Refresh data'}
      </button>
    </div>

    {error ? <div className="notice error" role="alert">{error}</div> : null}
    {loading && !data ? <p className="hint">Loading market data…</p> : null}
    {data ? <>
      <p className="hint">Retrieved {new Date(data.generatedAt).toLocaleString()} · Price source: {data.priceSource}</p>
      <h3>Market snapshot</h3>
      {data.prices.length ? <div className="network-grid market-cards">
        {data.prices.map((coin) => <article className="network-card" key={coin.id}>
          <h3>{coin.name} ({coin.symbol})</h3>
          <div className="balance">{money(coin.current_price, coin.current_price != null && coin.current_price < 1 ? 6 : 2)}</div>
          <p className={coin.price_change_percentage_24h != null && coin.price_change_percentage_24h < 0 ? 'market-change negative' : 'market-change positive'}>
            {coin.price_change_percentage_24h == null ? '24h change unavailable' : `${coin.price_change_percentage_24h >= 0 ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}% over 24h`}
          </p>
          <p className="hint">Market cap: {compactMoney(coin.market_cap)}</p>
          <p className="hint">24h volume: {compactMoney(coin.total_volume)}</p>
        </article>)}
      </div> : <p className="hint">No market prices returned. Confirm server-side CoinGecko credentials and plan access.</p>}

      <h3 className="subsection-heading">Trending pools across networks, including BNB Chain</h3>
      {data.pools.length ? <div className="table-wrap"><table>
        <thead><tr><th>Pool</th><th>Network / DEX</th><th>24h change</th><th>24h volume</th><th>Liquidity reserve</th><th>Pool address</th></tr></thead>
        <tbody>{data.pools.map((pool) => <tr key={pool.id}>
          <td>{pool.name}</td>
          <td>{pool.network.toUpperCase()} / {pool.dex ?? 'Unknown DEX'}</td>
          <td className={pool.priceChange24h != null && pool.priceChange24h < 0 ? 'negative' : 'positive'}>
            {pool.priceChange24h == null ? 'Unavailable' : `${pool.priceChange24h >= 0 ? '+' : ''}${pool.priceChange24h.toFixed(2)}%`}
          </td>
          <td>{compactMoney(pool.volume24hUsd)}</td>
          <td>{compactMoney(pool.reserveUsd)}</td>
          <td>{pool.address ? <a href={`https://www.geckoterminal.com/${encodeURIComponent(pool.network)}/pools/${encodeURIComponent(pool.address)}`} target="_blank" rel="noreferrer">{pool.address.slice(0, 8)}…{pool.address.slice(-6)}</a> : 'Unavailable'}</td>
        </tr>)}</tbody>
      </table></div> : <p className="hint">No trending pools returned. GeckoTerminal data may be temporarily unavailable.</p>}
      {data.warnings.map((warning, index) => <div className="notice" key={index}>{warning}</div>)}
      <p className="hint">{data.safetyNote}</p>
    </> : null}
  </section>;
}
