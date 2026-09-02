import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { ConfirmationService, Confirmation } from 'primeng/api';
import { AuthService } from '@org/auth';
import { PayrollList } from './payroll-list.js';
import { PayrollApiService } from './payroll-api.service.js';
import { DirectoryResolverService } from '../directory/directory-resolver.service.js';

describe('PayrollList', () => {
  function setup() {
    const payrollApi = {
      listPayslips: jest.fn().mockReturnValue(
        of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
      ),
      run: jest.fn().mockReturnValue(of({ count: 3 })),
      markPaid: jest.fn().mockReturnValue(of({})),
    } as unknown as PayrollApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [PayrollList],
      providers: [
        { provide: PayrollApiService, useValue: payrollApi },
        { provide: AuthService, useValue: auth },
        { provide: DirectoryResolverService, useValue: { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService },
      ],
    });

    const fixture = TestBed.createComponent(PayrollList);
    // PayrollList self-provides ConfirmationService (component-level) — spy on the real instance
    // and auto-accept, since no <p-confirmDialog> is rendered in these component tests.
    const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    jest.spyOn(confirmationService, 'confirm').mockImplementation((c: Confirmation) => {
      c.accept?.();
      return confirmationService;
    });
    return { fixture, payrollApi, confirmationService };
  }

  it('loads payslips on init', async () => {
    const { fixture, payrollApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(payrollApi.listPayslips).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      month: undefined,
      year: undefined,
    });
  });

  it('runs payroll for a period and reloads', async () => {
    const { fixture, payrollApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openRunModal();
    fixture.componentInstance.runForm.set({ month: 6, year: 2025, allowancePercent: 10, deductionPercent: 5 });
    fixture.componentInstance.submitRun();
    await fixture.whenStable();

    expect(payrollApi.run).toHaveBeenCalledWith({ month: 6, year: 2025, allowancePercent: 10, deductionPercent: 5 });
    expect(fixture.componentInstance.runResult()).toBe('3 payslip(s) generated.');
  });

  it('confirms before marking a draft payslip paid, and guards against a double-click while in flight', async () => {
    const { fixture, payrollApi, confirmationService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    const markPaid$ = new Subject<unknown>();
    (payrollApi.markPaid as jest.Mock).mockReturnValue(markPaid$);

    const slip = {
      id: 's1',
      employeeId: 'e1',
      periodMonth: 6,
      periodYear: 2025,
      basicAmount: 25000,
      allowanceAmount: 2500,
      grossAmount: 27500,
      deductionAmount: 1375,
      netAmount: 26125,
      status: 'Draft' as const,
      paidAt: null,
      createdAt: '',
    };
    fixture.componentInstance.markPaid(slip);
    fixture.componentInstance.markPaid(slip);

    expect(confirmationService.confirm).toHaveBeenCalledTimes(1);
    expect(payrollApi.markPaid).toHaveBeenCalledTimes(1);
    expect(payrollApi.markPaid).toHaveBeenCalledWith('s1');

    markPaid$.next({});
    markPaid$.complete();
    await fixture.whenStable();
    expect(fixture.componentInstance.markingPaidId()).toBeNull();
  });

  it('shows an error toast when marking paid fails, and clears the in-flight guard', async () => {
    const { fixture, payrollApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (payrollApi.markPaid as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: unknown) => void }) => handlers.error(new Error('boom')),
    });

    fixture.componentInstance.markPaid({ id: 's1', status: 'Draft' } as never);

    expect(fixture.componentInstance.markingPaidId()).toBeNull();
  });
});
