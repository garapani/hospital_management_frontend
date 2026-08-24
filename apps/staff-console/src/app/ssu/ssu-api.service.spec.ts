import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { SsuApiService } from './ssu-api.service.js';
import { CreateCaseDto, RejectCaseDto } from './ssu.model.js';

describe('SsuApiService', () => {
  let service: SsuApiService;
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
    service = TestBed.inject(SsuApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists cases filtered by patientId/status/page/limit without sending undefined values', () => {
    service.listCases({ patientId: 'pat-1', status: 'Open', page: 2, limit: 10 }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/ssu/cases',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('patientId')).toBe('pat-1');
    expect(req.request.params.get('status')).toBe('Open');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.keys().sort()).toEqual(['limit', 'page', 'patientId', 'status']);
    req.flush({ data: [], meta: { total: 0, page: 2, limit: 10, totalPages: 0 } });
  });

  it('lists cases without filters omitting undefined keys', () => {
    service.listCases().subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/ssu/cases');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
  });

  it('gets a single case by id', () => {
    service.getCase('case-1').subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/ssu/cases/case-1');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'case-1', caseNumber: 'SSU-0001' });
  });

  it('creates an SSU case', () => {
    const dto: CreateCaseDto = {
      patientId: 'pat-1',
      caseType: 'Charity Care',
      eligibilityNotes: 'Low income family',
      subsidyPercent: 50,
    };
    service.createCase(dto).subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/ssu/cases');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 'case-1', ...dto, caseNumber: 'SSU-0001', status: 'Open' });
  });

  it('approves an SSU case', () => {
    service.approveCase('case-1', { decisionNotes: 'Verified documentation' }).subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/ssu/cases/case-1/approve');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ decisionNotes: 'Verified documentation' });
    req.flush({ id: 'case-1', status: 'Approved' });
  });

  it('rejects an SSU case with required decisionNotes', () => {
    const dto: RejectCaseDto = { decisionNotes: 'Ineligible income threshold' };
    service.rejectCase('case-1', dto).subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/ssu/cases/case-1/reject');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 'case-1', status: 'Rejected' });
  });

  it('closes an SSU case', () => {
    service.closeCase('case-1').subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/ssu/cases/case-1/close');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ id: 'case-1', status: 'Closed' });
  });
});
