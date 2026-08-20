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
import { ApiError } from '@org/api-client';

import { AdmissionsApiService, Admission, CreateDischargeSummaryDto, DischargeSummary } from './admissions-api.service.js';
import { admissionSourceSeverity, admissionStatusSeverity, summaryReviewSeverity } from './admission.model.js';

@Component({
  selector: 'hms-admission-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TagModule, InputTextModule, TextareaModule, DialogModule],
  templateUrl: './admission-detail.html',
})
export class AdmissionDetail implements OnInit {
  private readonly admissionsApi = inject(AdmissionsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly admission = signal<Admission | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  // Transfer
  readonly showTransferModal = signal(false);
  readonly toBedId = signal('');
  readonly transferReason = signal('');
  readonly transferring = signal(false);

  // Discharge
  readonly showDischargeModal = signal(false);
  readonly dischargeType = signal('');
  readonly dischargeCondition = signal('');
  readonly dischargeNotes = signal('');
  readonly discharging = signal(false);

  // Discharge summary
  readonly summary = signal<DischargeSummary | null>(null);
  readonly summaryLoading = signal(false);
  readonly summaryMissing = signal(false);
  readonly showSummaryForm = signal(false);
  readonly summaryForm = signal<{ primaryDiagnosis: string; hospitalCourse: string; preparedBy: string }>({
    primaryDiagnosis: '',
    hospitalCourse: '',
    preparedBy: '',
  });
  readonly savingSummary = signal(false);
  readonly reviewing = signal(false);

  readonly statusSeverity = admissionStatusSeverity;
  readonly sourceSeverity = admissionSourceSeverity;
  readonly reviewSeverity = summaryReviewSeverity;

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.load(id);
      }
    });
  }

  load(id: string) {
    this.loading.set(true);
    this.notFound.set(false);
    this.admissionsApi.getById(id).subscribe({
      next: (data) => {
        this.admission.set(data);
        this.loading.set(false);
        this.loadSummary(data.id);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.notFound.set(true);
        }
      },
    });
  }

  private loadSummary(admissionId: string): void {
    this.summaryLoading.set(true);
    this.summaryMissing.set(false);
    this.admissionsApi.getDischargeSummaryByAdmission(admissionId).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.summaryLoading.set(false);
      },
      error: (err: ApiError) => {
        this.summaryLoading.set(false);
        if (err.status === 404) {
          this.summaryMissing.set(true);
        }
      },
    });
  }

  goBack() {
    this.router.navigate(['/admissions']);
  }

  openTransferModal() {
    this.toBedId.set('');
    this.transferReason.set('');
    this.showTransferModal.set(true);
  }

  confirmTransfer() {
    const admission = this.admission();
    const toBedId = this.toBedId().trim();
    if (!admission || !toBedId) return;

    this.transferring.set(true);
    this.admissionsApi
      .transfer(admission.id, {
        toBedId,
        transferredBy: this.auth.currentUser()?.sub,
        reason: this.transferReason().trim() || undefined,
      })
      .subscribe({
        next: (updated) => {
          this.admission.set(updated);
          this.transferring.set(false);
          this.showTransferModal.set(false);
        },
        error: () => this.transferring.set(false),
      });
  }

  openDischargeModal() {
    this.dischargeType.set('');
    this.dischargeCondition.set('');
    this.dischargeNotes.set('');
    this.showDischargeModal.set(true);
  }

  confirmDischarge() {
    const admission = this.admission();
    if (!admission) return;

    this.discharging.set(true);
    this.admissionsApi
      .discharge(admission.id, {
        dischargedBy: this.auth.currentUser()?.sub,
        dischargeType: this.dischargeType().trim() || undefined,
        dischargeCondition: this.dischargeCondition().trim() || undefined,
        dischargeSummary: this.dischargeNotes().trim() || undefined,
      })
      .subscribe({
        next: (updated) => {
          this.admission.set(updated);
          this.discharging.set(false);
          this.showDischargeModal.set(false);
          this.loadSummary(updated.id);
        },
        error: () => this.discharging.set(false),
      });
  }

  openSummaryForm() {
    this.summaryForm.set({
      primaryDiagnosis: '',
      hospitalCourse: '',
      preparedBy: this.auth.currentUser()?.sub ?? '',
    });
    this.showSummaryForm.set(true);
  }

  submitSummary() {
    const admission = this.admission();
    if (!admission) return;

    this.savingSummary.set(true);
    const dto: CreateDischargeSummaryDto = {
      admissionId: admission.id,
      patientId: admission.patientId,
      primaryDiagnosis: this.summaryForm().primaryDiagnosis.trim(),
      hospitalCourse: this.summaryForm().hospitalCourse.trim() || undefined,
      preparedBy: this.summaryForm().preparedBy.trim() || undefined,
    };
    this.admissionsApi.createDischargeSummary(dto).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.summaryMissing.set(false);
        this.savingSummary.set(false);
        this.showSummaryForm.set(false);
      },
      error: () => this.savingSummary.set(false),
    });
  }

  reviewSummary() {
    const summary = this.summary();
    if (!summary) return;

    this.reviewing.set(true);
    this.admissionsApi.reviewDischargeSummary(summary.id, this.auth.currentUser()?.sub).subscribe({
      next: (updated) => {
        this.summary.set(updated);
        this.reviewing.set(false);
      },
      error: () => this.reviewing.set(false),
    });
  }
}
