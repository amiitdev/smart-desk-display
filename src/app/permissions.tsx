import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SettingRow } from '@/components/ui/SettingRow';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { nativeBridge } from '@/native';
import { ensureNotificationPermission } from '@/services/notifications';
import { colors } from '@/theme';

interface StepCardProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  granted: boolean | null;
  status?: string;
  why: string;
  steps: string[];
  actionLabel: string;
  onAction: () => void;
  children?: React.ReactNode;
}

function StepCard({ icon, title, granted, status, why, steps, actionLabel, onAction, children }: StepCardProps) {
  return (
    <Card contentStyle={styles.card} highlighted={granted === true}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={granted === false ? colors.red : colors.cyan}
          />
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <Chip
          style={styles.badge}
          dotColor={granted === null ? colors.textDim : granted ? colors.green : colors.red}
          color={granted === null ? colors.textMuted : granted ? colors.green : colors.red}
        >
          {granted === null ? (status ?? 'INFO') : granted ? 'GRANTED' : 'REQUIRED'}
        </Chip>
      </View>
      <Text style={styles.why}>{why}</Text>
      <View style={styles.steps}>
        {steps.map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <Text style={styles.stepIndex}>{index + 1}</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
      {children}
      <SettingRow icon="open-in-new" title={actionLabel} onPress={onAction} />
    </Card>
  );
}

export default function PermissionsScreen() {
  const router = useRouter();
  const [mediaAccess, setMediaAccess] = useState<boolean | null>(null);
  const [notifPermission, setNotifPermission] = useState<boolean | null>(null);
  const [locationOk, setLocationOk] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    setMediaAccess(await nativeBridge.isNotificationAccessGranted());
    const permissions = await Notifications.getPermissionsAsync();
    setNotifPermission(permissions.granted);
    const location = await Location.getForegroundPermissionsAsync();
    setLocationOk(location.granted);
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Permissions"
        subtitle="Everything Smart Desk needs, and why"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <StepCard
          icon="playlist-music"
          title="Media session access"
          granted={mediaAccess}
          why="Android only lets apps read another app's music metadata (Spotify, YouTube Music, VLC…) through a notification listener. Smart Desk never reads your messages — it uses the listener only to resolve the active MediaSession."
          steps={[
            'Tap the button below to open Android notification access.',
            'Find “Smart Desk” and switch it on.',
            'Return here — the status turns GRANTED automatically.',
          ]}
          actionLabel="Open notification access settings"
          onAction={() => void nativeBridge.openSettings('notification_listener')}
        />

        <StepCard
          icon="map-marker-outline"
          title="Location"
          granted={locationOk}
          status="OPTIONAL"
          why="Used only to fetch local weather (Open-Meteo) and to reveal the Wi-Fi SSID, which Android redacts without location permission. You can also type a city instead in Settings."
          steps={[
            'Choose “Use device location” in Settings, or search for your city.',
            'Denying it is fine: weather then uses the city you picked.',
          ]}
          actionLabel="Open location settings"
          onAction={() => void nativeBridge.openSettings('location')}
        />

        <StepCard
          icon="bell-ring-outline"
          title="Task reminders"
          granted={notifPermission}
          why="Deadline reminders are scheduled locally with expo-notifications. No push server, no account, no data leaves the device."
          steps={[
            'Tap the button and allow notifications when Android asks.',
            'Set a reminder while creating a task in the Tasks screen.',
          ]}
          actionLabel="Enable notifications"
          onAction={() => void ensureNotificationPermission()}
        />

        <StepCard
          icon="widgets"
          title="Home screen widgets"
          granted={null}
          status="TAP TO ADD"
          why="Three Jetpack Glance widgets (clock, music, full) render from the same shared Kotlin store, so the home screen stays in sync with the app even while it is closed."
          steps={[
            'Open Settings → Home screen widgets and tap + to pin one.',
            'Or long-press the launcher → Widgets → Smart Desk.',
            'Reboot is handled automatically (BOOT_COMPLETED receiver).',
          ]}
          actionLabel="Go to widget settings"
          onAction={() => router.push('/settings')}
        />

        <Card contentStyle={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="battery-charging-medium" size={20} color={colors.yellow} />
            <Text style={styles.cardTitle}>Background behaviour</Text>
          </View>
          <Text style={styles.why}>
            Widgets refresh through WorkManager (15-minute period) while the app is closed, and receive
            push updates while it is open. Battery, power and clock changes trigger immediate widget
            updates through broadcast receivers, so nothing polls constantly.
          </Text>
        </Card>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 12, gap: 12 },
  card: { paddingVertical: 10, gap: 8 },
  // Wraps instead of pushing the status chip off the card at large font scales.
  cardHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  cardTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', flexShrink: 1 },
  badge: { marginLeft: 'auto' },
  why: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  steps: { gap: 5, marginTop: 2 },
  stepRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  stepIndex: {
    color: colors.weatherInk, backgroundColor: colors.cyan, fontSize: 10, fontWeight: '800',
    width: 16, height: 16, borderRadius: 8, overflow: 'hidden', textAlign: 'center', lineHeight: 16,
  },
  stepText: { color: colors.text, fontSize: 12.5, flex: 1, lineHeight: 17 },
});
