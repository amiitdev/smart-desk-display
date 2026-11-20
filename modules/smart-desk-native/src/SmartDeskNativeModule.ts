import { NativeModule, requireNativeModule } from 'expo';

import type {
  BatteryInfo,
  DashboardState,
  MediaAction,
  MediaControlResult,
  MediaInfo,
  NetworkInfo,
  SettingsSection,
  SystemInfo,
  WidgetPinResult,
  WidgetSize,
} from './SmartDeskNative.types';

export type SmartDeskNativeEvents = {
  onMediaChanged: (media: MediaInfo) => void;
  onStateChanged: (state: DashboardState) => void;
  onBatteryChanged: (battery: BatteryInfo) => void;
};

declare class SmartDeskNativeModule extends NativeModule<SmartDeskNativeEvents> {
  getBatteryInfo(): Promise<BatteryInfo>;
  getNetworkInfo(): Promise<NetworkInfo>;
  getMediaInfo(): Promise<MediaInfo>;
  controlMedia(action: MediaAction): Promise<MediaControlResult>;
  getSystemInfo(): Promise<SystemInfo>;
  setVolume(level: number): Promise<{ level: number; max: number }>;
  saveDashboardData(state: DashboardState): Promise<boolean>;
  getDashboardData(): Promise<DashboardState>;
  getMediaHistory(): Promise<DashboardState['mediaHistory']>;
  clearMediaHistory(): Promise<boolean>;
  updateWidget(): Promise<boolean>;
  isNotificationAccessGranted(): Promise<boolean>;
  requestAudioPermission(): Promise<boolean>;
  openSettings(section: SettingsSection): Promise<boolean>;
  getScreenBrightness(): Promise<number>;
  setScreenBrightness(level: number): Promise<boolean>;
  pinWidget(size: WidgetSize): Promise<boolean>;
  isWidgetPinned(): Promise<WidgetPinResult>;
}

// The module only exists on Android (this app's only target platform).
export default requireNativeModule<SmartDeskNativeModule>('SmartDeskNative');
