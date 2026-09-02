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
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '@org/auth';
import { ApiError } from '@org/api-client';

import { AppointmentsApiService, Appointment, CreateAppointmentDto } from './appointments-api.service.js';
import { appointmentDisplayName, appointmentStatusSeverity, APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from './appointment.model.js';
import { todayLocal as today } from '../shared/date.util.js';
import { UsersApiService } from '../users/users-api.service.js';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';
import { PatientsApiService, Patient } from '../patients/patients-api.service.js';

const PATIENT_SEARCH_DEBOUNCE_MS = 300;

function patientLabel(p: { firstName: string; lastName: string; patientNo: string }): string {
  return `${p.firstName} ${p.lastName} (${p.patientNo})`;
}

function emptyCreateForm(defaults: Partial<CreateAppointmentDto> = {}): CreateAppointmentDto {
  return {
    firstName: '',
    lastName: '',
    contactNumber: '',
    appointmentDate: today(),
    appointmentTime: '',
    appointmentType: '',
    ...defaults,
  };
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
    SelectButtonModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './appointment-list.html',
})
export class AppointmentList {
  private readonly appointmentsApi = inject(AppointmentsApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly masterDataApi = inject(MasterDataApiService);
  private readonly patientsApi = inject(PatientsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
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
  readonly completeActionId = signal<string | null>(null);
  readonly noShowActionId = signal<string | null>(null);

  readonly showCreateModal = signal(false);
  readonly createForm = signal<CreateAppointmentDto>(emptyCreateForm());
  readonly saving = signal(false);

  // Existing/New Patient toggle on the create form — an appointment must tie to a real patient
  // record, not just floating name/phone text, so "New Patient" mode registers one before booking.
  readonly patientModeOptions = [
    { label: 'Existing Patient', value: 'existing' },
    { label: 'New Patient', value: 'new' },
  ];
  readonly patientMode = signal<'existing' | 'new'>('existing');

  // Existing-patient search picker, mirroring Order List's pattern.
  readonly patientOptions = signal<{ label: string; value: string }[]>([]);
  readonly patientSearching = signal(false);
  private patientSearchTimer?: ReturnType<typeof setTimeout>;

  // New-patient duplicate-check safeguard, mirroring Patient Registration's pattern.
  readonly showDuplicateWarning = signal(false);
  readonly duplicateMatches = signal<Patient[]>([]);
  private allowDuplicate = false;

  readonly statuses = APPOINTMENT_STATUSES.map((s) => ({ label: s, value: s }));
  readonly appointmentTypes = APPOINTMENT_TYPES.map((t) => ({ label: t, value: t }));
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
        this.patientMode.set('existing');
        this.createForm.set(
          emptyCreateForm({
            patientId,
            firstName: params.get('firstName') ?? '',
            lastName: params.get('lastName') ?? '',
            contactNumber: params.get('contactNumber') ?? '',
          }),
        );
        this.patientOptions.set([{ label: `${params.get('firstName') ?? ''} ${params.get('lastName') ?? ''}`.trim(), value: patientId }]);
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
    this.createForm.set(emptyCreateForm({ appointmentDate: this.dateFilter() || today() }));
    this.patientMode.set('existing');
    this.patientOptions.set([]);
    this.showDuplicateWarning.set(false);
    this.duplicateMatches.set([]);
    this.allowDuplicate = false;
    this.showCreateModal.set(true);
  }

  setPatientMode(mode: 'existing' | 'new'): void {
    this.patientMode.set(mode);
    this.showDuplicateWarning.set(false);
    this.duplicateMatches.set([]);
    this.allowDuplicate = false;
    this.createForm.set(
      emptyCreateForm({
        appointmentDate: this.createForm().appointmentDate,
        appointmentTime: this.createForm().appointmentTime,
        appointmentType: this.createForm().appointmentType,
        doctorId: this.createForm().doctorId,
        departmentId: this.createForm().departmentId,
        reason: this.createForm().reason,
      }),
    );
  }

  onPatientSearch(query: string): void {
    clearTimeout(this.patientSearchTimer);
    const q = query.trim();
    if (q.length < 2) {
      this.patientOptions.set([]);
      return;
    }
    this.patientSearchTimer = setTimeout(() => {
      this.patientSearching.set(true);
      this.patientsApi.search({ page: 1, limit: 10, q }).subscribe({
        next: (res) => {
          this.patientOptions.set(res.data.map((p) => ({ label: patientLabel(p), value: p.id })));
          this.patientSearching.set(false);
        },
        error: () => this.patientSearching.set(false),
      });
    }, PATIENT_SEARCH_DEBOUNCE_MS);
  }

  onPatientSelected(patientId: string | null): void {
    if (!patientId) {
      this.createForm.set({ ...this.createForm(), patientId: undefined, firstName: '', lastName: '', contactNumber: '' });
      return;
    }
    this.patientsApi.getById(patientId).subscribe({
      next: (patient) => {
        this.createForm.set({
          ...this.createForm(),
          patientId: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          contactNumber: patient.phoneNumber ?? '',
        });
      },
    });
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

  complete(appt: Appointment): void {
    this.completeActionId.set(appt.id);
    this.appointmentsApi.complete(appt.id).subscribe({
      next: () => {
        this.completeActionId.set(null);
        this.load(this.firstRecord());
      },
      error: () => this.completeActionId.set(null),
    });
  }

  markNoShow(appt: Appointment): void {
    this.noShowActionId.set(appt.id);
    this.appointmentsApi.markNoShow(appt.id).subscribe({
      next: () => {
        this.noShowActionId.set(null);
        this.load(this.firstRecord());
      },
      error: () => this.noShowActionId.set(null),
    });
  }

  submitCreate(): void {
    const form = this.createForm();

    if (this.patientMode() === 'existing') {
      if (!form.patientId) return;
      this.saving.set(true);
      this.createAppointment(form);
      return;
    }

    this.saving.set(true);
    if (this.allowDuplicate) {
      this.createPatientThenAppointment(form);
      return;
    }
    this.patientsApi
      .checkDuplicates({
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.contactNumber || undefined,
      })
      .subscribe({
        next: (matches) => {
          if (matches && matches.length > 0) {
            this.duplicateMatches.set(matches);
            this.showDuplicateWarning.set(true);
            this.saving.set(false);
            return;
          }
          this.createPatientThenAppointment(form);
        },
        error: () => {
          this.messageService.add({
            severity: 'warn',
            summary: 'Warning',
            detail: 'Could not verify duplicates. Proceeding with registration.',
          });
          this.createPatientThenAppointment(form);
        },
      });
  }

  /** From the duplicate-warning panel: link the appointment to the matched patient instead of
   *  creating a second record for the same person. */
  useExistingMatch(patient: Patient): void {
    this.patientMode.set('existing');
    this.showDuplicateWarning.set(false);
    this.duplicateMatches.set([]);
    this.allowDuplicate = false;
    this.patientOptions.set([{ label: patientLabel(patient), value: patient.id }]);
    this.createForm.set({
      ...this.createForm(),
      patientId: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      contactNumber: patient.phoneNumber ?? '',
    });
    this.saving.set(false);
  }

  proceedWithDuplicate(): void {
    this.allowDuplicate = true;
    this.showDuplicateWarning.set(false);
    this.saving.set(true);
    this.createPatientThenAppointment(this.createForm());
  }

  private createPatientThenAppointment(form: CreateAppointmentDto): void {
    this.patientsApi
      .create({
        firstName: form.firstName,
        lastName: form.lastName,
        gender: 'Unknown',
        phoneNumber: form.contactNumber,
        allowDuplicate: true,
      })
      .subscribe({
        next: (patient) => this.createAppointment({ ...form, patientId: patient.id }),
        error: (err: ApiError) => {
          this.saving.set(false);
          this.showDuplicateWarning.set(false);
          this.messageService.add({
            severity: 'error',
            summary: err.status === 403 ? 'Permission Required' : 'Error',
            detail:
              err.status === 403
                ? "You don't have permission to register new patients. Contact your hospital administrator for access."
                : err.message || 'Failed to register patient',
          });
        },
      });
  }

  private createAppointment(payload: CreateAppointmentDto): void {
    this.appointmentsApi.create(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.showCreateModal.set(false);
        this.firstRecord.set(0);
        this.load(0);
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.message || 'Failed to create appointment',
        });
      },
    });
  }
}
