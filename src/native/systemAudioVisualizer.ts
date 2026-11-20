import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

/**
 * Thin wrapper over the `SystemAudioVisualizer` React Native module
 * (`modules/smart-desk-native/.../audio/`), registered in MainApplication by
 * `plugins/withAudioVisualizer.js`.
 *
 * The native side picks the source on its own:
 *   1. `Visualizer(0)` on the global output mix (no screen capture).
 *   2. If Android 16 never delivers samples, a 16 kHz microphone FFT.
 *
 * Frames arrive at ~20 Hz. They are fanned out through a tiny bus so exactly one
 * component drives the animation and no React state updates per frame.
 */

export type BeatSource = 'visualizer' | 'microphone' | 'none';

export interface BeatFrame {
  bands: number[];
  level: number;
  source: BeatSource;
}

export interface BeatStartResult {
  ok: boolean;
  source: BeatSource;
  reason?: string | null;
}

/** Band count shared with the native mapper. */
export const BEAT_BANDS = 12;

const EVENT = 'onFftUpdate';

interface NativeSystemAudioVisualizer {
  start(numBars: number): Promise<BeatStartResult>;
  stop(): Promise<boolean>;
  getSource(): Promise<BeatSource>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

const native: NativeSystemAudioVisualizer | undefined =
  Platform.OS === 'android'
    ? (NativeModules.SystemAudioVisualizer as NativeSystemAudioVisualizer | undefined)
    : undefined;

const emitter = native ? new NativeEventEmitter(native as never) : null;

type BeatListener = (frame: BeatFrame) => void;

const listeners = new Set<BeatListener>();
let latest: BeatFrame | null = null;
let bridgeSubscription: { remove(): void } | null = null;
let debugLastLog = 0;

function ensureBridge() {
  if (bridgeSubscription || !emitter) return;
  bridgeSubscription = emitter.addListener(EVENT, (payload) => {
    // NativeEventEmitter hands over the argument list; the module emits one map.
    const frame = ((payload as readonly unknown[])?.[0] ?? payload) as unknown as BeatFrame;
    if (!frame?.bands) return;
    if (__DEV__) {
      const now = Date.now();
      if (now - debugLastLog > 2000) {
        debugLastLog = now;
        console.log(`[beats] ${frame.source} ${frame.bands.map((band) => band.toFixed(2)).join(',')}`);
      }
    }
    latest = frame;
    listeners.forEach((listener) => listener(frame));
  });
}

function releaseBridge() {
  if (listeners.size > 0) return;
  bridgeSubscription?.remove();
  bridgeSubscription = null;
  latest = null;
}

export const systemAudioVisualizer = {
  get available() {
    return Boolean(native);
  },

  /** Last frame received, or null when capture is idle. */
  get latest() {
    return latest;
  },

  start(numBars: number = BEAT_BANDS): Promise<BeatStartResult> {
    if (!native) {
      return Promise.resolve({ ok: false, source: 'none' as BeatSource, reason: 'unavailable' });
    }
    return native.start(numBars);
  },

  stop(): Promise<boolean> {
    latest = null;
    return native ? native.stop() : Promise.resolve(false);
  },

  /** Subscribe to frames. Returns a handle; the bridge is closed with the last listener. */
  subscribe(listener: BeatListener) {
    ensureBridge();
    listeners.add(listener);
    return {
      remove() {
        listeners.delete(listener);
        releaseBridge();
      },
    };
  },
};
