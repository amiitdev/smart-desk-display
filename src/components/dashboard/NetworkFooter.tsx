import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import type { NetworkInfo, SystemInfo } from '@/native/types';
import { colors } from '@/theme';

interface NetworkFooterProps {
  network: NetworkInfo | null;
  system: SystemInfo | null;
  onOpenWifi: () => void;
  onOpenSettings: () => void;
  compact?: boolean;
}

function signalBars(level: number) {
  return Array.from({ length: 4 }).map((_, index) => (
    <View
      key={index}
      style={[
        styles.bar,
        {
          height: 4 + index * 3,
          backgroundColor: index < level ? colors.green : 'rgba(43, 255, 94, 0.18)',
        },
      ]}
    />
  ));
}

export function NetworkFooter({ network, system, onOpenWifi, onOpenSettings, compact }: NetworkFooterProps) {
  const ssid = network?.ssid ?? (network?.transport === 'Cellular' ? network.carrierName : null);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <Pressable onPress={onOpenWifi} style={({ pressed }) => [{ flex: 1.15, opacity: pressed ? 0.8 : 1 }]}>
        <Card tone="weather" contentStyle={styles.wifiContent}>
          <MaterialCommunityIcons
            name={network?.connected ? 'wifi' : 'wifi-off'}
            size={compact ? 26 : 34}
            color={colors.weatherInk}
          />
          <View style={styles.wifiText}>
            <Text style={styles.wifiTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
              {ssid ?? (network?.connected ? 'Connected' : 'Offline')}
            </Text>
            <Text style={styles.wifiSsid} numberOfLines={1}>
              {network?.connected ? `${network.transport} · ${network.hasInternet ? 'online' : 'no internet'}` : 'Not connected'}
            </Text>
          </View>
          <MaterialCommunityIcons name="cog" size={16} color="rgba(3,37,59,0.6)" />
        </Card>
      </Pressable>

      <Pressable onPress={onOpenSettings} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}>
        <Card tone="ink" contentStyle={styles.signalContent}>
          <View style={styles.signalHeader}>
            <Text style={styles.signalLabel}>SIGNAL</Text>
            <View style={styles.bars}>{signalBars(network?.signalLevel ?? 0)}</View>
          </View>
          <Text style={styles.signalValue} numberOfLines={1}>
            {network?.signalDbm != null ? `${Math.round(network.signalDbm)} dBm` : network?.transport ?? '—'}
          </Text>
          <Text style={styles.signalHint} numberOfLines={1}>
            {network?.connected
              ? `${network.hasInternet ? 'Online' : 'No internet'} · ${network.isMetered ? 'metered' : 'free'}`
              : 'No active network'}
          </Text>
        </Card>
      </Pressable>

      {!compact ? (
        <Card contentStyle={styles.brandContent} style={styles.brand}>
          <View>
            <Text style={styles.brandTitle}>Smart Desk</Text>
            <Text style={styles.brandSub} numberOfLines={1}>
              {system ? `${system.brand} · ${system.deviceModel}` : 'Display'}
            </Text>
          </View>
          <View style={styles.brandIcon}>
            <MaterialCommunityIcons name="desktop-tower-monitor" size={20} color={colors.weatherInk} />
          </View>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
  },
  containerCompact: {
    flexWrap: 'wrap',
  },
  wifiContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  wifiText: {
    flex: 1,
  },
  wifiTitle: {
    color: colors.weatherInk,
    fontSize: 15,
    fontWeight: '800',
  },
  wifiSsid: {
    color: 'rgba(3,37,59,0.72)',
    fontSize: 10,
  },
  signalContent: {
    gap: 1,
  },
  signalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signalLabel: {
    color: colors.green,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '800',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 3,
    borderRadius: 1,
  },
  signalValue: {
    color: colors.green,
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  signalHint: {
    color: 'rgba(160, 255, 190, 0.75)',
    fontSize: 10,
  },
  brand: {
    flex: 1.1,
  },
  brandContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  brandSub: {
    color: colors.textMuted,
    fontSize: 11,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
