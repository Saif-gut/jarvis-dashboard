import type { MetricPoint } from './dashboard-types';

export function getGreeting(hour: number): string {
  if (hour < 11) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}

export function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toLocaleString('de-DE', { maximumFractionDigits: unit > 1 ? 1 : 0 })} ${units[unit]}`;
}

export function limitMetricHistory(history: MetricPoint[], point: MetricPoint, limit = 24): MetricPoint[] {
  return [...history, point].slice(-limit);
}

export function formatDate(value: string | null): string {
  if (!value) return 'Kein Datum';
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
