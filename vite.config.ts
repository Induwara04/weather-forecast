import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {
  handleWeatherGuidanceRequest,
  serveConfigJs,
} from './server/weatherGuidanceService.mjs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dev-weather-guidance-api',
      configureServer(server) {
        const configPath = resolve(process.cwd(), 'config.js');

        server.middlewares.use(async (request, response, next) => {
          const requestUrl = new URL(request.url ?? '/', 'http://localhost');

          if (
            request.method === 'POST' &&
            requestUrl.pathname === '/api/weather-guidance'
          ) {
            await handleWeatherGuidanceRequest(request, response, { configPath });
            return;
          }

          if (
            (request.method === 'GET' || request.method === 'HEAD') &&
            requestUrl.pathname === '/config.js'
          ) {
            await serveConfigJs(response, { configPath });
            return;
          }

          next();
        });
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 3017,
  },
  preview: {
    host: '0.0.0.0',
    port: 4177,
  },
});
