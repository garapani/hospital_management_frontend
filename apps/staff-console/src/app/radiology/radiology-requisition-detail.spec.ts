import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ConfirmationService, Confirmation } from 'primeng/api';
import { AuthService } from '@org/auth';
import { RadiologyRequisitionDetail } from './radiology-requisition-detail.js';
import { RadiologyApiService } from './radiology-api.service.js';
import { RadiologyRequisition } from './radiology.model.js';
import { DirectoryResolverService } from '../directory/directory-resolver.service.js';

const directoryResolverProvider = {
  provide: DirectoryResolverService,
  useValue: { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService,
};

function autoAcceptConfirms(fixture: { debugElement: { injector: { get(token: unknown): ConfirmationService } } }) {
  const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
  jest.spyOn(confirmationService, 'confirm').mockImplementation((c: Confirmation) => {
    c.accept?.();
    return confirmationService;
  });
}

describe('RadiologyRequisitionDetail', () => {
  const requisition: RadiologyRequisition = {
    id: 'rad-1',
    orderItemId: 'order-item-1',
    patientId: 'patient-1',
    imagingItemId: 'img-item-1',
    requisitionNumber: 'RR-2026-0001',
    status: 'Scanned',
    scannedBy: 'account-2',
    scannedAt: '2026-08-12T10:00:00Z',
    reportText: null,
    indication: null,
    performerId: null,
    reportEnteredBy: null,
    reportEnteredAt: null,
    verifiedBy: null,
    verifiedAt: null,
    cancelReason: null,
    createdAt: '2026-08-12T09:00:00Z',
    updatedAt: '2026-08-12T10:00:00Z',
  };

  function setup() {
    const radiologyApi = {
      getById: jest.fn().mockReturnValue(of(requisition)),
      markScanned: jest.fn().mockReturnValue(of({ ...requisition, status: 'Scanned' })),
      enterReport: jest
        .fn()
        .mockReturnValue(of({ ...requisition, status: 'ReportEntered', reportText: 'Normal study' })),
      verify: jest.fn().mockReturnValue(of({ ...requisition, status: 'Verified' })),
      cancel: jest.fn().mockReturnValue(of({ ...requisition, status: 'Cancelled', cancelReason: 'Duplicate' })),
      getRequisitionLabelPdf: jest.fn().mockReturnValue(of(new Blob(['%PDF-fake'], { type: 'application/pdf' }))),
      getReportPdf: jest.fn().mockReturnValue(of(new Blob(['%PDF-fake'], { type: 'application/pdf' }))),
    } as unknown as RadiologyApiService;
    const auth = {
      hasPermission: () => true,
      currentUser: () => ({ sub: 'account-1' }),
    } as unknown as AuthService;
    const activatedRoute = { paramMap: of(convertToParamMap({ id: 'rad-1' })) } as unknown as ActivatedRoute;

    TestBed.configureTestingModule({
      imports: [RadiologyRequisitionDetail],
      providers: [
        provideRouter([]),
        { provide: RadiologyApiService, useValue: radiologyApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
        directoryResolverProvider,
      ],
    });

    const fixture = TestBed.createComponent(RadiologyRequisitionDetail);
    autoAcceptConfirms(fixture);
    return { fixture, radiologyApi };
  }

  it('loads the requisition on init', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.requisition()).toEqual(requisition);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('clears the loading flag when the initial load errors', async () => {
    const radiologyApi = {
      getById: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
    } as unknown as RadiologyApiService;
    const auth = { hasPermission: () => true, currentUser: () => ({ sub: 'account-1' }) } as unknown as AuthService;
    const activatedRoute = { paramMap: of(convertToParamMap({ id: 'rad-1' })) } as unknown as ActivatedRoute;
    TestBed.configureTestingModule({
      imports: [RadiologyRequisitionDetail],
      providers: [
        provideRouter([]),
        { provide: RadiologyApiService, useValue: radiologyApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
        directoryResolverProvider,
      ],
    });
    const fixture = TestBed.createComponent(RadiologyRequisitionDetail);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('marks the requisition scanned', async () => {
    const { fixture, radiologyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.markScanned();

    expect(radiologyApi.markScanned).toHaveBeenCalledWith('rad-1');
  });

  it('submits a report with reportText and reportEnteredBy from the current user', async () => {
    const { fixture, radiologyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openReportModal();
    fixture.componentInstance.reportText.set('Normal chest X-ray');
    fixture.componentInstance.submitReport();

    expect(radiologyApi.enterReport).toHaveBeenCalledWith('rad-1', {
      reportText: 'Normal chest X-ray',
      indication: undefined,
      reportEnteredBy: 'account-1',
    });
    expect(fixture.componentInstance.showReportModal()).toBe(false);
    expect(fixture.componentInstance.requisition()?.status).toBe('ReportEntered');
  });

  it('does not submit a report when reportText is empty', async () => {
    const { fixture, radiologyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openReportModal();
    fixture.componentInstance.submitReport();

    expect(radiologyApi.enterReport).not.toHaveBeenCalled();
  });

  it('clears the action loading flag and keeps the modal open when the report errors', async () => {
    const { fixture, radiologyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (radiologyApi.enterReport as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.openReportModal();
    fixture.componentInstance.reportText.set('Normal study');
    fixture.componentInstance.submitReport();

    expect(fixture.componentInstance.actionLoading()).toBe(false);
    expect(fixture.componentInstance.showReportModal()).toBe(true);
  });

  it('confirms before verifying the requisition', async () => {
    const { fixture, radiologyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    const confirmationService = fixture.debugElement.injector.get(ConfirmationService);

    fixture.componentInstance.verify();

    expect(confirmationService.confirm).toHaveBeenCalled();
    expect(radiologyApi.verify).toHaveBeenCalledWith('rad-1');
    expect(fixture.componentInstance.requisition()?.status).toBe('Verified');
  });

  it('cancels the requisition with a reason and closes the modal', async () => {
    const { fixture, radiologyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.cancelReason.set('Duplicate order');
    fixture.componentInstance.confirmCancel();

    expect(radiologyApi.cancel).toHaveBeenCalledWith('rad-1', 'Duplicate order');
    expect(fixture.componentInstance.showCancelModal()).toBe(false);
    expect(fixture.componentInstance.requisition()?.status).toBe('Cancelled');
  });

  it('clears the action loading flag when an action errors', async () => {
    const { fixture, radiologyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (radiologyApi.markScanned as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.markScanned();

    expect(fixture.componentInstance.actionLoading()).toBe(false);
  });

  describe('printRequisitionLabel', () => {
    let openSpy: jest.SpyInstance;

    beforeEach(() => {
      URL.createObjectURL = jest.fn().mockReturnValue('blob:fake-url');
      URL.revokeObjectURL = jest.fn();
      openSpy = jest.spyOn(window, 'open').mockReturnValue(null);
    });

    afterEach(() => openSpy.mockRestore());

    it('fetches the requisition label and opens it in a new tab', async () => {
      const { fixture, radiologyApi } = setup();
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance.printRequisitionLabel();
      await fixture.whenStable();

      expect(radiologyApi.getRequisitionLabelPdf).toHaveBeenCalledWith('rad-1');
      expect(openSpy).toHaveBeenCalledWith('blob:fake-url', '_blank');
      expect(fixture.componentInstance.printingLabel()).toBe(false);
    });

    it('toasts an error and clears loading when generating the label fails', async () => {
      const { fixture, radiologyApi } = setup();
      fixture.detectChanges();
      await fixture.whenStable();
      (radiologyApi.getRequisitionLabelPdf as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

      fixture.componentInstance.printRequisitionLabel();
      await fixture.whenStable();

      expect(fixture.componentInstance.printingLabel()).toBe(false);
      expect(openSpy).not.toHaveBeenCalled();
    });
  });

  describe('printReport', () => {
    let openSpy: jest.SpyInstance;

    beforeEach(() => {
      URL.createObjectURL = jest.fn().mockReturnValue('blob:fake-url');
      URL.revokeObjectURL = jest.fn();
      openSpy = jest.spyOn(window, 'open').mockReturnValue(null);
    });

    afterEach(() => openSpy.mockRestore());

    it('fetches the report and opens it in a new tab', async () => {
      const { fixture, radiologyApi } = setup();
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance.printReport();
      await fixture.whenStable();

      expect(radiologyApi.getReportPdf).toHaveBeenCalledWith('rad-1');
      expect(openSpy).toHaveBeenCalledWith('blob:fake-url', '_blank');
      expect(fixture.componentInstance.printingReport()).toBe(false);
    });

    it('toasts an error and clears loading when generating the report fails', async () => {
      const { fixture, radiologyApi } = setup();
      fixture.detectChanges();
      await fixture.whenStable();
      (radiologyApi.getReportPdf as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

      fixture.componentInstance.printReport();
      await fixture.whenStable();

      expect(fixture.componentInstance.printingReport()).toBe(false);
      expect(openSpy).not.toHaveBeenCalled();
    });
  });
});
