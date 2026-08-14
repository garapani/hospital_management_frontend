import { Injectable } from '@angular/core';

const REFRESH_TOKEN_KEY = 'auth.refreshToken';
const CSRF_TOKEN_KEY = 'auth.csrfToken';

/**
 * Secure storage for authentication tokens with CSRF protection.
 * Access token lives only in memory (this instance's field) — never persisted.
 * Refresh token is stored in sessionStorage with CSRF token validation.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  private accessToken: string | null = null;
  private csrfToken: string | null = null;

  /**
   * Gets the in-memory access token.
   * @returns The access token or null if not authenticated.
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Sets the in-memory access token.
   * @param token - The JWT access token to store in memory.
   */
  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  /**
   * Gets the CSRF token for request validation.
   * @returns The CSRF token or null if not set.
   */
  getCsrfToken(): string | null {
    return this.csrfToken || sessionStorage.getItem(CSRF_TOKEN_KEY);
  }

  /**
   * Sets the CSRF token for request validation.
   * @param token - The CSRF token to store.
   */
  setCsrfToken(token: string | null): void {
    this.csrfToken = token;
    if (token === null) {
      sessionStorage.removeItem(CSRF_TOKEN_KEY);
    } else {
      sessionStorage.setItem(CSRF_TOKEN_KEY, token);
    }
  }

  /**
   * Gets the refresh token from sessionStorage.
   * @returns The refresh token or null if not found.
   */
  getRefreshToken(): string | null {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Sets the refresh token in sessionStorage.
   * @param token - The refresh token to persist.
   */
  setRefreshToken(token: string | null): void {
    if (token === null) {
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
  }

  /**
   * Clears all stored tokens including CSRF token.
   */
  clear(): void {
    this.accessToken = null;
    this.csrfToken = null;
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
  }
}
