# WSO2 Deployment

This app now includes a small Node server for the OpenAI-backed country-capital lookup. The browser UI stays React/Vite, but the OpenAI API key is read server-side from `./config.js`.

## Runtime Config

Mount a `config.js` file into the container at `./config.js` with this shape:

```js
window.configs = {
  OPENAI_API_KEY: 'replace-with-your-key',
  OPENAI_MODEL: 'gpt-5.4-mini',
  AI_WEATHER_SERVICE_URL: '',
};
```

`OPENAI_MODEL` is optional.
`AI_WEATHER_SERVICE_URL` is optional and should point to a separately deployed AI service if you split the architecture.

## Separate AI Service

This repository now includes a standalone deployable service in `ai-weather-service/`.

Use it when you want the React dashboard and the OpenAI-backed guidance API to deploy as separate components.

Frontend `config.js` example:

```js
window.configs = {
  AI_WEATHER_SERVICE_URL: 'https://your-ai-service.example.com',
};
```

The separate service has its own:

- `ai-weather-service/Dockerfile`
- `ai-weather-service/server.mjs`
- `ai-weather-service/config.js`
- `ai-weather-service/README.md`

## Recommended Deploy Path

Use the Dockerfile flow so both the SPA and the server endpoint run in the same container.

Use this when creating a component from a repository that contains a Dockerfile.

Files included in this repo:
- `Dockerfile`
- `server.mjs`
- `config.js`

What it does:
- Builds the app with Node 20
- Serves the compiled SPA with Node
- Exposes `POST /api/country-capital` for the OpenAI lookup
- Listens on port `8080`
- Falls back to `index.html` for client-side routes

Recommended values in WSO2 when using the Dockerfile flow:
- Component Directory: `/`
- Dockerfile path: `./Dockerfile` if prompted
- Container port: `8080` if prompted during deploy

## Local Verification

Run the API server:

```bash
npm run dev:server
```

Run the Vite client:

```bash
npm run dev
```

Build the app:

```bash
npm run build
```

Build the container:

```bash
docker build -t sri-lanka-weather-dashboard .
```

Run the container:

```bash
docker run --rm -p 8080:8080 sri-lanka-weather-dashboard
```

Open:

```text
http://localhost:8080
```
