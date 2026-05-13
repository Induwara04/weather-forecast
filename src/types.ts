export type SriLankaLocation = {
  id: string;
  name: string;
  district: string;
  latitude: number;
  longitude: number;
  focus?: boolean;
};

export type WeatherPoint = {
  time: string;
  temperature: number;
  rain: number;
  precipitationProbability: number;
  windGust: number;
  uvIndex: number;
};

export type DailyPoint = {
  time: string;
  weatherCode: number;
  maxTemp: number;
  minTemp: number;
  maxUv: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  maxWindSpeed: number;
  maxWindGust: number;
  sunrise: string;
  sunset: string;
};

export type HomeSnapshot = {
  location: SriLankaLocation;
  timezone: string;
  current: {
    time: string;
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    precipitation: number;
    weatherCode: number;
    cloudCover: number;
    windSpeed: number;
    windDirection: number;
    windGust: number;
    pressure: number;
    isDay: number;
  };
  hourly: WeatherPoint[];
  daily: DailyPoint[];
  currentAir: {
    usAqi: number;
    pm25: number;
    pm10: number;
    carbonMonoxide: number;
    uvIndex: number;
  };
};

export type AreaRisk = {
  location: SriLankaLocation;
  score: number;
  level: 'Low' | 'Guarded' | 'Elevated' | 'High' | 'Severe';
  rainfallMm: number;
  rainChance: number;
  windGust: number;
  aqi: number;
  floodFactor: number;
  maxUv: number;
  summary: string;
  alerts: string[];
};

export type DashboardPayload = {
  home: HomeSnapshot;
  areas: AreaRisk[];
  generatedAt: string;
};
