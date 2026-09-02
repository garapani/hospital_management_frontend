import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from './api-base-url.token.js';
import { TENANT_ID } from './tenant-id.token.js';
import { ApiError } from './api-error.js';

interface RequestOptions {
  params?: Record<string, string | number | boolean>;
}

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly tenantId = inject(TENANT_ID);

  get<T>(path: string, options?: RequestOptions): Observable<T> {
    return this.http
      .get<T>(this.url(path), { ...options, headers: this.headers() })
      .pipe(catchError(this.normalizeError));
  }

  /** For a binary download (PDF/CSV export) — a plain get<T>() would try to JSON-parse the body. */
  getBlob(path: string, options?: RequestOptions): Observable<Blob> {
    return this.http
      .get(this.url(path), { ...options, headers: this.headers(), responseType: 'blob' })
      .pipe(catchError(this.normalizeError));
  }

  post<T>(
    path: string,
    body: unknown,
    options?: RequestOptions,
  ): Observable<T> {
    return this.http
      .post<T>(this.url(path), body, { ...options, headers: this.headers() })
      .pipe(catchError(this.normalizeError));
  }

  patch<T>(
    path: string,
    body: unknown,
    options?: RequestOptions,
  ): Observable<T> {
    return this.http
      .patch<T>(this.url(path), body, { ...options, headers: this.headers() })
      .pipe(catchError(this.normalizeError));
  }

  put<T>(
    path: string,
    body: unknown,
    options?: RequestOptions,
  ): Observable<T> {
    return this.http
      .put<T>(this.url(path), body, { ...options, headers: this.headers() })
      .pipe(catchError(this.normalizeError));
  }

  delete<T>(path: string, options?: RequestOptions): Observable<T> {
    return this.http
      .delete<T>(this.url(path), { ...options, headers: this.headers() })
      .pipe(catchError(this.normalizeError));
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  // x-tenant-id must go here (every request), not the auth interceptor: the interceptor
  // deliberately skips /auth/login and /auth/refresh, but the backend's tenant-context
  // middleware needs exactly those two routes to carry this header (see
  // TenantContextMiddleware in the backend repo) since no JWT/authContext exists yet for them.
  private headers(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.tenantId) {
      headers['x-tenant-id'] = this.tenantId;
    }
    return headers;
  }

  // Arrow field, not a prototype method: safe to pass to catchError() unbound.
  private readonly normalizeError = (error: HttpErrorResponse) => {
    const apiError: ApiError = {
      status: error.status,
      message:
        typeof error.error?.message === 'string'
          ? error.error.message
          : error.message,
      body: error.error,
    };
    return throwError(() => apiError);
  };
}
