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

import { AppointmentsApiService, Appointment } from './appointments-api.service.js';
import { appointmentDisplayName, appointmentStatusSeverity } from './appointment.model.js';

@Component({
  selector: 'hms-appointment-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TagModule, InputTextModule, TextareaModule, DialogModule],
  templateUrl: './appointment-detail.html',
})
export class AppointmentDetail implements OnInit {
  private readonly appointmentsApi = inject(AppointmentsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly appointment = signal<Appointment | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly saving = signal(false);

  readonly appointmentType = signal('');
  readonly reason = signal('');

  readonly showCancelModal = signal(false);
  readonly cancelRemarks = signal('');
  readonly cancelling = signal(false);
  readonly checkingIn = signal(false);
  readonly completing = signal(false);
  readonly markingNoShow = signal(false);

  readonly displayName = appointmentDisplayName;
  readonly statusSeverity = appointmentStatusSeverity;

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
    this.appointmentsApi.getById(id).subscribe({
      next: (data) => {
        this.appointment.set(data);
        this.appointmentType.set(data.appointmentType);
        this.reason.set(data.reason ?? '');
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.notFound.set(true);
        }
      },
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
        this.cancelling.set(false);
        this.showCancelModal.set(false);
      },
      error: () => this.cancelling.set(false),
    });
  }

  checkIn() {
    const id = this.appointment()?.id;
    if (!id) return;

    this.checkingIn.set(true);
    this.appointmentsApi.checkIn(id).subscribe({
      next: (updated) => {
        this.appointment.set(updated);
        this.checkingIn.set(false);
      },
      error: () => this.checkingIn.set(false),
    });
  }

  complete() {
    const id = this.appointment()?.id;
    if (!id) return;

    this.completing.set(true);
    this.appointmentsApi.complete(id).subscribe({
      next: (updated) => {
        this.appointment.set(updated);
        this.completing.set(false);
      },
      error: () => this.completing.set(false),
    });
  }

  markNoShow() {
    const id = this.appointment()?.id;
    if (!id) return;

    this.markingNoShow.set(true);
    this.appointmentsApi.markNoShow(id).subscribe({
      next: (updated) => {
        this.appointment.set(updated);
        this.markingNoShow.set(false);
      },
      error: () => this.markingNoShow.set(false),
    });
  }
}
