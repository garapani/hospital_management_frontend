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
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EMPTY, switchMap } from 'rxjs';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { openPdfBlobInNewTab } from '../../shared/pdf-blob.util.js';
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
    TextareaModule,
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
  // Mirrors InvoicesService.cancel's own rules — an invoice with a recorded payment must be
  // returned against instead (the backend rejects cancel with paidAmount > 0).
  readonly canCancel = computed(() => {
    const invoice = this.invoice();
    return !!invoice && this.auth.hasPermission('billing.manage') && invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && invoice.paidAmount === 0;
  });
  // Mirrors InvoicesService.createReturn's own rule — a return can only be issued against a
  // recorded payment (an invoice with paidAmount === 0 is cancelled instead).
  readonly canReturn = computed(() => {
    const invoice = this.invoice();
    return !!invoice && this.auth.hasPermission('billing.manage') && invoice.paidAmount > 0;
  });

  readonly paymentModes = PAYMENT_MODES.map((mode) => ({ label: mode, value: mode }));
  readonly showPaymentModal = signal(false);
  readonly paymentAmount = signal<number | null>(null);
  readonly paymentMode = signal<PaymentMode | null>(null);
  readonly sourceDepositId = signal('');
  readonly paymentSaving = signal(false);
  readonly paymentError = signal<string | null>(null);

  readonly showCancelModal = signal(false);
  readonly cancelSaving = signal(false);
  readonly cancelError = signal<string | null>(null);

  readonly showReturnModal = signal(false);
  readonly returnAmount = signal<number | null>(null);
  readonly returnReason = signal('');
  readonly returnSaving = signal(false);
  readonly returnError = signal<string | null>(null);

  readonly printingInvoice = signal(false);

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

  printInvoice(): void {
    const invoice = this.invoice();
    if (!invoice) return;

    this.printingInvoice.set(true);
    this.invoicesApi.getInvoicePdf(invoice.id).subscribe({
      next: (blob) => {
        this.printingInvoice.set(false);
        openPdfBlobInNewTab(blob);
      },
      error: () => {
        this.printingInvoice.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to generate the invoice PDF.' });
      },
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
      .subscribe({
        next: () => {
          this.paymentSaving.set(false);
          this.showPaymentModal.set(false);
          this.messageService.add({ severity: 'success', summary: 'Payment recorded', detail: `${mode} ${amount}` });
          this.refreshInvoice(invoice.id);
        },
        error: (err: ApiError) => {
          this.paymentSaving.set(false);
          this.paymentError.set(err.message || 'Failed to record the payment.');
        },
      });
  }

  openCancelModal(): void {
    this.cancelError.set(null);
    this.showCancelModal.set(true);
  }

  confirmCancel(): void {
    const invoice = this.invoice();
    if (!invoice) {
      return;
    }
    this.cancelSaving.set(true);
    this.cancelError.set(null);
    this.invoicesApi.cancel(invoice.id).subscribe({
      next: () => {
        this.cancelSaving.set(false);
        this.showCancelModal.set(false);
        this.messageService.add({ severity: 'success', summary: 'Invoice cancelled' });
        this.refreshInvoice(invoice.id);
      },
      error: (err: ApiError) => {
        this.cancelSaving.set(false);
        this.cancelError.set(err.message || 'Failed to cancel the invoice.');
      },
    });
  }

  openReturnModal(): void {
    this.returnAmount.set(null);
    this.returnReason.set('');
    this.returnError.set(null);
    this.showReturnModal.set(true);
  }

  submitReturn(): void {
    const invoice = this.invoice();
    const amount = this.returnAmount();
    const reason = this.returnReason().trim();
    if (!invoice || !amount || !reason) {
      return;
    }

    this.returnSaving.set(true);
    this.returnError.set(null);
    this.invoicesApi.createReturn(invoice.id, { amount, reason }).subscribe({
      next: () => {
        this.returnSaving.set(false);
        this.showReturnModal.set(false);
        this.messageService.add({ severity: 'success', summary: 'Return recorded', detail: `${amount}` });
        this.refreshInvoice(invoice.id);
      },
      error: (err: ApiError) => {
        this.returnSaving.set(false);
        this.returnError.set(err.message || 'Failed to record the return.');
      },
    });
  }

  // Split from the mutation call itself (recordPayment/cancel/createReturn) so a refresh failure
  // — a transient network blip after the money has already moved server-side — surfaces as a
  // "reload to see the latest" warning, not as an error on the mutation's own modal. Collapsing
  // both into one .subscribe() previously made the UI report a successful return/cancel as
  // failed, inviting the user to retry a request the backend would then apply a second time.
  private refreshInvoice(id: string): void {
    this.invoicesApi.findOne(id).subscribe({
      next: (updated) => {
        // Only apply if the screen is still showing this invoice — a route change mid-flight
        // (e.g. browser back to a different invoice) should not have this late response
        // overwrite whatever the paramMap subscription has since loaded.
        if (this.invoice()?.id === id) {
          this.invoice.set(updated);
        }
      },
      error: () =>
        this.messageService.add({
          severity: 'warn',
          summary: 'Refresh needed',
          detail: 'The change was saved, but the invoice could not be refreshed — reload the page.',
        }),
    });
  }
}
