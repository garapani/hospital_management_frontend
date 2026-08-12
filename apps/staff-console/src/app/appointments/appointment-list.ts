import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@org/auth';

import { AppointmentsApiService, Appointment, CreateAppointmentDto } from './appointments-api.service.js';
import { appointmentDisplayName, appointmentStatusSeverity, APPOINTMENT_STATUSES } from './appointment.model.js';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'hms-appointment-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    InputTextModule,
    SelectModule,
  ],
  templateUrl: './appointment-list.html',
})
export class AppointmentList {
  private readonly appointmentsApi = inject(AppointmentsApiService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);

  readonly appointments = signal<Appointment[]>([]);
  readonly loading = signal(false);

  readonly dateFilter = signal(today());
  readonly statusFilter = signal('');
  readonly doctorIdFilter = signal('');
  readonly departmentIdFilter = signal('');

  readonly showCreateModal = signal(false);
  readonly createForm = signal<CreateAppointmentDto>({
    firstName: '',
    lastName: '',
    contactNumber: '',
    appointmentDate: today(),
    appointmentTime: '',
    appointmentType: '',
  });
  readonly saving = signal(false);

  readonly statuses = APPOINTMENT_STATUSES.map((s) => ({ label: s, value: s }));
  readonly displayName = appointmentDisplayName;
  readonly statusSeverity = appointmentStatusSeverity;

  constructor() {
    this.load();

    const params = this.route.snapshot.queryParamMap;
    const patientId = params.get('patientId');
    if (patientId) {
      this.createForm.set({
        patientId,
        firstName: params.get('firstName') ?? '',
        lastName: params.get('lastName') ?? '',
        contactNumber: params.get('contactNumber') ?? '',
        appointmentDate: today(),
        appointmentTime: '',
        appointmentType: '',
      });
      this.showCreateModal.set(true);
    }
  }

  load(): void {
    this.loading.set(true);
    this.appointmentsApi
      .list({
        date: this.dateFilter() || undefined,
        status: this.statusFilter() || undefined,
        doctorId: this.doctorIdFilter() || undefined,
        departmentId: this.departmentIdFilter() || undefined,
      })
      .subscribe({
        next: (data) => {
          this.appointments.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  applyFilters(): void {
    this.load();
  }

  openCreateModal(): void {
    this.createForm.set({
      firstName: '',
      lastName: '',
      contactNumber: '',
      appointmentDate: this.dateFilter() || today(),
      appointmentTime: '',
      appointmentType: '',
    });
    this.showCreateModal.set(true);
  }

  submitCreate(): void {
    this.saving.set(true);
    this.appointmentsApi.create(this.createForm()).subscribe({
      next: () => {
        this.saving.set(false);
        this.showCreateModal.set(false);
        this.load();
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }
}
