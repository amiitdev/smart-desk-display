import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip, IconButton } from '@/components/ui/IconButton';
import type { NetworkInfo, SystemInfo } from '@/native/types';
import { colors } from '@/theme';

interface DashboardHeaderProps {
  network: NetworkInfo | null;
  system: SystemInfo | null;
  onOpenSettings: () => void;
  onOpenTasks: () => void;
  pendingTasks: number;
  compact?: boolean;
}

export function DashboardHeader({
  network,
  system,
  onOpenSettings,
  onOpenTasks,
  pendingTasks,
  compact,
}: DashboardHeaderProps) {
  const online = network?.hasInternet ?? false;
  const statusColor = online ? colors.green : network?.connected ? colors.yellow : colors.red;
  const statusLabel = network?.connected ? network.transport : 'Offline';

  return (
    <View style={styles.container}>
      <View style={[styles.titleColumn, compact && styles.titleColumnCompact]}>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={2}>
          Smart Desk Display
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          Live desk telemetry · widget sync
        </Text>
      </View>

      <View style={styles.badges}>
        <Chip
          dotColor={statusColor}
          color={colors.text}
          backgroundColor="rgba(4, 24, 44, 0.9)"
          style={styles.statusChip}
        >
          {statusLabel}
        </Chip>
        <IconButton
          icon="checkbox-marked-circle-outline"
          variant="outline"
          size={34}
          onPress={onOpenTasks}
          accessibilityLabel={`Tasks (${pendingTasks} pending)`}
        />
        <IconButton
          icon="cog-outline"
          variant="outline"
          size={34}
          onPress={onOpenSettings}
          accessibilityLabel="Settings"
        />
      </View>

      <View style={styles.deviceRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeTitle}>ANDROID</Text>
          <Text style={styles.badgeValue}>{system?.androidVersion ?? '—'}</Text>
        </View>
        <MaterialCommunityIcons name="tablet-dashboard" size={20} color={colors.cyan} />
        <Text style={styles.deviceName} numberOfLines={1}>
          {system ? `${system.manufacturer} ${system.deviceModel}` : 'Reading device info…'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  titleColumn: {
    gap: 1,
    flex: 1,
  },
  titleColumnCompact: {
    flexBasis: '100%',
    flex: 0,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(56, 225, 255, 0.45)',
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 0 },
  },
  titleCompact: {
    fontSize: 24,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12.5,
    letterSpacing: 0.2,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  statusChip: {
    paddingVertical: 4,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    backgroundColor: '#0C4B8F',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  badgeTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  badgeValue: {
    color: colors.yellow,
    fontSize: 13,
    fontWeight: '800',
  },
  deviceName: {
    color: colors.cyan,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.4,
    flexShrink: 1,
  },
});
