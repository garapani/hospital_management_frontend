export type LoginOutcome =
  | { kind: 'success' }
  | { kind: 'mustChangePassword' }
  | { kind: 'locked'; retryAfterSeconds: number }
  | { kind: 'invalidCredentials' }
  | { kind: 'serverError'; message: string };
