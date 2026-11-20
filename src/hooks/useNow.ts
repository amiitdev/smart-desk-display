import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Ticking clock. Re-renders once per second while the app is in the foreground
 * and stops entirely when the app is backgrounded (no wasted JS work).
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      setNow(new Date());
      timer = setInterval(() => setNow(new Date()), intervalMs);
    };

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    start();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, [intervalMs]);

  return now;
}
