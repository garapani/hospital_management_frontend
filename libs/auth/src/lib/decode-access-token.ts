import { AccessTokenClaims } from './access-token-claims.js';

/**
 * Reads claims for UI display/routing only — never used to validate signature or
 * expiry; the interceptor's 401 handling is the actual expiry-detection mechanism.
 */
export function decodeAccessToken(token: string): AccessTokenClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as AccessTokenClaims;
    if (
      claims.type !== 'access' ||
      !claims.sub ||
      !claims.hospitalId ||
      !Array.isArray(claims.roles) ||
      !Array.isArray(claims.permissions)
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}
