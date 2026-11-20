import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import type { Task } from '@/native/types';
import { colors } from '@/theme';
import { getDeadlineLabel, isOverdue } from '@/utils/format';

interface TaskTableProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onAdd: () => void;
  onOpenAll: () => void;
  compact?: boolean;
}

export function TaskTable({ tasks, onToggle, onEdit, onAdd, onOpenAll, compact }: TaskTableProps) {
  const sorted = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (a.deadline ?? Number.MAX_SAFE_INTEGER) - (b.deadline ?? Number.MAX_SAFE_INTEGER);
  });
  const visible = sorted.slice(0, compact ? 4 : 6);
  const pending = tasks.filter((task) => !task.completed).length;

  return (
    <Card contentStyle={styles.content} style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.deadlineCell]}>DEADLINE</Text>
        <View style={styles.headerDivider} />
        <Text style={[styles.headerCell, styles.taskCellHeader]}>TASK</Text>
        <Pressable onPress={onAdd} style={styles.addButton} accessibilityLabel="Add task">
          <MaterialCommunityIcons name="plus" size={14} color={colors.weatherInk} />
          <Text style={styles.addText}>ADD</Text>
        </Pressable>
      </View>

      {visible.length === 0 ? (
        <View style={styles.emptyRow}>
          <Text style={styles.emptyText}>No tasks yet — tap ADD to create your first reminder.</Text>
        </View>
      ) : (
        visible.map((task) => {
          const overdue = isOverdue(task);
          const label = getDeadlineLabel(task.deadline, task.completed);
          return (
            <View key={task.id} style={styles.row}>
              <Pressable
                onPress={() => onToggle(task.id)}
                hitSlop={8}
                style={styles.checkbox}
                accessibilityLabel={task.completed ? 'Mark as pending' : 'Mark as complete'}
              >
                <MaterialCommunityIcons
                  name={task.completed ? 'checkbox-marked-circle' : 'circle-outline'}
                  size={16}
                  color={task.completed ? colors.green : colors.textDim}
                />
              </Pressable>
              <Text
                style={[
                  styles.deadline,
                  label.tone === 'overdue' && styles.deadlineOverdue,
                  label.tone === 'soon' && styles.deadlineSoon,
                  label.tone === 'muted' && styles.deadlineMuted,
                ]}
                numberOfLines={1}
              >
                {label.text}
              </Text>
              <View style={styles.rowDivider} />
              <Pressable onPress={() => onEdit(task)} style={styles.taskCell}>
                <Text
                  style={[styles.taskText, task.completed && styles.taskTextDone]}
                  numberOfLines={1}
                >
                  {task.title}
                </Text>
              </Pressable>
              {overdue ? <MaterialCommunityIcons name="alert-circle" size={14} color={colors.red} /> : null}
            </View>
          );
        })
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {pending} open · {tasks.length - pending} done
        </Text>
        <Pressable onPress={onOpenAll} style={styles.footerLink} accessibilityLabel="Open all tasks">
          <Text style={styles.footerLinkText}>Manage tasks</Text>
          <MaterialCommunityIcons name="chevron-right" size={14} color={colors.cyan} />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: colors.cyanDim,
  },
  content: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 8,
  },
  headerCell: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  deadlineCell: {
    width: 96,
  },
  taskCellHeader: {
    flex: 1,
  },
  headerDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.divider,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.cyan,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  addText: {
    color: colors.weatherInk,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(120, 190, 240, 0.12)',
  },
  checkbox: {
    width: 18,
  },
  deadline: {
    width: 92,
    color: colors.cyan,
    fontSize: 13.5,
    fontWeight: '600',
  },
  deadlineOverdue: {
    color: colors.red,
  },
  deadlineSoon: {
    color: colors.cyanBright,
  },
  deadlineMuted: {
    color: colors.textDim,
  },
  rowDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(120, 190, 240, 0.18)',
  },
  taskCell: {
    flex: 1,
    paddingLeft: 4,
  },
  taskText: {
    color: colors.text,
    fontSize: 14,
  },
  taskTextDone: {
    color: colors.textDim,
    textDecorationLine: 'line-through',
  },
  emptyRow: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textDim,
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 10.5,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  footerLinkText: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: '700',
  },
});
