import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { PaginatorModule } from 'primeng/paginator';
import { AuthService } from '@org/auth';

import { PatientsApiService, Patient, CreatePatientDto } from './patients-api.service.js';
import { calculateAge } from './patient.model.js';
import { VitalsApiService, Vital, CreateVitalDto } from './vitals-api.service.js';
import {
  EncountersApiService,
  ClinicalNote,
  Diagnosis,
  Prescription,
  CreateNoteDto,
  CreateDiagnosisDto,
  CreatePrescriptionDto,
} from './encounters-api.service.js';

type EditFormState = Partial<CreatePatientDto>;
type VitalFormState = Omit<CreateVitalDto, 'patientId'>;
type NoteFormState = Omit<CreateNoteDto, 'patientId' | 'doctorId'>;
type DiagnosisFormState = Omit<CreateDiagnosisDto, 'patientId' | 'doctorId'>;
type PrescriptionFormState = Omit<CreatePrescriptionDto, 'patientId' | 'doctorId'>;

@Component({
  selector: 'hms-patient-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TagModule,
    ToastModule,
    TabsModule,
    TableModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    CheckboxModule,
    PaginatorModule,
  ],
  providers: [MessageService],
  templateUrl: './patient-detail.html',
})
export class PatientDetail implements OnInit {
  private api = inject(PatientsApiService);
  private vitalsApi = inject(VitalsApiService);
  private encountersApi = inject(EncountersApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService);
  readonly auth = inject(AuthService);

  readonly patient = signal<Patient | null>(null);
  readonly loading = signal(true);
  readonly activeTab = signal('appointments');
  readonly age = calculateAge;

  readonly showEditModal = signal(false);
  readonly editForm = signal<EditFormState>({});
  readonly editSaving = signal(false);

  readonly vitals = signal<Vital[]>([]);
  readonly vitalsLoading = signal(false);
  readonly showVitalModal = signal(false);
  readonly vitalForm = signal<VitalFormState>({});
  readonly vitalSaving = signal(false);

  readonly notes = signal<ClinicalNote[]>([]);
  readonly notesLoading = signal(false);
  readonly showNoteModal = signal(false);
  readonly noteForm = signal<NoteFormState>({});
  readonly noteSaving = signal(false);
  readonly notesPageSize = 10;
  readonly notesFirst = signal(0);
  readonly pagedNotes = computed(() => this.notes().slice(this.notesFirst(), this.notesFirst() + this.notesPageSize));

  readonly diagnoses = signal<Diagnosis[]>([]);
  readonly diagnosesLoading = signal(false);
  readonly showDiagnosisModal = signal(false);
  readonly diagnosisForm = signal<DiagnosisFormState>({ description: '' });
  readonly diagnosisSaving = signal(false);

  readonly prescriptions = signal<Prescription[]>([]);
  readonly prescriptionsLoading = signal(false);
  readonly showPrescriptionModal = signal(false);
  readonly prescriptionForm = signal<PrescriptionFormState>({
    medicationName: '',
    dosage: '',
    frequency: '',
    route: '',
    durationDays: 1,
  });
  readonly prescriptionSaving = signal(false);

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadPatient(id);
        if (this.auth.hasPermission('vitals.read')) {
          this.loadVitals(id);
        }
        if (this.auth.hasPermission('encounter.read')) {
          this.loadNotes(id);
          this.loadDiagnoses(id);
          this.loadPrescriptions(id);
        }
      }
    });
  }

  loadPatient(id: string) {
    this.loading.set(true);
    this.api.getById(id).subscribe({
      next: (data) => {
        this.patient.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load patient profile',
        });
        this.loading.set(false);
      },
    });
  }

  goBack() {
    this.router.navigate(['/clinical/patients']);
  }

  bookAppointment(patient: Patient) {
    this.router.navigate(['/clinical/appointments'], {
      queryParams: {
        patientId: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        contactNumber: patient.phoneNumber,
      },
    });
  }

  startEncounter() {
    this.activeTab.set('notes');
    this.openNoteModal();
  }

  // --- Edit Profile ---
  openEditModal() {
    const p = this.patient();
    if (!p) return;
    this.editForm.set({
      firstName: p.firstName,
      middleName: p.middleName,
      lastName: p.lastName,
      gender: p.gender,
      dateOfBirth: p.dateOfBirth,
      bloodGroup: p.bloodGroup,
      phoneNumber: p.phoneNumber,
      email: p.email,
      governmentIdType: p.governmentIdType,
      governmentIdNumber: p.governmentIdNumber,
    });
    this.showEditModal.set(true);
  }

  submitEdit() {
    const patientId = this.patient()?.id;
    if (!patientId) return;

    this.editSaving.set(true);
    this.api.update(patientId, this.editForm()).subscribe({
      next: (updated) => {
        this.patient.set(updated);
        this.editSaving.set(false);
        this.showEditModal.set(false);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Profile updated' });
      },
      error: () => {
        this.editSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update profile' });
      },
    });
  }

  // --- Vitals ---
  loadVitals(patientId: string) {
    this.vitalsLoading.set(true);
    this.vitalsApi.listByPatient(patientId).subscribe({
      next: (data) => {
        this.vitals.set(data);
        this.vitalsLoading.set(false);
      },
      error: () => this.vitalsLoading.set(false),
    });
  }

  openVitalModal() {
    const latest = this.vitals()[0];
    this.vitalForm.set(
      latest
        ? {
            height: latest.height,
            weight: latest.weight,
            temperature: latest.temperature,
            pulse: latest.pulse,
            bpSystolic: latest.bpSystolic,
            bpDiastolic: latest.bpDiastolic,
            respiratoryRate: latest.respiratoryRate,
            spO2: latest.spO2,
            painScale: latest.painScale,
            triageNotes: latest.triageNotes,
          }
        : {},
    );
    this.showVitalModal.set(true);
  }

  submitVital() {
    const patientId = this.patient()?.id;
    if (!patientId) return;

    this.vitalSaving.set(true);
    this.vitalsApi.create({ ...this.vitalForm(), patientId }).subscribe({
      next: () => {
        this.vitalSaving.set(false);
        this.showVitalModal.set(false);
        this.loadVitals(patientId);
      },
      error: () => {
        this.vitalSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save vitals' });
      },
    });
  }

  // --- Notes ---
  loadNotes(patientId: string) {
    this.notesLoading.set(true);
    this.encountersApi.getNotesByPatient(patientId).subscribe({
      next: (data) => {
        this.notes.set(data);
        this.notesFirst.set(0);
        this.notesLoading.set(false);
      },
      error: () => this.notesLoading.set(false),
    });
  }

  openNoteModal() {
    this.noteForm.set({});
    this.showNoteModal.set(true);
  }

  submitNote() {
    const patientId = this.patient()?.id;
    const doctorId = this.auth.currentUser()?.sub;
    if (!patientId || !doctorId) return;

    this.noteSaving.set(true);
    this.encountersApi.createNote({ ...this.noteForm(), patientId, doctorId }).subscribe({
      next: () => {
        this.noteSaving.set(false);
        this.showNoteModal.set(false);
        this.loadNotes(patientId);
      },
      error: () => {
        this.noteSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save note' });
      },
    });
  }

  // --- Diagnoses ---
  loadDiagnoses(patientId: string) {
    this.diagnosesLoading.set(true);
    this.encountersApi.getDiagnosesByPatient(patientId).subscribe({
      next: (data) => {
        this.diagnoses.set(data);
        this.diagnosesLoading.set(false);
      },
      error: () => this.diagnosesLoading.set(false),
    });
  }

  openDiagnosisModal() {
    this.diagnosisForm.set({ description: '' });
    this.showDiagnosisModal.set(true);
  }

  submitDiagnosis() {
    const patientId = this.patient()?.id;
    const doctorId = this.auth.currentUser()?.sub;
    if (!patientId || !doctorId) return;

    this.diagnosisSaving.set(true);
    this.encountersApi.createDiagnosis({ ...this.diagnosisForm(), patientId, doctorId }).subscribe({
      next: () => {
        this.diagnosisSaving.set(false);
        this.showDiagnosisModal.set(false);
        this.loadDiagnoses(patientId);
      },
      error: () => {
        this.diagnosisSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save diagnosis' });
      },
    });
  }

  removeDiagnosis(diagnosis: Diagnosis) {
    const patientId = this.patient()?.id;
    if (!patientId) return;
    this.encountersApi.deleteDiagnosis(diagnosis.id).subscribe({
      next: () => this.loadDiagnoses(patientId),
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete diagnosis' });
      },
    });
  }

  // --- Prescriptions ---
  loadPrescriptions(patientId: string) {
    this.prescriptionsLoading.set(true);
    this.encountersApi.getPrescriptionsByPatient(patientId).subscribe({
      next: (data) => {
        this.prescriptions.set(data);
        this.prescriptionsLoading.set(false);
      },
      error: () => this.prescriptionsLoading.set(false),
    });
  }

  openPrescriptionModal() {
    this.prescriptionForm.set({ medicationName: '', dosage: '', frequency: '', route: '', durationDays: 1 });
    this.showPrescriptionModal.set(true);
  }

  submitPrescription() {
    const patientId = this.patient()?.id;
    const doctorId = this.auth.currentUser()?.sub;
    if (!patientId || !doctorId) return;

    this.prescriptionSaving.set(true);
    this.encountersApi.createPrescription({ ...this.prescriptionForm(), patientId, doctorId }).subscribe({
      next: () => {
        this.prescriptionSaving.set(false);
        this.showPrescriptionModal.set(false);
        this.loadPrescriptions(patientId);
      },
      error: () => {
        this.prescriptionSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save prescription' });
      },
    });
  }

  removePrescription(prescription: Prescription) {
    const patientId = this.patient()?.id;
    if (!patientId) return;
    this.encountersApi.deletePrescription(prescription.id).subscribe({
      next: () => this.loadPrescriptions(patientId),
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete prescription' });
      },
    });
  }
}
