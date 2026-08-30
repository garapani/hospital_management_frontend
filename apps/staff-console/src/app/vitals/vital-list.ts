import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuthService } from '@org/auth';
import { PatientsApiService, Patient, PaginatedResponse } from '../patients/patients-api.service.js';
import { CreateVitalDto, Vital, VitalsApiService } from './vitals-api.service.js';

@Component({
  selector: 'hms-vital-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
  ],
  templateUrl: './vital-list.html',
})
export class VitalList {
  private readonly vitalsApi = inject(VitalsApiService);
  private readonly patientsApi = inject(PatientsApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  readonly auth = inject(AuthService);

  // Patient search (vitals are patient-scoped on the backend — GET /vitals/patient/:patientId).
  readonly searchQuery = signal('');
  readonly searching = signal(false);
  readonly patientResults = signal<Patient[]>([]);
  readonly selectedPatient = signal<Patient | null>(null);

  readonly vitals = signal<Vital[]>([]);
  readonly loading = signal(false);

  readonly showCreateModal = signal(false);
  readonly createForm = signal<CreateVitalDto>({
    patientId: '',
    height: undefined,
    weight: undefined,
    temperature: undefined,
    pulse: undefined,
    bpSystolic: undefined,
    bpDiastolic: undefined,
    respiratoryRate: undefined,
    spO2: undefined,
    painScale: undefined,
    triageNotes: undefined,
  });
  readonly saving = signal(false);

  readonly canManage = this.auth.hasPermission('vitals.manage');

  searchPatients(): void {
    const q = this.searchQuery().trim();
    if (!q) {
      return;
    }
    this.searching.set(true);
    this.patientsApi.search({ page: 1, limit: 10, q }).subscribe({
      next: (res: PaginatedResponse<Patient>) => {
        this.patientResults.set(res.data);
        this.searching.set(false);
      },
      error: () => this.searching.set(false),
    });
  }

  selectPatient(patient: Patient): void {
    this.selectedPatient.set(patient);
    this.patientResults.set([]);
    this.loadVitals(patient.id);
  }

  private loadVitals(patientId: string): void {
    this.loading.set(true);
    this.vitalsApi.listByPatient(patientId).subscribe({
      next: (vitals) => {
        this.vitals.set(vitals);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreateModal(): void {
    const patient = this.selectedPatient();
    if (!patient) {
      return;
    }
    this.createForm.set({ patientId: patient.id });
    this.showCreateModal.set(true);
  }

  submitCreate(): void {
    this.saving.set(true);
    this.vitalsApi.create(this.createForm()).subscribe({
      next: () => {
        this.saving.set(false);
        this.showCreateModal.set(false);
        this.loadVitals(this.createForm().patientId);
      },
      error: () => this.saving.set(false),
    });
  }

  voidVital(vital: Vital): void {
    this.confirmationService.confirm({
      header: 'Void Vitals',
      message: `Void this vitals reading from ${vital.recordedAt}? This cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Void', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.vitalsApi.voidVital(vital.id).subscribe({
          next: () => this.loadVitals(vital.patientId),
          error: () =>
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to void vitals' }),
        });
      },
    });
  }
}
