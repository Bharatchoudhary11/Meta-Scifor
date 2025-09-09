import React, { useEffect, useMemo, useState } from 'react';
import { PriceCard } from './components/PriceCard';
import { PriceChart } from './components/PriceChart';
import { fetchBtcLast6h, fetchSimplePrices } from './lib/api';
import type { TickerData } from './types';

const REFRESH_MS = 30_000; // 30 seconds

export default function App() {
  const [tickers, setTickers] = useState<TickerData[] | null>(null);
  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [chartData, setChartData] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  async function load() {
    try {
      setError(null);
      const [prices, chart] = await Promise.all([
        fetchSimplePrices(),
        fetchBtcLast6h(),
      ]);
      setTickers(prices);
      setChartLabels(chart.labels);
      setChartData(chart.prices);
      setLastUpdated(Date.now());
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load data');
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const lastUpdatedText = useMemo(() => {
    return lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '';
  }, [lastUpdated]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Live Crypto Price Dashboard</h1>
          <p className="text-sm text-gray-500">BTC, ETH, DOGE • Auto-refresh every 30s</p>
        </div>
        <div className="text-xs text-gray-400">{lastUpdatedText && `Last update: ${lastUpdatedText}`}</div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(tickers ?? [1, 2, 3]).map((t, i) => (
          <div key={i}>
            {tickers ? (
              <PriceCard
                name={t.name}
                symbol={t.symbol}
                priceUsd={t.priceUsd}
                change24hPercent={t.change24hPercent}
              />
            ) : (
              <div className="h-[100px] animate-pulse rounded-xl bg-gray-200" />
            )}
          </div>
        ))}
      </section>

      <section className="mt-6 sm:mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bitcoin Price (Last 6 hours)</h2>
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

