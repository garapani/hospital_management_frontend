import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '@org/auth';

import { RadiologyApiService } from './radiology-api.service.js';
import { NON_TERMINAL_RADIOLOGY_STATUSES, RadiologyRequisition, radiologyStatusSeverity } from './radiology.model.js';

@Component({
  selector: 'hms-radiology-requisition-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TagModule, InputTextModule, TextareaModule, DialogModule],
  templateUrl: './radiology-requisition-detail.html',
})
export class RadiologyRequisitionDetail implements OnInit {
  private readonly radiologyApi = inject(RadiologyApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly requisition = signal<RadiologyRequisition | null>(null);
  readonly loading = signal(true);
  readonly actionLoading = signal(false);

  readonly showReportModal = signal(false);
  readonly reportText = signal('');
  readonly indication = signal('');

  readonly showCancelModal = signal(false);
  readonly cancelReason = signal('');

  readonly statusSeverity = radiologyStatusSeverity;
  readonly canCancelStatuses = NON_TERMINAL_RADIOLOGY_STATUSES;

  ngOnInit() {
    // Subscribes to paramMap (not route.snapshot) so a route-reuse navigation between two
    // /clinical/radiology/:id URLs (e.g. browser back/forward) refetches instead of leaving
    // the previously-loaded requisition on screen under a changed id.
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.load(id);
      }
    });
  }

  load(id: string): void {
    this.loading.set(true);
    this.radiologyApi.getById(id).subscribe({
      next: (data) => {
        this.requisition.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goBack(): void {
    this.router.navigate(['/clinical/radiology']);
  }

  markScanned(): void {
    const id = this.requisition()?.id;
    if (!id) return;

    this.actionLoading.set(true);
    this.radiologyApi.markScanned(id).subscribe({
      next: (updated) => {
        this.requisition.set(updated);
        this.actionLoading.set(false);
      },
      error: () => this.actionLoading.set(false),
    });
  }

  openReportModal(): void {
    const r = this.requisition();
    this.reportText.set(r?.reportText ?? '');
    this.indication.set(r?.indication ?? '');
    this.showReportModal.set(true);
  }

  submitReport(): void {
    const id = this.requisition()?.id;
    if (!id || !this.reportText().trim()) return;

    this.actionLoading.set(true);
    const enteredBy = this.auth.currentUser()?.sub;
    this.radiologyApi
      .enterReport(id, {
        reportText: this.reportText(),
        indication: this.indication().trim() || undefined,
        ...(enteredBy ? { reportEnteredBy: enteredBy } : {}),
      })
      .subscribe({
        next: (updated) => {
          this.requisition.set(updated);
          this.actionLoading.set(false);
          this.showReportModal.set(false);
        },
        error: () => this.actionLoading.set(false),
      });
  }

  verify(): void {
    const id = this.requisition()?.id;
    if (!id) return;

    this.actionLoading.set(true);
    this.radiologyApi.verify(id).subscribe({
      next: (updated) => {
        this.requisition.set(updated);
        this.actionLoading.set(false);
      },
      error: () => this.actionLoading.set(false),
    });
  }

  openCancelModal(): void {
    this.cancelReason.set('');
    this.showCancelModal.set(true);
  }

  confirmCancel(): void {
    const id = this.requisition()?.id;
    if (!id) return;

    this.actionLoading.set(true);
    this.radiologyApi.cancel(id, this.cancelReason().trim() || undefined).subscribe({
      next: (updated) => {
        this.requisition.set(updated);
        this.actionLoading.set(false);
        this.showCancelModal.set(false);
      },
      error: () => this.actionLoading.set(false),
    });
  }
}
