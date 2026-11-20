import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import SmartDeskNative from '../../modules/smart-desk-native/src/SmartDeskNativeModule';
import { useDashboardStore } from '@/store/dashboardStore';
import { useDeviceStore } from '@/store/deviceStore';

/**
 * Bridges live native telemetry into Zustand:
 *  - battery + media state arrive as push events from Kotlin receivers/services
 *  - network and system info are cheap binder calls polled on a slow interval
 *  - everything stops while the app is backgrounded
 */
export function useDeviceTelemetry() {
  const timerRef = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    const device = useDeviceStore.getState();
    const dashboard = useDashboardStore.getState();

    const refreshSlow = () => {
      void device.refreshNetwork();
      void device.refreshSystem();
    };

    void device.refreshBattery();
    void device.refreshMedia();
    refreshSlow();

    const subscriptions = [
      SmartDeskNative?.addListener?.('onMediaChanged', (media) => {
        useDeviceStore.getState().setMedia(media);
      }),
      SmartDeskNative?.addListener?.('onStateChanged', (state) => {
        useDashboardStore.getState().applyNativeState(state);
      }),
    ].filter(Boolean) as Array<{ remove: () => void }>;

    const startTimers = () => {
      stopTimers();
      timerRef.current = [
        setInterval(() => void useDeviceStore.getState().refreshBattery(), 30_000),
        setInterval(() => useDeviceStore.getState().refreshNetwork(), 20_000),
        setInterval(() => {
          void useDeviceStore.getState().refreshSystem();
          const media = useDeviceStore.getState().media;
          if (media?.isPlaying) void useDeviceStore.getState().refreshMedia();
        }, 15_000),
      ];
    };

    const stopTimers = () => {
      timerRef.current.forEach(clearInterval);
      timerRef.current = [];
    };

    startTimers();

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void useDashboardStore.getState().hydrate();
        void useDashboardStore.getState().syncWeather();
        void useDeviceStore.getState().refreshBattery();
        void useDeviceStore.getState().refreshMedia();
        refreshSlow();
        startTimers();
      } else {
        stopTimers();
      }
    });

    // First hydration of the persisted dashboard state.
    void dashboard.hydrate();

    return () => {
      stopTimers();
      appStateSubscription.remove();
      subscriptions.forEach((subscription) => subscription.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
