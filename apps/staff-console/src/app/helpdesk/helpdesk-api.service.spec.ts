import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { HelpdeskApiService } from './helpdesk-api.service.js';

describe('HelpdeskApiService', () => {
  let service: HelpdeskApiService;
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
    service = TestBed.inject(HelpdeskApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists tickets filtered by status/priority/q', () => {
    service.list({ status: 'Open', priority: 'High', q: 'printer' }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/helpdesk/tickets',
    );
    expect(req.request.params.get('status')).toBe('Open');
    expect(req.request.params.get('priority')).toBe('High');
    expect(req.request.params.get('q')).toBe('printer');
    req.flush({ data: [], total: 0 });
  });

  it('fetches a single ticket by id', () => {
    service.getById('t1').subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/helpdesk/tickets/t1');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('creates a ticket', () => {
    const dto = { title: 'Printer broken', description: 'Ward 3 printer offline' };
    service.create(dto).subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/helpdesk/tickets');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({});
  });

  it('assigns, starts, resolves, and closes a ticket', () => {
    service.assign('t1', 'acc1').subscribe();
    const assignReq = httpMock.expectOne('https://gateway.example/api/helpdesk/tickets/t1/assign');
    expect(assignReq.request.body).toEqual({ assigneeAccountId: 'acc1' });
    assignReq.flush({});

    service.start('t1').subscribe();
    httpMock.expectOne('https://gateway.example/api/helpdesk/tickets/t1/start').flush({});

    service.resolve('t1').subscribe();
    httpMock.expectOne('https://gateway.example/api/helpdesk/tickets/t1/resolve').flush({});

    service.close('t1').subscribe();
    httpMock.expectOne('https://gateway.example/api/helpdesk/tickets/t1/close').flush({});
  });
});
