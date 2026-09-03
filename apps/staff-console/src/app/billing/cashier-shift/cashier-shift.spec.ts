import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { CashierShiftComponent } from './cashier-shift.js';
import { CashierShift, CashierShiftApiService, ShiftReconciliation } from '../cashier-shift-api.service.js';

function fakeShift(overrides: Partial<CashierShift> = {}): CashierShift {
  return {
    id: 'shift-1',
    openedBy: 'account-1',
    openedAt: '2026-09-03T08:00:00Z',
    floatAmount: 1000,
    status: 'Open',
    closedBy: null,
    closedAt: null,
    cashDenominationCounts: null,
    cashDeclaredTotal: null,
    modeDeclaredTotals: null,
    notes: null,
    createdAt: '2026-09-03T08:00:00Z',
    updatedAt: '2026-09-03T08:00:00Z',
    ...overrides,
  };
}

function fakeAuth(canManage = true): AuthService {
  return { hasPermission: () => canManage } as unknown as AuthService;
}

function setup(opts: {
  current?: CashierShift | null;
  canManage?: boolean;
  historyItems?: CashierShift[];
} = {}) {
  const current = jest.fn().mockReturnValue(of(opts.current ?? null));
  const list = jest.fn().mockReturnValue(of({ data: opts.historyItems ?? [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }));
  const open = jest.fn().mockReturnValue(of(fakeShift()));
  const close = jest.fn().mockReturnValue(
    of({ shift: fakeShift({ status: 'Closed' }), modes: [] } as ShiftReconciliation),
  );
  const api = { current, list, open, close } as unknown as CashierShiftApiService;

  TestBed.configureTestingModule({
    imports: [CashierShiftComponent],
    providers: [
      { provide: CashierShiftApiService, useValue: api },
      { provide: AuthService, useValue: fakeAuth(opts.canManage ?? true) },
    ],
  });

  const fixture = TestBed.createComponent(CashierShiftComponent);
  return { fixture, api, current, list, open, close };
}

describe('CashierShiftComponent', () => {
  it('loads the current shift and shift history on init', async () => {
    const shift = fakeShift();
    const { fixture, current, list } = setup({ current: shift, historyItems: [shift] });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(current).toHaveBeenCalled();
    expect(list).toHaveBeenCalled();
    expect(fixture.componentInstance.currentShift()).toEqual(shift);
    expect(fixture.componentInstance.history()).toEqual([shift]);
  });

  it('opens a shift and refreshes state', async () => {
    const { fixture, open } = setup({ current: null });
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    component.openOpenModal();
    component.floatAmount.set(2000);
    component.submitOpen();
    await fixture.whenStable();

    expect(open).toHaveBeenCalledWith({ floatAmount: 2000, notes: undefined });
    expect(component.showOpenModal()).toBe(false);
    expect(component.currentShift()).not.toBeNull();
  });

  it('surfaces the backend error message when opening fails', async () => {
    const { fixture, api } = setup({ current: null });
    (api.open as jest.Mock).mockReturnValue(throwError(() => ({ message: 'Already has an open shift' })));
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    component.openOpenModal();
    component.floatAmount.set(2000);
    component.submitOpen();
    await fixture.whenStable();

    expect(component.opening()).toBe(false);
    expect(component.openError()).toBe('Already has an open shift');
    expect(component.showOpenModal()).toBe(true);
  });

  it('computes the counted cash total from denomination inputs', async () => {
    const { fixture } = setup({ current: fakeShift() });
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    component.openCloseModal();
    component.setDenominationCount(500, 2);
    component.setDenominationCount(100, 3);

    expect(component.cashCountedTotal()).toBe(1300); // 2*500 + 3*100
  });

  it('closes a shift, sending only the non-empty denomination/mode entries, and shows the reconciliation', async () => {
    const { fixture, close } = setup({ current: fakeShift() });
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    component.openCloseModal();
    component.setDenominationCount(500, 2);
    component.setDenominationCount(100, null);
    component.setModeTotal('Card', 500);
    component.submitClose();
    await fixture.whenStable();

    expect(close).toHaveBeenCalledWith('shift-1', {
      cashDenominationCounts: { '500': 2 },
      modeDeclaredTotals: { Card: 500 },
      notes: undefined,
    });
    expect(component.showCloseModal()).toBe(false);
    expect(component.currentShift()).toBeNull();
    expect(component.lastReconciliation()).not.toBeNull();
  });

  it('surfaces the backend error message when closing fails', async () => {
    const { fixture, api } = setup({ current: fakeShift() });
    (api.close as jest.Mock).mockReturnValue(throwError(() => ({ message: 'Unknown denomination: 30' })));
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    component.openCloseModal();
    component.submitClose();
    await fixture.whenStable();

    expect(component.closing()).toBe(false);
    expect(component.closeError()).toBe('Unknown denomination: 30');
    expect(component.showCloseModal()).toBe(true);
  });

  describe('permission gating', () => {
    it('exposes canManage() true when the account has billing.manage', async () => {
      const { fixture } = setup({ current: fakeShift(), canManage: true });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.canManage()).toBe(true);
    });

    it('exposes canManage() false without billing.manage', async () => {
      const { fixture } = setup({ current: fakeShift(), canManage: false });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.canManage()).toBe(false);
    });
  });
});
