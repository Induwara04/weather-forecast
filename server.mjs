import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import {
  handleWeatherGuidanceRequest,
  sendJson,
  serveConfigJs,
} from './server/weatherGuidanceService.mjs';

const rootDir = path.dirname(new URL(import.meta.url).pathname);
const distDir = path.join(rootDir, 'dist');
const configPath = path.join(rootDir, 'config.js');
const args = process.argv.slice(2);

const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
};

const port = Number(getArgValue('--port') ?? process.env.PORT ?? 3018);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const applyCors = (request, response) => {
  const origin = request.headers.origin;

  if (origin) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }

  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const serveStaticAsset = async (pathname, response) => {
  if (pathname === '/config.js') {
    await serveConfigJs(response, { configPath });
    return;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const requestedPath = path.normalize(path.join(distDir, relativePath));
  const safeBase = `${path.normalize(distDir)}${path.sep}`;

  if (!requestedPath.startsWith(safeBase) && requestedPath !== path.normalize(distDir)) {
    sendJson(response, 403, { error: 'Forbidden.' });
    return;
  }

  const filePath =
    existsSync(requestedPath) && !requestedPath.endsWith(path.sep)
      ? requestedPath
      : path.join(distDir, 'index.html');

  try {
    const buffer = await readFile(filePath);
    const extension = path.extname(filePath);

    response.writeHead(200, {
      'Content-Type': contentTypes[extension] ?? 'application/octet-stream',
    });
    response.end(buffer);
  } catch {
    sendJson(response, 404, { error: 'Not found.' });
  }
};

const server = createServer(async (request, response) => {
  try {
    applyCors(request, response);

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host}`);

    if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/weather-guidance') {
      await handleWeatherGuidanceRequest(request, response, { configPath });
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendJson(response, 405, { error: 'Method not allowed.' });
      return;
    }

    await serveStaticAsset(requestUrl.pathname, response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server failure.';

    if (!response.headersSent) {
      sendJson(response, 500, { error: message });
      return;
    }

    response.end();
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
  console.log(`Config path: ${configPath} (${existsSync(configPath) ? 'found' : 'not found — using empty config'})`);
});
