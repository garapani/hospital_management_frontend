import { Injectable } from '@angular/core';

const REFRESH_TOKEN_KEY = 'auth.refreshToken';

/** Access token lives only in memory (this instance's field) — never persisted. */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  private accessToken: string | null = null;

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  getRefreshToken(): string | null {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setRefreshToken(token: string | null): void {
    if (token === null) {
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
  }

  clear(): void {
    this.accessToken = null;
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
