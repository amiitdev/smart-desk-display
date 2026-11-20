/** Pure formatting helpers shared by the dashboard and the settings screens. */

export function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export interface ClockParts {
  hours: string;
  minutes: string;
  seconds: string;
  suffix: string | null;
}

export function getClockParts(date: Date, use24Hour: boolean): ClockParts {
  const h24 = date.getHours();
  const suffix = use24Hour ? null : h24 >= 12 ? 'PM' : 'AM';
  const hours = use24Hour ? h24 : h24 % 12 === 0 ? 12 : h24 % 12;
  return {
    hours: pad(hours),
    minutes: pad(date.getMinutes()),
    seconds: pad(date.getSeconds()),
    suffix,
  };
}

export function formatLongDate(date: Date): string {
  return `${date.getDate()} ${date.toLocaleDateString(undefined, { month: 'long' })} ${date.getFullYear()}`;
}

export function formatWeekday(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'long' });
}

export function formatShortDate(date: Date): string {
  return `${date.getDate()} ${date.toLocaleDateString(undefined, { month: 'short' })}`;
}

export function formatTimeOfDay(date: Date, use24Hour: boolean): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour,
  });
}

export interface MonthCell {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
}

/** Calendar grid starting on Sunday, matching the reference widget. */
export function buildMonthMatrix(year: number, month: number): MonthCell[] {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const today = new Date();
  const cells: MonthCell[] = [];

  const start = new Date(year, month, 1 - startOffset);
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    cells.push({
      date,
      inMonth: date.getMonth() === month,
      isToday:
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear(),
    });
  }
  return cells;
}

export const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

export interface DeadlineLabel {
  text: string;
  tone: 'normal' | 'soon' | 'overdue' | 'muted';
}

export function getDeadlineLabel(deadline: number | null, completed: boolean, now = Date.now()): DeadlineLabel {
  if (completed) return { text: 'done', tone: 'muted' };
  if (!deadline) return { text: 'someday', tone: 'muted' };

  const target = new Date(deadline);
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const dayDelta = Math.round((startOfTarget - startOfToday) / 86_400_000);

  if (dayDelta < 0) {
    return { text: dayDelta === -1 ? 'yesterday' : `${Math.abs(dayDelta)}d late`, tone: 'overdue' };
  }
  if (dayDelta === 0) {
    const hours = target.getHours();
    if (hours < 12) return { text: 'morning', tone: 'soon' };
    if (hours < 17) return { text: 'afternoon', tone: 'soon' };
    return { text: 'today', tone: 'soon' };
  }
  if (dayDelta === 1) return { text: 'tomorrow', tone: 'normal' };
  if (dayDelta < 7) return { text: `in ${dayDelta}d`, tone: 'normal' };
  return { text: formatShortDate(target), tone: 'normal' };
}

export function isOverdue(task: { deadline: number | null; completed: boolean }, now = Date.now()): boolean {
  return !task.completed && !!task.deadline && task.deadline < now;
}

export function formatBytes(bytes: number, fractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : fractionDigits)} ${units[exponent]}`;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${pad(seconds)}`;
}

export function formatUptime(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function relativeTime(from: number, now = Date.now()): string {
  const diff = Math.max(0, now - from);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
