import { toLocalDateString } from './date.util.js';

describe('toLocalDateString', () => {
  it('formats a local date as YYYY-MM-DD without shifting to UTC', () => {
    // 2026-01-05T00:15 local time is 2026-01-04T18:45Z in IST (UTC+5:30) — toISOString().slice(0, 10)
    // would wrongly return '2026-01-04'.
    const date = new Date(2026, 0, 5, 0, 15);
    expect(toLocalDateString(date)).toBe('2026-01-05');
  });

  it('pads single-digit months and days', () => {
    const date = new Date(2026, 2, 7);
    expect(toLocalDateString(date)).toBe('2026-03-07');
  });
});
