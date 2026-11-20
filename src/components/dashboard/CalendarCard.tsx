import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { colors } from '@/theme';
import { buildMonthMatrix, WEEKDAY_LABELS } from '@/utils/format';

interface CalendarCardProps {
  /** Days that contain pending tasks, as yyyy-mm-dd keys. */
  taskDays?: Set<string>;
  compact?: boolean;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function CalendarCard({ taskDays, compact }: CalendarCardProps) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const cells = useMemo(
    () => buildMonthMatrix(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const shift = (delta: number) => {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  return (
    <Card contentStyle={styles.content} style={styles.card}>
      <View style={styles.header}>
        <Pressable
          onPress={() => shift(-1)}
          accessibilityLabel="Previous month"
          style={({ pressed }) => [styles.arrow, pressed && styles.arrowPressed]}
        >
          <MaterialCommunityIcons name="chevron-left" size={20} color={colors.cyan} />
        </Pressable>
        <Text style={styles.monthLabel} numberOfLines={1}>
          {monthLabel}
        </Text>
        <Pressable
          onPress={() => shift(1)}
          accessibilityLabel="Next month"
          style={({ pressed }) => [styles.arrow, pressed && styles.arrowPressed]}
        >
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.cyan} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={styles.cell}>
            <Text style={styles.weekday}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, index) => {
          const isToday = cell.isToday;
          const hasTask = taskDays?.has(dayKey(cell.date));
          return (
            <View key={`${index}-${cell.date.toISOString()}`} style={styles.cell}>
              <View
                style={[
                  styles.dayBox,
                  compact && styles.dayBoxCompact,
                  cell.inMonth ? styles.dayInMonth : styles.dayOutside,
                  isToday && styles.dayToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    compact && styles.dayTextCompact,
                    !cell.inMonth && styles.dayTextOutside,
                    isToday && styles.dayTextToday,
                  ]}
                >
                  {cell.date.getDate()}
                </Text>
                {hasTask ? <View style={[styles.taskDot, isToday && styles.taskDotToday]} /> : null}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: colors.borderStrong,
  },
  content: {
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  monthLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  arrow: {
    padding: 2,
    borderRadius: 6,
  },
  arrowPressed: {
    backgroundColor: 'rgba(56, 225, 255, 0.12)',
  },
  weekRow: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    paddingHorizontal: 2,
    paddingVertical: 2,
    alignItems: 'center',
  },
  weekday: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dayBox: {
    width: '100%',
    aspectRatio: 1.12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 120, 200, 0.18)',
  },
  dayBoxCompact: {
    height: 36,
  },
  dayInMonth: {
    backgroundColor: '#08304F',
  },
  dayOutside: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  dayToday: {
    backgroundColor: '#1273E6',
    borderColor: colors.cyan,
  },
  dayText: {
    color: '#EAF8FF',
    fontSize: 14,
    fontWeight: '600',
  },
  dayTextCompact: {
    fontSize: 11.5,
  },
  dayTextOutside: {
    color: 'rgba(140, 180, 210, 0.35)',
  },
  dayTextToday: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  taskDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.yellow,
  },
  taskDotToday: {
    backgroundColor: '#FFFFFF',
  },
});
