import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuthService } from '@org/auth';
import { ApiError } from '@org/api-client';
import { SsuList } from './ssu-list.js';
import { SsuApiService } from './ssu-api.service.js';
import { PatientsApiService, Patient } from '../patients/patients-api.service.js';
import { SsuCase } from './ssu.model.js';
import { DirectoryResolverService } from '../directory/directory-resolver.service.js';

describe('SsuList', () => {
  const sampleCases: SsuCase[] = [
    {
      id: 'case-1',
      caseNumber: 'SSU-0001',
      patientId: 'patient-1',
      caseType: 'Charity Care',
      eligibilityNotes: 'Low income',
      subsidyPercent: 50,
      status: 'Open',
      appliedBy: 'user-1',
      approvedBy: null,
      approvedAt: null,
      decisionNotes: null,
      createdAt: '2026-08-24T10:00:00Z',
    },
    {
      id: 'case-2',
      caseNumber: 'SSU-0002',
      patientId: 'patient-2',
      caseType: 'Subsidized Surgery',
      eligibilityNotes: 'Govt aid',
      subsidyPercent: 100,
      status: 'Approved',
      appliedBy: 'user-1',
      approvedBy: 'admin-1',
      approvedAt: '2026-08-24T11:00:00Z',
      decisionNotes: 'Approved full subsidy',
      createdAt: '2026-08-24T09:00:00Z',
    },
    {
      id: 'case-3',
      caseNumber: 'SSU-0003',
      patientId: 'patient-3',
      caseType: 'Elderly Support',
      eligibilityNotes: null,
      subsidyPercent: 25,
      status: 'Rejected',
      appliedBy: 'user-1',
      approvedBy: 'admin-1',
      approvedAt: '2026-08-24T11:30:00Z',
      decisionNotes: 'Missing proof of income',
      createdAt: '2026-08-24T08:00:00Z',
    },
    {
      id: 'case-4',
      caseNumber: 'SSU-0004',
      patientId: 'patient-4',
      caseType: 'Dialysis Subsidy',
      eligibilityNotes: null,
      subsidyPercent: 75,
      status: 'Closed',
      appliedBy: 'user-1',
      approvedBy: 'admin-1',
      approvedAt: '2026-08-24T12:00:00Z',
      decisionNotes: 'Treatment completed',
      createdAt: '2026-08-24T07:00:00Z',
    },
  ];

  const samplePatient: Patient = {
    id: 'patient-1',
    patientNo: 'PAT-001',
    firstName: 'Jane',
    lastName: 'Doe',
    gender: 'Female',
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  function setup() {
    const api = {
      listCases: jest.fn().mockReturnValue(
        of({
          data: sampleCases,
          meta: { total: sampleCases.length, page: 1, limit: 20, totalPages: 1 },
        }),
      ),
      createCase: jest.fn().mockReturnValue(of(sampleCases[0])),
      approveCase: jest.fn().mockReturnValue(of({ ...sampleCases[0], status: 'Approved' })),
      rejectCase: jest.fn().mockReturnValue(of({ ...sampleCases[0], status: 'Rejected' })),
      closeCase: jest.fn().mockReturnValue(of({ ...sampleCases[1], status: 'Closed' })),
    } as unknown as SsuApiService;

    const patientsApi = {
      search: jest.fn().mockReturnValue(of({ data: [samplePatient], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } })),
      getById: jest.fn().mockReturnValue(of(samplePatient)),
    } as unknown as PatientsApiService;

    const messageService = { add: jest.fn() } as unknown as MessageService;

    const auth = {
      hasPermission: jest.fn().mockReturnValue(true),
      currentUser: jest.fn().mockReturnValue({ sub: 'user-1' }),
    } as unknown as AuthService;

    const directoryResolver = { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService;

    TestBed.configureTestingModule({
      imports: [SsuList],
      providers: [
        { provide: SsuApiService, useValue: api },
        { provide: PatientsApiService, useValue: patientsApi },
        { provide: MessageService, useValue: messageService },
        { provide: AuthService, useValue: auth },
        { provide: DirectoryResolverService, useValue: directoryResolver },
      ],
    });

    const fixture = TestBed.createComponent(SsuList);
    return { fixture, api, patientsApi, messageService, auth };
  }

  it('loads cases on init with pagination defaults', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.listCases).toHaveBeenCalledWith({
      patientId: undefined,
      status: undefined,
      page: 1,
      limit: 20,
    });
    expect(fixture.componentInstance.cases().length).toBe(4);
    expect(fixture.componentInstance.totalRecords()).toBe(4);
  });

  it('filters cases by status and patient', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.patientFilter.set('patient-1');
    fixture.componentInstance.statusFilter.set('Open');
    fixture.componentInstance.applyFilters();
    await fixture.whenStable();

    expect(api.listCases).toHaveBeenCalledWith({
      patientId: 'patient-1',
      status: 'Open',
      page: 1,
      limit: 20,
    });
  });

  it('searches and selects a patient in the create modal', async () => {
    const { fixture, patientsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCreateModal();
    expect(fixture.componentInstance.showCreateModal()).toBe(true);

    fixture.componentInstance.patientSearchQuery.set('Jane');
    fixture.componentInstance.searchPatients();
    await fixture.whenStable();

    expect(patientsApi.search).toHaveBeenCalledWith({ page: 1, limit: 10, q: 'Jane' });
    expect(fixture.componentInstance.patientResults()).toEqual([samplePatient]);

    fixture.componentInstance.selectPatient(samplePatient);
    expect(fixture.componentInstance.selectedPatient()).toEqual(samplePatient);
    expect(fixture.componentInstance.createForm().patientId).toBe('patient-1');
    expect(fixture.componentInstance.patientResults().length).toBe(0);
  });

  it('creates an SSU case and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCreateModal();
    fixture.componentInstance.createForm.set({
      patientId: 'patient-1',
      caseType: 'Charity Care',
      subsidyPercent: 50,
      eligibilityNotes: 'BPL card verified',
    });
    fixture.componentInstance.submitCreate();
    await fixture.whenStable();

    expect(api.createCase).toHaveBeenCalledWith({
      patientId: 'patient-1',
      caseType: 'Charity Care',
      subsidyPercent: 50,
      eligibilityNotes: 'BPL card verified',
    });
    expect(fixture.componentInstance.showCreateModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'SSU Case Created',
        detail: 'Case SSU-0001 created successfully.',
      }),
    );
  });

  it('handles error when creating a case fails', async () => {
    const { fixture, api } = setup();
    (api.createCase as jest.Mock).mockReturnValue(
      throwError(() => ({ message: 'Patient not found' } as ApiError)),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCreateModal();
    fixture.componentInstance.createForm.set({
      patientId: 'invalid-id',
      caseType: 'Charity',
      subsidyPercent: 10,
    });
    fixture.componentInstance.submitCreate();
    await fixture.whenStable();

    expect(fixture.componentInstance.createError()).toBe('Patient not found');
    expect(fixture.componentInstance.showCreateModal()).toBe(true);
  });

  it('approves an Open case with decision notes', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openApproveModal(sampleCases[0]);
    expect(fixture.componentInstance.showApproveModal()).toBe(true);
    expect(fixture.componentInstance.targetCase()).toEqual(sampleCases[0]);

    fixture.componentInstance.approveNotes.set('Income verified by social worker');
    fixture.componentInstance.confirmApprove();
    await fixture.whenStable();

    expect(api.approveCase).toHaveBeenCalledWith('case-1', {
      decisionNotes: 'Income verified by social worker',
    });
    expect(fixture.componentInstance.showApproveModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Case Approved',
      }),
    );
  });

  it('rejects an Open case with required decision notes', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openRejectModal(sampleCases[0]);
    expect(fixture.componentInstance.showRejectModal()).toBe(true);

    fixture.componentInstance.rejectNotes.set('Does not meet poverty criteria');
    fixture.componentInstance.confirmReject();
    await fixture.whenStable();

    expect(api.rejectCase).toHaveBeenCalledWith('case-1', {
      decisionNotes: 'Does not meet poverty criteria',
    });
    expect(fixture.componentInstance.showRejectModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Case Rejected',
      }),
    );
  });

  it('closes an Approved/Rejected case via confirmation dialog', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCloseModal(sampleCases[1]);
    expect(fixture.componentInstance.showCloseModal()).toBe(true);
    expect(fixture.componentInstance.targetCase()).toEqual(sampleCases[1]);

    fixture.componentInstance.confirmClose();
    await fixture.whenStable();

    expect(api.closeCase).toHaveBeenCalledWith('case-2');
    expect(fixture.componentInstance.showCloseModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Case Closed',
      }),
    );
  });
});
