import type { CoinId, MarketChartResponse, SimplePriceResponse, TickerData } from '../types';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

const COINS: Record<CoinId, { name: string; symbol: string }> = {
  bitcoin: { name: 'Bitcoin', symbol: 'BTC' },
  ethereum: { name: 'Ethereum', symbol: 'ETH' },
  dogecoin: { name: 'Dogecoin', symbol: 'DOGE' },
};

export async function fetchSimplePrices(): Promise<TickerData[]> {
  const ids: CoinId[] = ['bitcoin', 'ethereum', 'dogecoin'];
  const url = `${COINGECKO_BASE}/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`;

  const res = await fetch(url, { headers: { 'accept': 'application/json' } });
  if (!res.ok) throw new Error(`Price fetch failed: ${res.status}`);
  const json = (await res.json()) as SimplePriceResponse;

  return ids.map((id) => ({
    id,
    name: COINS[id].name,
    symbol: COINS[id].symbol,
    priceUsd: json[id].usd,
    change24hPercent: json[id].usd_24h_change,
  }));
}

export async function fetchBtcLast6h(): Promise<{ labels: string[]; prices: number[] }>
{
  // Use 1-day hourly data and keep last 6 hours
  const url = `${COINGECKO_BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly`;
  const res = await fetch(url, { headers: { 'accept': 'application/json' } });
  if (!res.ok) throw new Error(`Chart fetch failed: ${res.status}`);
  const json = (await res.json()) as MarketChartResponse;

  const now = Date.now();
  const sixHoursMs = 6 * 60 * 60 * 1000;
  const filtered = json.prices.filter(([ts]) => now - ts <= sixHoursMs);
  const slice = filtered.length > 0 ? filtered : json.prices.slice(-6);

  const labels = slice.map(([ts]) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const prices = slice.map(([, price]) => price);
  return { labels, prices };
}
