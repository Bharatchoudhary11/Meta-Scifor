export type CoinId = 'bitcoin' | 'ethereum' | 'dogecoin';

export interface SimplePriceResponse {
  [key: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

export interface MarketChartResponse {
  prices: [number, number][]; // [timestamp, price]
}

export interface TickerData {
  id: CoinId;
  name: string;
  symbol: string;
  priceUsd: number;
  change24hPercent: number;
}

