import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Ports are configurable so a second, isolated stack (mock data, throwaway
 * vault) can run alongside a normal dev session — see `npm run dev:guide`.
 */
const proxyPort = process.env.ROLES_PROXY_PORT ?? '8931';
const uiPort = Number.parseInt(process.env.ROLES_UI_PORT ?? '5173', 10);

export default defineConfig({
  plugins: [react()],
  server: {
    port: uiPort,
    strictPort: true,
    proxy: {
      '/api': `http://127.0.0.1:${proxyPort}`,
    },
  },
});
