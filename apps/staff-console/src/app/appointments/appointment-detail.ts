import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '@org/auth';

import { AppointmentsApiService, Appointment } from './appointments-api.service.js';
import { appointmentDisplayName, appointmentStatusSeverity, APPOINTMENT_STATUSES } from './appointment.model.js';

@Component({
  selector: 'hms-appointment-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TagModule, InputTextModule, TextareaModule, SelectModule, DialogModule],
  templateUrl: './appointment-detail.html',
})
export class AppointmentDetail implements OnInit {
  private readonly appointmentsApi = inject(AppointmentsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly appointment = signal<Appointment | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly appointmentType = signal('');
  readonly status = signal('');
  readonly reason = signal('');

  readonly showCancelModal = signal(false);
  readonly cancelRemarks = signal('');
  readonly cancelling = signal(false);

  readonly displayName = appointmentDisplayName;
  readonly statusSeverity = appointmentStatusSeverity;
  readonly statuses = APPOINTMENT_STATUSES.map((s) => ({ label: s, value: s }));

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
    this.appointmentsApi.getById(id).subscribe({
      next: (data) => {
        this.appointment.set(data);
        this.appointmentType.set(data.appointmentType);
        this.status.set(data.status);
        this.reason.set(data.reason ?? '');
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goBack() {
    this.router.navigate(['/clinical/appointments']);
  }

  saveChanges() {
    const id = this.appointment()?.id;
    if (!id) return;

    this.saving.set(true);
    this.appointmentsApi
      .update(id, {
        appointmentType: this.appointmentType(),
        status: this.status(),
        reason: this.reason() || undefined,
      })
      .subscribe({
        next: (updated) => {
          this.appointment.set(updated);
          this.saving.set(false);
        },
        error: () => this.saving.set(false),
      });
  }

  openCancelModal() {
    this.cancelRemarks.set('');
    this.showCancelModal.set(true);
  }

  confirmCancel() {
    const id = this.appointment()?.id;
    const remarks = this.cancelRemarks().trim();
    if (!id || !remarks) return;

    this.cancelling.set(true);
    this.appointmentsApi.cancel(id, remarks).subscribe({
      next: (updated) => {
        this.appointment.set(updated);
        this.status.set(updated.status);
        this.cancelling.set(false);
        this.showCancelModal.set(false);
      },
      error: () => this.cancelling.set(false),
    });
  }
}
