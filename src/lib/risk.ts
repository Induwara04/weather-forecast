import type { AreaRisk, DailyPoint, HomeSnapshot } from '../types';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const scoreBand = (
  value: number,
  thresholds: Array<{ limit: number; score: number }>,
) => {
  for (const band of thresholds) {
    if (value <= band.limit) {
      return band.score;
    }
  }

  return thresholds.at(-1)?.score ?? 0;
};

export const getRiskLevel = (score: number): AreaRisk['level'] => {
  if (score >= 80) {
    return 'Severe';
  }
  if (score >= 62) {
    return 'High';
  }
  if (score >= 45) {
    return 'Elevated';
  }
  if (score >= 28) {
    return 'Guarded';
  }
  return 'Low';
};

export const formatWeatherLabel = (weatherCode: number) => {
  const labels: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mostly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Light snow',
    73: 'Snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Rain showers',
    81: 'Heavy showers',
    82: 'Violent showers',
    85: 'Snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Severe hailstorm',
  };

  return labels[weatherCode] ?? 'Mixed conditions';
};

export const getAqiLabel = (aqi: number) => {
  if (aqi <= 50) {
    return 'Good';
  }
  if (aqi <= 100) {
    return 'Moderate';
  }
  if (aqi <= 150) {
    return 'Sensitive groups';
  }
  if (aqi <= 200) {
    return 'Unhealthy';
  }
  if (aqi <= 300) {
    return 'Very unhealthy';
  }
  return 'Hazardous';
};

export const buildAreaSummary = (
  area: Pick<
    AreaRisk,
    'rainChance' | 'windGust' | 'floodFactor'
  >,
) => {
  const rainText =
    area.rainChance >= 80
      ? 'heavy rain exposure'
      : area.rainChance >= 55
        ? 'wet-weather watch'
        : 'manageable rain risk';
  const windText =
    area.windGust >= 60
      ? 'strong gusts expected'
      : area.windGust >= 40
        ? 'wind build-up likely'
        : 'lighter wind pattern';
  const floodText =
    area.floodFactor >= 1.45
      ? 'river stress elevated'
      : area.floodFactor >= 1.15
        ? 'river flow rising'
        : 'stable river flow';

  return `${rainText}, ${windText}, ${floodText}`;
};

export const buildAreaAlerts = (area: Omit<AreaRisk, 'summary' | 'alerts'>) => {
  const alerts: string[] = [];

  if (area.rainChance >= 85 || area.rainfallMm >= 55) {
    alerts.push('Flash-rain watch');
  }
  if (area.floodFactor >= 1.45) {
    alerts.push('Flood-prone river cell');
  }
  if (area.windGust >= 60) {
    alerts.push('Damaging gust risk');
  }
  if (area.aqi >= 100) {
    alerts.push('Poor air quality');
  }
  if (area.maxUv >= 10) {
    alerts.push('Extreme UV');
  }

  return alerts.length ? alerts : ['No active severe trigger'];
};

export const buildHomeAlerts = (home: HomeSnapshot, topArea: AreaRisk | undefined) => {
  const alerts: Array<{ title: string; detail: string; tone: 'error' | 'warning' | 'info' | 'success' }> = [];
  const today: DailyPoint | undefined = home.daily[0];

  if (today && (today.precipitationProbabilityMax >= 80 || today.precipitationSum >= 45)) {
    alerts.push({
      title: 'Rain alert',
      detail: `Today is trending wet near ${home.location.name}. Expect ${today.precipitationSum.toFixed(0)} mm with rain probability up to ${today.precipitationProbabilityMax.toFixed(0)}%.`,
      tone: 'warning',
    });
  }

  if (home.current.windGust >= 55 || (today && today.maxWindGust >= 60)) {
    alerts.push({
      title: 'Wind alert',
      detail: `Wind gusts are reaching up to ${Math.max(home.current.windGust, today?.maxWindGust ?? 0).toFixed(0)} km/h. Outdoor setups should be checked.`,
      tone: 'error',
    });
  }

  if (home.currentAir.usAqi >= 100) {
    alerts.push({
      title: 'Air quality alert',
      detail: `US AQI is ${home.currentAir.usAqi.toFixed(0)} (${getAqiLabel(home.currentAir.usAqi)}). Reduce long outdoor exposure if you are sensitive.`,
      tone: 'warning',
    });
  }

  if (today && today.maxUv >= 10) {
    alerts.push({
      title: 'UV alert',
      detail: `UV index could peak near ${today.maxUv.toFixed(1)} today. Midday exposure should be limited.`,
      tone: 'info',
    });
  }

  if (topArea && topArea.level !== 'Low') {
    alerts.push({
      title: 'National hotspot',
      detail: `${topArea.location.name} is currently the highest-ranked monitored risk area in Sri Lanka with a ${topArea.level.toLowerCase()} risk profile.`,
      tone: topArea.level === 'Severe' ? 'error' : 'info',
    });
  }

  if (!alerts.length) {
    alerts.push({
      title: 'Calmer window',
      detail: 'No strong severe-weather trigger is active for the home area right now.',
      tone: 'success',
    });
  }

  return alerts;
};

export const calculateAreaScore = (params: {
  rainfallMm: number;
  rainChance: number;
  windGust: number;
  aqi: number;
  floodFactor: number;
  maxUv: number;
  maxTemp: number;
}) => {
  const rainScore =
    scoreBand(params.rainfallMm, [
      { limit: 5, score: 2 },
      { limit: 15, score: 7 },
      { limit: 30, score: 14 },
      { limit: 50, score: 21 },
      { limit: 80, score: 29 },
      { limit: Number.POSITIVE_INFINITY, score: 35 },
    ]) +
    scoreBand(params.rainChance, [
      { limit: 20, score: 0 },
      { limit: 40, score: 2 },
      { limit: 60, score: 4 },
      { limit: 80, score: 6 },
      { limit: Number.POSITIVE_INFINITY, score: 8 },
    ]);

  const windScore = scoreBand(params.windGust, [
    { limit: 25, score: 1 },
    { limit: 40, score: 6 },
    { limit: 55, score: 11 },
    { limit: 70, score: 16 },
    { limit: Number.POSITIVE_INFINITY, score: 20 },
  ]);

  const airScore = scoreBand(params.aqi, [
    { limit: 50, score: 0 },
    { limit: 100, score: 4 },
    { limit: 150, score: 7 },
    { limit: 200, score: 9 },
    { limit: Number.POSITIVE_INFINITY, score: 10 },
  ]);

  const floodScore = scoreBand(params.floodFactor, [
    { limit: 1.02, score: 1 },
    { limit: 1.15, score: 7 },
    { limit: 1.3, score: 14 },
    { limit: 1.45, score: 20 },
    { limit: Number.POSITIVE_INFINITY, score: 25 },
  ]);

  const exposureScore = clamp(
    scoreBand(params.maxUv, [
      { limit: 5, score: 1 },
      { limit: 8, score: 3 },
      { limit: 10, score: 5 },
      { limit: Number.POSITIVE_INFINITY, score: 7 },
    ]) +
      scoreBand(params.maxTemp, [
        { limit: 26, score: 0 },
        { limit: 30, score: 1 },
        { limit: 33, score: 2 },
        { limit: Number.POSITIVE_INFINITY, score: 3 },
      ]),
    0,
    10,
  );

  return clamp(rainScore + windScore + airScore + floodScore + exposureScore, 0, 100);
};
