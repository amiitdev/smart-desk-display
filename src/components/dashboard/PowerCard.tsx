import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ProgressBar, Stat } from '@/components/ui/ProgressBar';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Slider } from '@/components/ui/Slider';
import type { BatteryInfo } from '@/native/types';
import { colors } from '@/theme';

interface BacklightCardProps {
  value: number;
  onChange: (value: number) => void;
  onChangeEnd: (value: number) => void;
  compact?: boolean;
}

export function BacklightCard({ value, onChange, onChangeEnd, compact }: BacklightCardProps) {
  return (
    <Card contentStyle={styles.content} style={compact ? styles.cardCompact : undefined}>
      <View style={styles.header}>
        <SectionLabel color={colors.text}>Display backlight</SectionLabel>
        <Text style={styles.percent}>{Math.round(value * 100)}%</Text>
      </View>
      <Slider value={value} onChange={onChange} onChangeEnd={onChangeEnd} thumbSize={compact ? 22 : 26} />
    </Card>
  );
}

interface PowerCardProps {
  battery: BatteryInfo | null;
  compact?: boolean;
}

function formatCurrent(battery: BatteryInfo): string {
  const milliAmps = Math.abs(battery.currentMa);
  if (milliAmps >= 1000) return `${(milliAmps / 1000).toFixed(2)} A`;
  return `${Math.round(milliAmps)}mA`;
}

export function PowerCard({ battery, compact }: PowerCardProps) {
  const level = battery?.level ?? 0;
  const charging = battery?.isCharging ?? false;
  const levelColor = level <= 15 ? colors.red : level <= 35 ? colors.orange : colors.green;

  return (
    <Card contentStyle={styles.content}>
      <View style={styles.powerHeader}>
        <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.cyan} />
        <Text style={styles.powerTitle}>POWER</Text>
        <View style={styles.spacer} />
        <MaterialCommunityIcons
          name={charging ? 'battery-charging' : 'battery-medium'}
          size={20}
          color={charging ? colors.green : colors.textMuted}
        />
        <Text style={[styles.level, { color: levelColor }]}>{level}%</Text>
      </View>

      <View style={styles.statRow}>
        <Stat
          label="current"
          value={battery ? formatCurrent(battery) : '—'}
          valueColor={colors.text}
          style={styles.stat}
          valueSize={15}
        />
        <View style={styles.verticalDivider} />
        <Stat
          label="voltage"
          value={battery ? `${battery.voltage.toFixed(2)}V` : '—'}
          valueColor={colors.text}
          style={styles.stat}
          valueSize={15}
        />
        <View style={styles.verticalDivider} />
        <Stat
          label="temp"
          value={battery?.temperatureC != null ? `${battery.temperatureC.toFixed(1)}°C` : '—'}
          valueColor={colors.textMuted}
          style={styles.stat}
          valueSize={15}
        />
      </View>

      <ProgressBar
        value={level / 100}
        color={levelColor}
        height={5}
        style={styles.batteryBar}
      />
      <Text style={styles.status} numberOfLines={1}>
        {battery ? `${battery.statusLabel} · health ${battery.health}` : 'Waiting for battery broadcast…'}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 6,
    justifyContent: 'center',
  },
  cardCompact: {
    paddingBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percent: {
    color: colors.yellow,
    fontSize: 12,
    fontWeight: '700',
  },
  powerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  powerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  spacer: {
    flex: 1,
  },
  level: {
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 4,
    fontVariant: ['tabular-nums'],
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  stat: {
    flex: 1,
  },
  verticalDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.divider,
  },
  batteryBar: {
    marginTop: 4,
  },
  status: {
    color: colors.textDim,
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
});
