import { Buffer } from 'node:buffer';
import { decodeAccessToken } from './decode-access-token.js';

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
});
