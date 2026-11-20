import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Segment, SettingRow } from '@/components/ui/SettingRow';
import { Slider } from '@/components/ui/Slider';
import { nativeBridge } from '@/native';
import type { WidgetPinResult, WidgetSize } from '@/native/types';
import { searchLocations } from '@/services/weather';
import { ensureNotificationPermission } from '@/services/notifications';
import { useDashboardStore } from '@/store/dashboardStore';
import { colors } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useDashboardStore((s) => s.settings);
  const updateSettings = useDashboardStore((s) => s.updateSettings);
  const searchLocation = useDashboardStore((s) => s.searchLocation);
  const pickLocationFromDevice = useDashboardStore((s) => s.pickLocationFromDevice);
  const clearMediaHistory = useDashboardStore((s) => s.clearMediaHistory);

  const [mediaAccess, setMediaAccess] = useState(false);
  const [pinState, setPinState] = useState<WidgetPinResult | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ name: string; admin1?: string; country: string; latitude: number; longitude: number }>>([]);
  const [searching, setSearching] = useState(false);

  const refresh = async () => {
    setMediaAccess(await nativeBridge.isNotificationAccessGranted());
    setPinState(await nativeBridge.isWidgetPinned());
  };
  useEffect(() => { void refresh(); }, []);

  const runSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try { setResults(await searchLocations(text)); } catch { setResults([]); }
    setSearching(false);
  };

  const pin = async (size: WidgetSize) => {
    await nativeBridge.pinWidget(size);
    setTimeout(() => void refresh(), 700);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Settings"
        subtitle="Display, location, permissions and widgets"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>DISPLAY</Text>
        <Card contentStyle={styles.card}>
          <SettingRow
            icon="clock-time-four"
            title="24-hour clock"
            subtitle="Affects the dashboard, settings and widgets"
            toggle={{ value: settings.use24Hour, onValueChange: (v) => void updateSettings({ use24Hour: v }) }}
          />
          <View style={styles.unitRow}>
            <Text style={styles.unitLabel}>Temperature</Text>
            <Segment
              value={settings.temperatureUnit}
              onChange={(unit) => void updateSettings({ temperatureUnit: unit })}
              options={[{ value: 'c' as const, label: '°C' }, { value: 'f' as const, label: '°F' }]}
            />
          </View>
          <View style={styles.sliderBlock}>
            <Text style={styles.unitLabel}>Backlight</Text>
            <Slider
              value={settings.backlight}
              onChange={(v) => void nativeBridge.setScreenBrightness(v)}
              onChangeEnd={(v) => void updateSettings({ backlight: v })}
            />
          </View>
        </Card>

        <Text style={styles.section}>WEATHER LOCATION</Text>
        <Card contentStyle={styles.card}>
          <SettingRow
            icon="map-marker"
            title={settings.location?.name ?? 'No location set'}
            subtitle={settings.location ? settings.location.latitude.toFixed(3) + ', ' + settings.location.longitude.toFixed(3) : 'Pick a city or use device location'}
          />
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={runSearch}
              placeholder="Search a city…"
              placeholderTextColor={colors.textDim}
              style={styles.input}
              selectionColor={colors.cyan}
            />
            <IconButton icon="crosshairs-gps" variant="outline" size={42} onPress={() => void pickLocationFromDevice()} accessibilityLabel="Use device location" />
          </View>
          {searching ? <Text style={styles.hint}>Searching…</Text> : null}
          {results.map((r) => (
            <SettingRow
              key={r.latitude + '-' + r.longitude + r.name}
              title={r.name}
              subtitle={[r.admin1, r.country].filter(Boolean).join(', ')}
              onPress={() => { void searchLocation(r); setResults([]); setQuery(''); }}
            />
          ))}
        </Card>

        <Text style={styles.section}>PERMISSIONS</Text>
        <Card contentStyle={styles.card}>
          <SettingRow
            icon="bell-ring-outline"
            title="Task reminders"
            subtitle="Android 13+ needs notification permission to show reminders"
            onPress={async () => { await ensureNotificationPermission(); }}
          />
          <SettingRow
            icon="playlist-music"
            title="Media session access"
            subtitle={mediaAccess ? 'Granted — reading Spotify / YouTube Music / VLC' : 'Required to read and control other apps'}
            value={mediaAccess ? 'ON' : 'OFF'}
            onPress={() => router.push('/permissions')}
          />
          <SettingRow icon="shield-check-outline" title="Setup guide" subtitle="Notification listener, location and widget steps" onPress={() => router.push('/permissions')} />
        </Card>

        <Text style={styles.section}>HOME SCREEN WIDGETS</Text>
        <Card contentStyle={styles.card}>
          {(['small', 'medium', 'large'] as WidgetSize[]).map((size) => (
            <SettingRow
              key={size}
              icon={size === 'small' ? 'crop-square' : size === 'medium' ? 'tablet' : 'tablet-dashboard'}
              title={size === 'small' ? 'Small · clock + weather' : size === 'medium' ? 'Medium · music controls' : 'Large · calendar + tasks'}
              subtitle={pinState?.[size] ? 'Added to your home screen' : 'Tap to add to the home screen'}
              trailing={<IconButton icon="plus" variant="solid" size={30} onPress={() => void pin(size)} />}
            />
          ))}
        </Card>

        <Text style={styles.section}>DATA</Text>
        <Card contentStyle={styles.card}>
          <SettingRow icon="broom" title="Clear media history" subtitle="Removes the recently played list from app and widget" danger onPress={() => void clearMediaHistory()} />
          <SettingRow icon="information-outline" title="About" subtitle="Smart Desk Display 1.0.0 · dashboard schema v1 · shared Kotlin store + Glance widgets" />
        </Card>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 12, gap: 8 },
  section: { color: colors.textMuted, fontSize: 11, letterSpacing: 1.4, fontWeight: '800', marginTop: 10 },
  card: { paddingVertical: 4 },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, columnGap: 10, rowGap: 8 },
  unitLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  sliderBlock: { paddingHorizontal: 12, paddingBottom: 12, gap: 6 },
  searchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 10 },
  input: { flexGrow: 1, flexBasis: 180, minHeight: 42, backgroundColor: 'rgba(0,12,28,0.75)', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10, color: colors.text, paddingHorizontal: 12, fontSize: 14 },
  hint: { color: colors.textDim, fontSize: 11, paddingHorizontal: 12, paddingBottom: 6 },
});
