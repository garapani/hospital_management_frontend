import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service.js';

const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh'];

function isAuthEndpoint(url: string): boolean {
  const path = url.split('?')[0];
  return AUTH_ENDPOINTS.some((endpoint) => path.endsWith(endpoint));
}

function withBearerToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  const accessToken = authService.getAccessToken();
  const authedReq = accessToken ? withBearerToken(req, accessToken) : req;

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
