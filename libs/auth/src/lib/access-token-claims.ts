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
}
