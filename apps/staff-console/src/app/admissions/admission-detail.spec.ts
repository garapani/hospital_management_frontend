import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { ApiError } from '@org/api-client';
import { AdmissionDetail } from './admission-detail.js';
import { AdmissionsApiService, Admission, DischargeSummary } from './admissions-api.service.js';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';
import { DirectoryResolverService } from '../directory/directory-resolver.service.js';

describe('AdmissionDetail', () => {
  const admission: Admission = {
    id: 'admission-1',
    patientId: 'patient-1',
    admissionSource: 'ER',
    sourceAppointmentId: null,
    sourceTriageEntryId: null,
    admittingDoctorId: 'doctor-1',
    wardId: 'ward-1',
    bedId: 'bed-1',
    admissionDate: '2026-08-12T10:00:00Z',
    status: 'Admitted',
    dischargeDate: null,
    dischargeType: null,
    dischargeCondition: null,
    dischargeSummary: null,
    dischargedBy: null,
    createdAt: '2026-08-12T10:00:00Z',
    updatedAt: '2026-08-12T10:00:00Z',
  };

  const summary: DischargeSummary = {
    id: 'summary-1',
    admissionId: 'admission-1',
    patientId: 'patient-1',
    primaryDiagnosis: 'Pneumonia',
    secondaryDiagnoses: [],
    proceduresPerformed: [],
    hospitalCourse: null,
    dischargeMedications: null,
    followUpInstructions: null,
    warningSigns: null,
    activityRestrictions: null,
    followUpAppointmentDate: null,
    followUpDoctorId: null,
    dietRecommendations: null,
    additionalNotes: null,
    preparedBy: 'doctor-1',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-08-12T12:00:00Z',
    updatedAt: '2026-08-12T12:00:00Z',
  };

  function setup(options: { summaryReturns?: unknown } = {}) {
    const admissionsApi = {
      getById: jest.fn().mockReturnValue(of(admission)),
      getDischargeSummaryByAdmission: jest.fn().mockReturnValue(options.summaryReturns ?? of(summary)),
      transfer: jest.fn().mockReturnValue(of({ ...admission, bedId: 'bed-2', wardId: 'ward-2' })),
      discharge: jest.fn().mockReturnValue(of({ ...admission, status: 'Discharged', dischargeDate: '2026-08-13T00:00:00Z' })),
      createDischargeSummary: jest.fn().mockReturnValue(of(summary)),
      reviewDischargeSummary: jest.fn().mockReturnValue(of({ ...summary, reviewedBy: 'user-1', reviewedAt: '2026-08-13T00:00:00Z' })),
    } as unknown as AdmissionsApiService;
    const auth = { hasPermission: () => true, currentUser: () => ({ sub: 'user-1' }) } as unknown as AuthService;
    const activatedRoute = { paramMap: of(convertToParamMap({ id: 'admission-1' })) } as unknown as ActivatedRoute;
    const masterDataApi = {
      listWards: jest.fn().mockReturnValue(of([{ id: 'ward-1', wardName: 'ICU', isActive: true }, { id: 'ward-2', wardName: 'General', isActive: true }])),
      listBedsByWard: jest.fn().mockReturnValue(of([{ id: 'bed-2', wardId: 'ward-2', bedNumber: '2', status: 'Available', isActive: true }])),
    } as unknown as MasterDataApiService;
    const directoryResolver = { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService;

    TestBed.configureTestingModule({
      imports: [AdmissionDetail],
      providers: [
        provideRouter([]),
        { provide: AdmissionsApiService, useValue: admissionsApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: MasterDataApiService, useValue: masterDataApi },
        { provide: DirectoryResolverService, useValue: directoryResolver },
      ],
    });

    const fixture = TestBed.createComponent(AdmissionDetail);
    return { fixture, admissionsApi, masterDataApi, directoryResolver };
  }

  it('loads the admission and its discharge summary', async () => {
    const { fixture, admissionsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.admission()).toEqual(admission);
    expect(admissionsApi.getDischargeSummaryByAdmission).toHaveBeenCalledWith('admission-1');
    expect(fixture.componentInstance.summary()).toEqual(summary);
  });

  it('marks the summary as missing when the by-admission lookup returns 404', async () => {
    const { fixture } = setup({ summaryReturns: throwError(() => ({ status: 404, message: 'Not found' } as ApiError)) });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.summaryMissing()).toBe(true);
    expect(fixture.componentInstance.summary()).toBeNull();
  });

  it('clears the loading flag and marks not found when the admission lookup errors with 404', async () => {
    const admissionsApi = {
      getById: jest.fn().mockReturnValue(throwError(() => ({ status: 404, message: 'Not found' } as ApiError))),
    } as unknown as AdmissionsApiService;
    const auth = { hasPermission: () => true, currentUser: () => ({ sub: 'user-1' }) } as unknown as AuthService;
    const activatedRoute = { paramMap: of(convertToParamMap({ id: 'admission-1' })) } as unknown as ActivatedRoute;
    const masterDataApi = {
      listWards: jest.fn().mockReturnValue(of([])),
      listBedsByWard: jest.fn().mockReturnValue(of([])),
    } as unknown as MasterDataApiService;
    const directoryResolver = { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService;

    TestBed.configureTestingModule({
      imports: [AdmissionDetail],
      providers: [
        provideRouter([]),
        { provide: AdmissionsApiService, useValue: admissionsApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: MasterDataApiService, useValue: masterDataApi },
        { provide: DirectoryResolverService, useValue: directoryResolver },
      ],
    });
    const fixture = TestBed.createComponent(AdmissionDetail);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.notFound()).toBe(true);
  });

  it('transfers the admission to a new bed', async () => {
    const { fixture, admissionsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.toBedId.set('bed-2');
    fixture.componentInstance.confirmTransfer();

    expect(admissionsApi.transfer).toHaveBeenCalledWith(
      'admission-1',
      expect.objectContaining({ toBedId: 'bed-2', transferredBy: 'user-1' }),
    );
    expect(fixture.componentInstance.admission()?.bedId).toBe('bed-2');
    expect(fixture.componentInstance.showTransferModal()).toBe(false);
  });

  it('resolves patient/doctor/ward/bed names for display instead of leaving raw UUIDs on screen', async () => {
    const { fixture, directoryResolver } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(directoryResolver.resolve).toHaveBeenCalledWith('patient', 'patient-1');
    expect(directoryResolver.resolve).toHaveBeenCalledWith('doctor', 'doctor-1');
    expect(directoryResolver.resolve).toHaveBeenCalledWith('ward', 'ward-1');
    expect(directoryResolver.resolve).toHaveBeenCalledWith('bed', 'bed-1');
  });

  it('opens the transfer modal defaulted to the current ward, and reloads beds when the ward changes', async () => {
    const { fixture, masterDataApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openTransferModal();
    await fixture.whenStable();

    expect(masterDataApi.listWards).toHaveBeenCalled();
    expect(fixture.componentInstance.transferWardId()).toBe('ward-1');
    expect(masterDataApi.listBedsByWard).toHaveBeenCalledWith('ward-1');

    fixture.componentInstance.selectTransferWard('ward-2');
    await fixture.whenStable();

    expect(masterDataApi.listBedsByWard).toHaveBeenCalledWith('ward-2');
    expect(fixture.componentInstance.transferBeds()).toEqual([
      { id: 'bed-2', wardId: 'ward-2', bedNumber: '2', status: 'Available', isActive: true },
    ]);
    // Switching ward clears any bed picked under the previous ward.
    expect(fixture.componentInstance.toBedId()).toBe('');
  });

  it('clears the transferring flag and keeps the modal open when transfer errors', async () => {
    const { fixture, admissionsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (admissionsApi.transfer as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.toBedId.set('bed-2');
    fixture.componentInstance.showTransferModal.set(true);
    fixture.componentInstance.confirmTransfer();

    expect(fixture.componentInstance.transferring()).toBe(false);
    expect(fixture.componentInstance.showTransferModal()).toBe(true);
  });

  it('discharges the admission', async () => {
    const { fixture, admissionsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.dischargeType.set('Recovered');
    fixture.componentInstance.dischargeCondition.set('Stable');
    fixture.componentInstance.confirmDischarge();

    expect(admissionsApi.discharge).toHaveBeenCalledWith(
      'admission-1',
      expect.objectContaining({ dischargeType: 'Recovered', dischargeCondition: 'Stable', dischargedBy: 'user-1' }),
    );
    expect(fixture.componentInstance.admission()?.status).toBe('Discharged');
    expect(fixture.componentInstance.showDischargeModal()).toBe(false);
  });

  it('creates a discharge summary for the admission', async () => {
    const { fixture, admissionsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.summaryForm.set({ primaryDiagnosis: 'Pneumonia', hospitalCourse: 'Uneventful', preparedBy: 'user-1' });
    fixture.componentInstance.submitSummary();

    expect(admissionsApi.createDischargeSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        admissionId: 'admission-1',
        patientId: 'patient-1',
        primaryDiagnosis: 'Pneumonia',
        preparedBy: 'user-1',
      }),
    );
    expect(fixture.componentInstance.summary()).toEqual(summary);
    expect(fixture.componentInstance.showSummaryForm()).toBe(false);
  });

  it('reviews the discharge summary', async () => {
    const { fixture, admissionsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.reviewSummary();

    expect(admissionsApi.reviewDischargeSummary).toHaveBeenCalledWith('summary-1', 'user-1');
    expect(fixture.componentInstance.summary()?.reviewedBy).toBe('user-1');
    expect(fixture.componentInstance.reviewing()).toBe(false);
  });
});
