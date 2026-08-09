export interface AccessTokenClaims {
  sub: string;
  hospitalId: string;
  roles: string[];
  permissions: string[];
  type: 'access';
}
