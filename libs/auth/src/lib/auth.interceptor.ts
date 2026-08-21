import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service.js';
import { TokenStorage } from './token-storage.js';

// Auth-flow endpoints are called before any session exists (or with a deliberately limited one):
// login and the must-change-password onboarding authenticate with credentials, refresh with the
// refresh token. None of them may attach a Bearer token or trigger refresh-on-401 — a 401 there
// is a credential error, not a session expiry.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/change-password'];

function isAuthEndpoint(url: string): boolean {
  const path = url.split('?')[0];
  return AUTH_ENDPOINTS.some((endpoint) => path.endsWith(endpoint));
}

function withBearerToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * HTTP Interceptor that attaches the JWT access token to outgoing requests.
 * Handles 401 responses by attempting a silent refresh and retrying the request once.
 * Also attaches CSRF token if available for additional security.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const tokenStorage = inject(TokenStorage);

  if (isAuthEndpoint(req.url)) {
    // Include CSRF token on auth endpoints for login/refresh operations
    const csrfToken = tokenStorage.getCsrfToken();
    if (csrfToken) {
      req = req.clone({ setHeaders: { 'X-CSRF-Token': csrfToken } });
    }
    return next(req);
  }

  const accessToken = authService.getAccessToken();
  let authedReq = accessToken ? withBearerToken(req, accessToken) : req;

  // Attach CSRF token to all authenticated requests
  const csrfToken = tokenStorage.getCsrfToken();
  if (csrfToken) {
    authedReq = authedReq.clone({ setHeaders: { 'X-CSRF-Token': csrfToken } });
  }

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      // Retried at most once: a 401 on the retry itself falls through to clear-and-redirect
      // below rather than triggering another refresh (guards against infinite retry loops).
      // If refreshAccessToken() itself fails, it already clears the session internally —
      // this catchError only wraps the retried request, so that path isn't double-cleared.
      return authService.refreshAccessToken().pipe(
        switchMap((newAccessToken) =>
          next(withBearerToken(req, newAccessToken)).pipe(
            catchError((retryError: unknown) => {
              authService.clearSession();
              return throwError(() => retryError);
            }),
          ),
        ),
      );
    }),
  );
};
