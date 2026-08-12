import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiClientService, ApiError } from '@org/api-client';
import { Observable, catchError, finalize, map, of, throwError } from 'rxjs';
import { AccessTokenClaims } from './access-token-claims.js';
import { decodeAccessToken, isTokenExpired } from './decode-access-token.js';
import { LoginOutcome } from './login-outcome.js';
import { TokenStorage } from './token-storage.js';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiClient = inject(ApiClientService);
  private readonly router = inject(Router);
  private readonly tokens = inject(TokenStorage);

  private readonly claims = signal<AccessTokenClaims | null>(null);
  private refreshInFlight: Observable<string> | null = null;

  readonly isAuthenticated = computed(() => this.claims() !== null);
  readonly currentUser = this.claims.asReadonly();

  login(username: string, password: string): Observable<LoginOutcome> {
    return this.apiClient.post<LoginResponse>('/auth/login', { username, password }).pipe(
      map((response) => {
        this.setSession(response.accessToken, response.refreshToken);
        return { kind: 'success' } as const;
      }),
      catchError((error: ApiError) => {
        if (error.status === 423) {
          const body = error.body as { retryAfterSeconds?: number } | undefined;
          return of({
            kind: 'locked' as const,
            retryAfterSeconds: body?.retryAfterSeconds ?? 0,
          });
        }
        if (error.status === 401) {
          return of({ kind: 'invalidCredentials' as const });
        }
        throw error;
      }),
    );
  }

  /**
   * Single-flight: concurrent callers share one HTTP call. On failure, clears the
   * session and redirects to login — callers just subscribe for the error.
   */
  refreshAccessToken(): Observable<string> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    const refreshToken = this.tokens.getRefreshToken();
    if (!refreshToken) {
      this.clearSession();
      return throwError(() => new Error('No refresh token available'));
    }

    this.refreshInFlight = this.apiClient
      .post<LoginResponse>('/auth/refresh', { refreshToken })
      .pipe(
        map((response) => {
          this.setSession(response.accessToken, response.refreshToken);
          return response.accessToken;
        }),
        catchError((error: ApiError) => {
          this.clearSession();
          return throwError(() => error);
        }),
        finalize(() => (this.refreshInFlight = null)),
      );

    return this.refreshInFlight;
  }

  logout(): Observable<void> {
    const refreshToken = this.tokens.getRefreshToken();
    if (!refreshToken) {
      // No refresh token to invalidate, just clear local session
      this.clearSession();
      return of(undefined);
    }

    // Call server-side logout to invalidate refresh token
    return this.apiClient.post('/auth/logout', { refreshToken }).pipe(
      finalize(() => this.clearSession()),
    );
  }

  /** Clears stored tokens AND navigates to /login — called on logout and on unrecoverable
   * auth failures (interceptor retry-401, failed refresh), which all want both steps together. */
  clearSession(): void {
    this.tokens.clear();
    this.claims.set(null);
    void this.router.navigateByUrl('/login');
  }

  /** Checks if the current access token is expired or about to expire (with buffer). */
  isAccessTokenExpired(): boolean {
    return isTokenExpired(this.claims());
  }

  getAccessToken(): string | null {
    return this.tokens.getAccessToken();
  }

  hasStoredSession(): boolean {
    return this.tokens.getRefreshToken() !== null;
  }

  hasPermission(permission: string): boolean {
    return this.claims()?.permissions.includes(permission) ?? false;
  }

  /** Rejects rather than storing a token whose claims fail to decode — never leaves the
   * interceptor authenticating requests while isAuthenticated()/hasPermission() report false. */
  private setSession(accessToken: string, refreshToken: string): void {
    const claims = decodeAccessToken(accessToken);
    if (!claims) {
      throw new Error('Received an access token with unreadable or malformed claims');
    }
    this.tokens.setAccessToken(accessToken);
    this.tokens.setRefreshToken(refreshToken);
    this.claims.set(claims);
  }
}
