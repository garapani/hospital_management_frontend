import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ConfirmationService, Confirmation } from 'primeng/api';
import { AuthService } from '@org/auth';
import { LabRequisitionDetail } from './lab-requisition-detail.js';
import { LabApiService, LabRequisition, LabTestComponent } from '../lab-api.service.js';

describe('LabRequisitionDetail', () => {
  const requisition: LabRequisition = {
    id: 'req-1',
    orderItemId: 'order-item-1',
    testId: 'test-1',
    requisitionNumber: 'LAB-0001',
    specimenType: 'Blood',
    status: 'Pending',
    sampleCollectedBy: null,
    sampleCollectedAt: null,
    verifiedBy: null,
    verifiedAt: null,
    cancelReason: null,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  };

  const components: LabTestComponent[] = [
    {
      id: 'comp-1',
      testId: 'test-1',
      name: 'Hemoglobin',
      unit: 'g/dL',
      referenceRangeLow: '12',
      referenceRangeHigh: '16',
      referenceRangeText: null,
      displaySequence: 1,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'comp-2',
      testId: 'test-1',
      name: 'COVID Antibody',
      unit: null,
      referenceRangeLow: null,
      referenceRangeHigh: null,
      referenceRangeText: 'Negative',
      displaySequence: 2,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
  ];

  function setup(labApiOverrides: Partial<LabApiService> = {}) {
    const labApi = {
      getRequisition: jest.fn().mockReturnValue(of(requisition)),
      listComponentsByTest: jest.fn().mockReturnValue(of(components)),
      collectSample: jest.fn().mockReturnValue(of({ ...requisition, status: 'SampleCollected' })),
      enterResult: jest.fn().mockReturnValue(of({ id: 'res-1', requisitionId: 'req-1', componentId: 'comp-1', value: '13.5', isAbnormal: false, enteredBy: 'user-1', enteredAt: '2026-08-02T00:00:00Z' })),
      getResults: jest.fn().mockReturnValue(of([])),
      verify: jest.fn().mockReturnValue(of({ ...requisition, status: 'Verified' })),
      ...labApiOverrides,
    } as unknown as LabApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;
    const activatedRoute = { paramMap: of(convertToParamMap({ id: 'req-1' })) } as unknown as ActivatedRoute;

    TestBed.configureTestingModule({
      imports: [LabRequisitionDetail],
      providers: [
        provideRouter([]),
        { provide: LabApiService, useValue: labApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    });

    const fixture = TestBed.createComponent(LabRequisitionDetail);
    // LabRequisitionDetail self-provides ConfirmationService (component-level, like MessageService),
    // so a TestBed-level override wouldn't take effect — spy on the real instance instead and
    // auto-accept, since no <p-confirmDialog> is rendered in these component tests.
    const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    jest.spyOn(confirmationService, 'confirm').mockImplementation((c: Confirmation) => {
      c.accept?.();
      return confirmationService;
    });
    return { fixture, labApi, confirmationService };
  }

  it('loads the requisition on init', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.requisition()).toEqual(requisition);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('clears the loading flag when the initial load errors', async () => {
    const { fixture } = setup({
      getRequisition: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('collects a sample via the API and updates the requisition', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.collectSample();

    expect(labApi.collectSample).toHaveBeenCalledWith('req-1');
    expect(fixture.componentInstance.requisition()?.status).toBe('SampleCollected');
  });

  it('clears the collecting flag when collectSample errors', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (labApi.collectSample as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.collectSample();

    expect(fixture.componentInstance.collecting()).toBe(false);
  });

  it('loads the test components when the results dialog opens', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openResultsDialog();

    expect(labApi.listComponentsByTest).toHaveBeenCalledWith('test-1');
    expect(fixture.componentInstance.components()).toEqual(components);
    expect(fixture.componentInstance.showResultsDialog()).toBe(true);
  });

  it('saves one result per component and reloads the requisition', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openResultsDialog();
    fixture.componentInstance.setResultValue('comp-1', '13.5');
    fixture.componentInstance.setResultValue('comp-2', 'Negative');
    fixture.componentInstance.submitResults();

    expect(labApi.enterResult).toHaveBeenCalledTimes(2);
    expect(labApi.enterResult).toHaveBeenCalledWith('req-1', { componentId: 'comp-1', value: '13.5' });
    expect(labApi.enterResult).toHaveBeenCalledWith('req-1', { componentId: 'comp-2', value: 'Negative' });
    expect(fixture.componentInstance.showResultsDialog()).toBe(false);
    expect(fixture.componentInstance.enteringResults()).toBe(false);
    // Reloads the requisition after saving so the updated status is reflected.
    expect(labApi.getRequisition).toHaveBeenCalledTimes(2);
  });

  it('rejects saving when any component value is missing', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openResultsDialog();
    fixture.componentInstance.setResultValue('comp-1', '13.5');
    fixture.componentInstance.submitResults();

    expect(labApi.enterResult).not.toHaveBeenCalled();
    expect(fixture.componentInstance.resultsError()).toContain('every component');
    expect(fixture.componentInstance.showResultsDialog()).toBe(true);
  });

  it('clears the entering flag and keeps the dialog open when saving results errors', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (labApi.enterResult as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.openResultsDialog();
    fixture.componentInstance.setResultValue('comp-1', '13.5');
    fixture.componentInstance.setResultValue('comp-2', 'Negative');
    fixture.componentInstance.submitResults();

    expect(fixture.componentInstance.enteringResults()).toBe(false);
    expect(fixture.componentInstance.showResultsDialog()).toBe(true);
    expect(fixture.componentInstance.resultsError()).toContain('Failed');
  });

  it('verifies the requisition via the API and updates it', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.verify();

    expect(labApi.verify).toHaveBeenCalledWith('req-1');
    expect(fixture.componentInstance.requisition()?.status).toBe('Verified');
  });

  it('clears the verifying flag when verify errors', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (labApi.verify as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.verify();

    expect(fixture.componentInstance.verifying()).toBe(false);
  });
});
