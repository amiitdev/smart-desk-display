import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { colors, fonts } from '@/theme';
import { formatLongDate, formatWeekday, getClockParts } from '@/utils/format';

interface ClockCardProps {
  now: Date;
  use24Hour: boolean;
  compact?: boolean;
  /** Font size of the digits; the tablet layout uses a much larger clock. */
  digitSize?: number;
}

const ICON_COLORS = 'rgba(120, 200, 240, 0.55)';

export function ClockCard({ now, use24Hour, compact, digitSize = 64 }: ClockCardProps) {
  const parts = getClockParts(now, use24Hour);
  const iconSize = compact ? 26 : 40;

  return (
    <Card style={styles.card} contentStyle={styles.content}>
      <View style={styles.row}>
        <MaterialCommunityIcons
          name="clock-outline"
          size={iconSize}
          color={colors.cyan}
          style={styles.icon}
        />
        <View style={styles.digitsRow}>
          <Text
            style={[styles.digits, { fontSize: digitSize, lineHeight: digitSize * 1.16 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            allowFontScaling={false}
          >
            {parts.hours}:{parts.minutes}
          </Text>
          <View style={styles.secondsColumn}>
            <Text
              style={[styles.seconds, { fontSize: digitSize * 0.34 }]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {parts.seconds}
            </Text>
            <Text style={styles.suffix} numberOfLines={1}>
              {parts.suffix ?? ''}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.dateBlock}>
        <Text style={[styles.date, compact && styles.dateCompact]} numberOfLines={1}>
          {formatLongDate(now)}
        </Text>
        <Text style={[styles.weekday, compact && styles.weekdayCompact]} numberOfLines={1}>
          {formatWeekday(now)}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: colors.borderStrong,
  },
  content: {
    justifyContent: 'center',
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  icon: {
    marginTop: 4,
    opacity: 0.9,
  },
  digitsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  digits: {
    fontFamily: fonts.digital,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  secondsColumn: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginLeft: 6,
    paddingBottom: 4,
    minWidth: 30,
  },
  seconds: {
    fontFamily: fonts.digital,
    color: colors.text,
  },
  suffix: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    height: 14,
  },
  dateBlock: {
    alignItems: 'center',
    marginTop: 4,
  },
  date: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  dateCompact: {
    fontSize: 17,
  },
  weekday: {
    fontSize: 18,
    color: 'rgba(230, 245, 255, 0.86)',
    marginTop: 1,
  },
  weekdayCompact: {
    fontSize: 14,
  },
});
