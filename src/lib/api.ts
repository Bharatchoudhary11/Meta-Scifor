import type { CoinId, MarketChartResponse, SimplePriceResponse, TickerData } from '../types';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const COINCAP_BASE = 'https://api.coincap.io/v2';

const COINS: Record<CoinId, { name: string; symbol: string }> = {
  bitcoin: { name: 'Bitcoin', symbol: 'BTC' },
  ethereum: { name: 'Ethereum', symbol: 'ETH' },
  dogecoin: { name: 'Dogecoin', symbol: 'DOGE' },
};

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = { accept: 'application/json' };
  const key = (import.meta as any).env?.VITE_COINGECKO_API_KEY as string | undefined;
  if (key) {
    // CoinGecko free API now requires an API key header.
    // Header name can be 'x-cg-api-key' (free) or 'X-CG-Pro-API-Key' (pro).
    headers['x-cg-api-key' as any] = key;
  }
  return headers;
}

export async function fetchSimplePrices(): Promise<TickerData[]> {
  const ids: CoinId[] = ['bitcoin', 'ethereum', 'dogecoin'];
  const url = `${COINGECKO_BASE}/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`;

  try {
    const res = await fetch(url, { headers: buildHeaders() });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new Error('cg-auth');
      throw new Error(`Price fetch failed: ${res.status}`);
    }
    const json = (await res.json()) as SimplePriceResponse;
    return ids.map((id) => ({
      id,
      name: COINS[id].name,
      symbol: COINS[id].symbol,
      priceUsd: json[id].usd,
      change24hPercent: json[id].usd_24h_change,
    }));
  } catch (e: any) {
    // Fallback to CoinCap (no key required)
    if (e?.message === 'cg-auth' || /Price fetch failed/.test(String(e?.message))) {
      const ccUrl = `${COINCAP_BASE}/assets?ids=bitcoin,ethereum,dogecoin`;
      const ccRes = await fetch(ccUrl, { headers: { accept: 'application/json' } });
      if (!ccRes.ok) throw new Error(`CoinCap price failed: ${ccRes.status}`);
      const { data } = await ccRes.json() as { data: Array<{ id: string; name: string; symbol: string; priceUsd: string; changePercent24Hr: string }> };
      const byId = new Map(data.map((d) => [d.id, d]));
      return ids.map((id) => {
        const d = byId.get(id)!;
        return {
          id,
          name: COINS[id].name,
          symbol: COINS[id].symbol,
          priceUsd: Number(d.priceUsd),
          change24hPercent: Number(d.changePercent24Hr),
        } as TickerData;
      });
    }
    throw e;
  }
}

export async function fetchBtcLast6h(): Promise<{ labels: string[]; prices: number[] }>
{
  // Use 1-day hourly data and keep last 6 hours
  const url = `${COINGECKO_BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly`;
  try {
    const res = await fetch(url, { headers: buildHeaders() });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new Error('cg-auth');
      throw new Error(`Chart fetch failed: ${res.status}`);
    }
    const json = (await res.json()) as MarketChartResponse;

    const now = Date.now();
    const sixHoursMs = 6 * 60 * 60 * 1000;
    const filtered = json.prices.filter(([ts]) => now - ts <= sixHoursMs);
    const slice = filtered.length > 0 ? filtered : json.prices.slice(-6);

    const labels = slice.map(([ts]) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const prices = slice.map(([, price]) => price);
    return { labels, prices };
  } catch (e: any) {
    // Fallback to CoinCap
    if (e?.message === 'cg-auth' || /Chart fetch failed/.test(String(e?.message))) {
      const now = Date.now();
      const sixHoursMs = 6 * 60 * 60 * 1000;
      const start = now - sixHoursMs;
      const ccUrl = `${COINCAP_BASE}/assets/bitcoin/history?interval=m15&start=${start}&end=${now}`;
      const res = await fetch(ccUrl, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`CoinCap chart failed: ${res.status}`);
      const json = await res.json() as { data: Array<{ priceUsd: string; time: number }> };
      const points = json.data;
      const labels = points.map(p => new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      const prices = points.map(p => Number(p.priceUsd));
      return { labels, prices };
    }
    throw e;
  }
}
