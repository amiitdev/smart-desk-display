import * as Location from 'expo-location';
import { create } from 'zustand';

import { nativeBridge } from '@/native';
import {
  DASHBOARD_SCHEMA_VERSION,
  type DashboardSettings,
  type DashboardState,
  type MediaInfo,
  type SavedLocation,
  type Task,
  type WeatherSnapshot,
} from '@/native/types';
import { syncTaskReminders, scheduleTaskReminder, cancelTaskReminder } from '@/services/notifications';
import { fetchWeather, type GeocodeResult } from '@/services/weather';

export const DEFAULT_SETTINGS: DashboardSettings = {
  use24Hour: true,
  backlight: 0.85,
  volume: 0.6,
  temperatureUnit: 'c',
  location: null,
};

type WeatherStatus = 'idle' | 'loading' | 'ready' | 'error';

interface DashboardStore {
  hydrated: boolean;
  nativeError: string | null;
  settings: DashboardSettings;
  tasks: Task[];
  weather: WeatherSnapshot | null;
  mediaHistory: DashboardState['mediaHistory'];
  weatherStatus: WeatherStatus;
  weatherError: string | null;
  lastSyncedAt: number;

  hydrate: () => Promise<void>;
  updateSettings: (partial: Partial<DashboardSettings>) => Promise<void>;
  setLocation: (location: SavedLocation) => Promise<void>;
  pickLocationFromDevice: () => Promise<SavedLocation | null>;
  searchLocation: (result: GeocodeResult) => Promise<void>;
  syncWeather: (options?: { force?: boolean }) => Promise<void>;

  addTask: (input: { title: string; deadline: number | null; reminderAt: number | null }) => Promise<Task>;
  updateTask: (id: string, patch: Partial<Omit<Task, 'id'>>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  setMediaHistory: (history: DashboardState['mediaHistory']) => void;
  clearMediaHistory: () => Promise<void>;
  applyNativeState: (state: DashboardState) => void;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function createId(): string {
  return `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useDashboardStore = create<DashboardStore>((set, get) => {
  /**
   * Single writer path: every persisted field change goes through here, then
   * lands in the Kotlin repository (SharedPreferences) which is shared with the
   * Android widget. There is exactly one stored copy of dashboard state.
   */
  function persist(partial: Partial<Pick<DashboardState, 'settings' | 'tasks' | 'weather' | 'mediaHistory'>>) {
    const state = get();
    const next: DashboardState = {
      version: DASHBOARD_SCHEMA_VERSION,
      updatedAt: Date.now(),
      settings: partial.settings ?? state.settings,
      tasks: partial.tasks ?? state.tasks,
      weather: partial.weather ?? state.weather,
      mediaHistory: partial.mediaHistory ?? state.mediaHistory,
    };
    set({ lastSyncedAt: next.updatedAt });
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      void nativeBridge.saveDashboardData(next).then((ok) => {
        if (!ok) set({ nativeError: 'Could not persist dashboard data to the native store.' });
      });
    }, 120);
  }

  return {
    hydrated: false,
    nativeError: null,
    settings: DEFAULT_SETTINGS,
    tasks: [],
    weather: null,
    mediaHistory: [],
    weatherStatus: 'idle',
    weatherError: null,
    lastSyncedAt: 0,

    async hydrate() {
      if (get().hydrated) return;
      try {
        const stored = await nativeBridge.getDashboardData();
        if (!stored) {
          set({ hydrated: true, nativeError: 'Native dashboard store unavailable.' });
        } else {
          set({
            hydrated: true,
            settings: { ...DEFAULT_SETTINGS, ...stored.settings },
            tasks: stored.tasks ?? [],
            weather: stored.weather,
            mediaHistory: stored.mediaHistory ?? [],
            lastSyncedAt: stored.updatedAt ?? 0,
          });
        }
        await syncTaskReminders(get().tasks);
      } catch (error) {
        set({ hydrated: true, nativeError: (error as Error).message });
      }
      void get().syncWeather();
    },

    async updateSettings(partial) {
      const settings = { ...get().settings, ...partial };
      set({ settings });
      persist({ settings });
      if (partial.volume !== undefined) {
        await nativeBridge.setVolume(partial.volume);
      }
    },

    async setLocation(location) {
      const settings = { ...get().settings, location };
      set({ settings });
      persist({ settings });
      await get().syncWeather({ force: true });
    },

    async searchLocation(result) {
      const location: SavedLocation = {
        name: [result.name, result.admin1, result.country].filter(Boolean).join(', '),
        latitude: result.latitude,
        longitude: result.longitude,
      };
      await get().setLocation(location);
    },

    async pickLocationFromDevice() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) return null;
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        let name = 'Current location';
        try {
          const [place] = await Location.reverseGeocodeAsync({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          if (place) {
            name = [place.city ?? place.district ?? place.subregion, place.region, place.country]
              .filter(Boolean)
              .join(', ');
          }
        } catch {
          // Reverse geocoding is best-effort (needs network / Play services).
        }
        const location: SavedLocation = {
          name,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        await get().setLocation(location);
        return location;
      } catch {
        return null;
      }
    },

    async syncWeather(options) {
      const { settings, weather, weatherStatus } = get();
      if (weatherStatus === 'loading') return;

      const stale = !weather || Date.now() - weather.updatedAt > 30 * 60 * 1000;
      if (!options?.force && !stale) return;

      let location = settings.location;
      if (!location) {
        location = await get().pickLocationFromDevice();
      }
      if (!location) {
        set({
          weatherStatus: weather ? 'ready' : 'error',
          weatherError: 'Choose a location in Settings to load live weather.',
        });
        return;
      }

      set({ weatherStatus: 'loading', weatherError: null });
      try {
        const snapshot = await fetchWeather(location);
        set({ weather: snapshot, weatherStatus: 'ready' });
        persist({ weather: snapshot });
      } catch (error) {
        set({
          weatherStatus: 'error',
          weatherError: (error as Error).message,
        });
      }
    },

    async addTask(input) {
      const task: Task = {
        id: createId(),
        title: input.title.trim(),
        deadline: input.deadline,
        completed: false,
        reminderAt: input.reminderAt,
        createdAt: Date.now(),
      };
      const tasks = [...get().tasks, task];
      set({ tasks });
      persist({ tasks });
      await scheduleTaskReminder(task);
      return task;
    },

    async updateTask(id, patch) {
      const tasks = get().tasks.map((task) => (task.id === id ? { ...task, ...patch } : task));
      set({ tasks });
      persist({ tasks });
      const updated = tasks.find((task) => task.id === id);
      if (updated) await scheduleTaskReminder(updated);
    },

    async toggleTask(id) {
      const tasks = get().tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      );
      set({ tasks });
      persist({ tasks });
      const updated = tasks.find((task) => task.id === id);
      if (updated) {
        if (updated.completed) await cancelTaskReminder(updated.id);
        else await scheduleTaskReminder(updated);
      }
    },

    async deleteTask(id) {
      const tasks = get().tasks.filter((task) => task.id !== id);
      set({ tasks });
      persist({ tasks });
      await cancelTaskReminder(id);
    },

    setMediaHistory(history) {
      set({ mediaHistory: history });
    },

    async clearMediaHistory() {
      set({ mediaHistory: [] });
      persist({ mediaHistory: [] });
      await nativeBridge.clearMediaHistory();
    },

    applyNativeState(state) {
      if (!state || state.updatedAt <= get().lastSyncedAt) return;
      set({
        settings: { ...DEFAULT_SETTINGS, ...state.settings },
        tasks: state.tasks ?? [],
        weather: state.weather,
        mediaHistory: state.mediaHistory ?? [],
        lastSyncedAt: state.updatedAt,
      });
    },
  };
});

/** Selector helpers keep components from re-rendering on unrelated changes. */
export const selectPendingTasks = (state: DashboardStore) =>
  state.tasks.filter((task) => !task.completed);

export function sortTasksByDeadline(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.deadline && b.deadline) return a.deadline - b.deadline;
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return a.createdAt - b.createdAt;
  });
}
