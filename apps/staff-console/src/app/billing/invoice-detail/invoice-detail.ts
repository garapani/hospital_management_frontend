import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { EMPTY, switchMap } from 'rxjs';
import { InvoicesApiService } from '../invoices-api.service.js';
import { InvoiceWithReturns, invoiceReference } from '../invoice.model.js';

@Component({
  imports: [DecimalPipe, DatePipe, RouterModule, ButtonModule, TagModule],
  selector: 'hms-invoice-detail',
  templateUrl: './invoice-detail.html',
})
export class InvoiceDetail {
  private readonly invoicesApi = inject(InvoicesApiService);
  private readonly route = inject(ActivatedRoute);

  readonly invoice = signal<InvoiceWithReturns | null>(null);
  readonly error = signal<string | null>(null);

  readonly reference = invoiceReference;

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
          this.error.set(null);
          return this.invoicesApi.findOne(id);
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (invoice) => this.invoice.set(invoice),
        error: () => this.error.set('Failed to load invoice.'),
      });
  }
}
