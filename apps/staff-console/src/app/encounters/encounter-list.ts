import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { TabsModule } from 'primeng/tabs';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuthService } from '@org/auth';
import { PatientsApiService, Patient, PaginatedResponse } from '../patients/patients-api.service.js';
import {
  ClinicalNote,
  CreateDiagnosisDto,
  CreateNoteDto,
  CreatePrescriptionDto,
  Diagnosis,
  EncountersApiService,
  Prescription,
} from './encounters-api.service.js';

type ActiveTab = 'notes' | 'diagnoses' | 'prescriptions';

@Component({
  selector: 'hms-encounter-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    InputNumberModule,
    TabsModule,
    CheckboxModule,
  ],
  templateUrl: './encounter-list.html',
})
export class EncounterList {
  private readonly encountersApi = inject(EncountersApiService);
  private readonly patientsApi = inject(PatientsApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  readonly auth = inject(AuthService);

  // Patient search (encounter data is patient-scoped on the backend).
  readonly searchQuery = signal('');
  readonly searching = signal(false);
  readonly patientResults = signal<Patient[]>([]);
  readonly selectedPatient = signal<Patient | null>(null);

  readonly activeTab = signal<ActiveTab>('notes');
  readonly loading = signal(false);

  readonly notes = signal<ClinicalNote[]>([]);
  readonly diagnoses = signal<Diagnosis[]>([]);
  readonly prescriptions = signal<Prescription[]>([]);

  // Note dialog
  readonly showNoteModal = signal(false);
  readonly noteForm = signal<CreateNoteDto>({ patientId: '', doctorId: '' });
  readonly savingNote = signal(false);

  // Diagnosis dialog
  readonly showDiagnosisModal = signal(false);
  readonly diagnosisForm = signal<CreateDiagnosisDto>({ patientId: '', doctorId: '', description: '' });
  readonly savingDiagnosis = signal(false);

  // Prescription dialog
  readonly showPrescriptionModal = signal(false);
  readonly prescriptionForm = signal<CreatePrescriptionDto>({
    patientId: '',
    doctorId: '',
    medicationName: '',
    dosage: '',
    frequency: '',
    route: 'Oral',
    durationDays: 1,
  });
  readonly savingPrescription = signal(false);

  readonly canManage = this.auth.hasPermission('encounter.manage');

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
    this.reloadAll(patient.id);
  }

  private reloadAll(patientId: string): void {
    this.loading.set(true);
    void Promise.all([
      this.loadNotes(patientId),
      this.loadDiagnoses(patientId),
      this.loadPrescriptions(patientId),
    ]).finally(() => this.loading.set(false));
  }

  private loadNotes(patientId: string): Promise<void> {
    return new Promise((resolve) => {
      this.encountersApi.notesByPatient(patientId).subscribe({
        next: (notes) => {
          this.notes.set(notes);
          resolve();
        },
        error: () => resolve(),
      });
    });
  }

  private loadDiagnoses(patientId: string): Promise<void> {
    return new Promise((resolve) => {
      this.encountersApi.diagnosesByPatient(patientId).subscribe({
        next: (diagnoses) => {
          this.diagnoses.set(diagnoses);
          resolve();
        },
        error: () => resolve(),
      });
    });
  }

  private loadPrescriptions(patientId: string): Promise<void> {
    return new Promise((resolve) => {
      this.encountersApi.prescriptionsByPatient(patientId).subscribe({
        next: (prescriptions) => {
          this.prescriptions.set(prescriptions);
          resolve();
        },
        error: () => resolve(),
      });
    });
  }

  private doctorId(): string {
    return this.auth.currentUser()?.sub ?? '';
  }

  openNoteModal(note?: ClinicalNote): void {
    const patient = this.selectedPatient();
    if (!patient) {
      return;
    }
    this.noteForm.set(
      note
        ? {
            patientId: patient.id,
            doctorId: this.doctorId(),
            chiefComplaint: note.chiefComplaint ?? '',
            historyOfPresentingIllness: note.historyOfPresentingIllness ?? '',
            physicalExamination: note.physicalExamination ?? '',
            plan: note.plan ?? '',
          }
        : { patientId: patient.id, doctorId: this.doctorId() },
    );
    this.editingNoteId.set(note?.id ?? null);
    this.showNoteModal.set(true);
  }

  private readonly editingNoteId = signal<string | null>(null);

  submitNote(): void {
    const patientId = this.selectedPatient()?.id;
    if (!patientId) {
      return;
    }
    this.savingNote.set(true);
    const editingId = this.editingNoteId();
    const request = editingId
      ? this.encountersApi.updateNote(editingId, this.noteForm())
      : this.encountersApi.createNote(this.noteForm());
    request.subscribe({
      next: () => {
        this.savingNote.set(false);
        this.showNoteModal.set(false);
        this.reloadAll(patientId);
      },
      error: () => this.savingNote.set(false),
    });
  }

  openDiagnosisModal(): void {
    const patient = this.selectedPatient();
    if (!patient) {
      return;
    }
    this.diagnosisForm.set({ patientId: patient.id, doctorId: this.doctorId(), description: '' });
    this.showDiagnosisModal.set(true);
  }

  submitDiagnosis(): void {
    const patientId = this.selectedPatient()?.id;
    if (!patientId) {
      return;
    }
    this.savingDiagnosis.set(true);
    this.encountersApi.createDiagnosis(this.diagnosisForm()).subscribe({
      next: () => {
        this.savingDiagnosis.set(false);
        this.showDiagnosisModal.set(false);
        this.reloadAll(patientId);
      },
      error: () => this.savingDiagnosis.set(false),
    });
  }

  deleteDiagnosis(diagnosis: Diagnosis): void {
    this.confirmationService.confirm({
      header: 'Delete Diagnosis',
      message: `Delete the diagnosis "${diagnosis.description}"? This cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.encountersApi.deleteDiagnosis(diagnosis.id).subscribe({
          next: () => {
            const patientId = this.selectedPatient()?.id;
            if (patientId) {
              this.reloadAll(patientId);
            }
          },
          error: () =>
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete diagnosis' }),
        });
      },
    });
  }

  openPrescriptionModal(): void {
    const patient = this.selectedPatient();
    if (!patient) {
      return;
    }
    this.prescriptionForm.set({
      patientId: patient.id,
      doctorId: this.doctorId(),
      medicationName: '',
      dosage: '',
      frequency: '',
      route: 'Oral',
      durationDays: 1,
    });
    this.showPrescriptionModal.set(true);
  }

  submitPrescription(): void {
    const patientId = this.selectedPatient()?.id;
    if (!patientId) {
      return;
    }
    this.savingPrescription.set(true);
    this.encountersApi.createPrescription(this.prescriptionForm()).subscribe({
      next: () => {
        this.savingPrescription.set(false);
        this.showPrescriptionModal.set(false);
        this.reloadAll(patientId);
      },
      error: () => this.savingPrescription.set(false),
    });
  }

  deletePrescription(prescription: Prescription): void {
    this.confirmationService.confirm({
      header: 'Delete Prescription',
      message: `Delete the prescription for "${prescription.medicationName}"? This cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.encountersApi.deletePrescription(prescription.id).subscribe({
          next: () => {
            const patientId = this.selectedPatient()?.id;
            if (patientId) {
              this.reloadAll(patientId);
            }
          },
          error: () =>
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete prescription' }),
        });
      },
    });
  }
}
