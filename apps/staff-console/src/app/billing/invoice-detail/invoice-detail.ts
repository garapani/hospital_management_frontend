import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EMPTY, switchMap } from 'rxjs';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { InvoicesApiService } from '../invoices-api.service.js';
import { PatientsApiService } from '../../patients/patients-api.service.js';
import {
  InvoiceWithReturns,
  PAYMENT_MODES,
  PaymentMode,
  invoiceReference,
  outstandingBalance,
  statusSeverity,
} from '../invoice.model.js';

@Component({
  imports: [
    DecimalPipe,
    DatePipe,
    FormsModule,
    RouterModule,
    ButtonModule,
    TagModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    ToastModule,
  ],
  providers: [MessageService],
  selector: 'hms-invoice-detail',
  templateUrl: './invoice-detail.html',
})
export class InvoiceDetail {
  private readonly invoicesApi = inject(InvoicesApiService);
  private readonly patientsApi = inject(PatientsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  readonly auth = inject(AuthService);

  readonly invoice = signal<InvoiceWithReturns | null>(null);
  readonly error = signal<string | null>(null);
  // Falls back to the raw id in the template if the patient lookup fails — the invoice itself
  // already loaded successfully, so a name-lookup failure shouldn't block the rest of the screen.
  readonly patientName = signal<string | null>(null);

  readonly reference = invoiceReference;
  readonly statusSeverity = statusSeverity;
  readonly outstanding = computed(() => {
    const invoice = this.invoice();
    return invoice ? outstandingBalance(invoice) : 0;
  });
  readonly canRecordPayment = computed(() => {
    const invoice = this.invoice();
    return !!invoice && this.auth.hasPermission('billing.manage') && invoice.status !== 'Paid' && invoice.status !== 'Cancelled';
  });

  readonly paymentModes = PAYMENT_MODES.map((mode) => ({ label: mode, value: mode }));
  readonly showPaymentModal = signal(false);
  readonly paymentAmount = signal<number | null>(null);
  readonly paymentMode = signal<PaymentMode | null>(null);
  readonly sourceDepositId = signal('');
  readonly paymentSaving = signal(false);
  readonly paymentError = signal<string | null>(null);

  // Subscribes to paramMap (not route.snapshot) so a route-reuse navigation between two
  // billing/invoices/:id URLs (e.g. browser back/forward) refetches instead of leaving the
  // previously-loaded invoice's money figures on screen under a changed id.
  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          if (!id) {
            this.error.set('No invoice id in the route.');
            return EMPTY;
          }
          this.invoice.set(null);
          this.patientName.set(null);
          this.error.set(null);
          return this.invoicesApi.findOne(id);
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (invoice) => {
          this.invoice.set(invoice);
          this.patientsApi.getById(invoice.patientId).subscribe({
            next: (patient) => this.patientName.set(`${patient.firstName} ${patient.lastName}`.trim()),
            error: () => this.patientName.set(null),
          });
        },
        error: () => this.error.set('Failed to load invoice.'),
      });
  }

  openPaymentModal(): void {
    this.paymentAmount.set(this.outstanding() || null);
    this.paymentMode.set(null);
    this.sourceDepositId.set('');
    this.paymentError.set(null);
    this.showPaymentModal.set(true);
  }

  submitPayment(): void {
    const invoice = this.invoice();
    const amount = this.paymentAmount();
    const mode = this.paymentMode();
    if (!invoice || !amount || !mode) {
      return;
    }
    if (mode === 'Deposit' && !this.sourceDepositId().trim()) {
      this.paymentError.set('Source deposit ID is required for a Deposit payment.');
      return;
    }

    this.paymentSaving.set(true);
    this.paymentError.set(null);
    this.invoicesApi
      .recordPayment(invoice.id, {
        amount,
        paymentMode: mode,
        sourceDepositId: mode === 'Deposit' ? this.sourceDepositId().trim() : undefined,
      })
      .pipe(switchMap(() => this.invoicesApi.findOne(invoice.id)))
      .subscribe({
        next: (updated) => {
          this.paymentSaving.set(false);
          this.showPaymentModal.set(false);
          this.invoice.set(updated);
          this.messageService.add({ severity: 'success', summary: 'Payment recorded', detail: `${mode} ${amount}` });
        },
        error: (err: ApiError) => {
          this.paymentSaving.set(false);
          this.paymentError.set(err.message || 'Failed to record the payment.');
        },
      });
  }
}
