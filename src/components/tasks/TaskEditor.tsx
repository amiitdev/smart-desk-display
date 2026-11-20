import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import type { Task } from '@/native/types';
import { colors, radii } from '@/theme';
import { formatShortDate, formatTimeOfDay } from '@/utils/format';

export interface TaskDraft {
  title: string;
  deadline: number | null;
  reminderAt: number | null;
}

interface TaskEditorProps {
  visible: boolean;
  task: Task | null;
  use24Hour: boolean;
  onClose: () => void;
  onSave: (draft: TaskDraft) => void;
  onDelete?: () => void;
}

type PickerMode = 'date' | 'time' | 'reminder' | null;

function atDefaultTime(date: Date): Date {
  const next = new Date(date);
  next.setHours(18, 0, 0, 0);
  return next;
}

export function TaskEditor({ visible, task, use24Hour, onClose, onSave, onDelete }: TaskEditorProps) {
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remind, setRemind] = useState(false);
  const [reminderAt, setReminderAt] = useState<number | null>(null);
  const [picker, setPicker] = useState<PickerMode>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle(task?.title ?? '');
    setDeadline(task?.deadline ?? null);
    setRemind(!!task?.reminderAt);
    setReminderAt(task?.reminderAt ?? null);
    setPicker(null);
  }, [visible, task]);

  const deadlineDate = useMemo(() => (deadline ? new Date(deadline) : null), [deadline]);
  const reminderDate = useMemo(() => (reminderAt ? new Date(reminderAt) : null), [reminderAt]);

  const setDeadlineTo = (date: Date) => {
    const next = new Date(date);
    if (remind) setReminderAt(next.getTime() - 10 * 60 * 1000);
    setDeadline(next.getTime());
  };

  const quickDate = (offsetDays: number) => {
    const base = new Date(deadline ?? Date.now());
    const target = atDefaultTime(base);
    target.setDate(target.getDate() + offsetDays);
    setDeadlineTo(target);
  };

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    setPicker(null);
    if (event.type !== 'set' || !selected) return;
    if (picker === 'date' || picker === 'time') {
      const base = new Date(deadline ?? atDefaultTime(new Date()).getTime());
      const merged = new Date(base);
      if (picker === 'date') {
        merged.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      } else {
        merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      }
      setDeadlineTo(merged);
    } else if (picker === 'reminder') {
      setReminderAt(selected.getTime());
    }
  };

  const toggleRemind = (value: boolean) => {
    setRemind(value);
    if (!value) {
      setReminderAt(null);
      return;
    }
    const base = deadline ?? Date.now() + 60 * 60 * 1000;
    setReminderAt(base - 10 * 60 * 1000);
  };

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSave({ title: trimmed, deadline, reminderAt: remind ? reminderAt : null });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={undefined} style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{task ? 'Edit task' : 'New task'}</Text>
            <IconButton icon="close" variant="ghost" size={32} onPress={onClose} accessibilityLabel="Close" />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <Text style={styles.label}>TASK</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What needs to happen?"
              placeholderTextColor={colors.textDim}
              style={styles.input}
              autoFocus
              maxLength={120}
              selectionColor={colors.cyan}
            />

            <Text style={styles.label}>DEADLINE</Text>
            <View style={styles.quickRow}>
              <QuickChip label="Today" onPress={() => quickDate(0)} />
              <QuickChip label="Tomorrow" onPress={() => quickDate(1)} />
              <QuickChip label="Next week" onPress={() => quickDate(7)} />
              {deadline ? <QuickChip label="Clear" tone="danger" onPress={() => setDeadline(null)} /> : null}
            </View>
            <View style={styles.dateRow}>
              <Pressable style={styles.dateButton} onPress={() => setPicker('date')}>
                <MaterialCommunityIcons name="calendar-month-outline" size={16} color={colors.cyan} />
                <Text style={styles.dateText}>{deadlineDate ? formatShortDate(deadlineDate) : 'No date'}</Text>
              </Pressable>
              <Pressable style={styles.dateButton} onPress={() => setPicker('time')}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={colors.cyan} />
                <Text style={styles.dateText}>
                  {deadlineDate ? formatTimeOfDay(deadlineDate, use24Hour) : 'No time'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.reminderRow}>
              <MaterialCommunityIcons name="bell-outline" size={18} color={colors.yellow} />
              <View style={styles.reminderTexts}>
                <Text style={styles.reminderTitle}>Reminder</Text>
                <Text style={styles.reminderSub}>
                  {reminderDate ? formatShortDate(reminderDate) + ' ' + formatTimeOfDay(reminderDate, use24Hour) : 'No reminder scheduled'}
                </Text>
              </View>
              <Switch value={remind} onValueChange={toggleRemind} trackColor={{ false: '#0B2A47', true: 'rgba(253,220,44,0.5)' }} thumbColor={remind ? colors.yellow : '#7FA8C9'} />
            </View>
            {remind ? (
              <Pressable style={styles.dateButton} onPress={() => setPicker('reminder')}>
                <MaterialCommunityIcons name="alarm" size={16} color={colors.yellow} />
                <Text style={[styles.dateText, { color: colors.yellow }]}>Pick reminder time</Text>
              </Pressable>
            ) : null}

            <View style={styles.actions}>
              {onDelete ? (
                <IconButton icon="trash-can-outline" variant="outline" label="DELETE" size={44} color={colors.red} onPress={onDelete} />
              ) : null}
              <IconButton icon="content-save-outline" label="SAVE" size={44} flex={1} onPress={submit} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {picker && deadlineDate ? (
        <DateTimePicker
          value={(picker === 'reminder' ? (reminderDate ?? deadlineDate ?? new Date()) : deadlineDate ?? new Date())}
          mode={picker === 'date' ? 'date' : 'time'}
          display={Platform.OS === 'android' ? 'default' : 'spinner'}
          onChange={onPickerChange}
        />
      ) : null}
    </Modal>
  );
}

function QuickChip({ label, onPress, tone }: { label: string; onPress: () => void; tone?: 'danger' }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, tone === 'danger' && { borderColor: 'rgba(255,90,110,0.6)' }]}
    >
      <Text style={[styles.chipText, tone === 'danger' && { color: colors.red }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: '#02152A', borderRadius: 18, borderWidth: 1, borderColor: colors.borderStrong, maxHeight: '88%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 10 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  body: { paddingHorizontal: 14, paddingBottom: 18, gap: 8 },
  label: { color: colors.textMuted, fontSize: 11, letterSpacing: 1.2, fontWeight: '700', marginTop: 8 },
  input: {
    backgroundColor: 'rgba(0,12,28,0.75)', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 10,
    color: colors.text, fontSize: 15, paddingHorizontal: 12, paddingVertical: 10,
  },
  quickRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(4,24,44,0.9)' },
  chipText: { color: colors.cyan, fontSize: 12, fontWeight: '700' },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(4,24,44,0.9)',
  },
  dateText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(253,220,44,0.35)', borderRadius: 10, padding: 10, backgroundColor: 'rgba(253,220,44,0.06)' },
  reminderTexts: { flex: 1 },
  reminderTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  reminderSub: { color: colors.textMuted, fontSize: 11 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
