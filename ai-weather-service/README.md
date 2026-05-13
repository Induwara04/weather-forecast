# AI Weather Service

Standalone OpenAI-backed weather guidance service for the dashboard.

## Endpoints

- `GET /health`
- `POST /api/weather-guidance`

## Config

Mount or edit `./config.js`:

```js
window.configs = {
  OPENAI_API_KEY: 'replace-with-your-key',
  OPENAI_MODEL: 'gpt-5.4-mini',
};
```

You can also use environment variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `PORT`

## Run locally

```bash
cd ai-weather-service
node server.mjs
```

Default port: `8080`

## Docker

```bash
docker build -t ai-weather-service .
docker run --rm -p 8080:8080 ai-weather-service
```

## Dashboard config

Point the frontend to this service by setting in the main app `config.js`:

```js
window.configs = {
  AI_WEATHER_SERVICE_URL: 'http://your-service-host:8080',
};
```
