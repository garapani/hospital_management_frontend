import { Buffer } from 'node:buffer';
import { decodeAccessToken, isTokenExpired } from './decode-access-token.js';

function encodeFakeJwt(payload: unknown): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fake-signature`;
}

describe('decodeAccessToken', () => {
  it('decodes the claims from a well-formed access token', () => {
    const token = encodeFakeJwt({
      sub: 'account-1',
      hospitalId: 'hospital-1',
      roles: ['Nurse'],
      permissions: ['billing.manage'],
      type: 'access',
    });

    expect(decodeAccessToken(token)).toEqual({
      sub: 'account-1',
      hospitalId: 'hospital-1',
      roles: ['Nurse'],
      permissions: ['billing.manage'],
      type: 'access',
    });
  });

  it('returns null for a malformed token', () => {
    expect(decodeAccessToken('not-a-jwt')).toBeNull();
  });

  it('returns null when permissions or roles are missing/not arrays', () => {
    const missingPermissions = encodeFakeJwt({
      sub: 'account-1',
      hospitalId: 'hospital-1',
      roles: ['Nurse'],
      type: 'access',
    });
    const nonArrayRoles = encodeFakeJwt({
      sub: 'account-1',
      hospitalId: 'hospital-1',
      roles: 'Nurse',
      permissions: ['billing.manage'],
      type: 'access',
    });

    expect(decodeAccessToken(missingPermissions)).toBeNull();
    expect(decodeAccessToken(nonArrayRoles)).toBeNull();
  });

  it('decodes a non-ASCII displayName without mojibake (atob() alone yields Latin-1, not UTF-8)', () => {
    const token = encodeFakeJwt({
      sub: 'account-1',
      hospitalId: 'hospital-1',
      roles: ['Doctor'],
      permissions: [],
      type: 'access',
      displayName: 'डॉ. रमेश',
    });

    expect(decodeAccessToken(token)?.displayName).toBe('डॉ. रमेश');
  });

  it('normalizes a non-string displayName to undefined rather than letting it reach the UI broken', () => {
    const token = encodeFakeJwt({
      sub: 'account-1',
      hospitalId: 'hospital-1',
      roles: ['Doctor'],
      permissions: [],
      type: 'access',
      displayName: 12345,
    });

    expect(decodeAccessToken(token)?.displayName).toBeUndefined();
  });
});

describe('isTokenExpired', () => {
  const now = Math.floor(Date.now() / 1000);

  it('returns true when exp claim is missing', () => {
    const claims = { sub: 'account-1', hospitalId: 'hospital-1', roles: [], permissions: [], type: 'access' as const };
    expect(isTokenExpired(claims)).toBe(true);
  });

  it('returns true when token is expired', () => {
    const claims = { sub: 'account-1', hospitalId: 'hospital-1', roles: [], permissions: [], type: 'access' as const, exp: now - 60 };
    expect(isTokenExpired(claims)).toBe(true);
  });

  it('returns false when token is not expired', () => {
    const claims = { sub: 'account-1', hospitalId: 'hospital-1', roles: [], permissions: [], type: 'access' as const, exp: now + 300 };
    expect(isTokenExpired(claims)).toBe(false);
  });

  it('returns true when token expires within the buffer period', () => {
    const claims = { sub: 'account-1', hospitalId: 'hospital-1', roles: [], permissions: [], type: 'access' as const, exp: now + 20 };
    expect(isTokenExpired(claims, 30)).toBe(true);
  });

  it('returns false when token expires just outside the buffer period', () => {
    const claims = { sub: 'account-1', hospitalId: 'hospital-1', roles: [], permissions: [], type: 'access' as const, exp: now + 40 };
    expect(isTokenExpired(claims, 30)).toBe(false);
  });

  it('uses custom buffer when provided', () => {
    const claims = { sub: 'account-1', hospitalId: 'hospital-1', roles: [], permissions: [], type: 'access' as const, exp: now + 10 };
    expect(isTokenExpired(claims, 5)).toBe(false);
    expect(isTokenExpired(claims, 15)).toBe(true);
  });

  it('returns true when claims is null', () => {
    expect(isTokenExpired(null)).toBe(true);
  });
});
