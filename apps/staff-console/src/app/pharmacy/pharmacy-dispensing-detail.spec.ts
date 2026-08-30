import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ConfirmationService, Confirmation } from 'primeng/api';
import { AuthService } from '@org/auth';
import { PharmacyDispensingDetail } from './pharmacy-dispensing-detail.js';
import { PharmacyDispensingApiService } from './pharmacy-dispensing-api.service.js';
import { PharmacyDispensing } from './pharmacy-dispensing.model.js';

describe('PharmacyDispensingDetail', () => {
  const dispensing: PharmacyDispensing = {
    id: 'disp-1',
    orderItemId: 'order-1',
    inventoryItemId: 'inv-1',
    dispensingNumber: 'PH-2026-0001',
    quantity: '2',
    status: 'Pending',
    dispensedBy: null,
    dispensedAt: null,
    cancelReason: null,
    reversedBy: null,
    reversedAt: null,
    reversalReason: null,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  };

  function setup() {
    const pharmacyApi = {
      getById: jest.fn().mockReturnValue(of(dispensing)),
      dispense: jest
        .fn()
        .mockReturnValue(
          of({ ...dispensing, status: 'Dispensed', dispensedBy: 'user-1', dispensedAt: '2026-08-02T00:00:00Z' }),
        ),
      cancel: jest.fn().mockReturnValue(of({ ...dispensing, status: 'Cancelled', cancelReason: 'Wrong item' })),
      reverse: jest.fn().mockReturnValue(
        of({ ...dispensing, status: 'Reversed', reversalReason: 'Dispensed to wrong patient', reversedAt: '2026-08-03T00:00:00Z' }),
      ),
    } as unknown as PharmacyDispensingApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;
    const activatedRoute = { paramMap: of(convertToParamMap({ id: 'disp-1' })) } as unknown as ActivatedRoute;

    TestBed.configureTestingModule({
      imports: [PharmacyDispensingDetail],
      providers: [
        provideRouter([]),
        { provide: PharmacyDispensingApiService, useValue: pharmacyApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    });

    const fixture = TestBed.createComponent(PharmacyDispensingDetail);
    // PharmacyDispensingDetail self-provides ConfirmationService (component-level, like
    // MessageService), so spy on the real instance and auto-accept — no <p-confirmDialog> is
    // rendered in these component tests.
    const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    jest.spyOn(confirmationService, 'confirm').mockImplementation((c: Confirmation) => {
      c.accept?.();
      return confirmationService;
    });
    return { fixture, pharmacyApi, confirmationService };
  }

  it('loads the dispensing record on init', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.dispensing()).toEqual(dispensing);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('clears the loading flag when the initial load errors', async () => {
    const pharmacyApi = {
      getById: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
    } as unknown as PharmacyDispensingApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;
    const activatedRoute = { paramMap: of(convertToParamMap({ id: 'disp-1' })) } as unknown as ActivatedRoute;
    TestBed.configureTestingModule({
      imports: [PharmacyDispensingDetail],
      providers: [
        provideRouter([]),
        { provide: PharmacyDispensingApiService, useValue: pharmacyApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    });
    const fixture = TestBed.createComponent(PharmacyDispensingDetail);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('confirms before dispensing, via the dispense endpoint, and updates status', async () => {
    const { fixture, pharmacyApi, confirmationService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.dispenseDrug();

    expect(confirmationService.confirm).toHaveBeenCalled();
    expect(pharmacyApi.dispense).toHaveBeenCalledWith('disp-1');
    expect(fixture.componentInstance.dispensing()?.status).toBe('Dispensed');
  });

  it('cancels a pending dispensing with a reason', async () => {
    const { fixture, pharmacyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCancelModal();
    fixture.componentInstance.cancelReason.set('Wrong item');
    fixture.componentInstance.confirmCancel();
    await fixture.whenStable();

    expect(pharmacyApi.cancel).toHaveBeenCalledWith('disp-1', 'Wrong item');
    expect(fixture.componentInstance.dispensing()?.status).toBe('Cancelled');
    expect(fixture.componentInstance.showCancelModal()).toBe(false);
  });

  it('reverses a dispensed record, requiring a reason', async () => {
    const { fixture, pharmacyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.dispensing.set({ ...dispensing, status: 'Dispensed' });

    fixture.componentInstance.openReverseModal();
    fixture.componentInstance.confirmReverse();
    expect(pharmacyApi.reverse).not.toHaveBeenCalled();

    fixture.componentInstance.reversalReason.set('Dispensed to wrong patient');
    fixture.componentInstance.confirmReverse();
    await fixture.whenStable();

    expect(pharmacyApi.reverse).toHaveBeenCalledWith('disp-1', 'Dispensed to wrong patient');
    expect(fixture.componentInstance.dispensing()?.status).toBe('Reversed');
    expect(fixture.componentInstance.showReverseModal()).toBe(false);
  });

  it('clears the dispensing flag when dispense errors', async () => {
    const { fixture, pharmacyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (pharmacyApi.dispense as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.dispenseDrug();

    expect(fixture.componentInstance.dispensingInProgress()).toBe(false);
  });

  it('does not dispense a record that is not Pending', async () => {
    const { fixture, pharmacyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.dispensing.set({ ...dispensing, status: 'Dispensed' });
    fixture.componentInstance.dispenseDrug();

    expect(pharmacyApi.dispense).not.toHaveBeenCalled();
  });
});
