Live Crypto Price Dashboard

Overview
- React + TypeScript + Vite app that displays live prices for Bitcoin, Ethereum, and Dogecoin.
- Uses CoinGecko API for current prices and a 6-hour BTC trend chart.
- Auto-refreshes every 30 seconds.
- Styled with Tailwind CSS and uses Chart.js via react-chartjs-2.

Quick Start
1) Install dependencies:
   - npm install
2) Start the dev server:
   - npm run dev
3) Open the local URL Vite prints (usually http://localhost:5173).

Notes
- API endpoints:
  - Simple prices: https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,dogecoin&vs_currencies=usd&include_24hr_change=true
  - BTC market chart: https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly
- No API keys required for these public endpoints. Rate limits may apply.

