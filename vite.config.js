import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            // Proxy CoinGecko to avoid browser CORS in dev
            '/coingecko': {
                target: 'https://api.coingecko.com',
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/coingecko/, ''); },
            },
            // Proxy CoinCap (optional; CoinCap supports CORS so direct calls also work)
            '/coincap': {
                target: 'https://api.coincap.io',
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/coincap/, ''); },
            },
        },
    },
});
