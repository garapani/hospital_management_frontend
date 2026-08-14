import { calculateAge } from './patient.model.js';

describe('calculateAge', () => {
  it('returns null when dateOfBirth is missing', () => {
    expect(calculateAge(undefined)).toBeNull();
    expect(calculateAge(null)).toBeNull();
    expect(calculateAge('')).toBeNull();
  });

  it('returns null for an unparseable date', () => {
    expect(calculateAge('not-a-date')).toBeNull();
  });

  it('computes full years elapsed, accounting for whether this year\'s birthday has passed', () => {
    // Built from local Y/M/D components directly (not toISOString(), which converts to UTC and
    // can shift the calendar date across midnight depending on the local timezone offset).
    function isoDate(year: number, month: number, day: number): string {
      const d = new Date(year, month, day);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    const now = new Date();
    expect(calculateAge(isoDate(now.getFullYear() - 1, now.getMonth(), now.getDate()))).toBe(1);
    expect(calculateAge(isoDate(now.getFullYear() - 10, now.getMonth(), now.getDate() + 1))).toBe(9);
  });
});
