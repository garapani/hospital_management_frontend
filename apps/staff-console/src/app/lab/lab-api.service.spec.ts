import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { LabApiService } from './lab-api.service.js';

describe('LabApiService', () => {
  let service: LabApiService;
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
    service = TestBed.inject(LabApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('omits orderItemId from query params when not provided', () => {
    service.listRequisitions({ page: 1, limit: 10 }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) =>
        r.url === 'https://gateway.example/api/lab/requisitions',
    );
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.has('orderItemId')).toBe(false);
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
  });

  it('includes orderItemId in query params when provided', () => {
    service.listRequisitions({ orderItemId: 'item-123', page: 1, limit: 10 }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) =>
        r.url === 'https://gateway.example/api/lab/requisitions',
    );
    expect(req.request.params.get('orderItemId')).toBe('item-123');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
  });

  it('gets a single requisition by id', () => {
    service.getRequisition('req-1').subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/lab/requisitions/req-1');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'req-1' });
  });

  it('includes status in query params when provided', () => {
    service.listRequisitions({ status: 'Verified', page: 1, limit: 10 }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/lab/requisitions',
    );
    expect(req.request.params.get('status')).toBe('Verified');
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
  });

  it('gets the entered results for a requisition', () => {
    service.getResults('req-1').subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/lab/requisitions/req-1/results');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
