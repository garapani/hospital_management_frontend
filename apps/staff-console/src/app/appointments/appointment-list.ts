import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@org/auth';

import { AppointmentsApiService, Appointment, CreateAppointmentDto } from './appointments-api.service.js';
import { appointmentDisplayName, appointmentStatusSeverity, APPOINTMENT_STATUSES } from './appointment.model.js';
import { todayLocal as today } from '../shared/date.util.js';
import { UsersApiService } from '../users/users-api.service.js';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';

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
  private readonly usersApi = inject(UsersApiService);
  private readonly masterDataApi = inject(MasterDataApiService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);

  readonly appointments = signal<Appointment[]>([]);
  readonly loading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageSize = signal(10);
  readonly firstRecord = signal(0);

  readonly dateFilter = signal(today());
  readonly statusFilter = signal('');
  readonly doctorIdFilter = signal('');
  readonly departmentIdFilter = signal('');

  readonly checkInActionId = signal<string | null>(null);

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

  // Name pickers for Doctor/Department, replacing raw-UUID text filters — a receptionist doesn't
  // know a doctor's UUID by heart. Loaded once; failures leave the picker empty rather than
  // blocking the rest of the screen.
  readonly doctorOptions = signal<{ label: string; value: string }[]>([]);
  readonly departmentOptions = signal<{ label: string; value: string }[]>([]);

  constructor() {
    this.load(0);
    this.usersApi.listDirectory('Doctor').subscribe({
      next: (doctors) => this.doctorOptions.set(doctors.map((d) => ({ label: d.displayName, value: d.id }))),
      error: () => this.doctorOptions.set([]),
    });
    this.masterDataApi.listDepartments().subscribe({
      next: (departments) =>
        this.departmentOptions.set(
          departments.filter((d) => d.isAppointmentApplicable).map((d) => ({ label: d.departmentName, value: d.id })),
        ),
      error: () => this.departmentOptions.set([]),
    });

    this.route.queryParamMap.subscribe((params) => {
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
    });
  }

  load(first: number): void {
    this.loading.set(true);
    const page = Math.floor(first / this.pageSize()) + 1;
    this.appointmentsApi
      .list({
        date: this.dateFilter() || undefined,
        status: this.statusFilter() || undefined,
        doctorId: this.doctorIdFilter() || undefined,
        departmentId: this.departmentIdFilter() || undefined,
        page,
        limit: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          this.appointments.set(res.data);
          this.totalRecords.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.firstRecord.set(event.first || 0);
    this.load(event.first || 0);
  }

  applyFilters(): void {
    this.firstRecord.set(0);
    this.load(0);
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

  checkIn(appt: Appointment): void {
    this.checkInActionId.set(appt.id);
    this.appointmentsApi.checkIn(appt.id).subscribe({
      next: () => {
        this.checkInActionId.set(null);
        this.load(this.firstRecord());
      },
      error: () => this.checkInActionId.set(null),
    });
  }

  submitCreate(): void {
    this.saving.set(true);
    this.appointmentsApi.create(this.createForm()).subscribe({
      next: () => {
        this.saving.set(false);
        this.showCreateModal.set(false);
        this.firstRecord.set(0);
        this.load(0);
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }
}
