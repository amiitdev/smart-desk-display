import SmartDeskNative from '../../modules/smart-desk-native/src/SmartDeskNativeModule';
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
} from './types';

export * from './types';
export { default as SmartDeskNative } from '../../modules/smart-desk-native/src/SmartDeskNativeModule';

export const NATIVE_MODULE_NAME = 'SmartDeskNative';

function isAndroid() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Platform } = require('react-native') as typeof import('react-native');
  return Platform.OS === 'android';
}

/**
 * Every call into Kotlin is wrapped so a missing / mis-built native module
 * surfaces as a readable error banner instead of a red screen.
 */
async function call<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.warn(`[smart-desk-native] call failed`, error);
    return fallback;
  }
}

export const nativeBridge = {
  get available() {
    return isAndroid() && !!SmartDeskNative;
  },

  getBatteryInfo: (): Promise<BatteryInfo | null> =>
    call(async () => SmartDeskNative.getBatteryInfo(), null as BatteryInfo | null),

  getNetworkInfo: (): Promise<NetworkInfo | null> =>
    call(async () => SmartDeskNative.getNetworkInfo(), null as NetworkInfo | null),

  getMediaInfo: (): Promise<MediaInfo | null> =>
    call(async () => SmartDeskNative.getMediaInfo(), null as MediaInfo | null),

  controlMedia: (action: MediaAction): Promise<MediaControlResult> =>
    call(async () => SmartDeskNative.controlMedia(action), {
      ok: false,
      message: 'Native media controls are unavailable on this platform.',
    }),

  getSystemInfo: (): Promise<SystemInfo | null> =>
    call(async () => SmartDeskNative.getSystemInfo(), null as SystemInfo | null),

  setVolume: (level: number): Promise<{ level: number; max: number }> =>
    call(async () => SmartDeskNative.setVolume(level), { level: 0, max: 0 }),

  saveDashboardData: (state: DashboardState): Promise<boolean> =>
    call(async () => SmartDeskNative.saveDashboardData(state), false),

  getDashboardData: (): Promise<DashboardState | null> =>
    call(async () => SmartDeskNative.getDashboardData(), null as DashboardState | null),

  updateWidget: (): Promise<boolean> => call(async () => SmartDeskNative.updateWidget(), false),

  requestAudioPermission: (): Promise<boolean> =>
    call(async () => SmartDeskNative.requestAudioPermission(), false),

  isNotificationAccessGranted: (): Promise<boolean> =>
    call(async () => SmartDeskNative.isNotificationAccessGranted(), false),

  getScreenBrightness: (): Promise<number | null> =>
    call(async () => SmartDeskNative.getScreenBrightness(), null as number | null),

  setScreenBrightness: (level: number): Promise<boolean> =>
    call(async () => SmartDeskNative.setScreenBrightness(level), false),

  openSettings: (section: SettingsSection): Promise<boolean> =>
    call(async () => SmartDeskNative.openSettings(section), false),

  pinWidget: (size: WidgetSize): Promise<boolean> =>
    call(async () => SmartDeskNative.pinWidget(size), false),

  isWidgetPinned: (): Promise<WidgetPinResult> =>
    call(async () => SmartDeskNative.isWidgetPinned(), { small: false, medium: false, large: false }),

  clearMediaHistory: (): Promise<boolean> => call(async () => SmartDeskNative.clearMediaHistory(), false),
};
