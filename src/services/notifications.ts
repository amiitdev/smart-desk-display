import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Task } from '@/native/types';

const CHANNEL_ID = 'task-reminders';

let configured = false;

/**
 * Notification setup for task reminders. Reminders are scheduled locally with
 * expo-notifications (no push service involved).
 */
export async function configureNotifications(): Promise<boolean> {
  if (configured) return true;
  if (Platform.OS !== 'android') return false;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Task reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: '#38E1FF',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  configured = true;
  return true;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function reminderIdentifier(taskId: string) {
  return `task-reminder-${taskId}`;
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderIdentifier(taskId));
  } catch {
    // Nothing scheduled — expo-notifications throws for unknown identifiers on
    // some platform versions. Safe to ignore.
  }
}

export async function scheduleTaskReminder(task: Task): Promise<boolean> {
  await cancelTaskReminder(task.id);
  if (task.completed || !task.reminderAt) return false;
  if (task.reminderAt <= Date.now()) return false;

  const granted = await ensureNotificationPermission();
  if (!granted) return false;

  await Notifications.scheduleNotificationAsync({
    identifier: reminderIdentifier(task.id),
    content: {
      title: 'Smart Desk reminder',
      body: task.title,
      data: { taskId: task.id },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(task.reminderAt),
      channelId: CHANNEL_ID,
    },
  });
  return true;
}

/**
 * Reconciles the OS notification queue with the persisted task list. Called on
 * boot / hydration so reminders survive app reinstalls and edits.
 */
export async function syncTaskReminders(tasks: Task[]): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const wanted = new Map(
    tasks
      .filter((task) => !task.completed && task.reminderAt && task.reminderAt > Date.now())
      .map((task) => [reminderIdentifier(task.id), task]),
  );

  for (const notification of scheduled) {
    if (!wanted.has(notification.identifier)) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier).catch(() => undefined);
    }
  }

  for (const task of wanted.values()) {
    await scheduleTaskReminder(task);
  }
}
