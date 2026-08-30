import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { OrdersApiService } from './orders-api.service.js';

describe('OrdersApiService', () => {
  let service: OrdersApiService;
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
    service = TestBed.inject(OrdersApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('omits patientId from query params when not provided', () => {
    service.list({ page: 1, limit: 10 }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) =>
        r.url === 'https://gateway.example/api/orders',
    );
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.has('patientId')).toBe(false);
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
  });

  it('includes patientId in query params when provided', () => {
    service.list({ patientId: 'pat-123', page: 1, limit: 10 }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) =>
        r.url === 'https://gateway.example/api/orders',
    );
    expect(req.request.params.get('patientId')).toBe('pat-123');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
  });

  it('gets an order by id', () => {
    service.getById('ord-1').subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/orders/ord-1');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'ord-1', items: [] });
  });

  it('completes an order item', () => {
    service.completeItem('ord-1', 'item-1').subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/orders/ord-1/items/item-1/complete');
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: 'item-1', status: 'Completed' });
  });

  it('cancels an order item with a reason', () => {
    service.cancelItem('ord-1', 'item-1', 'Duplicate order').subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/orders/ord-1/items/item-1/cancel');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ cancelReason: 'Duplicate order' });
    req.flush({ id: 'item-1', status: 'Cancelled' });
  });
});
