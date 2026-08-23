import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { NursingApiService } from './nursing-api.service.js';

describe('NursingApiService', () => {
  let service: NursingApiService;
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
    service = TestBed.inject(NursingApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists tasks filtered by admissionId', () => {
    service.listTasks('adm-1').subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/nursing/tasks',
    );
    expect(req.request.params.get('admissionId')).toBe('adm-1');
    req.flush({ data: [], total: 0 });
  });

  it('creates a task', () => {
    const dto = { admissionId: 'adm-1', taskType: 'Vitals Check', description: 'Q4H vitals' };
    service.createTask(dto).subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/nursing/tasks');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({});
  });

  it('starts, completes, and cancels a task', () => {
    service.startTask('t1').subscribe();
    httpMock.expectOne('https://gateway.example/api/nursing/tasks/t1/start').flush({});

    service.completeTask('t1').subscribe();
    httpMock.expectOne('https://gateway.example/api/nursing/tasks/t1/complete').flush({});

    service.cancelTask('t1').subscribe();
    httpMock.expectOne('https://gateway.example/api/nursing/tasks/t1/cancel').flush({});
  });

  it('creates a medication administration and administers/skips it', () => {
    const dto = { admissionId: 'adm-1', drugName: 'Paracetamol', dose: '500mg' };
    service.createAdministration(dto).subscribe();
    const createReq = httpMock.expectOne('https://gateway.example/api/nursing/administrations');
    expect(createReq.request.body).toEqual(dto);
    createReq.flush({});

    service.administer('a1').subscribe();
    httpMock.expectOne('https://gateway.example/api/nursing/administrations/a1/administer').flush({});

    service.skipAdministration('a1', 'Patient refused').subscribe();
    const skipReq = httpMock.expectOne('https://gateway.example/api/nursing/administrations/a1/skip');
    expect(skipReq.request.body).toEqual({ notes: 'Patient refused' });
    skipReq.flush({});
  });
});
