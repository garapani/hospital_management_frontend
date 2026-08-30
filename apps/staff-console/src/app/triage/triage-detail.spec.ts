import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@org/auth';
import { TriageDetail } from './triage-detail.js';
import { TriageApiService, TriageEntry } from './triage-api.service.js';

describe('TriageDetail', () => {
  const entry: TriageEntry = {
    id: 'entry-1',
    patientId: null,
    firstName: 'Jane',
    lastName: 'Doe',
    gender: 'Female',
    estimatedAge: '30',
    arrivalMode: 'Walk-in',
    broughtBy: null,
    isPoliceCase: false,
    chiefComplaint: 'Chest pain',
    acuityLevel: null,
    colorCode: null,
    triagedBy: null,
    triagedAt: null,
    status: 'Arrived',
    dischargeRemarks: null,
    createdAt: '2026-08-12T00:00:00Z',
    updatedAt: '2026-08-12T00:00:00Z',
  };

  function setup() {
    const triageApi = {
      findOne: jest.fn().mockReturnValue(of(entry)),
      update: jest.fn().mockReturnValue(of({ ...entry, status: 'Triaged', acuityLevel: 2, colorCode: 'Orange' })),
      linkPatient: jest.fn().mockReturnValue(of({ ...entry, patientId: 'patient-1' })),
    } as unknown as TriageApiService;
    const auth = { hasPermission: () => true, currentUser: () => ({ sub: 'account-1' }) } as unknown as AuthService;
    const activatedRoute = { paramMap: of(convertToParamMap({ id: 'entry-1' })) } as unknown as ActivatedRoute;

    TestBed.configureTestingModule({
      imports: [TriageDetail],
      providers: [
        provideRouter([]),
        { provide: TriageApiService, useValue: triageApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    });

    const fixture = TestBed.createComponent(TriageDetail);
    return { fixture, triageApi };
  }

  it('loads the triage entry and seeds the assessment form from it', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.entry()).toEqual(entry);
    expect(fixture.componentInstance.status()).toBe('Arrived');
  });

  it('saves the assessment with the current user as triagedBy', async () => {
    const { fixture, triageApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.acuityLevel.set(2);
    fixture.componentInstance.colorCode.set('Orange');
    fixture.componentInstance.status.set('Triaged');
    fixture.componentInstance.saveAssessment();

    expect(triageApi.update).toHaveBeenCalledWith(
      'entry-1',
      expect.objectContaining({ acuityLevel: 2, colorCode: 'Orange', status: 'Triaged', triagedBy: 'account-1' }),
    );
    expect(fixture.componentInstance.entry()?.status).toBe('Triaged');
  });

  it('does not overwrite triagedAt/triagedBy on a later edit of an already-triaged entry', async () => {
    const triagedEntry: TriageEntry = {
      ...entry,
      status: 'Triaged',
      acuityLevel: 2,
      colorCode: 'Orange',
      triagedBy: 'account-1',
      triagedAt: '2026-08-12T00:05:00Z',
    };
    const triageApi = {
      findOne: jest.fn().mockReturnValue(of(triagedEntry)),
      update: jest.fn().mockReturnValue(of({ ...triagedEntry, status: 'Discharged' })),
      linkPatient: jest.fn(),
    } as unknown as TriageApiService;
    const auth = { hasPermission: () => true, currentUser: () => ({ sub: 'account-2' }) } as unknown as AuthService;
    const activatedRoute = { paramMap: of(convertToParamMap({ id: 'entry-1' })) } as unknown as ActivatedRoute;
    TestBed.configureTestingModule({
      imports: [TriageDetail],
      providers: [
        provideRouter([]),
        { provide: TriageApiService, useValue: triageApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    });
    const fixture = TestBed.createComponent(TriageDetail);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.status.set('Discharged');
    fixture.componentInstance.saveAssessment();

    const payload = (triageApi.update as jest.Mock).mock.calls[0][1];
    expect(payload.triagedAt).toBeUndefined();
    expect(payload.triagedBy).toBeUndefined();
    expect(payload.status).toBe('Discharged');
  });

  it('links a patient and clears the input on success', async () => {
    const { fixture, triageApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.patientIdInput.set('patient-1');
    fixture.componentInstance.linkPatient();

    expect(triageApi.linkPatient).toHaveBeenCalledWith('entry-1', 'patient-1');
    expect(fixture.componentInstance.entry()?.patientId).toBe('patient-1');
    expect(fixture.componentInstance.patientIdInput()).toBe('');
  });
});
