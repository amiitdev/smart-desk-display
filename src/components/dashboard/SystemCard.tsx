import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ProgressBar, Stat } from '@/components/ui/ProgressBar';
import type { SystemInfo } from '@/native/types';
import { colors } from '@/theme';
import { formatBytes, formatUptime } from '@/utils/format';

interface SystemCardProps {
  system: SystemInfo | null;
  compact?: boolean;
}

export function SystemCard({ system, compact }: SystemCardProps) {
  const ramUsed = system ? system.usedRamBytes / system.totalRamBytes : 0;
  const storageUsed = system
    ? (system.totalStorageBytes - system.freeStorageBytes) / system.totalStorageBytes
    : 0;

  return (
    <Card contentStyle={styles.content}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="memory" size={16} color={colors.cyan} />
        <Text style={styles.title}>SYSTEM</Text>
        <View style={styles.spacer} />
        <Text style={styles.model} numberOfLines={1}>
          {system ? `${system.cpuCores}× ${system.cpuAbi}` : '—'}
        </Text>
      </View>

      <View style={styles.metric}>
        <View style={styles.metricLabels}>
          <Text style={styles.metricLabel}>RAM</Text>
          <Text style={styles.metricValue}>
            {system ? `${formatBytes(system.usedRamBytes, 1)} / ${formatBytes(system.totalRamBytes, 1)}` : '—'}
          </Text>
        </View>
        <ProgressBar value={ramUsed} color={colors.cyan} height={5} />
      </View>

      <View style={styles.metric}>
        <View style={styles.metricLabels}>
          <Text style={styles.metricLabel}>Storage</Text>
          <Text style={styles.metricValue}>
            {system
              ? `${formatBytes(system.freeStorageBytes, 0)} free · ${formatBytes(system.totalStorageBytes - system.freeStorageBytes, 0)} used`
              : '—'}
          </Text>
        </View>
        <ProgressBar value={storageUsed} color={colors.blue} height={5} />
      </View>

      <View style={styles.statsRow}>
        <Stat label="Android" value={system ? `${system.androidVersion} (API ${system.apiLevel})` : '—'} style={styles.stat} valueSize={12} />
        {!compact ? <Stat label="Uptime" value={system ? formatUptime(system.uptimeMs) : '—'} style={styles.stat} valueSize={12} /> : null}
        <Stat label="Screen" value={system ? `${Math.round(system.density)} dpi` : '—'} style={styles.stat} valueSize={12} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  spacer: {
    flex: 1,
  },
  model: {
    color: colors.textMuted,
    fontSize: 10,
    flexShrink: 1,
  },
  metric: {
    gap: 3,
  },
  metricLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  metricValue: {
    color: colors.text,
    fontSize: 10.5,
    fontVariant: ['tabular-nums'],
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
  },
});
