export interface AccessTokenClaims {
  sub: string;
  hospitalId: string;
  roles: string[];
  permissions: string[];
  type: 'access';
  exp?: number; // Unix timestamp (seconds) when token expires
  iat?: number; // Unix timestamp (seconds) when token was issued
  /** Ward-scoped staff account (Nurse role); undefined means unrestricted, tenant-wide access. */
  wardId?: string;
  /** The account's real name, for UI display (shell chrome initials/header). Always present on a
   *  token issued after this field was added; absent on a still-live pre-existing token, so
   *  consumers must fall back gracefully rather than assume it's always set. */
  displayName?: string;
}
