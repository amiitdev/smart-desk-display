import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BacklightCard, PowerCard } from '@/components/dashboard/PowerCard';
import { CalendarCard } from '@/components/dashboard/CalendarCard';
import { ClockCard } from '@/components/dashboard/ClockCard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MusicCard } from '@/components/dashboard/MusicCard';
import { NetworkFooter } from '@/components/dashboard/NetworkFooter';
import { PlaylistCard } from '@/components/dashboard/PlaylistCard';
import { SystemCard } from '@/components/dashboard/SystemCard';
import { TaskTable } from '@/components/dashboard/TaskTable';
import { TasksBanner } from '@/components/dashboard/TasksBanner';
import { WeatherCard } from '@/components/dashboard/WeatherCard';
import { useDeviceTelemetry } from '@/hooks/useDeviceTelemetry';
import { useNow } from '@/hooks/useNow';
import { nativeBridge } from '@/native';
import { useDashboardStore } from '@/store/dashboardStore';
import { useDeviceStore } from '@/store/deviceStore';
import { colors, layout, radii } from '@/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= layout.wideBreakpoint;

  useDeviceTelemetry();

  const now = useNow(1000);

  const settings = useDashboardStore((state) => state.settings);
  const tasks = useDashboardStore((state) => state.tasks);
  const weather = useDashboardStore((state) => state.weather);
  const weatherStatus = useDashboardStore((state) => state.weatherStatus);
  const weatherError = useDashboardStore((state) => state.weatherError);
  const mediaHistory = useDashboardStore((state) => state.mediaHistory);
  const syncWeather = useDashboardStore((state) => state.syncWeather);
  const updateSettings = useDashboardStore((state) => state.updateSettings);
  const pickLocationFromDevice = useDashboardStore((state) => state.pickLocationFromDevice);
  const toggleTask = useDashboardStore((state) => state.toggleTask);
  const clearMediaHistory = useDashboardStore((state) => state.clearMediaHistory);

  const battery = useDeviceStore((state) => state.battery);
  const network = useDeviceStore((state) => state.network);
  const system = useDeviceStore((state) => state.system);
  const media = useDeviceStore((state) => state.media);
  const controlMedia = useDeviceStore((state) => state.controlMedia);

  const [backlight, setBacklight] = useState(settings.backlight);
  const [volume, setVolume] = useState(settings.volume);
  const [mediaAccessGranted, setMediaAccessGranted] = useState<boolean | null>(null);

  // Screen brightness is a native window property; read it once so the slider
  // reflects the real value instead of an invented default.
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const current = await nativeBridge.getScreenBrightness();
      if (mounted && current != null) {
        setBacklight((value) => (Math.abs(value - current) > 0.02 ? current : value));
      }
      const granted = await nativeBridge.isNotificationAccessGranted();
      if (mounted) setMediaAccessGranted(granted);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Keep the media stream of events in sync with the permission state.
  useEffect(() => {
    if (media) setMediaAccessGranted(media.enabled);
  }, [media?.enabled]);

  useEffect(() => setBacklight(settings.backlight), [settings.backlight]);
  useEffect(() => setVolume(settings.volume), [settings.volume]);

  const taskDays = useMemo(() => {
    const days = new Set<string>();
    tasks
      .filter((task) => !task.completed && task.deadline)
      .forEach((task) => {
        const date = new Date(task.deadline as number);
        days.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
      });
    return days;
  }, [tasks]);

  const pendingCount = tasks.filter((task) => !task.completed).length;

  const backlightStamp = useRef(0);
  const volumeStamp = useRef(0);

  // Throttled live application: the slider tracks the finger immediately while
  // the native call is rate limited, so dragging stays smooth.
  const applyBacklight = useCallback((value: number) => {
    setBacklight(value);
    const now = Date.now();
    if (now - backlightStamp.current > 80) {
      backlightStamp.current = now;
      void nativeBridge.setScreenBrightness(value);
    }
  }, []);

  const commitBacklight = useCallback(
    (value: number) => {
      setBacklight(value);
      backlightStamp.current = 0;
      void nativeBridge.setScreenBrightness(value);
      void updateSettings({ backlight: value });
    },
    [updateSettings],
  );

  const applyVolume = useCallback((value: number) => {
    setVolume(value);
    const now = Date.now();
    if (now - volumeStamp.current > 120) {
      volumeStamp.current = now;
      void nativeBridge.setVolume(value);
    }
  }, []);

  // On release the native stream is the authority: the slider snaps to the real
  // step value so the UI and the device volume can never drift apart.
  const commitVolume = useCallback(
    async (value: number) => {
      const result = await nativeBridge.setVolume(value);
      const synced = result.max > 0 ? result.level / result.max : value;
      setVolume(synced);
      await updateSettings({ volume: synced });
    },
    [updateSettings],
  );

  const openPermissions = useCallback(() => router.push('/permissions'), [router]);

  const calendarCard = <CalendarCard taskDays={taskDays} compact={!wide} />;
  const weatherCard = (
    <WeatherCard
      weather={weather}
      status={weatherStatus}
      error={weatherError}
      unit={settings.temperatureUnit}
      onRefresh={() => void syncWeather({ force: true })}
      onPickLocation={() => void pickLocationFromDevice()}
      compact={!wide}
    />
  );
  const banner = <TasksBanner tasks={tasks} onOpenTasks={() => router.push('/tasks')} compact={!wide} />;
  const musicCard = (
    <MusicCard
      media={media}
      volume={volume}
      onVolumeChange={applyVolume}
      onVolumeCommit={commitVolume}
      onControl={(action) => void controlMedia(action)}
      onRequestAccess={openPermissions}
      compact={!wide}
    />
  );
  const playlist = (
    <PlaylistCard
      history={mediaHistory}
      current={media}
      onRequestAccess={openPermissions}
      onClear={() => void clearMediaHistory()}
      compact={!wide}
    />
  );
  const power = <PowerCard battery={battery} compact={!wide} />;
  const backlightCard = (
    <BacklightCard
      value={backlight}
      onChange={applyBacklight}
      onChangeEnd={commitBacklight}
      compact={!wide}
    />
  );
  const systemCard = <SystemCard system={system} compact={!wide} />;
  const networkFooter = (
    <NetworkFooter
      network={network}
      system={system}
      onOpenWifi={() => void nativeBridge.openSettings('wifi')}
      onOpenSettings={() => router.push('/settings')}
      compact={!wide}
    />
  );
  const taskTable = (
    <TaskTable
      tasks={tasks}
      onToggle={(id) => void toggleTask(id)}
      onEdit={(task) => router.push({ pathname: '/tasks', params: { edit: task.id } })}
      onAdd={() => router.push('/tasks')}
      onOpenAll={() => router.push('/tasks')}
      compact={!wide}
    />
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#011226', '#00060F', '#00030A']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 10,
            paddingBottom: insets.bottom + 16,
            paddingLeft: Math.max(insets.left, 10) + 2,
            paddingRight: Math.max(insets.right, 10) + 2,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.frame, { maxWidth: layout.maxContentWidth }]}>
          <DashboardHeader
            network={network}
            system={system}
            onOpenSettings={() => router.push('/settings')}
            onOpenTasks={() => router.push('/tasks')}
            pendingTasks={pendingCount}
            compact={!wide}
          />

          {wide ? (
            <View style={styles.columns}>
              <View style={styles.leftColumn}>
                <ClockCard now={now} use24Hour={settings.use24Hour} digitSize={72} />
                {backlightCard}
                {power}
                {playlist}
              </View>
              <View style={styles.rightColumn}>
                {calendarCard}
                {weatherCard}
                {musicCard}
                {banner}
              </View>
            </View>
          ) : (
            <View style={styles.singleColumn}>
              <ClockCard now={now} use24Hour={settings.use24Hour} digitSize={width < 380 ? 46 : 54} compact />
              {calendarCard}
              {weatherCard}
              {banner}
              {taskTable}
              {musicCard}
              {playlist}
              {backlightCard}
              {power}
              {systemCard}
              {networkFooter}
            </View>
          )}

          {wide ? (
            <>
              {taskTable}
              <View style={styles.bottomRow}>
                {systemCard}
                <View style={styles.networkWrap}>{networkFooter}</View>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  frame: {
    width: '100%',
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(10, 100, 176, 0.75)',
    borderRadius: radii.cardLarge + 4,
    backgroundColor: 'rgba(0, 4, 12, 0.55)',
    padding: 10,
  },
  columns: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  leftColumn: {
    flex: 1.02,
    gap: 12,
  },
  rightColumn: {
    flex: 1,
    gap: 12,
  },
  singleColumn: {
    gap: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  networkWrap: {
    flexGrow: 1.6,
    flexBasis: 380,
  },
});
