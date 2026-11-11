import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CoinPrice = {
  id: string;
  name: string;
  symbol: string;
  current_price: number | null;
  market_cap: number | null;
  total_volume: number | null;
  price_change_percentage_24h: number | null;
  last_updated: string | null;
};

async function getJson(url: string, headers: HeadersInit = {}) {
  const response = await fetch(url, {
    method: 'GET',
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Upstream returned HTTP ${response.status}`);
  return response.json();
}

export async function GET() {
  const apiBase = 'https://api.coingecko.com/api/v3';
  const headers: HeadersInit = { accept: 'application/json' };

  const warnings: string[] = [];
  let prices: CoinPrice[] = [];
  let priceSource = 'CoinGecko keyless public API';

  try {
    const ids = 'bitcoin,ethereum,chainlink,tether';
    const rows = await getJson(
      `${apiBase}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`,
      headers,
    );
    prices = (Array.isArray(rows) ? rows : []).map((row: any) => ({
      id: String(row.id),
      name: String(row.name),
      symbol: String(row.symbol).toUpperCase(),
      current_price: row.current_price == null ? null : Number(row.current_price),
      market_cap: row.market_cap == null ? null : Number(row.market_cap),
      total_volume: row.total_volume == null ? null : Number(row.total_volume),
      price_change_percentage_24h: row.price_change_percentage_24h == null ? null : Number(row.price_change_percentage_24h),
      last_updated: row.last_updated == null ? null : String(row.last_updated),
    }));
  } catch {
    warnings.push('CoinGecko public market prices are temporarily unavailable. Public rate limits may apply; try again later.');
    priceSource = 'unavailable';
  }

  let pools: Array<{
    id: string;
    network: string;
    name: string;
    address: string;
    baseTokenPriceUsd: number | null;
    quoteTokenPriceUsd: number | null;
    priceChange24h: number | null;
    volume24hUsd: number | null;
    reserveUsd: number | null;
    dex: string | null;
  }> = [];

  try {
    const payload = await getJson(
      'https://api.geckoterminal.com/api/v2/networks/eth/trending_pools?page=1&include=base_token,quote_token,dex',
      { accept: 'application/json' },
    );
    const included = Array.isArray(payload?.included) ? payload.included : [];
    const tokenById = new Map<string, string>(
      included.filter((item: any) => item?.type === 'token').map((item: any): [string, string] => [
        String(item.id),
        String(item.attributes?.symbol ?? 'TOKEN').toUpperCase(),
      ]),
    );
    pools = (Array.isArray(payload?.data) ? payload.data : []).slice(0, 8).map((pool: any) => {
      const attrs = pool?.attributes ?? {};
      const rel = pool?.relationships ?? {};
      const baseId = rel?.base_token?.data?.id;
      const quoteId = rel?.quote_token?.data?.id;
      return {
        id: String(pool?.id ?? attrs.address ?? attrs.name ?? 'pool'),
        network: String(pool?.id ?? '').split('_')[0] || 'unknown',
        address: String(attrs.address ?? ''),
        baseTokenPriceUsd: attrs.base_token_price_usd == null ? null : Number(attrs.base_token_price_usd),
        quoteTokenPriceUsd: attrs.quote_token_price_usd == null ? null : Number(attrs.quote_token_price_usd),
        priceChange24h: attrs.price_change_percentage?.h24 == null ? null : Number(attrs.price_change_percentage.h24),
        volume24hUsd: attrs.volume_usd?.h24 == null ? null : Number(attrs.volume_usd.h24),
        reserveUsd: attrs.reserve_in_usd == null ? null : Number(attrs.reserve_in_usd),
        dex: rel?.dex?.data?.id ? String(rel.dex.data.id) : null,
        name: String(attrs.name ?? ([tokenById.get(baseId), tokenById.get(quoteId)].filter(Boolean).join(' / ') || 'Unnamed pool')),
      };
    });
  } catch {
    warnings.push('Ethereum trending pool data is temporarily unavailable from GeckoTerminal.');
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    priceSource,
    prices,
    pools,
    warnings,
    safetyNote: 'Read-only market data. Prices, pool metrics, and third-party scores are informational and do not guarantee token quality or investment performance.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
