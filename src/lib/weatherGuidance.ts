import type { AreaRisk, HomeSnapshot } from '../types';

export type WeatherGuidanceResult = {
  summary: string;
  suggestions: Array<{
    title: string;
    detail: string;
  }>;
  model: string;
};

type WeatherGuidanceError = {
  error?: string;
  detail?: string;
};

type RuntimeConfig = {
  AI_WEATHER_SERVICE_URL?: string;
};

const parseGuidancePayload = (rawBody: string): WeatherGuidanceResult => {
  if (!rawBody.trim()) {
    throw new Error('AI weather service returned an empty response.');
  }

  let payload: WeatherGuidanceResult | WeatherGuidanceError;

  try {
    payload = JSON.parse(rawBody) as WeatherGuidanceResult | WeatherGuidanceError;
  } catch {
    throw new Error(`AI weather service returned invalid JSON: ${rawBody.slice(0, 160)}`);
  }

  if ('error' in payload && payload.error) {
    throw new Error(
      payload.detail ? `${payload.error} ${payload.detail}` : payload.error,
    );
  }

  return payload as WeatherGuidanceResult;
};

const getWeatherGuidanceUrl = () => {
  const runtimeWindow = window as Window & { configs?: RuntimeConfig };
  const configuredBaseUrl = runtimeWindow.configs?.AI_WEATHER_SERVICE_URL?.trim();

  if (configuredBaseUrl) {
    return `${configuredBaseUrl.replace(/\/+$/, '')}/api/weather-guidance`;
  }

  return '/api/weather-guidance';
};

export const fetchWeatherGuidance = async (
  home: HomeSnapshot,
  topArea: AreaRisk,
): Promise<WeatherGuidanceResult> => {
  const url = getWeatherGuidanceUrl();
  const requestBody = JSON.stringify({
    home,
    topArea,
    next24Hours: home.hourly.slice(0, 24),
  });

  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown weather guidance error.';
    throw new Error(`${url}: ${message}`);
  }

  const rawBody = await response.text();

  if (!response.ok) {
    if (!rawBody.trim()) {
      throw new Error(`${url}: request failed with ${response.status} ${response.statusText}.`);
    }

    try {
      parseGuidancePayload(rawBody);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'AI weather guidance request failed.';
      throw new Error(`${url}: ${message}`);
    }

    throw new Error(`${url}: AI weather guidance request failed.`);
  }

  try {
    return parseGuidancePayload(rawBody);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown weather guidance error.';
    throw new Error(`${url}: ${message}`);
  }
};
