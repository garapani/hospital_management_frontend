import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AuthService } from '@org/auth';

import { PharmacyDispensingApiService } from './pharmacy-dispensing-api.service.js';
import { dispensingStatusSeverity, PharmacyDispensing } from './pharmacy-dispensing.model.js';
import { openPdfBlobInNewTab } from '../shared/pdf-blob.util.js';
import { EntityName } from '../directory/entity-name.js';

@Component({
  selector: 'hms-pharmacy-dispensing-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TagModule, DialogModule, TextareaModule, ToastModule, ConfirmDialogModule, EntityName],
  providers: [MessageService, ConfirmationService],
  templateUrl: './pharmacy-dispensing-detail.html',
})
export class PharmacyDispensingDetail implements OnInit {
  private readonly pharmacyApi = inject(PharmacyDispensingApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  readonly auth = inject(AuthService);

  readonly dispensing = signal<PharmacyDispensing | null>(null);
  readonly loading = signal(true);
  readonly dispensingInProgress = signal(false);
  readonly printingLabel = signal(false);

  readonly showCancelModal = signal(false);
  readonly cancelReason = signal('');
  readonly cancelSaving = signal(false);

  readonly showReverseModal = signal(false);
  readonly reversalReason = signal('');
  readonly reverseSaving = signal(false);

  readonly statusSeverity = dispensingStatusSeverity;

  ngOnInit() {
    // Subscribes to paramMap (not route.snapshot) so a route-reuse navigation between two
    // /clinical/pharmacy/:id URLs refetches instead of leaving stale data on screen.
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.load(id);
      }
    });
  }

  load(id: string) {
    this.loading.set(true);
    this.pharmacyApi.getById(id).subscribe({
      next: (data) => {
        this.dispensing.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load the dispensing record.' });
      },
    });
  }

  goBack() {
    this.router.navigate(['/clinical/pharmacy']);
  }

  printDispensingLabel() {
    const id = this.dispensing()?.id;
    if (!id) return;

    this.printingLabel.set(true);
    this.pharmacyApi.getDispensingLabelPdf(id).subscribe({
      next: (blob) => {
        this.printingLabel.set(false);
        openPdfBlobInNewTab(blob);
      },
      error: () => {
        this.printingLabel.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to generate the dispensing label.' });
      },
    });
  }

  dispenseDrug() {
    const current = this.dispensing();
    const id = current?.id;
    if (!id || current?.status !== 'Pending') return;

    this.confirmationService.confirm({
      header: 'Dispense',
      message: `Dispense ${current.quantity} unit(s)? This decrements physical stock and cannot be undone from here — use Reverse afterwards if needed.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Dispense', severity: 'success' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.dispensingInProgress.set(true);
        this.pharmacyApi.dispense(id).subscribe({
          next: (updated) => {
            this.dispensing.set(updated);
            this.dispensingInProgress.set(false);
          },
          error: () => {
            this.dispensingInProgress.set(false);
            this.messageService.add({ severity: 'error', summary: 'Action failed', detail: 'Failed to dispense.' });
          },
        });
      },
    });
  }

  openCancelModal() {
    this.cancelReason.set('');
    this.showCancelModal.set(true);
  }

  confirmCancel() {
    const id = this.dispensing()?.id;
    if (!id) return;

    this.cancelSaving.set(true);
    this.pharmacyApi.cancel(id, this.cancelReason().trim() || undefined).subscribe({
      next: (updated) => {
        this.dispensing.set(updated);
        this.cancelSaving.set(false);
        this.showCancelModal.set(false);
      },
      error: () => {
        this.cancelSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Action failed', detail: 'Failed to cancel the dispensing.' });
      },
    });
  }

  openReverseModal() {
    this.reversalReason.set('');
    this.showReverseModal.set(true);
  }

  confirmReverse() {
    const id = this.dispensing()?.id;
    const reason = this.reversalReason().trim();
    if (!id || !reason) return;

    this.reverseSaving.set(true);
    this.pharmacyApi.reverse(id, reason).subscribe({
      next: (updated) => {
        this.dispensing.set(updated);
        this.reverseSaving.set(false);
        this.showReverseModal.set(false);
      },
      error: () => {
        this.reverseSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Action failed', detail: 'Failed to reverse the dispensing.' });
      },
    });
  }
}
