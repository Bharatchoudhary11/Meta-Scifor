Live Crypto Price Dashboard

Overview
- React + TypeScript + Vite app that displays live prices for Bitcoin, Ethereum, and Dogecoin.
- Uses CoinGecko API for current prices and a 6-hour BTC trend chart.
- Auto-refreshes every 30 seconds.
- Styled with Tailwind CSS and uses Chart.js via react-chartjs-2.

Requirements Coverage
- 3 cards with name, USD price, 24h change — Implemented in `src/App.tsx:1` and `src/components/PriceCard.tsx:1`.
- Uses CoinGecko or CoinCap API — Implemented with CoinCap by default and CoinGecko support in `src/lib/api.ts:1`.
- Auto-refresh every 30 seconds — Implemented in `src/App.tsx:1`.
- Bitcoin price trend chart (last 6 hours) — Implemented in `src/components/PriceChart.tsx:1` with data from `src/lib/api.ts:1`.
- Responsive with Tailwind CSS — Layout in `src/App.tsx:1`, styles in `src/index.css:1`.
- React + TypeScript — Vite + TS setup present.
- Chart.js or Recharts — Chart.js used via `react-chartjs-2`.

Quick Start
1) Install dependencies:
   - npm install
2) Start the dev server:
   - npm run dev
3) Open the local URL Vite prints (usually http://localhost:5173).

Notes
- Primary API: CoinGecko (with optional API key)
- Automatic fallback: CoinCap (no key) if CoinGecko returns 401/403
- Endpoints used:
  - CoinGecko prices: /simple/price
  - CoinGecko chart: /coins/bitcoin/market_chart
  - CoinCap prices fallback: /v2/assets?ids=bitcoin,ethereum,dogecoin
  - CoinCap chart fallback: /v2/assets/bitcoin/history?interval=m15&start=...&end=...

Offline Mode (no API calls)
- The app uses live APIs by default. To run without network access, set in `.env.local`:
  - VITE_ENABLE_API=false
  - Optionally: VITE_COINGECKO_API_KEY=your_key_here
  - Optional dev-only bypass: VITE_USE_COINCAP_ONLY=true (skip CoinGecko)
  Then restart the dev server.

CoinGecko API Key (401 fixes)
- CoinGecko now often requires an API key. If 401/403 occurs, the app will automatically fall back to CoinCap.
- To keep using CoinGecko, add a free key:
  1) Create a key in your CoinGecko account.
  2) Add `.env.local` with:
     - VITE_COINGECKO_API_KEY=your_key_here
  3) Restart `npm run dev`. The app sends it via `x-cg-api-key`.

Manifest console warning
- If your browser logs: `Manifest: Line: 1, column: 1, Syntax error.` it means the browser tried to load a Web App Manifest but the response wasn’t valid JSON (often a 404 HTML page). This is harmless for this app. You can ignore it or add a valid manifest if you plan to make the app a PWA.
