/** Shared data schema (version 1) exchanged between React Native, Kotlin and the widgets. */

export const DASHBOARD_SCHEMA_VERSION = 1 as const;

export type TemperatureUnit = 'c' | 'f';

export interface SavedLocation {
  name: string;
  latitude: number;
  longitude: number;
}

export interface DashboardSettings {
  use24Hour: boolean;
  /** Screen brightness 0..1 (mirrors the hardware backlight). */
  backlight: number;
  /** Media volume 0..1. */
  volume: number;
  temperatureUnit: TemperatureUnit;
  location: SavedLocation | null;
}

export interface ForecastDay {
  /** ISO date, e.g. 2026-11-19 */
  date: string;
  minC: number;
  maxC: number;
  code: number;
  precipitationChance: number | null;
}

export interface WeatherSnapshot {
  tempC: number;
  feelsLikeC: number;
  humidity: number;
  windKph: number;
  /** WMO weather interpretation code. */
  code: number;
  isDay: boolean;
  locationName: string;
  updatedAt: number;
  forecast: ForecastDay[];
}

export interface Task {
  id: string;
  title: string;
  /** Epoch millis of the deadline, null when the task has no deadline. */
  deadline: number | null;
  completed: boolean;
  /** Epoch millis of the reminder notification, null when none. */
  reminderAt: number | null;
  createdAt: number;
}

export interface MediaHistoryEntry {
  title: string;
  artist: string | null;
  packageName: string | null;
  playedAt: number;
}

export interface DashboardState {
  version: typeof DASHBOARD_SCHEMA_VERSION;
  updatedAt: number;
  settings: DashboardSettings;
  weather: WeatherSnapshot | null;
  tasks: Task[];
  mediaHistory: MediaHistoryEntry[];
}

export interface BatteryInfo {
  level: number;
  isCharging: boolean;
  chargingType: 'AC' | 'USB' | 'Wireless' | 'Dock' | 'None';
  statusLabel: string;
  temperatureC: number | null;
  voltage: number;
  /** Battery current in mA. Negative while discharging, positive while charging. */
  currentMa: number;
  powerMw: number | null;
  health: string;
  technology: string | null;
}

export type NetworkTransport = 'Wi-Fi' | 'Cellular' | 'Ethernet' | 'VPN' | 'None';

export interface NetworkInfo {
  connected: boolean;
  transport: NetworkTransport;
  ssid: string | null;
  signalLevel: number;
  signalDbm: number | null;
  linkSpeedMbps: number | null;
  frequencyMhz: number | null;
  ipAddress: string | null;
  hasInternet: boolean;
  isMetered: boolean;
  carrierName: string | null;
  ssidPermissionGranted: boolean;
}

export interface MediaInfo {
  /** True when the app has notification-listener access (required on Android 11+). */
  enabled: boolean;
  hasSession: boolean;
  isPlaying: boolean;
  title: string | null;
  artist: string | null;
  album: string | null;
  packageName: string | null;
  appLabel: string | null;
  durationMs: number;
  positionMs: number;
  artworkUri: string | null;
  supportsNext: boolean;
  supportsPrevious: boolean;
}

export interface SystemInfo {
  deviceModel: string;
  manufacturer: string;
  brand: string;
  androidVersion: string;
  apiLevel: number;
  cpuCores: number;
  cpuAbi: string;
  totalRamBytes: number;
  availableRamBytes: number;
  usedRamBytes: number;
  totalStorageBytes: number;
  freeStorageBytes: number;
  uptimeMs: number;
  screenWidthPx: number;
  screenHeightPx: number;
  density: number;
  volumeLevel: number;
  volumeMax: number;
}

export type MediaAction = 'play' | 'pause' | 'toggle' | 'next' | 'previous' | 'stop';

export type SettingsSection = 'notification_listener' | 'wifi' | 'location' | 'app' | 'battery_optimization';

export interface MediaControlResult {
  ok: boolean;
  message?: string;
}

export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetPinResult {
  small: boolean;
  medium: boolean;
  large: boolean;
}
