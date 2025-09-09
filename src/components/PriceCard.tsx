import React from 'react';

interface Props {
  name: string;
  symbol: string;
  priceUsd: number;
  change24hPercent: number;
  compact?: boolean;
}

function formatUsd(n: number, compact?: boolean) {
  if (compact) {
    // Use compact notation for large numbers
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(n);
  }
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

export const PriceCard: React.FC<Props> = ({ name, symbol, priceUsd, change24hPercent, compact }) => {
  const isUp = change24hPercent >= 0;
  const changeStr = `${isUp ? '+' : ''}${change24hPercent.toFixed(2)}%`;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold">{name} <span className="text-gray-400 text-sm">({symbol})</span></h3>
        <span className={`text-sm font-medium ${isUp ? 'text-green-600' : 'text-red-600'}`}>{changeStr}</span>
      </div>
      <div className="mt-3 text-2xl font-bold">{formatUsd(priceUsd, compact)}</div>
    </div>
  );
};
