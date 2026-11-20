import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

interface ProgressBarProps {
  value: number; // 0..1
  color?: string;
  trackColor?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({
  value,
  color = colors.cyan,
  trackColor = 'rgba(10, 60, 100, 0.55)',
  height = 6,
  style,
}: ProgressBarProps) {
  const progress = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }, style]}>
      <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: color, borderRadius: height / 2 }]} />
    </View>
  );
}

interface StatProps {
  label: string;
  value: string;
  hint?: string;
  valueColor?: string;
  labelColor?: string;
  style?: StyleProp<ViewStyle>;
  align?: 'left' | 'center' | 'flex-end';
  valueSize?: number;
}

/** Compact label/value pair used across the power, system and network cards. */
export function Stat({
  label,
  value,
  hint,
  valueColor = colors.text,
  labelColor = colors.textMuted,
  style,
  align = 'left',
  valueSize = 17,
}: StatProps) {
  return (
    <View style={[style, align !== 'left' && { alignItems: align }]}>
      <Text style={[styles.statLabel, { color: labelColor }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: valueColor, fontSize: valueSize }]} numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text style={styles.statHint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  statLabel: {
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statValue: {
    fontWeight: '700',
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  statHint: {
    fontSize: 10,
    color: colors.textDim,
    marginTop: 1,
  },
});
