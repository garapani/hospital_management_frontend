import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TabsModule } from 'primeng/tabs';
import { SelectModule } from 'primeng/select';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableLazyLoadEvent } from 'primeng/table';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Observable } from 'rxjs';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { NursingApiService } from './nursing-api.service.js';
import {
  CreateAdministrationDto,
  CreateHandoffNoteDto,
  CreateTaskDto,
  MedicationAdministration,
  NursingTask,
  Shift,
  ShiftHandoffNote,
} from './nursing.model.js';
import { PatientsApiService } from '../patients/patients-api.service.js';
import { AdmissionsApiService, Admission } from '../admissions/admissions-api.service.js';
import { EntityName } from '../directory/entity-name.js';

const DEFAULT_PAGE_SIZE = 20;
const PATIENT_SEARCH_DEBOUNCE_MS = 300;
const EMPTY_TASK_FORM: CreateTaskDto = { admissionId: '', taskType: '', description: '' };
const EMPTY_ADMIN_FORM: CreateAdministrationDto = { admissionId: '', drugName: '', dose: '' };
const EMPTY_HANDOFF_FORM: CreateHandoffNoteDto = { admissionId: '', note: '' };

function patientLabel(p: { firstName: string; lastName: string; patientNo: string }): string {
  return `${p.firstName} ${p.lastName} (${p.patientNo})`;
}

@Component({
  imports: [DatePipe, FormsModule, TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, TextareaModule, TabsModule, SelectModule, PaginatorModule, EntityName],
  selector: 'hms-nursing-console',
  templateUrl: './nursing-console.html',
})
export class NursingConsole {
  private readonly api = inject(NursingApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly patientsApi = inject(PatientsApiService);
  private readonly admissionsApi = inject(AdmissionsApiService);
  readonly auth = inject(AuthService);
  readonly canManage = this.auth.hasPermission('nursing.manage');

  readonly admissionIdFilter = signal('');
  // Patient search picker, replacing a raw-UUID "Admission ID" text filter — a nurse can only
  // write vitals/tasks for one active admission per patient at a time, so picking the patient
  // resolves to their current admission automatically instead of asking for its UUID directly.
  readonly patientOptions = signal<{ label: string; value: string }[]>([]);
  readonly patientSearching = signal(false);
  private patientSearchTimer?: ReturnType<typeof setTimeout>;
  readonly selectedPatientId = signal<string | null>(null);
  readonly selectedAdmission = signal<Admission | null>(null);
  readonly resolvingAdmission = signal(false);

  readonly tasks = signal<NursingTask[]>([]);
  readonly tasksTotalRecords = signal(0);
  readonly tasksPageSize = signal(DEFAULT_PAGE_SIZE);
  readonly tasksFirstRecord = signal(0);
  readonly tasksLoading = signal(false);
  readonly showTaskModal = signal(false);
  readonly taskForm = signal<CreateTaskDto>(EMPTY_TASK_FORM);
  readonly taskDueAt = signal('');
  readonly taskSaving = signal(false);
  readonly taskError = signal<string | null>(null);
  readonly taskActionId = signal<string | null>(null);

  readonly administrations = signal<MedicationAdministration[]>([]);
  readonly administrationsTotalRecords = signal(0);
  readonly administrationsPageSize = signal(DEFAULT_PAGE_SIZE);
  readonly administrationsFirstRecord = signal(0);
  readonly administrationsLoading = signal(false);
  readonly showAdminModal = signal(false);
  readonly adminForm = signal<CreateAdministrationDto>(EMPTY_ADMIN_FORM);
  readonly adminScheduledAt = signal('');
  readonly adminSaving = signal(false);
  readonly adminError = signal<string | null>(null);
  readonly adminActionId = signal<string | null>(null);

  readonly showSkipModal = signal(false);
  readonly skipNotes = signal('');
  private skippingAdmin: MedicationAdministration | null = null;

  readonly handoffNotes = signal<ShiftHandoffNote[]>([]);
  readonly handoffTotalRecords = signal(0);
  readonly handoffPageSize = signal(DEFAULT_PAGE_SIZE);
  readonly handoffFirstRecord = signal(0);
  readonly handoffLoading = signal(false);
  readonly showHandoffModal = signal(false);
  readonly handoffForm = signal<CreateHandoffNoteDto>(EMPTY_HANDOFF_FORM);
  readonly handoffSaving = signal(false);
  readonly handoffError = signal<string | null>(null);
  readonly handoffAckId = signal<string | null>(null);
  readonly shiftOptions: { label: string; value: Shift }[] = [
    { label: 'Day', value: 'Day' },
    { label: 'Evening', value: 'Evening' },
    { label: 'Night', value: 'Night' },
  ];

  // Arriving from an Admission's "Nursing Tasks / MAR" link (?admissionId=...) applies that
  // filter immediately instead of landing on the unfiltered list — the nurse would otherwise have
  // to copy the Admission ID off the admission screen and paste it in here by hand. Subscribes
  // (not a one-time snapshot read) because Angular's route-reuse strategy keeps this component
  // instance alive across a query-params-only navigation back to the same path — e.g. clicking
  // the link again for a different admission without the page reloading in between.
  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const admissionId = params.get('admissionId');
      this.admissionIdFilter.set(admissionId ?? '');
      this.selectedAdmission.set(null);
      this.selectedPatientId.set(null);
      if (admissionId) {
        this.loadAdmissionContext(admissionId);
      }
      this.loadTasks(1, this.tasksPageSize());
      this.loadAdministrations(1, this.administrationsPageSize());
      this.loadHandoffNotes(1, this.handoffPageSize());
    });
  }

  /** Seeds the picker/context display for an admissionId that arrived via a query param (the
   *  Admission screen's "Nursing Tasks / MAR" link) rather than through the picker itself. */
  private loadAdmissionContext(admissionId: string): void {
    this.admissionsApi.getById(admissionId).subscribe({
      next: (admission) => {
        this.selectedAdmission.set(admission);
        this.selectedPatientId.set(admission.patientId);
        this.patientsApi.getById(admission.patientId).subscribe({
          next: (patient) => this.patientOptions.set([{ label: patientLabel(patient), value: patient.id }]),
          error: () => {},
        });
      },
      error: () => {},
    });
  }

  onPatientFilterSearch(query: string): void {
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

  /** A patient can only have one active admission at a time (backend-enforced), so selecting a
   *  patient resolves straight to it — no separate "pick which admission" step needed. */
  onPatientSelected(patientId: string | null): void {
    this.selectedPatientId.set(patientId);
    this.selectedAdmission.set(null);
    this.admissionIdFilter.set('');

    if (!patientId) {
      this.applyFilter();
      return;
    }

    this.resolvingAdmission.set(true);
    this.admissionsApi.list({ patientId, status: 'Admitted', page: 1, limit: 1 }).subscribe({
      next: (result) => {
        this.resolvingAdmission.set(false);
        const admission = result.data[0];
        if (!admission) {
          this.messageService.add({
            severity: 'warn',
            summary: 'No active admission',
            detail: 'This patient has no active admission right now.',
          });
          this.applyFilter();
          return;
        }
        this.selectedAdmission.set(admission);
        this.admissionIdFilter.set(admission.id);
        this.applyFilter();
      },
      error: () => {
        this.resolvingAdmission.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not look up this patient\'s admission.' });
      },
    });
  }

  applyFilter(): void {
    this.loadTasks(1, this.tasksPageSize());
    this.loadAdministrations(1, this.administrationsPageSize());
    this.loadHandoffNotes(1, this.handoffPageSize());
  }

  // --- Tasks ---

  onTasksLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.tasksPageSize();
    const page = Math.floor((event.first ?? 0) / rows) + 1;
    this.loadTasks(page, rows);
  }

  loadTasks(page: number, limit: number): void {
    this.tasksLoading.set(true);
    this.tasksFirstRecord.set((page - 1) * limit);
    this.api.listTasks(this.admissionIdFilter() || undefined, page, limit).subscribe({
      next: (result) => {
        this.tasks.set(result.data);
        this.tasksTotalRecords.set(result.meta.total);
        this.tasksLoading.set(false);
      },
      error: () => {
        this.tasksLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load nursing tasks.' });
      },
    });
  }

  openTaskModal(): void {
    this.taskForm.set({ ...EMPTY_TASK_FORM, admissionId: this.admissionIdFilter() });
    this.taskDueAt.set('');
    this.taskError.set(null);
    this.showTaskModal.set(true);
  }

  submitTask(): void {
    this.taskSaving.set(true);
    this.taskError.set(null);
    const dueAt = this.taskDueAt();
    this.api.createTask({ ...this.taskForm(), dueAt: dueAt ? new Date(dueAt).toISOString() : undefined }).subscribe({
      next: () => {
        this.taskSaving.set(false);
        this.showTaskModal.set(false);
        this.loadTasks(1, this.tasksPageSize());
        this.messageService.add({ severity: 'success', summary: 'Task created', detail: this.taskForm().taskType });
      },
      error: (err: ApiError) => {
        this.taskSaving.set(false);
        this.taskError.set(err.message || 'Failed to save the task.');
      },
    });
  }

  startTask(task: NursingTask): void {
    this.runTaskAction(task.id, this.api.startTask(task.id), 'Task started');
  }

  completeTask(task: NursingTask): void {
    this.runTaskAction(task.id, this.api.completeTask(task.id), 'Task completed');
  }

  cancelTask(task: NursingTask): void {
    this.confirmationService.confirm({
      header: 'Cancel Task',
      message: `Cancel the "${task.taskType}" task?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Cancel Task', severity: 'danger' },
      rejectButtonProps: { label: 'Back', severity: 'secondary', outlined: true },
      accept: () => this.runTaskAction(task.id, this.api.cancelTask(task.id), 'Task cancelled'),
    });
  }

  private runTaskAction(id: string, action$: Observable<NursingTask>, successSummary: string): void {
    this.taskActionId.set(id);
    action$.subscribe({
      next: () => {
        this.taskActionId.set(null);
        this.loadTasks(1, this.tasksPageSize());
        this.messageService.add({ severity: 'success', summary: successSummary });
      },
      error: (err: ApiError) => {
        this.taskActionId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message || 'Please try again.' });
      },
    });
  }

  // --- Medication administration (MAR) ---

  onAdministrationsLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.administrationsPageSize();
    const page = Math.floor((event.first ?? 0) / rows) + 1;
    this.loadAdministrations(page, rows);
  }

  loadAdministrations(page: number, limit: number): void {
    this.administrationsLoading.set(true);
    this.administrationsFirstRecord.set((page - 1) * limit);
    this.api.listAdministrations(this.admissionIdFilter() || undefined, page, limit).subscribe({
      next: (result) => {
        this.administrations.set(result.data);
        this.administrationsTotalRecords.set(result.meta.total);
        this.administrationsLoading.set(false);
      },
      error: () => {
        this.administrationsLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load the medication administration record.' });
      },
    });
  }

  openAdminModal(): void {
    this.adminForm.set({ ...EMPTY_ADMIN_FORM, admissionId: this.admissionIdFilter() });
    this.adminScheduledAt.set('');
    this.adminError.set(null);
    this.showAdminModal.set(true);
  }

  submitAdmin(): void {
    this.adminSaving.set(true);
    this.adminError.set(null);
    const scheduledAt = this.adminScheduledAt();
    this.api
      .createAdministration({ ...this.adminForm(), scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined })
      .subscribe({
        next: () => {
          this.adminSaving.set(false);
          this.showAdminModal.set(false);
          this.loadAdministrations(1, this.administrationsPageSize());
          this.messageService.add({ severity: 'success', summary: 'Medication scheduled', detail: this.adminForm().drugName });
        },
        error: (err: ApiError) => {
          this.adminSaving.set(false);
          this.adminError.set(err.message || 'Failed to schedule the administration.');
        },
      });
  }

  administer(admin: MedicationAdministration): void {
    this.confirmationService.confirm({
      header: 'Administer Dose',
      message: `Record "${admin.drugName}" (${admin.dose}) as administered?`,
      icon: 'pi pi-check-circle',
      acceptButtonProps: { label: 'Administer', severity: 'success' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.adminActionId.set(admin.id);
        this.api.administer(admin.id).subscribe({
          next: () => {
            this.adminActionId.set(null);
            this.loadAdministrations(1, this.administrationsPageSize());
            this.messageService.add({ severity: 'success', summary: 'Dose administered', detail: admin.drugName });
          },
          error: (err: ApiError) => {
            this.adminActionId.set(null);
            this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message || 'Please try again.' });
          },
        });
      },
    });
  }

  openSkipModal(admin: MedicationAdministration): void {
    this.skippingAdmin = admin;
    this.skipNotes.set('');
    this.showSkipModal.set(true);
  }

  confirmSkip(): void {
    const admin = this.skippingAdmin;
    const notes = this.skipNotes().trim();
    if (!admin || !notes) return;

    this.adminActionId.set(admin.id);
    this.api.skipAdministration(admin.id, notes).subscribe({
      next: () => {
        this.adminActionId.set(null);
        this.showSkipModal.set(false);
        this.loadAdministrations(1, this.administrationsPageSize());
        this.messageService.add({ severity: 'success', summary: 'Dose skipped', detail: admin.drugName });
      },
      error: (err: ApiError) => {
        this.adminActionId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message || 'Please try again.' });
      },
    });
  }

  // --- Shift handoff notes ---

  onHandoffPageChange(event: PaginatorState): void {
    const rows = event.rows ?? this.handoffPageSize();
    const page = Math.floor((event.first ?? 0) / rows) + 1;
    this.loadHandoffNotes(page, rows);
  }

  loadHandoffNotes(page: number, limit: number): void {
    this.handoffLoading.set(true);
    this.handoffFirstRecord.set((page - 1) * limit);
    this.api.listHandoffNotes(this.admissionIdFilter() || undefined, page, limit).subscribe({
      next: (result) => {
        this.handoffNotes.set(result.data);
        this.handoffTotalRecords.set(result.meta.total);
        this.handoffLoading.set(false);
      },
      error: () => {
        this.handoffLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load shift handoff notes.' });
      },
    });
  }

  openHandoffModal(): void {
    this.handoffForm.set({ ...EMPTY_HANDOFF_FORM, admissionId: this.admissionIdFilter() });
    this.handoffError.set(null);
    this.showHandoffModal.set(true);
  }

  submitHandoffNote(): void {
    this.handoffSaving.set(true);
    this.handoffError.set(null);
    this.api.createHandoffNote(this.handoffForm()).subscribe({
      next: () => {
        this.handoffSaving.set(false);
        this.showHandoffModal.set(false);
        this.loadHandoffNotes(1, this.handoffPageSize());
        this.messageService.add({ severity: 'success', summary: 'Handoff note added' });
      },
      error: (err: ApiError) => {
        this.handoffSaving.set(false);
        this.handoffError.set(err.message || 'Failed to save the handoff note.');
      },
    });
  }

  acknowledgeHandoffNote(note: ShiftHandoffNote): void {
    this.handoffAckId.set(note.id);
    this.api.acknowledgeHandoffNote(note.id).subscribe({
      next: () => {
        this.handoffAckId.set(null);
        this.loadHandoffNotes(1, this.handoffPageSize());
        this.messageService.add({ severity: 'success', summary: 'Note acknowledged' });
      },
      error: (err: ApiError) => {
        this.handoffAckId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message || 'Please try again.' });
      },
    });
  }
}
