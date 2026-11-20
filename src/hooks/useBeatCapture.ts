import { useEffect, useState } from 'react';

import { nativeBridge } from '@/native';
import { BEAT_BANDS, systemAudioVisualizer, type BeatSource } from '@/native/systemAudioVisualizer';

const RETRY_MS = 1_500;
const MAX_ATTEMPTS = 12;

/**
 * Starts the native beat meter while media is playing and stops it on unmount.
 *
 * `requestAudioPermission` returns before the system dialog is answered, so the
 * first start usually reports `permission`. The hook keeps retrying the start
 * (without re-prompting) for ~18 s, which is enough for the user to tap Allow;
 * after that the equalizer stays in its quiet idle state instead of pretending
 * to have a beat.
 */
export function useBeatCapture(active: boolean): BeatSource {
  const [source, setSource] = useState<BeatSource>('none');

  useEffect(() => {
    if (!active || !systemAudioVisualizer.available) {
      setSource('none');
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let started = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const attempt = async () => {
      if (cancelled) return;
      const result = await systemAudioVisualizer.start(BEAT_BANDS);
      if (cancelled) return;
      if (result.ok) {
        started = true;
        setSource(result.source);
        return;
      }
      attempts += 1;
      if (attempts < MAX_ATTEMPTS) {
        timer = setTimeout(attempt, RETRY_MS);
      } else {
        setSource('none');
      }
    };

    const begin = async () => {
      const granted = await nativeBridge.requestAudioPermission();
      if (cancelled) return;
      if (!granted) {
        // Dialog is on screen; give it a moment before the first start.
        timer = setTimeout(attempt, RETRY_MS);
        return;
      }
      await attempt();
    };

    void begin();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (started) void systemAudioVisualizer.stop();
      setSource('none');
    };
  }, [active]);

  return source;
}
