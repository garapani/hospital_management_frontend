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
    // atob() yields a Latin-1 binary string (one JS char per byte), but the backend signs the
    // payload as UTF-8 bytes — every claim before displayName was ASCII in practice (UUIDs,
    // tenant slugs, seeded English role names), so this never mattered until a claim started
    // carrying real human names. Re-decode the Latin-1 bytes as UTF-8 so a name like "José" or
    // "डॉ. रमेश" round-trips instead of coming out as mojibake.
    const binary = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
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
    // Defensive, matching the roles/permissions guard above: a malformed displayName shouldn't
    // make userInitials() throw mid-render (it calls .split() on it) — degrade to the roles[0]
    // fallback instead.
    if (typeof claims.displayName !== 'string') {
      claims.displayName = undefined;
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
export function isTokenExpired(claims: AccessTokenClaims | null, bufferSeconds = 30): boolean {
  if (!claims?.exp) {
    // If no exp claim, assume token is expired (conservative approach)
    return true;
  }
  const now = Math.floor(Date.now() / 1000);
  return claims.exp - bufferSeconds <= now;
}
