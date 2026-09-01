import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@org/auth';
import { ApiError } from '@org/api-client';

import { AdmissionsApiService, Admission, CreateDischargeSummaryDto, DischargeSummary } from './admissions-api.service.js';
import { admissionSourceSeverity, admissionStatusSeverity, summaryReviewSeverity } from './admission.model.js';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';
import { Ward, Bed } from '../master-data/master-data.model.js';

@Component({
  selector: 'hms-admission-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TagModule, InputTextModule, TextareaModule, DialogModule, SelectModule],
  templateUrl: './admission-detail.html',
})
export class AdmissionDetail implements OnInit {
  private readonly admissionsApi = inject(AdmissionsApiService);
  private readonly masterDataApi = inject(MasterDataApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly admission = signal<Admission | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  // Resolved display names for the raw wardId/bedId FKs — the "ward and bed are raw UUIDs"
  // finding covers this Details panel too, not just the transfer picker.
  readonly wardName = signal<string | null>(null);
  readonly bedNumber = signal<string | null>(null);

  // Transfer — ward + bed pickers (not a free-text bed UUID field), scoped to beds actually
  // available right now so a nurse can't pick an occupied/maintenance bed by mistake.
  readonly showTransferModal = signal(false);
  readonly transferWards = signal<Ward[]>([]);
  readonly transferWardId = signal<string | null>(null);
  readonly transferBeds = signal<Bed[]>([]);
  readonly transferBedsLoading = signal(false);
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
        this.loadWardAndBedNames(data.wardId, data.bedId);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.notFound.set(true);
        }
      },
    });
  }

  private loadWardAndBedNames(wardId: string, bedId: string): void {
    this.wardName.set(null);
    this.bedNumber.set(null);
    this.masterDataApi.getWard(wardId).subscribe({
      next: (ward) => this.wardName.set(ward.wardName),
      error: () => {},
    });
    this.masterDataApi.getBed(bedId).subscribe({
      next: (bed) => this.bedNumber.set(bed.bedNumber),
      error: () => {},
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
    const admission = this.admission();
    this.toBedId.set('');
    this.transferReason.set('');
    this.showTransferModal.set(true);

    if (this.transferWards().length === 0) {
      this.masterDataApi.listWards().subscribe({
        next: (wards) => this.transferWards.set(wards.filter((w) => w.isActive)),
      });
    }
    const initialWardId = admission?.wardId ?? null;
    this.transferWardId.set(initialWardId);
    if (initialWardId) {
      this.loadTransferBeds(initialWardId);
    }
  }

  selectTransferWard(wardId: string | null) {
    this.transferWardId.set(wardId);
    this.toBedId.set('');
    if (wardId) {
      this.loadTransferBeds(wardId);
    } else {
      this.transferBeds.set([]);
    }
  }

  private loadTransferBeds(wardId: string) {
    this.transferBedsLoading.set(true);
    this.masterDataApi.listBedsByWard(wardId).subscribe({
      next: (beds) => {
        this.transferBeds.set(beds.filter((b) => b.isActive && b.status === 'Available'));
        this.transferBedsLoading.set(false);
      },
      error: () => this.transferBedsLoading.set(false),
    });
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
