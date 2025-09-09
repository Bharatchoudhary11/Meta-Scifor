import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const cgKey = env.VITE_COINGECKO_API_KEY;
  return {
    plugins: [react()],
    server: {
      proxy: {
        // Proxy CoinGecko to avoid browser CORS in dev and inject API key
        '/coingecko': {
          target: 'https://api.coingecko.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/coingecko/, ''),
          headers: cgKey
            ? { 'x-cg-api-key': cgKey, 'x-cg-demo-api-key': cgKey }
            : {},
        },
        // Proxy CoinCap (if you choose to use it via proxy)
        '/coincap': {
          target: 'https://api.coincap.io',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/coincap/, ''),
        },
      },
    },
  };
});
