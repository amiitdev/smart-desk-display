import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import type { Task } from '@/native/types';
import { colors } from '@/theme';
import { getDeadlineLabel, isOverdue } from '@/utils/format';

interface TasksBannerProps {
  tasks: Task[];
  onOpenTasks: () => void;
  compact?: boolean;
}

export function TasksBanner({ tasks, onOpenTasks, compact }: TasksBannerProps) {
  const pending = tasks.filter((task) => !task.completed);
  const overdue = pending.filter((task) => isOverdue(task));
  const next = pending
    .slice()
    .sort((a, b) => (a.deadline ?? Number.MAX_SAFE_INTEGER) - (b.deadline ?? Number.MAX_SAFE_INTEGER))[0];

  const headline = next
    ? `${getDeadlineLabel(next.deadline, next.completed).text} — ${next.title}`
    : pending.length === 0
      ? 'All clear for today'
      : `${pending.length} task${pending.length === 1 ? '' : 's'} waiting`;

  return (
    <Pressable onPress={onOpenTasks} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <Card contentStyle={styles.content} style={styles.card}>
        <View style={styles.textColumn}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, compact && styles.titleCompact]}>Today&apos;s Tasks</Text>
            <Text style={styles.count}>{pending.length}</Text>
            {overdue.length > 0 ? (
              <View style={styles.overduePill}>
                <Text style={styles.overdueText}>{overdue.length} overdue</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.headline} numberOfLines={1}>
            {headline}
          </Text>
          <Text style={styles.cta} numberOfLines={1}>
            DON&apos;T FORGET AGAIN!
          </Text>
        </View>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="checkbox-multiple-marked-circle-outline" size={compact ? 30 : 40} color={colors.cyan} />
          <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textMuted} style={styles.chevron} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: colors.borderStrong,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textColumn: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: '#FF5A6E',
    fontSize: 17,
    fontWeight: '800',
  },
  titleCompact: {
    fontSize: 15,
  },
  count: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  overduePill: {
    backgroundColor: 'rgba(255, 90, 110, 0.16)',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 110, 0.5)',
  },
  overdueText: {
    color: colors.red,
    fontSize: 9.5,
    fontWeight: '700',
  },
  headline: {
    color: colors.text,
    fontSize: 13,
    marginTop: 2,
  },
  cta: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '700',
    marginTop: 1,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    marginTop: -6,
  },
});
