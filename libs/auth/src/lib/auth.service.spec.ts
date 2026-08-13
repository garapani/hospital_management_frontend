import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { Buffer } from 'node:buffer';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
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

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: 'https://gateway.example/api' },
        { provide: TENANT_ID, useValue: 'demo' },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('stores tokens and marks the user authenticated on successful login', () => {
    const accessToken = fakeAccessToken();
    let outcome: unknown;

    service.login('jdoe', 'secret').subscribe((result) => (outcome = result));

    const req = httpMock.expectOne('https://gateway.example/api/auth/login');
    expect(req.request.body).toEqual({ username: 'jdoe', password: 'secret' });
    req.flush({ accessToken, refreshToken: 'refresh-token-1' });

    expect(outcome).toEqual({ kind: 'success' });
    expect(service.isAuthenticated()).toBe(true);
    expect(service.getAccessToken()).toBe(accessToken);
    expect(sessionStorage.getItem('auth.refreshToken')).toBe('refresh-token-1');
  });

  it('reports a locked outcome with retryAfterSeconds on a 423 response', () => {
    let outcome: unknown;

    service.login('jdoe', 'wrong').subscribe((result) => (outcome = result));

    const req = httpMock.expectOne('https://gateway.example/api/auth/login');
    req.flush(
      { message: 'Account locked', retryAfterSeconds: 300 },
      { status: 423, statusText: 'Locked' },
    );

    expect(outcome).toEqual({ kind: 'locked', retryAfterSeconds: 300 });
    expect(service.isAuthenticated()).toBe(false);
  });

  it('reports invalidCredentials on a 401 response', () => {
    let outcome: unknown;

    service.login('jdoe', 'wrong').subscribe((result) => (outcome = result));

    const req = httpMock.expectOne('https://gateway.example/api/auth/login');
    req.flush(
      { message: 'Invalid username or password' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(outcome).toEqual({ kind: 'invalidCredentials' });
    expect(service.isAuthenticated()).toBe(false);
  });

  describe('refreshAccessToken', () => {
    beforeEach(() => {
      sessionStorage.setItem('auth.refreshToken', 'refresh-token-1');
    });

    it('exchanges the stored refresh token for a new access token', () => {
      const newAccessToken = fakeAccessToken();
      let result: string | undefined;

      service.refreshAccessToken().subscribe((token) => (result = token));

      const req = httpMock.expectOne(
        'https://gateway.example/api/auth/refresh',
      );
      expect(req.request.body).toEqual({ refreshToken: 'refresh-token-1' });
      req.flush({
        accessToken: newAccessToken,
        refreshToken: 'refresh-token-2',
      });

      expect(result).toBe(newAccessToken);
      expect(service.getAccessToken()).toBe(newAccessToken);
      expect(sessionStorage.getItem('auth.refreshToken')).toBe(
        'refresh-token-2',
      );
    });

    it('shares one in-flight HTTP call across concurrent callers', () => {
      const newAccessToken = fakeAccessToken();
      const results: string[] = [];

      service.refreshAccessToken().subscribe((token) => results.push(token));
      service.refreshAccessToken().subscribe((token) => results.push(token));

      const req = httpMock.expectOne(
        'https://gateway.example/api/auth/refresh',
      );
      req.flush({
        accessToken: newAccessToken,
        refreshToken: 'refresh-token-2',
      });

      expect(results).toEqual([newAccessToken, newAccessToken]);
    });

    it('clears the session and redirects to login when refresh fails', () => {
      const router = TestBed.inject(Router);
      const navigateSpy = jest
        .spyOn(router, 'navigateByUrl')
        .mockResolvedValue(true);
      let erroredWith: unknown;

      service
        .refreshAccessToken()
        .subscribe({ error: (err) => (erroredWith = err) });

      const req = httpMock.expectOne(
        'https://gateway.example/api/auth/refresh',
      );
      req.flush(
        { message: 'Invalid or expired refresh token' },
        { status: 401, statusText: 'Unauthorized' },
      );

      expect(erroredWith).toBeDefined();
      expect(service.isAuthenticated()).toBe(false);
      expect(sessionStorage.getItem('auth.refreshToken')).toBeNull();
      expect(navigateSpy).toHaveBeenCalledWith('/login');
    });
  });

  describe('hasPermission', () => {
    it('reflects the permissions embedded in the current access token', () => {
      service.login('jdoe', 'secret').subscribe();
      httpMock.expectOne('https://gateway.example/api/auth/login').flush({
        accessToken: fakeAccessToken({ permissions: ['billing.manage'] }),
        refreshToken: 'r',
      });

      expect(service.hasPermission('billing.manage')).toBe(true);
      expect(service.hasPermission('billing.settle')).toBe(false);
    });

    it('is false when no user is authenticated', () => {
      expect(service.hasPermission('billing.manage')).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears tokens and navigates to /login', () => {
      const router = TestBed.inject(Router);
      const navigateSpy = jest
        .spyOn(router, 'navigateByUrl')
        .mockResolvedValue(true);

      service.login('jdoe', 'secret').subscribe();
      httpMock.expectOne('https://gateway.example/api/auth/login').flush({
        accessToken: fakeAccessToken(),
        refreshToken: 'refresh-token-1',
      });

      service.logout().subscribe();
      httpMock.expectOne('https://gateway.example/api/auth/logout').flush(null);

      expect(service.isAuthenticated()).toBe(false);
      expect(service.getAccessToken()).toBeNull();
      expect(sessionStorage.getItem('auth.refreshToken')).toBeNull();
      expect(navigateSpy).toHaveBeenCalledWith('/login');
    });
  });
});
