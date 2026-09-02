import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuthService } from '@org/auth';
import { PayrollApiService, Payslip, RunPayrollDto } from './payroll-api.service.js';
import { EntityName } from '../directory/entity-name.js';

const MONTHS = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
];

const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function currentYear(): number {
  return new Date().getFullYear();
}

@Component({
  selector: 'hms-payroll-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    SelectModule,
    TagModule,
    MessageModule,
    ToastModule,
    ConfirmDialogModule,
    EntityName,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './payroll-list.html',
})
export class PayrollList {
  private readonly payrollApi = inject(PayrollApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  readonly auth = inject(AuthService);

  readonly payslips = signal<Payslip[]>([]);
  readonly loading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageSize = signal(10);
  readonly firstRecord = signal(0);

  readonly monthFilter = signal<number | null>(null);
  readonly yearFilter = signal<number | null>(null);

  readonly showRunModal = signal(false);
  readonly runForm = signal<RunPayrollDto>({
    month: new Date().getMonth() + 1,
    year: currentYear(),
    allowancePercent: 0,
    deductionPercent: 0,
  });
  readonly running = signal(false);
  readonly runResult = signal<string | null>(null);
  readonly runError = signal<string | null>(null);

  readonly months = MONTHS;
  readonly monthNames = MONTH_NAMES;
  readonly canManage = this.auth.hasPermission('payroll.manage');
  readonly markingPaidId = signal<string | null>(null);

  constructor() {
    this.load(0);
  }

  load(first: number): void {
    this.loading.set(true);
    const page = Math.floor(first / this.pageSize()) + 1;
    this.payrollApi
      .listPayslips({
        page,
        limit: this.pageSize(),
        month: this.monthFilter() ?? undefined,
        year: this.yearFilter() ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.payslips.set(res.data);
          this.totalRecords.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.firstRecord.set(event.first || 0);
    this.load(event.first || 0);
  }

  applyFilters(): void {
    this.firstRecord.set(0);
    this.load(0);
  }

  openRunModal(): void {
    this.runForm.set({
      month: new Date().getMonth() + 1,
      year: currentYear(),
      allowancePercent: 0,
      deductionPercent: 0,
    });
    this.runResult.set(null);
    this.runError.set(null);
    this.showRunModal.set(true);
  }

  submitRun(): void {
    this.running.set(true);
    this.runResult.set(null);
    this.runError.set(null);
    this.payrollApi.run(this.runForm()).subscribe({
      next: (res) => {
        this.running.set(false);
        this.runResult.set(`${res.count} payslip(s) generated.`);
        this.showRunModal.set(false);
        this.load(this.firstRecord());
      },
      error: () => {
        this.running.set(false);
        this.runError.set('Could not run payroll for this period. It may already have been run.');
      },
    });
  }

  markPaid(payslip: Payslip): void {
    if (this.markingPaidId() !== null) return;

    this.confirmationService.confirm({
      header: 'Mark Paid',
      message: `Mark this payslip as paid? This stamps a payment record and cannot be undone from here.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Mark Paid', severity: 'success' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.markingPaidId.set(payslip.id);
        this.payrollApi.markPaid(payslip.id).subscribe({
          next: () => {
            this.markingPaidId.set(null);
            this.load(this.firstRecord());
            this.messageService.add({ severity: 'success', summary: 'Payslip marked paid' });
          },
          error: () => {
            this.markingPaidId.set(null);
            this.messageService.add({ severity: 'error', summary: 'Action failed', detail: 'Failed to mark payslip as paid.' });
          },
        });
      },
    });
  }
}
