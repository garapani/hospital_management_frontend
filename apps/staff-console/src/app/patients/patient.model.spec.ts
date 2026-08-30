import { calculateAge, isValidEmail, isValidPhoneNumber } from './patient.model.js';

describe('isValidPhoneNumber', () => {
  it('accepts a 10-digit number', () => {
    expect(isValidPhoneNumber('9811000001')).toBe(true);
  });

  it('accepts an absent value (field is optional)', () => {
    expect(isValidPhoneNumber(undefined)).toBe(true);
    expect(isValidPhoneNumber(null)).toBe(true);
    expect(isValidPhoneNumber('')).toBe(true);
  });

  it('rejects a number with the wrong length or non-digit characters', () => {
    expect(isValidPhoneNumber('12345')).toBe(false);
    expect(isValidPhoneNumber('98110000012')).toBe(false);
    expect(isValidPhoneNumber('98110-0001')).toBe(false);
    expect(isValidPhoneNumber('abcdefghij')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('accepts a well-formed email', () => {
    expect(isValidEmail('jane.doe@example.com')).toBe(true);
  });

  it('accepts an absent value (field is optional)', () => {
    expect(isValidEmail(undefined)).toBe(true);
    expect(isValidEmail(null)).toBe(true);
    expect(isValidEmail('')).toBe(true);
  });

  it('rejects a malformed email', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('missing-domain@')).toBe(false);
    expect(isValidEmail('@missing-local.com')).toBe(false);
  });
});

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
