export type LoginOutcome =
  | { kind: 'success' }
  | { kind: 'locked'; retryAfterSeconds: number }
  | { kind: 'invalidCredentials' };
