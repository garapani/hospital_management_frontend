import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { Observable } from 'rxjs';
import { ApiError } from '@org/api-client';
import { NursingApiService } from './nursing-api.service.js';
import {
  CreateAdministrationDto,
  CreateTaskDto,
  MedicationAdministration,
  NursingTask,
} from './nursing.model.js';

const EMPTY_TASK_FORM: CreateTaskDto = { admissionId: '', taskType: '', description: '' };
const EMPTY_ADMIN_FORM: CreateAdministrationDto = { admissionId: '', drugName: '', dose: '' };

@Component({
  imports: [DatePipe, FormsModule, TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, TabsModule],
  selector: 'hms-nursing-console',
  templateUrl: './nursing-console.html',
})
export class NursingConsole {
  private readonly api = inject(NursingApiService);
  private readonly messageService = inject(MessageService);

  readonly admissionIdFilter = signal('');

  readonly tasks = signal<NursingTask[]>([]);
  readonly tasksLoading = signal(false);
  readonly showTaskModal = signal(false);
  readonly taskForm = signal<CreateTaskDto>(EMPTY_TASK_FORM);
  readonly taskSaving = signal(false);
  readonly taskError = signal<string | null>(null);
  readonly taskActionId = signal<string | null>(null);

  readonly administrations = signal<MedicationAdministration[]>([]);
  readonly administrationsLoading = signal(false);
  readonly showAdminModal = signal(false);
  readonly adminForm = signal<CreateAdministrationDto>(EMPTY_ADMIN_FORM);
  readonly adminSaving = signal(false);
  readonly adminError = signal<string | null>(null);
  readonly adminActionId = signal<string | null>(null);

  constructor() {
    this.loadTasks();
    this.loadAdministrations();
  }

  applyFilter(): void {
    this.loadTasks();
    this.loadAdministrations();
  }

  // --- Tasks ---

  loadTasks(): void {
    this.tasksLoading.set(true);
    this.api.listTasks(this.admissionIdFilter() || undefined).subscribe({
      next: (result) => {
        this.tasks.set(result.data);
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
    this.taskError.set(null);
    this.showTaskModal.set(true);
  }

  submitTask(): void {
    this.taskSaving.set(true);
    this.taskError.set(null);
    this.api.createTask(this.taskForm()).subscribe({
      next: () => {
        this.taskSaving.set(false);
        this.showTaskModal.set(false);
        this.loadTasks();
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
    this.runTaskAction(task.id, this.api.cancelTask(task.id), 'Task cancelled');
  }

  private runTaskAction(id: string, action$: Observable<NursingTask>, successSummary: string): void {
    this.taskActionId.set(id);
    action$.subscribe({
      next: () => {
        this.taskActionId.set(null);
        this.loadTasks();
        this.messageService.add({ severity: 'success', summary: successSummary });
      },
      error: (err: ApiError) => {
        this.taskActionId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message || 'Please try again.' });
      },
    });
  }

  // --- Medication administration (MAR) ---

  loadAdministrations(): void {
    this.administrationsLoading.set(true);
    this.api.listAdministrations(this.admissionIdFilter() || undefined).subscribe({
      next: (result) => {
        this.administrations.set(result.data);
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
    this.adminError.set(null);
    this.showAdminModal.set(true);
  }

  submitAdmin(): void {
    this.adminSaving.set(true);
    this.adminError.set(null);
    this.api.createAdministration(this.adminForm()).subscribe({
      next: () => {
        this.adminSaving.set(false);
        this.showAdminModal.set(false);
        this.loadAdministrations();
        this.messageService.add({ severity: 'success', summary: 'Medication scheduled', detail: this.adminForm().drugName });
      },
      error: (err: ApiError) => {
        this.adminSaving.set(false);
        this.adminError.set(err.message || 'Failed to schedule the administration.');
      },
    });
  }

  administer(admin: MedicationAdministration): void {
    this.adminActionId.set(admin.id);
    this.api.administer(admin.id).subscribe({
      next: () => {
        this.adminActionId.set(null);
        this.loadAdministrations();
        this.messageService.add({ severity: 'success', summary: 'Dose administered', detail: admin.drugName });
      },
      error: (err: ApiError) => {
        this.adminActionId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message || 'Please try again.' });
      },
    });
  }

  skipAdministration(admin: MedicationAdministration): void {
    this.adminActionId.set(admin.id);
    this.api.skipAdministration(admin.id).subscribe({
      next: () => {
        this.adminActionId.set(null);
        this.loadAdministrations();
        this.messageService.add({ severity: 'success', summary: 'Dose skipped', detail: admin.drugName });
      },
      error: (err: ApiError) => {
        this.adminActionId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message || 'Please try again.' });
      },
    });
  }
}
