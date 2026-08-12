import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { Buffer } from 'node:buffer';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { authInterceptor } from './auth.interceptor.js';
import { AuthService } from './auth.service.js';

function fakeAccessToken(
  overrides: Partial<Record<string, unknown>> = {},
): string {
  const payload = {
    sub: 'account-1',
    hospitalId: 'hospital-1',
    roles: ['Nurse'],
    permissions: ['billing.manage'],
    type: 'access',
    ...overrides,
  };
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fake-signature`;
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: 'https://gateway.example/api' },
        { provide: TENANT_ID, useValue: 'demo' },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Logs in through the real seam so the service holds a genuine access token. */
  function login(accessToken: string): void {
    authService.login('jdoe', 'secret').subscribe();
    httpMock
      .expectOne('https://gateway.example/api/auth/login')
      .flush({ accessToken, refreshToken: 'refresh-token-1' });
  }

  it('attaches the current access token as a Bearer header', () => {
    login(fakeAccessToken());

    http.get('https://gateway.example/api/invoices').subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/invoices');
    expect(req.request.headers.get('Authorization')).toBe(
      `Bearer ${authService.getAccessToken()}`,
    );
    req.flush({});
  });

  it('does not attach a header to /auth/login', () => {
    http.post('https://gateway.example/api/auth/login', {}).subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('on a 401, refreshes once and retries the original request with the new token', () => {
    login(fakeAccessToken());
    const newAccessToken = fakeAccessToken({ permissions: ['billing.settle'] });
    let result: unknown;

    http
      .get('https://gateway.example/api/invoices')
      .subscribe((res) => (result = res));

    const first = httpMock.expectOne('https://gateway.example/api/invoices');
    first.flush(
      { message: 'expired' },
      { status: 401, statusText: 'Unauthorized' },
    );

    const refresh = httpMock.expectOne(
      'https://gateway.example/api/auth/refresh',
    );
    refresh.flush({
      accessToken: newAccessToken,
      refreshToken: 'refresh-token-2',
    });

    const retried = httpMock.expectOne('https://gateway.example/api/invoices');
    expect(retried.request.headers.get('Authorization')).toBe(
      `Bearer ${newAccessToken}`,
    );
    retried.flush({ ok: true });

    expect(result).toEqual({ ok: true });
  });

  it('shares a single refresh call across two requests that 401 concurrently', () => {
    login(fakeAccessToken());
    const newAccessToken = fakeAccessToken();

    http.get('https://gateway.example/api/invoices').subscribe();
    http.get('https://gateway.example/api/appointments').subscribe();

    httpMock
      .expectOne('https://gateway.example/api/invoices')
      .flush(
        { message: 'expired' },
        { status: 401, statusText: 'Unauthorized' },
      );
    httpMock
      .expectOne('https://gateway.example/api/appointments')
      .flush(
        { message: 'expired' },
        { status: 401, statusText: 'Unauthorized' },
      );

    httpMock
      .expectOne('https://gateway.example/api/auth/refresh')
      .flush({ accessToken: newAccessToken, refreshToken: 'refresh-token-2' });

    httpMock.expectOne('https://gateway.example/api/invoices').flush({});
    httpMock.expectOne('https://gateway.example/api/appointments').flush({});
  });

  it('gives up after one retry if the retried request also 401s, clearing the session', () => {
    login(fakeAccessToken());
    const navigateSpy = TestBed.inject(Router).navigateByUrl as jest.Mock;
    const newAccessToken = fakeAccessToken();
    let errored: unknown;

    http
      .get('https://gateway.example/api/invoices')
      .subscribe({ error: (err) => (errored = err) });

    httpMock
      .expectOne('https://gateway.example/api/invoices')
      .flush(
        { message: 'expired' },
        { status: 401, statusText: 'Unauthorized' },
      );

    httpMock
      .expectOne('https://gateway.example/api/auth/refresh')
      .flush({ accessToken: newAccessToken, refreshToken: 'refresh-token-2' });

    httpMock
      .expectOne('https://gateway.example/api/invoices')
      .flush(
        { message: 'still expired' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(errored).toBeDefined();
    httpMock.expectNone('https://gateway.example/api/auth/refresh');
    expect(authService.isAuthenticated()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });

  it('clears the session and redirects to login exactly once when the refresh call itself fails', () => {
    login(fakeAccessToken());
    const navigateSpy = TestBed.inject(Router).navigateByUrl as jest.Mock;
    let errored: unknown;

    http
      .get('https://gateway.example/api/invoices')
      .subscribe({ error: (err) => (errored = err) });

    httpMock
      .expectOne('https://gateway.example/api/invoices')
      .flush(
        { message: 'expired' },
        { status: 401, statusText: 'Unauthorized' },
      );

    httpMock
      .expectOne('https://gateway.example/api/auth/refresh')
      .flush(
        { message: 'invalid refresh token' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(errored).toBeDefined();
    expect(authService.isAuthenticated()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });

  it('does not treat a protected endpoint containing "/auth/login" as a substring as the login endpoint', () => {
    login(fakeAccessToken());

    http
      .get('https://gateway.example/api/audit-log/auth/login-events')
      .subscribe();

    const req = httpMock.expectOne(
      'https://gateway.example/api/audit-log/auth/login-events',
    );
    expect(req.request.headers.get('Authorization')).toBe(
      `Bearer ${authService.getAccessToken()}`,
    );
    req.flush({});
  });
});
