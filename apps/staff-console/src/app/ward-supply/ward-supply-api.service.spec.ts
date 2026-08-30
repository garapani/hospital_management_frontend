import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { WardSupplyApiService } from './ward-supply-api.service.js';

describe('WardSupplyApiService', () => {
  let service: WardSupplyApiService;
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
    service = TestBed.inject(WardSupplyApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists balances filtered by departmentId', () => {
    service.listBalances('d1').subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/ward-supply/stock',
    );
    expect(req.request.params.get('departmentId')).toBe('d1');
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
  });

  it('lists transactions filtered by department/item/type', () => {
    service.listTransactions({ departmentId: 'd1', itemId: 'i1', transactionType: 'Receive' }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/ward-supply/transactions',
    );
    expect(req.request.params.get('departmentId')).toBe('d1');
    expect(req.request.params.get('itemId')).toBe('i1');
    expect(req.request.params.get('transactionType')).toBe('Receive');
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
  });

  it('receives and consumes stock', () => {
    const dto = { departmentId: 'd1', itemId: 'i1', quantity: 10 };
    service.receiveStock(dto).subscribe();
    const receiveReq = httpMock.expectOne('https://gateway.example/api/ward-supply/stock/receive');
    expect(receiveReq.request.body).toEqual(dto);
    receiveReq.flush({});

    service.consumeStock(dto).subscribe();
    const consumeReq = httpMock.expectOne('https://gateway.example/api/ward-supply/stock/consume');
    expect(consumeReq.request.body).toEqual(dto);
    consumeReq.flush({});
  });
});
