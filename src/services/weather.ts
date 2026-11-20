/**
 * Open-Meteo integration.
 *
 * Docs: https://open-meteo.com/en/docs
 * No API key required. Weather is always stored in Celsius inside the shared
 * dashboard state so the Android widget and React Native never disagree; the
 * unit preference is applied at render time.
 */
import type { ForecastDay, SavedLocation, WeatherSnapshot } from '@/native/types';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

export class WeatherError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'WeatherError';
  }
}

export interface GeocodeResult {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

export async function searchLocations(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(trimmed)}&count=8&language=en&format=json`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new WeatherError(`Location search failed (HTTP ${response.status})`);
  const json = (await response.json()) as {
    results?: Array<{
      name: string;
      country?: string;
      admin1?: string;
      latitude: number;
      longitude: number;
    }>;
  };
  return (json.results ?? []).map((item) => ({
    name: item.name,
    country: item.country ?? '',
    admin1: item.admin1,
    latitude: item.latitude,
    longitude: item.longitude,
  }));
}

interface OpenMeteoResponse {
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max?: Array<number | null>;
  };
}

export async function fetchWeather(
  location: SavedLocation,
  signal?: AbortSignal,
): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '5',
  });

  let response: Response;
  try {
    response = await fetch(`${FORECAST_URL}?${params.toString()}`, { signal });
  } catch (error) {
    throw new WeatherError('Network unavailable. Showing the last cached weather.', error);
  }

  if (!response.ok) {
    throw new WeatherError(`Open-Meteo returned HTTP ${response.status}`);
  }

  const json = (await response.json()) as OpenMeteoResponse;
  if (!json.current) throw new WeatherError('Open-Meteo response did not include current weather.');

  const daily = json.daily;
  const forecast: ForecastDay[] = (daily?.time ?? []).map((date, index) => ({
    date,
    minC: daily?.temperature_2m_min?.[index] ?? 0,
    maxC: daily?.temperature_2m_max?.[index] ?? 0,
    code: daily?.weather_code?.[index] ?? 0,
    precipitationChance: daily?.precipitation_probability_max?.[index] ?? null,
  }));

  return {
    tempC: Math.round(json.current.temperature_2m * 10) / 10,
    feelsLikeC: Math.round(json.current.apparent_temperature * 10) / 10,
    humidity: json.current.relative_humidity_2m,
    windKph: json.current.wind_speed_10m,
    code: json.current.weather_code,
    isDay: json.current.is_day === 1,
    locationName: location.name,
    updatedAt: Date.now(),
    forecast,
  };
}

export interface WeatherDescriptor {
  label: string;
  /** Icon family used by <WeatherIcon />. */
  icon:
    | 'clear'
    | 'partly'
    | 'cloudy'
    | 'fog'
    | 'drizzle'
    | 'rain'
    | 'snow'
    | 'thunder'
    | 'sleet';
}

/** WMO 4677 weather interpretation codes. */
export function describeWeatherCode(code: number, isDay = true): WeatherDescriptor {
  switch (code) {
    case 0:
      return { label: 'Clear sky', icon: 'clear' };
    case 1:
      return { label: 'Mainly clear', icon: 'partly' };
    case 2:
      return { label: 'Partly cloudy', icon: 'partly' };
    case 3:
      return { label: 'Overcast', icon: 'cloudy' };
    case 45:
    case 48:
      return { label: code === 48 ? 'Rime fog' : 'Fog', icon: 'fog' };
    case 51:
      return { label: 'Light drizzle', icon: 'drizzle' };
    case 53:
      return { label: 'Drizzle', icon: 'drizzle' };
    case 55:
      return { label: 'Dense drizzle', icon: 'drizzle' };
    case 56:
    case 57:
      return { label: 'Freezing drizzle', icon: 'sleet' };
    case 61:
      return { label: 'Light rain', icon: 'rain' };
    case 63:
      return { label: 'Rain', icon: 'rain' };
    case 65:
      return { label: 'Heavy rain', icon: 'rain' };
    case 66:
    case 67:
      return { label: 'Freezing rain', icon: 'sleet' };
    case 71:
      return { label: 'Light snow', icon: 'snow' };
    case 73:
      return { label: 'Snow', icon: 'snow' };
    case 75:
      return { label: 'Heavy snow', icon: 'snow' };
    case 77:
      return { label: 'Snow grains', icon: 'snow' };
    case 80:
    case 81:
    case 82:
      return { label: 'Rain showers', icon: 'rain' };
    case 85:
    case 86:
      return { label: 'Snow showers', icon: 'snow' };
    case 95:
      return { label: 'Thunderstorm', icon: 'thunder' };
    case 96:
    case 99:
      return { label: 'Thunderstorm with hail', icon: 'thunder' };
    default:
      return { label: isDay ? 'Unknown conditions' : 'Unknown conditions', icon: 'cloudy' };
  }
}

export function celsiusToFahrenheit(celsius: number): number {
  return celsius * (9 / 5) + 32;
}

export function formatTemperature(celsius: number, unit: 'c' | 'f'): string {
  const value = unit === 'f' ? celsiusToFahrenheit(celsius) : celsius;
  return `${Math.round(value)}°`;
}
