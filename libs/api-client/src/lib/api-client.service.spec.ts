import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api-base-url.token.js';
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
