import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { BrandingApiService } from './branding-api.service.js';

describe('BrandingApiService', () => {
  let service: BrandingApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://gateway.example/api' },
        { provide: TENANT_ID, useValue: 'demo' },
      ],
    });
    service = TestBed.inject(BrandingApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('reads the caller-own-tenant branding from the public unauthenticated endpoint', () => {
    let result: unknown;
    service.getPublicBranding().subscribe((res) => (result = res));

    const req = httpMock.expectOne('https://gateway.example/api/branding');
    expect(req.request.method).toBe('GET');
    const body = { displayName: 'City Hospital', primaryColor: '#006D77', logoUrl: null };
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('reads admin branding for a specific tenant', () => {
    service.getForAdmin('demo').subscribe();
    const req = httpMock.expectOne('https://gateway.example/api/platform/tenants/demo/branding');
    expect(req.request.method).toBe('GET');
    req.flush({ displayName: null, primaryColor: null, logoUrl: null });
  });

  it('upserts branding via PUT', () => {
    service.upsert('demo', { displayName: 'City Hospital', primaryColor: '#006D77' }).subscribe();
    const req = httpMock.expectOne('https://gateway.example/api/platform/tenants/demo/branding');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ displayName: 'City Hospital', primaryColor: '#006D77' });
    req.flush({ displayName: 'City Hospital', primaryColor: '#006D77', logoUrl: null });
  });

  it('uploads a logo as multipart form data', () => {
    const file = new File(['fake-bytes'], 'logo.png', { type: 'image/png' });
    service.uploadLogo('demo', file).subscribe();
    const req = httpMock.expectOne('https://gateway.example/api/platform/tenants/demo/branding/logo');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush({ displayName: null, primaryColor: null, logoUrl: 'https://minio.example/logo.png' });
  });

  it('removes the logo via DELETE', () => {
    service.removeLogo('demo').subscribe();
    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/platform/tenants/demo/branding/logo',
    );
    expect(req.request.method).toBe('DELETE');
    req.flush({ displayName: null, primaryColor: null, logoUrl: null });
  });
});
