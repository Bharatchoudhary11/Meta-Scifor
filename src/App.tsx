import { useEffect, useMemo, useState } from 'react';
import { PriceCard } from './components/PriceCard';
import { PriceChart } from './components/PriceChart';
import { fetchBtcHistory, fetchSimplePrices, appendBtcSample, loadBtcSeries } from './lib/api';
import type { CoinId, TickerData } from './types';

const REFRESH_MS = 30_000; // 30 seconds

export default function App() {
  const [tickers, setTickers] = useState<TickerData[] | null>(null);
  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [chartData, setChartData] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [compact, setCompact] = useState(true);
  const [rangeHours, setRangeHours] = useState<1 | 3 | 6>(6);
  const [visible, setVisible] = useState<Record<CoinId, boolean>>({
    bitcoin: true,
    ethereum: true,
    dogecoin: true,
  });

  async function load() {
    try {
      setError(null);
      const prices = await fetchSimplePrices();
      setTickers(prices);
      // Update local BTC series from current price sample
      const btc = prices.find(p => p.id === 'bitcoin');
      if (btc) appendBtcSample(btc.priceUsd);
      // Choose chart source:
      const useCoinCapOnly = (import.meta as any).env?.VITE_USE_COINCAP_ONLY === 'true';
      if (useCoinCapOnly) {
        const chart = await fetchBtcHistory(rangeHours);
        setChartLabels(chart.labels);
        setChartData(chart.prices);
      } else {
        const chart = loadBtcSeries(rangeHours);
        setChartLabels(chart.labels);
        setChartData(chart.prices);
      }
      setLastUpdated(Date.now());
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load data');
    }
  }

  useEffect(() => {
    // Ensure tab title shows the correct app name
    document.title = 'Meta Scifor Technologies';
    load();
  }, [rangeHours]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, rangeHours]);

  const lastUpdatedText = useMemo(() => {
    return lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '';
  }, [lastUpdated]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <header className="mb-4 sm:mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <img src="/icons/meta-scifor.svg" alt="Meta Scifor" className="h-9 w-9" />
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Meta Scifor Technologies</h1>
            <p className="text-sm text-gray-500">Interactive crypto glance: BTC, ETH, DOGE</p>
          </div>
        </div>
        <div className="text-xs text-gray-400">{lastUpdatedText && `Last update: ${lastUpdatedText}`}</div>
      </header>

      <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Auto-refresh</span>
            <label className="inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:ml-0.5 after:mt-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-emerald-500 peer-checked:after:translate-x-5 relative"></div>
            </label>
          </div>
          <button onClick={load} className="mt-3 w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800">Refresh now</button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="font-medium mb-2">Chart range</div>
          <div className="flex gap-2">
            {[1,3,6].map(h => (
              <button
                key={h}
                onClick={() => setRangeHours(h as 1|3|6)}
                className={`rounded-md px-3 py-2 text-sm border ${rangeHours===h? 'bg-amber-500 text-white border-amber-500':'border-gray-300 hover:bg-gray-50'}`}
              >{h}h</button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="font-medium mb-2">Options</div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={compact} onChange={(e)=>setCompact(e.target.checked)} />
            Compact prices (K/M)
          </label>
          <div className="mt-3 text-sm text-gray-500">Toggle coin cards:</div>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {(['bitcoin','ethereum','dogecoin'] as CoinId[]).map(id => (
              <label key={id} className="flex items-center gap-2">
                <input type="checkbox" checked={visible[id]} onChange={(e)=>setVisible(v=>({...v,[id]:e.target.checked}))} />
                {id}
              </label>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tickers
          ? tickers.filter(t => visible[t.id as CoinId]).map((t) => (
              <PriceCard
                key={t.id}
                name={t.name}
                symbol={t.symbol}
                priceUsd={t.priceUsd}
                change24hPercent={t.change24hPercent}
                compact={compact}
              />
            ))
          : [0,1,2].map(i => <div key={i} className="h-[100px] animate-pulse rounded-xl bg-gray-200" />)}
      </section>

      <section className="mt-6 sm:mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bitcoin Price (Last {rangeHours} hours)</h2>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {chartLabels.length ? (
            <PriceChart labels={chartLabels} data={chartData} />
          ) : (
            <div className="h-72 animate-pulse rounded-md bg-gray-200" />
          )}
        </div>
      </section>
    </div>
  );
}
