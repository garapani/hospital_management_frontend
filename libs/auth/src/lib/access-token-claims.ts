export interface AccessTokenClaims {
  sub: string;
  hospitalId: string;
  roles: string[];
  permissions: string[];
  type: 'access';
  exp?: number; // Unix timestamp (seconds) when token expires
  iat?: number; // Unix timestamp (seconds) when token was issued
}
