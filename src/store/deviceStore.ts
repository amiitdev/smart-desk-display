import { create } from 'zustand';

import { nativeBridge } from '@/native';
import type { BatteryInfo, MediaAction, MediaInfo, NetworkInfo, SystemInfo } from '@/native/types';

interface DeviceStore {
  battery: BatteryInfo | null;
  network: NetworkInfo | null;
  system: SystemInfo | null;
  media: MediaInfo | null;
  /** Set when a native call reports a real problem (never for permission denials). */
  lastError: string | null;

  setBattery: (battery: BatteryInfo) => void;
  setNetwork: (network: NetworkInfo) => void;
  setSystem: (system: SystemInfo) => void;
  setMedia: (media: MediaInfo) => void;

  refreshBattery: () => Promise<void>;
  refreshNetwork: () => Promise<void>;
  refreshSystem: () => Promise<void>;
  refreshMedia: () => Promise<void>;
  controlMedia: (action: MediaAction) => Promise<string | null>;
}

export const useDeviceStore = create<DeviceStore>((set) => ({
  battery: null,
  network: null,
  system: null,
  media: null,
  lastError: null,

  setBattery: (battery) => set({ battery }),
  setNetwork: (network) => set({ network }),
  setSystem: (system) => set({ system }),
  setMedia: (media) => set({ media }),

  async refreshBattery() {
    const battery = await nativeBridge.getBatteryInfo();
    if (battery) set({ battery });
  },

  async refreshNetwork() {
    const network = await nativeBridge.getNetworkInfo();
    if (network) set({ network });
  },

  async refreshSystem() {
    const system = await nativeBridge.getSystemInfo();
    if (system) set({ system });
  },

  async refreshMedia() {
    const media = await nativeBridge.getMediaInfo();
    if (media) set({ media });
  },

  async controlMedia(action) {
    const result = await nativeBridge.controlMedia(action);
    if (!result.ok) return result.message ?? 'Media control failed';
    const media = await nativeBridge.getMediaInfo();
    if (media) set({ media });
    return null;
  },
}));
