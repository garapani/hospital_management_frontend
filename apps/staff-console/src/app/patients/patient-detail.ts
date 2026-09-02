import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { PaginatorModule } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@org/auth';

import { PatientsApiService, Patient, CreatePatientDto } from './patients-api.service.js';
import { openPdfBlobInNewTab } from '../shared/pdf-blob.util.js';
import { calculateAge, isValidEmail, isValidPhoneNumber } from './patient.model.js';
import { VitalsApiService, Vital, CreateVitalDto } from '../vitals/vitals-api.service.js';
import {
  EncountersApiService,
  ClinicalNote,
  Diagnosis,
  Prescription,
  CreateNoteDto,
  CreateDiagnosisDto,
  CreatePrescriptionDto,
} from '../encounters/encounters-api.service.js';
import { AppointmentsApiService, Appointment } from '../appointments/appointments-api.service.js';
import { appointmentStatusSeverity } from '../appointments/appointment.model.js';
import { AdmissionsApiService, Admission } from '../admissions/admissions-api.service.js';
import { admissionStatusSeverity, admissionSourceSeverity } from '../admissions/admission.model.js';
import { OrdersApiService, Order } from '../orders/orders-api.service.js';
import { InvoicesApiService } from '../billing/invoices-api.service.js';
import { Invoice, invoiceReference, statusSeverity as invoiceStatusSeverity } from '../billing/invoice.model.js';

// The backend's paginate() default (20) otherwise silently truncates a patient's chart tabs; these
// embedded tabs page over the fetched rows client-side (p-table [paginator]="true") rather than a
// second, server-side paginator, so the fix is one large-enough fetch rather than a lazy table.
const PATIENT_CHART_TAB_LIMIT = 200;

function noteStatusSeverity(status: string): 'success' | 'warn' | 'secondary' {
  return status === 'Signed' ? 'success' : 'warn';
}

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
    ConfirmDialogModule,
    TabsModule,
    TableModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    CheckboxModule,
    PaginatorModule,
    SelectModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './patient-detail.html',
})
export class PatientDetail implements OnInit {
  private api = inject(PatientsApiService);
  private vitalsApi = inject(VitalsApiService);
  private encountersApi = inject(EncountersApiService);
  private appointmentsApi = inject(AppointmentsApiService);
  private admissionsApi = inject(AdmissionsApiService);
  private ordersApi = inject(OrdersApiService);
  private invoicesApi = inject(InvoicesApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  readonly auth = inject(AuthService);
  readonly appointmentStatusSeverity = appointmentStatusSeverity;
  readonly admissionStatusSeverity = admissionStatusSeverity;
  readonly admissionSourceSeverity = admissionSourceSeverity;
  readonly invoiceReference = invoiceReference;
  readonly invoiceStatusSeverity = invoiceStatusSeverity;

  readonly patient = signal<Patient | null>(null);
  readonly loading = signal(true);
  readonly activeTab = signal('appointments');
  readonly age = calculateAge;
  readonly isValidPhoneNumber = isValidPhoneNumber;
  readonly isValidEmail = isValidEmail;

  readonly printingLabel = signal(false);

  readonly showEditModal = signal(false);
  readonly editForm = signal<EditFormState>({});
  readonly editSaving = signal(false);
  readonly genderOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' },
    { label: 'Unknown', value: 'Unknown' },
  ];
  readonly bloodGroupOptions = [
    { label: 'A+', value: 'A+' },
    { label: 'A-', value: 'A-' },
    { label: 'B+', value: 'B+' },
    { label: 'B-', value: 'B-' },
    { label: 'O+', value: 'O+' },
    { label: 'O-', value: 'O-' },
    { label: 'AB+', value: 'AB+' },
    { label: 'AB-', value: 'AB-' },
    { label: 'Unknown', value: 'Unknown' },
  ];

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
  readonly signingNoteId = signal<string | null>(null);
  readonly noteStatusSeverity = noteStatusSeverity;
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

  readonly appointments = signal<Appointment[]>([]);
  readonly appointmentsLoading = signal(false);

  readonly admissions = signal<Admission[]>([]);
  readonly admissionsLoading = signal(false);

  readonly orders = signal<Order[]>([]);
  readonly ordersLoading = signal(false);

  readonly invoices = signal<Invoice[]>([]);
  readonly invoicesLoading = signal(false);

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
        if (this.auth.hasPermission('appointment.read')) {
          this.loadAppointments(id);
        }
        if (this.auth.hasPermission('admission.read')) {
          this.loadAdmissions(id);
        }
        if (this.auth.hasPermission('order.read')) {
          this.loadOrders(id);
        }
        if (this.auth.hasPermission('billing.manage')) {
          this.loadInvoices(id);
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

  /** Opens the ID label PDF in a new tab — the browser's own viewer handles print (Ctrl+P);
   *  this is a printable label, not a document to save, so no forced download. */
  printIdLabel() {
    const patientId = this.patient()?.id;
    if (!patientId) return;

    this.printingLabel.set(true);
    this.api.getIdLabelPdf(patientId).subscribe({
      next: (blob) => {
        this.printingLabel.set(false);
        openPdfBlobInNewTab(blob);
      },
      error: () => {
        this.printingLabel.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to generate the ID label' });
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
      allergies: p.allergies,
      phoneNumber: p.phoneNumber,
      email: p.email,
      governmentIdType: p.governmentIdType,
      governmentIdNumber: p.governmentIdNumber,
      insuranceProvider: p.insuranceProvider,
      insurancePolicyNumber: p.insurancePolicyNumber,
    });
    this.showEditModal.set(true);
  }

  submitEdit() {
    const patientId = this.patient()?.id;
    if (!patientId) return;

    this.editSaving.set(true);
    const form = this.editForm();
    // dateOfBirth/phoneNumber/email carry format validators server-side (@IsDateString,
    // @Matches, @IsEmail); @IsOptional() only skips undefined/null, not '', so clearing one of
    // these fields down to blank must send undefined, not an empty string.
    const payload = {
      ...form,
      dateOfBirth: form.dateOfBirth || undefined,
      phoneNumber: form.phoneNumber || undefined,
      email: form.email || undefined,
    };
    this.api.update(patientId, payload).subscribe({
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
      error: () => {
        this.vitalsLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load vitals' });
      },
    });
  }

  openVitalModal() {
    // Only height/weight carry forward from the previous reading — they change slowly and a nurse
    // recording, say, a new temperature shouldn't have to re-enter them. Point-in-time measurements
    // (temperature, pulse, BP, respiratory rate, SpO2, pain score) and free-text notes must not
    // carry forward: pre-filling them produced fabricated vitals a nurse could save unmodified.
    const latest = this.vitals()[0];
    this.vitalForm.set(latest ? { height: latest.height ?? undefined, weight: latest.weight ?? undefined } : {});
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
    this.encountersApi.getNotesByPatient(patientId, PATIENT_CHART_TAB_LIMIT).subscribe({
      next: (result) => {
        this.notes.set(result.data);
        this.notesFirst.set(0);
        this.notesLoading.set(false);
      },
      error: () => {
        this.notesLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load clinical notes' });
      },
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

  signNote(note: ClinicalNote): void {
    const patientId = this.patient()?.id;
    if (!patientId) return;

    this.confirmationService.confirm({
      header: 'Sign & Lock Note',
      message: 'Signing locks this note permanently — it can no longer be edited. Continue?',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Sign & Lock', severity: 'success' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.signingNoteId.set(note.id);
        this.encountersApi.updateNote(note.id, { status: 'Signed' }).subscribe({
          next: () => {
            this.signingNoteId.set(null);
            this.loadNotes(patientId);
            this.messageService.add({ severity: 'success', summary: 'Note signed and locked' });
          },
          error: () => {
            this.signingNoteId.set(null);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to sign the note' });
          },
        });
      },
    });
  }

  // --- Diagnoses ---
  loadDiagnoses(patientId: string) {
    this.diagnosesLoading.set(true);
    this.encountersApi.getDiagnosesByPatient(patientId, PATIENT_CHART_TAB_LIMIT).subscribe({
      next: (result) => {
        this.diagnoses.set(result.data);
        this.diagnosesLoading.set(false);
      },
      error: () => {
        this.diagnosesLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load diagnoses' });
      },
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
    this.confirmationService.confirm({
      header: 'Delete Diagnosis',
      message: `Delete the diagnosis "${diagnosis.description}"? This cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.encountersApi.deleteDiagnosis(diagnosis.id).subscribe({
          next: () => this.loadDiagnoses(patientId),
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete diagnosis' });
          },
        });
      },
    });
  }

  // --- Prescriptions ---
  loadPrescriptions(patientId: string) {
    this.prescriptionsLoading.set(true);
    this.encountersApi.getPrescriptionsByPatient(patientId, PATIENT_CHART_TAB_LIMIT).subscribe({
      next: (result) => {
        this.prescriptions.set(result.data);
        this.prescriptionsLoading.set(false);
      },
      error: () => {
        this.prescriptionsLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load prescriptions' });
      },
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
    this.confirmationService.confirm({
      header: 'Delete Prescription',
      message: `Delete the prescription for "${prescription.medicationName}"? This cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.encountersApi.deletePrescription(prescription.id).subscribe({
          next: () => this.loadPrescriptions(patientId),
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete prescription' });
          },
        });
      },
    });
  }

  // --- Appointments ---
  loadAppointments(patientId: string) {
    this.appointmentsLoading.set(true);
    this.appointmentsApi.list({ patientId, limit: PATIENT_CHART_TAB_LIMIT }).subscribe({
      next: (result) => {
        this.appointments.set(result.data);
        this.appointmentsLoading.set(false);
      },
      error: () => {
        this.appointmentsLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load appointments' });
      },
    });
  }

  viewAppointment(appointment: Appointment) {
    this.router.navigate(['/clinical/appointments', appointment.id]);
  }

  // --- Admissions ---
  loadAdmissions(patientId: string) {
    this.admissionsLoading.set(true);
    this.admissionsApi.list({ patientId, limit: PATIENT_CHART_TAB_LIMIT }).subscribe({
      next: (result) => {
        this.admissions.set(result.data);
        this.admissionsLoading.set(false);
      },
      error: () => {
        this.admissionsLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load admissions' });
      },
    });
  }

  viewAdmission(admission: Admission) {
    this.router.navigate(['/admissions', admission.id]);
  }

  // --- Orders ---
  loadOrders(patientId: string) {
    this.ordersLoading.set(true);
    this.ordersApi.list({ patientId, limit: PATIENT_CHART_TAB_LIMIT }).subscribe({
      next: (result) => {
        this.orders.set(result.data);
        this.ordersLoading.set(false);
      },
      error: () => {
        this.ordersLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load orders' });
      },
    });
  }

  viewOrder(order: Order) {
    this.router.navigate(['/clinical/orders', order.id]);
  }

  // --- Invoices ---
  loadInvoices(patientId: string) {
    this.invoicesLoading.set(true);
    this.invoicesApi.list({ patientId, limit: PATIENT_CHART_TAB_LIMIT }).subscribe({
      next: (result) => {
        this.invoices.set(result.data);
        this.invoicesLoading.set(false);
      },
      error: () => {
        this.invoicesLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load invoices' });
      },
    });
  }

  viewInvoice(invoice: Invoice) {
    this.router.navigate(['/billing/invoices', invoice.id]);
  }
}
