import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { FixedAssetsApiService } from './fixed-assets-api.service.js';

describe('FixedAssetsApiService', () => {
  let service: FixedAssetsApiService;
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
    service = TestBed.inject(FixedAssetsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists categories', () => {
    service.listCategories().subscribe();
    httpMock.expectOne('https://gateway.example/api/fixed-assets/categories').flush([]);
  });

  it('creates a category', () => {
    service.createCategory('Medical Equipment').subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/fixed-assets/categories');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Medical Equipment' });
    req.flush({});
  });

  it('lists assets filtered by category/condition', () => {
    service.listAssets({ categoryId: 'c1', condition: 'In Service' }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/fixed-assets',
    );
    expect(req.request.params.get('categoryId')).toBe('c1');
    expect(req.request.params.get('condition')).toBe('In Service');
    req.flush({ data: [], total: 0 });
  });

  it('creates an asset', () => {
    const dto = { categoryId: 'c1', name: 'MRI Machine', purchaseDate: '2026-01-01', purchaseCost: 5000000 };
    service.createAsset(dto).subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/fixed-assets');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({});
  });

  it('fetches an asset valuation', () => {
    service.getValuation('a1').subscribe();
    httpMock.expectOne('https://gateway.example/api/fixed-assets/a1/valuation').flush({});
  });
});
