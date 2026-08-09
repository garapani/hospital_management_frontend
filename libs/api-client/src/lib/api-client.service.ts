import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from './api-base-url.token.js';
import { ApiError } from './api-error.js';

interface RequestOptions {
  params?: Record<string, string | number | boolean>;
}

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  get<T>(path: string, options?: RequestOptions): Observable<T> {
    return this.http.get<T>(this.url(path), options).pipe(catchError(this.normalizeError));
  }

  post<T>(path: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.post<T>(this.url(path), body, options).pipe(catchError(this.normalizeError));
  }

  patch<T>(path: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.patch<T>(this.url(path), body, options).pipe(catchError(this.normalizeError));
  }

  delete<T>(path: string, options?: RequestOptions): Observable<T> {
    return this.http.delete<T>(this.url(path), options).pipe(catchError(this.normalizeError));
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  // Arrow field, not a prototype method: safe to pass to catchError() unbound.
  private readonly normalizeError = (error: HttpErrorResponse) => {
    const apiError: ApiError = {
      status: error.status,
      message: typeof error.error?.message === 'string' ? error.error.message : error.message,
      body: error.error,
    };
    return throwError(() => apiError);
  };
}
