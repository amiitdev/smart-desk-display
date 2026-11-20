import React, { useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { TaskEditor, type TaskDraft } from '@/components/tasks/TaskEditor';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Segment } from '@/components/ui/SettingRow';
import type { Task } from '@/native/types';
import { useDashboardStore, sortTasksByDeadline } from '@/store/dashboardStore';
import { colors } from '@/theme';
import { getDeadlineLabel, isOverdue } from '@/utils/format';

type Filter = 'all' | 'pending' | 'done';

export default function TasksScreen() {
  const params = useLocalSearchParams<{ edit?: string }>();
  const tasks = useDashboardStore((s) => s.tasks);
  const use24Hour = useDashboardStore((s) => s.settings.use24Hour);
  const addTask = useDashboardStore((s) => s.addTask);
  const updateTask = useDashboardStore((s) => s.updateTask);
  const toggleTask = useDashboardStore((s) => s.toggleTask);
  const deleteTask = useDashboardStore((s) => s.deleteTask);

  const [filter, setFilter] = useState<Filter>('all');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const openNew = () => { setEditing(null); setEditorVisible(true); };
  const openEdit = (task: Task) => { setEditing(task); setEditorVisible(true); };

  React.useEffect(() => {
    if (!params.edit) return;
    const task = tasks.find((t) => t.id === params.edit);
    if (task) openEdit(task);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.edit]);

  const visible = useMemo(() => {
    const sorted = sortTasksByDeadline(tasks);
    if (filter === 'pending') return sorted.filter((t) => !t.completed);
    if (filter === 'done') return sorted.filter((t) => t.completed);
    return sorted;
  }, [tasks, filter]);

  const save = async (draft: TaskDraft) => {
    if (editing) await updateTask(editing.id, draft);
    else await addTask(draft);
    setEditorVisible(false);
  };

  const renderTask = ({ item }: { item: Task }) => {
    const label = getDeadlineLabel(item.deadline, item.completed);
    const overdue = isOverdue(item);
    return (
      <View style={[styles.row, item.completed && styles.rowDone]}>
        <Pressable onPress={() => toggleTask(item.id)} hitSlop={10} style={styles.check}>
          <MaterialCommunityIcons
            name={item.completed ? 'checkbox-marked-circle' : 'circle-outline'}
            size={26}
            color={item.completed ? colors.green : colors.textDim}
          />
        </Pressable>
        <Pressable style={styles.rowText} onPress={() => openEdit(item)}>
          <Text style={[styles.title, item.completed && styles.titleDone]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.deadline, label.tone === 'overdue' && { color: colors.red }]}>
              {label.text}
            </Text>
            {item.reminderAt ? <Text style={styles.meta}> · reminder set</Text> : null}
            {overdue ? <Text style={[styles.meta, { color: colors.red }]}> · overdue</Text> : null}
          </View>
        </Pressable>
        <IconButton icon="pencil-outline" variant="outline" size={30} onPress={() => openEdit(item)} />
      </View>
    );
  };

  const pendingCount = tasks.filter((t) => !t.completed).length;

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Tasks"
        subtitle={pendingCount + ' pending · ' + tasks.length + ' total'}
        right={<IconButton icon="plus" variant="solid" size={34} onPress={openNew} accessibilityLabel="Add task" />}
      />
      <View style={styles.filters}>
        <Segment<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'ALL' },
            { value: 'pending', label: 'PENDING' },
            { value: 'done', label: 'DONE' },
          ]}
        />
      </View>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nothing here yet.</Text>}
      />
      <TaskEditor
        visible={editorVisible}
        task={editing}
        use24Hour={use24Hour}
        onClose={() => setEditorVisible(false)}
        onSave={save}
        onDelete={editing ? async () => { await deleteTask(editing.id); setEditorVisible(false); } : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  filters: { paddingHorizontal: 12, paddingBottom: 8 },
  list: { paddingHorizontal: 12, paddingBottom: 24, gap: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(4,24,44,0.9)', borderRadius: 12,
    borderWidth: 1, borderColor: colors.borderSoft, paddingVertical: 6, paddingHorizontal: 6,
  },
  rowDone: { opacity: 0.55 },
  check: { width: 34, alignItems: 'center' },
  rowText: { flex: 1, paddingVertical: 6 },
  title: { color: colors.text, fontSize: 15, fontWeight: '600' },
  titleDone: { textDecorationLine: 'line-through', color: colors.textDim },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
  deadline: { color: colors.cyan, fontSize: 12, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 11.5 },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 40, fontSize: 13 },
});
