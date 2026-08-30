import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@org/auth';

import { TriageApiService, TriageEntry } from './triage-api.service.js';
import { triageDisplayName, colorCodeSeverity, COLOR_CODES, TRIAGE_STATUSES } from './triage.model.js';

@Component({
  selector: 'hms-triage-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TagModule, InputTextModule, TextareaModule, SelectModule],
  templateUrl: './triage-detail.html',
})
export class TriageDetail implements OnInit {
  private readonly triageApi = inject(TriageApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly entry = signal<TriageEntry | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly linkingPatient = signal(false);
  readonly patientIdInput = signal('');

  readonly acuityLevel = signal<number | null>(null);
  readonly colorCode = signal<string | null>(null);
  readonly status = signal<string>('Arrived');
  readonly dischargeRemarks = signal<string>('');

  readonly displayName = triageDisplayName;
  readonly colorSeverity = colorCodeSeverity;
  readonly colorCodes = COLOR_CODES.map((c) => ({ label: c, value: c }));
  readonly statuses = TRIAGE_STATUSES.map((s) => ({ label: s, value: s }));

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
    this.triageApi.findOne(id).subscribe({
      next: (data) => {
        this.entry.set(data);
        this.acuityLevel.set(data.acuityLevel);
        this.colorCode.set(data.colorCode);
        this.status.set(data.status);
        this.dischargeRemarks.set(data.dischargeRemarks ?? '');
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goBack() {
    this.router.navigate(['/clinical/triage']);
  }

  saveAssessment() {
    const entry = this.entry();
    if (!entry) return;

    // triagedAt/triagedBy record the moment of the *first* triage assessment (used to measure
    // door-to-triage time) — a later edit (e.g. discharge remarks, status change) must not
    // overwrite them with whoever last touched the form.
    const isFirstTriage = !entry.triagedAt;

    this.saving.set(true);
    this.triageApi
      .update(entry.id, {
        acuityLevel: this.acuityLevel() ?? undefined,
        colorCode: this.colorCode() ?? undefined,
        status: this.status(),
        dischargeRemarks: this.dischargeRemarks() || undefined,
        ...(isFirstTriage
          ? { triagedBy: this.auth.currentUser()?.sub, triagedAt: new Date().toISOString() }
          : {}),
      })
      .subscribe({
        next: (updated) => {
          this.entry.set(updated);
          this.saving.set(false);
        },
        error: () => this.saving.set(false),
      });
  }

  linkPatient() {
    const id = this.entry()?.id;
    const patientId = this.patientIdInput().trim();
    if (!id || !patientId) return;

    this.linkingPatient.set(true);
    this.triageApi.linkPatient(id, patientId).subscribe({
      next: (updated) => {
        this.entry.set(updated);
        this.patientIdInput.set('');
        this.linkingPatient.set(false);
      },
      error: () => this.linkingPatient.set(false),
    });
  }
}
