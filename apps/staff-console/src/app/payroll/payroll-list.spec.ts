import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '@org/auth';
import { PayrollList } from './payroll-list.js';
import { PayrollApiService } from './payroll-api.service.js';

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
      ],
    });

    const fixture = TestBed.createComponent(PayrollList);
    return { fixture, payrollApi };
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

  it('marks a draft payslip paid', async () => {
    const { fixture, payrollApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

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
    await fixture.whenStable();

    expect(payrollApi.markPaid).toHaveBeenCalledWith('s1');
  });
});
