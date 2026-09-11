import { describe, expect, it } from 'vitest';

import { formatBytes, getGreeting, limitMetricHistory } from './dashboard-utils';

describe('dashboard utilities', () => {
  it('selects a greeting by time of day', () => {
    expect(getGreeting(7)).toBe('Guten Morgen');
    expect(getGreeting(13)).toBe('Guten Tag');
    expect(getGreeting(21)).toBe('Guten Abend');
  });

  it('formats byte values for German readers', () => {
    expect(formatBytes(1024 ** 3)).toBe('1 GB');
    expect(formatBytes(-1)).toBe('—');
  });

  it('keeps only the configured amount of measurements', () => {
    const history = Array.from({ length: 4 }, (_, index) => ({ time: String(index), cpu: index, ram: index }));
    const result = limitMetricHistory(history, { time: '4', cpu: 4, ram: 4 }, 3);
    expect(result.map((point) => point.time)).toEqual(['2', '3', '4']);
  });
});
