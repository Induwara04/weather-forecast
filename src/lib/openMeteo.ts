import { homeLocation, sriLankaLocations } from '../data/sriLankaLocations';
import { buildAreaAlerts, buildAreaSummary, calculateAreaScore, getRiskLevel } from './risk';
import type { AreaRisk, DashboardPayload, DailyPoint, HomeSnapshot } from '../types';

const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const FLOOD_BASE = 'https://flood-api.open-meteo.com/v1/flood';

type ForecastResponse = {
  timezone: string;
  current: Record<string, number | string>;
  hourly: Record<string, Array<number | string>>;
  daily: Record<string, Array<number | string>>;
};

type AirQualityResponse = {
  current: Record<string, number | string>;
};

type FloodResponse = {
  daily: Record<string, Array<number | string>>;
};

const toList = <T,>(payload: T | T[]): T[] => (Array.isArray(payload) ? payload : [payload]);

const buildUrl = (base: string, params: Record<string, string>) => {
  const url = new URL(base);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
};

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Open-Meteo request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
};

const latitudes = sriLankaLocations.map((location) => location.latitude).join(',');
const longitudes = sriLankaLocations.map((location) => location.longitude).join(',');

const homeForecastUrl = buildUrl(FORECAST_BASE, {
  latitude: String(homeLocation.latitude),
  longitude: String(homeLocation.longitude),
  timezone: 'auto',
  forecast_days: '7',
  current:
    'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,is_day',
  hourly:
    'temperature_2m,precipitation_probability,precipitation,rain,wind_gusts_10m,uv_index',
  daily:
    'weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset',
});

const homeAirUrl = buildUrl(AIR_QUALITY_BASE, {
  latitude: String(homeLocation.latitude),
  longitude: String(homeLocation.longitude),
  timezone: 'auto',
  current: 'us_aqi,pm2_5,pm10,carbon_monoxide,uv_index',
});

const areasForecastUrl = buildUrl(FORECAST_BASE, {
  latitude: latitudes,
  longitude: longitudes,
  timezone: 'auto',
  forecast_hours: '24',
  daily:
    'temperature_2m_max,uv_index_max,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max',
  hourly: 'precipitation,rain,precipitation_probability,wind_gusts_10m',
});

const areasAirUrl = buildUrl(AIR_QUALITY_BASE, {
  latitude: latitudes,
  longitude: longitudes,
  timezone: 'auto',
  current: 'us_aqi',
});

const areasFloodUrl = buildUrl(FLOOD_BASE, {
  latitude: latitudes,
  longitude: longitudes,
  timezone: 'auto',
  forecast_days: '7',
  daily: 'river_discharge,river_discharge_mean,river_discharge_max',
});

const asNumberArray = (values: Array<number | string>) => values.map((value) => Number(value));
const asStringArray = (values: Array<number | string>) => values.map((value) => String(value));

const parseHomePayload = (
  forecast: ForecastResponse,
  air: AirQualityResponse,
): HomeSnapshot => {
  const hourlyTime = asStringArray(forecast.hourly.time);
  const dailyTime = asStringArray(forecast.daily.time);

  const hourly: HomeSnapshot['hourly'] = hourlyTime.map((time, index) => ({
    time,
    temperature: Number(forecast.hourly.temperature_2m[index]),
    rain: Number(forecast.hourly.rain[index] ?? forecast.hourly.precipitation[index] ?? 0),
    precipitationProbability: Number(forecast.hourly.precipitation_probability[index] ?? 0),
    windGust: Number(forecast.hourly.wind_gusts_10m[index] ?? 0),
    uvIndex: Number(forecast.hourly.uv_index[index] ?? 0),
  }));

  const daily: DailyPoint[] = dailyTime.map((time, index) => ({
    time,
    weatherCode: Number(forecast.daily.weather_code[index]),
    maxTemp: Number(forecast.daily.temperature_2m_max[index]),
    minTemp: Number(forecast.daily.temperature_2m_min[index]),
    maxUv: Number(forecast.daily.uv_index_max[index]),
    precipitationSum: Number(forecast.daily.precipitation_sum[index]),
    precipitationProbabilityMax: Number(
      forecast.daily.precipitation_probability_max[index],
    ),
    maxWindSpeed: Number(forecast.daily.wind_speed_10m_max[index]),
    maxWindGust: Number(forecast.daily.wind_gusts_10m_max[index]),
    sunrise: String(forecast.daily.sunrise[index]),
    sunset: String(forecast.daily.sunset[index]),
  }));

  return {
    location: homeLocation,
    timezone: forecast.timezone,
    current: {
      time: String(forecast.current.time),
      temperature: Number(forecast.current.temperature_2m),
      apparentTemperature: Number(forecast.current.apparent_temperature),
      humidity: Number(forecast.current.relative_humidity_2m),
      precipitation: Number(forecast.current.precipitation),
      weatherCode: Number(forecast.current.weather_code),
      cloudCover: Number(forecast.current.cloud_cover),
      windSpeed: Number(forecast.current.wind_speed_10m),
      windDirection: Number(forecast.current.wind_direction_10m),
      windGust: Number(forecast.current.wind_gusts_10m),
      pressure: Number(forecast.current.pressure_msl),
      isDay: Number(forecast.current.is_day),
    },
    hourly,
    daily,
    currentAir: {
      usAqi: Number(air.current.us_aqi),
      pm25: Number(air.current.pm2_5),
      pm10: Number(air.current.pm10),
      carbonMonoxide: Number(air.current.carbon_monoxide),
      uvIndex: Number(air.current.uv_index),
    },
  };
};

const extractFloodFactor = (daily: FloodResponse['daily']) => {
  const discharge = asNumberArray(daily.river_discharge ?? []);
  const mean = asNumberArray(daily.river_discharge_mean ?? []);
  const max = asNumberArray(daily.river_discharge_max ?? []);

  if (!discharge.length || !mean.length) {
    return 1;
  }

  const ratios = discharge.map((value, index) => {
    const base = mean[index] || max[index] || value || 1;
    return base > 0 ? value / base : 1;
  });

  return Math.max(...ratios, 1);
};

const parseAreaRisks = (
  forecastItems: ForecastResponse[],
  airItems: AirQualityResponse[],
  floodItems: FloodResponse[],
) => {
  const areas: AreaRisk[] = sriLankaLocations.map((location, index) => {
    const forecast = forecastItems[index];
    const air = airItems[index];
    const flood = floodItems[index];
    const rainfallMm = asNumberArray(forecast.hourly.rain ?? forecast.hourly.precipitation).reduce(
      (total, value) => total + value,
      0,
    );
    const rainChance = Math.max(
      ...asNumberArray(forecast.hourly.precipitation_probability ?? []),
      Number(forecast.daily.precipitation_probability_max?.[0] ?? 0),
      0,
    );
    const windGust = Math.max(
      ...asNumberArray(forecast.hourly.wind_gusts_10m ?? []),
      Number(forecast.daily.wind_gusts_10m_max?.[0] ?? 0),
      0,
    );
    const maxUv = Number(forecast.daily.uv_index_max?.[0] ?? 0);
    const maxTemp = Number(forecast.daily.temperature_2m_max?.[0] ?? 0);
    const aqi = Number(air.current.us_aqi ?? 0);
    const floodFactor = extractFloodFactor(flood.daily);
    const score = calculateAreaScore({
      rainfallMm,
      rainChance,
      windGust,
      aqi,
      floodFactor,
      maxUv,
      maxTemp,
    });
    const level = getRiskLevel(score);
    const areaBase = {
      location,
      score,
      level,
      rainfallMm,
      rainChance,
      windGust,
      aqi,
      floodFactor,
      maxUv,
    };

    return {
      ...areaBase,
      summary: buildAreaSummary(areaBase),
      alerts: buildAreaAlerts(areaBase),
    };
  });

  return areas.sort((left, right) => right.score - left.score);
};

export const fetchDashboardPayload = async (): Promise<DashboardPayload> => {
  const [homeForecast, homeAir, areasForecast, areasAir, areasFlood] = await Promise.all([
    fetchJson<ForecastResponse>(homeForecastUrl),
    fetchJson<AirQualityResponse>(homeAirUrl),
    fetchJson<ForecastResponse | ForecastResponse[]>(areasForecastUrl),
    fetchJson<AirQualityResponse | AirQualityResponse[]>(areasAirUrl),
    fetchJson<FloodResponse | FloodResponse[]>(areasFloodUrl),
  ]);

  const areas = parseAreaRisks(
    toList(areasForecast),
    toList(areasAir),
    toList(areasFlood),
  );

  return {
    home: parseHomePayload(homeForecast, homeAir),
    areas,
    generatedAt: new Date().toISOString(),
  };
};
