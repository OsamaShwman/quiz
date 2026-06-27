import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // GEMINI_API_KEY is intentionally NOT defined here. The key now lives only
      // on Cloudflare (set as a Pages secret) and is used server-side by the
      // /api/gemini/* Pages Functions. The frontend bundle contains no API key.
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
