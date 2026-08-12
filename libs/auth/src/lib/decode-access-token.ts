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

/**
 * Checks if the access token has expired based on the exp claim.
 * Returns true if the token is expired or if exp claim is missing.
 * Uses a 30-second buffer to proactively refresh before actual expiry.
 */
export function isTokenExpired(claims: AccessTokenClaims | null, bufferSeconds: number = 30): boolean {
  if (!claims?.exp) {
    // If no exp claim, assume token is expired (conservative approach)
    return true;
  }
  const now = Math.floor(Date.now() / 1000);
  return claims.exp - bufferSeconds <= now;
}
