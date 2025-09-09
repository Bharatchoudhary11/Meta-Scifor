import type { CoinId, MarketChartResponse, SimplePriceResponse, TickerData } from '../types';

// Offline-first: disable live APIs by default unless explicitly enabled
const DEV = (import.meta as any).env?.DEV as boolean | undefined;
const ENABLE_API = ((import.meta as any).env?.VITE_ENABLE_API as string | undefined) === 'true';
const USE_COINCAP_ONLY = ((import.meta as any).env?.VITE_USE_COINCAP_ONLY as string | undefined) === 'true';
// In dev, use Vite proxy to avoid CORS. In prod, hit CG directly.
const COINGECKO_BASE = DEV ? '/coingecko/api/v3' : 'https://api.coingecko.com/api/v3';
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

// -------- Mock/offline data generation --------
const basePrices: Record<CoinId, number> = {
  bitcoin: 65000,
  ethereum: 3500,
  dogecoin: 0.12,
};

let mockLastPrices: Record<CoinId, number> | null = null;

function randomWalk(prev: number, volatility = 0.01) {
  const change = (Math.random() * 2 - 1) * volatility; // +/- vol
  const next = prev * (1 + change);
  return Math.max(next, 0.0000001);
}

function mockTickers(): TickerData[] {
  if (!mockLastPrices) mockLastPrices = { ...basePrices };
  const updated: Record<CoinId, number> = { ...mockLastPrices } as any;
  (Object.keys(updated) as CoinId[]).forEach((id) => {
    const vol = id === 'dogecoin' ? 0.02 : id === 'ethereum' ? 0.012 : 0.008;
    updated[id] = randomWalk(updated[id], vol);
  });
  const res: TickerData[] = (Object.keys(updated) as CoinId[]).map((id) => {
    const prev = mockLastPrices![id];
    const curr = updated[id];
    const changePct = ((curr - prev) / prev) * 100;
    return {
      id,
      name: COINS[id].name,
      symbol: COINS[id].symbol,
      priceUsd: curr,
      change24hPercent: changePct, // synthetic per-refresh change
    };
  });
  mockLastPrices = updated;
  return res;
}

function mockBtcLast6h() {
  const points = 24; // 15-min intervals over 6 hours
  const now = Date.now();
  const step = 15 * 60 * 1000;
  let price = (mockLastPrices?.bitcoin ?? basePrices.bitcoin) * 0.98;
  const labels: string[] = [];
  const prices: number[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const ts = now - i * step;
    price = randomWalk(price, 0.004);
    labels.push(new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    prices.push(price);
  }
  return { labels, prices };
}

export async function fetchSimplePrices(): Promise<TickerData[]> {
  if (!ENABLE_API) return mockTickers();
  const ids: CoinId[] = ['bitcoin', 'ethereum', 'dogecoin'];
  const url = `${COINGECKO_BASE}/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`;

  if (USE_COINCAP_ONLY) {
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
  } catch (_e: any) {
    // Fallback to CoinCap (no key required) on any failure (auth, CORS, network)
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
}

export async function fetchBtcLast6h(): Promise<{ labels: string[]; prices: number[] }>
{
  if (!ENABLE_API) return mockBtcLast6h();
  // Use 1-day hourly data and keep last 6 hours
  const url = `${COINGECKO_BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly`;
  if (USE_COINCAP_ONLY) {
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
  } catch (_e: any) {
    // Fallback to CoinCap on any failure (auth, CORS, network)
    const now = Date.now();
    const sixHoursMs = 6 * 60 * 60 * 1000;
    const start = now - sixHoursMs;
    const withRange = `${COINCAP_BASE}/assets/bitcoin/history?interval=m15&start=${start}&end=${now}`;
    const noRange = `${COINCAP_BASE}/assets/bitcoin/history?interval=m15`;

    // Try with explicit range first
    let res = await fetch(withRange, { headers: { accept: 'application/json' } });
    // If API returns 404 or other error, try without range
    if (!res.ok) {
      res = await fetch(noRange, { headers: { accept: 'application/json' } });
    }
    let points: Array<{ priceUsd: string; time: number }> = [];
    if (res.ok) {
      const json = await res.json() as { data: Array<{ priceUsd: string; time: number }> };
      points = json.data || [];
    }
    // If still empty or failed, attempt CoinCap candles endpoint as a deeper fallback
    if (!points.length) {
      const candlesUrl = `${COINCAP_BASE}/candles?exchange=binance&interval=m15&baseId=bitcoin&quoteId=tether&start=${start}&end=${now}`;
      let cRes = await fetch(candlesUrl, { headers: { accept: 'application/json' } });
      if (!cRes.ok) {
        const candlesH1 = `${COINCAP_BASE}/candles?exchange=binance&interval=h1&baseId=bitcoin&quoteId=tether&start=${start}&end=${now}`;
        cRes = await fetch(candlesH1, { headers: { accept: 'application/json' } });
      }
      if (cRes.ok) {
        const cjson = await cRes.json() as { data: Array<{ period: number; close: number }> };
        const cpoints = (cjson.data || []).slice(-24);
        if (cpoints.length) {
          const labels = cpoints.map(p => new Date(p.period).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          const prices = cpoints.map(p => Number(p.close));
          return { labels, prices };
        }
      }
      // If candles also failed, throw the latest status we have
      if (!res.ok) throw new Error(`CoinCap chart failed: ${res.status}`);
    }
    // Keep roughly last 6h worth of 15-min points (~24 points)
    const recent = points.slice(-24);
    const labels = recent.map(p => new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const prices = recent.map(p => Number(p.priceUsd));
    return { labels, prices };
  }
}

export async function fetchBtcHistory(hours: number): Promise<{ labels: string[]; prices: number[] }> {
  if (!ENABLE_API) {
    const points = Math.max(1, Math.round((hours * 60) / 15));
    const now = Date.now();
    const step = 15 * 60 * 1000;
    let price = (mockLastPrices?.bitcoin ?? basePrices.bitcoin) * 0.98;
    const labels: string[] = [];
    const prices: number[] = [];
    for (let i = points - 1; i >= 0; i--) {
      const ts = now - i * step;
      price = randomWalk(price, 0.004);
      labels.push(new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      prices.push(price);
    }
    return { labels, prices };
  }

  const cgUrl = `${COINGECKO_BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly`;
  try {
    const res = await fetch(cgUrl, { headers: buildHeaders() });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new Error('cg-auth');
      throw new Error(`Chart fetch failed: ${res.status}`);
    }
    const json = (await res.json()) as MarketChartResponse;
    const now = Date.now();
    const rangeMs = hours * 60 * 60 * 1000;
    const filtered = json.prices.filter(([ts]) => now - ts <= rangeMs);
    const slice = filtered.length > 0 ? filtered : json.prices.slice(-Math.max(1, Math.round(hours)));
    const labels = slice.map(([ts]) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const prices = slice.map(([, price]) => price);
    return { labels, prices };
  } catch (_e: any) {
    const now = Date.now();
    const rangeMs = hours * 60 * 60 * 1000;
    const start = now - rangeMs;
    const withRange = `${COINCAP_BASE}/assets/bitcoin/history?interval=m15&start=${start}&end=${now}`;
    const noRange = `${COINCAP_BASE}/assets/bitcoin/history?interval=m15`;

    let res = await fetch(withRange, { headers: { accept: 'application/json' } });
    if (!res.ok) {
      res = await fetch(noRange, { headers: { accept: 'application/json' } });
    }
    let points: Array<{ priceUsd: string; time: number }> = [];
    if (res.ok) {
      const json = await res.json() as { data: Array<{ priceUsd: string; time: number }> };
      points = json.data || [];
    }
    if (!points.length) {
      const candlesUrl = `${COINCAP_BASE}/candles?exchange=binance&interval=m15&baseId=bitcoin&quoteId=tether&start=${start}&end=${now}`;
      let cRes = await fetch(candlesUrl, { headers: { accept: 'application/json' } });
      if (!cRes.ok) {
        const candlesH1 = `${COINCAP_BASE}/candles?exchange=binance&interval=h1&baseId=bitcoin&quoteId=tether&start=${start}&end=${now}`;
        cRes = await fetch(candlesH1, { headers: { accept: 'application/json' } });
      }
      if (cRes.ok) {
        const cjson = await cRes.json() as { data: Array<{ period: number; close: number }> };
        const cpoints = (cjson.data || []);
        const keep = Math.max(1, Math.round((hours * 60) / 15));
        const latest = cpoints.slice(-keep);
        if (latest.length) {
          const labels = latest.map(p => new Date(p.period).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          const prices = latest.map(p => Number(p.close));
          return { labels, prices };
        }
      }
      if (!res.ok) throw new Error(`CoinCap chart failed: ${res.status}`);
    }
    const keep = Math.max(1, Math.round((hours * 60) / 15));
    const recent = points.slice(-keep);
    const labels = recent.map(p => new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const prices = recent.map(p => Number(p.priceUsd));
    return { labels, prices };
  }
}
