import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api-base-url.token.js';
import { TENANT_ID } from './tenant-id.token.js';
import { ApiClientService } from './api-client.service.js';

describe('ApiClientService', () => {
  let service: ApiClientService;
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
    service = TestBed.inject(ApiClientService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('prefixes GET requests with the configured base URL', () => {
    service.get('/invoices/123').subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/invoices/123');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('attaches the configured tenant id as an x-tenant-id header on every request', () => {
    service.get('/invoices/123').subscribe();
    service.post('/invoices', {}).subscribe();

    const requests = httpMock.match(() => true);
    expect(requests).toHaveLength(2);
    for (const req of requests) {
      expect(req.request.headers.get('x-tenant-id')).toBe('demo');
      req.flush({});
    }
  });

  it('normalizes a failed request into an ApiError with status and message', () => {
    let captured: unknown;
    service.post('/invoices', { amount: 10 }).subscribe({
      error: (err: unknown) => (captured = err),
    });

    const req = httpMock.expectOne('https://gateway.example/api/invoices');
    req.flush(
      { message: 'Amount must be positive' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(captured).toEqual({
      status: 400,
      message: 'Amount must be positive',
      body: { message: 'Amount must be positive' },
    });
  });
});
