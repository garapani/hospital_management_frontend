import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { AuthService } from '@org/auth';
import { ApiError } from '@org/api-client';
import { SsuApiService } from './ssu-api.service.js';
import {
  CreateCaseDto,
  SsuCase,
  SsuCaseStatus,
  ssuStatusSeverity,
} from './ssu.model.js';
import { PatientsApiService, Patient, PaginatedResponse } from '../patients/patients-api.service.js';
import { EntityName } from '../directory/entity-name.js';

const DEFAULT_PAGE_SIZE = 20;
const EMPTY_CREATE_FORM: CreateCaseDto = {
  patientId: '',
  caseType: '',
  subsidyPercent: 0,
  eligibilityNotes: '',
};

export const COMMON_CASE_TYPES: string[] = [
  'Charity Care',
  'Elderly Subsidy',
  'Child Health Support',
  'Emergency Relief',
  'Chronic Illness Aid',
];

@Component({
  selector: 'hms-ssu-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TextareaModule,
    EntityName,
  ],
  templateUrl: './ssu-list.html',
})
export class SsuList {
  private readonly api = inject(SsuApiService);
  private readonly patientsApi = inject(PatientsApiService);
  private readonly messageService = inject(MessageService);
  readonly auth = inject(AuthService);

  readonly ssuStatusSeverity = ssuStatusSeverity;
  readonly commonCaseTypes = COMMON_CASE_TYPES;
  readonly statusOptions: { label: string; value: SsuCaseStatus | null }[] = [
    { label: 'All', value: null },
    { label: 'Open', value: 'Open' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'Closed', value: 'Closed' },
  ];

  // Cases table state
  readonly cases = signal<SsuCase[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly firstRecord = signal(0);
  readonly statusFilter = signal<SsuCaseStatus | null>(null);
  readonly patientFilter = signal('');

  // Create Modal state
  readonly showCreateModal = signal(false);
  readonly createForm = signal<CreateCaseDto>({ ...EMPTY_CREATE_FORM });
  readonly createSaving = signal(false);
  readonly createError = signal<string | null>(null);

  // Patient search in Create Modal
  readonly patientSearchQuery = signal('');
  readonly patientSearching = signal(false);
  readonly patientResults = signal<Patient[]>([]);
  readonly selectedPatient = signal<Patient | null>(null);

  // Action Modals state
  readonly targetCase = signal<SsuCase | null>(null);

  readonly showApproveModal = signal(false);
  readonly approveNotes = signal('');
  readonly approveSaving = signal(false);

  readonly showRejectModal = signal(false);
  readonly rejectNotes = signal('');
  readonly rejectSaving = signal(false);
  readonly rejectError = signal<string | null>(null);

  readonly showCloseModal = signal(false);
  readonly closeSaving = signal(false);

  readonly canManage = this.auth.hasPermission('ssu.manage');

  constructor() {
    this.load(1, this.pageSize());
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize();
    const page = Math.floor((event.first ?? 0) / rows) + 1;
    this.load(page, rows);
  }

  applyFilters(): void {
    this.load(1, this.pageSize());
  }

  private load(page: number, limit: number): void {
    this.loading.set(true);
    this.firstRecord.set((page - 1) * limit);
    this.api
      .listCases({
        patientId: this.patientFilter().trim() || undefined,
        status: this.statusFilter() ?? undefined,
        page,
        limit,
      })
      .subscribe({
        next: (result) => {
          this.cases.set(result.data);
          this.totalRecords.set(result.meta.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Could not load SSU cases.',
          });
        },
      });
  }

  // ---------- Create Modal ----------
  openCreateModal(): void {
    this.createForm.set({ ...EMPTY_CREATE_FORM });
    this.patientSearchQuery.set('');
    this.patientResults.set([]);
    this.selectedPatient.set(null);
    this.createError.set(null);
    this.showCreateModal.set(true);
  }

  searchPatients(): void {
    const q = this.patientSearchQuery().trim();
    if (!q) {
      return;
    }
    this.patientSearching.set(true);
    this.patientsApi.search({ page: 1, limit: 10, q }).subscribe({
      next: (res: PaginatedResponse<Patient>) => {
        this.patientResults.set(res.data);
        this.patientSearching.set(false);
      },
      error: () => this.patientSearching.set(false),
    });
  }

  selectPatient(patient: Patient): void {
    this.selectedPatient.set(patient);
    this.createForm.set({ ...this.createForm(), patientId: patient.id });
    this.patientResults.set([]);
  }

  clearSelectedPatient(): void {
    this.selectedPatient.set(null);
    this.createForm.set({ ...this.createForm(), patientId: '' });
  }

  submitCreate(): void {
    const form = this.createForm();
    if (!form.patientId.trim()) {
      this.createError.set('Patient is required.');
      return;
    }
    if (!form.caseType.trim()) {
      this.createError.set('Case type is required.');
      return;
    }
    if (form.subsidyPercent === undefined || form.subsidyPercent < 0 || form.subsidyPercent > 100) {
      this.createError.set('Subsidy percent must be between 0 and 100.');
      return;
    }

    this.createSaving.set(true);
    this.createError.set(null);
    const dto: CreateCaseDto = {
      patientId: form.patientId.trim(),
      caseType: form.caseType.trim(),
      subsidyPercent: form.subsidyPercent,
      eligibilityNotes: form.eligibilityNotes?.trim() || undefined,
    };

    this.api.createCase(dto).subscribe({
      next: (created) => {
        this.createSaving.set(false);
        this.showCreateModal.set(false);
        this.load(1, this.pageSize());
        this.messageService.add({
          severity: 'success',
          summary: 'SSU Case Created',
          detail: `Case ${created.caseNumber} created successfully.`,
        });
      },
      error: (err: ApiError) => {
        this.createSaving.set(false);
        this.createError.set(err.message || 'Failed to create SSU case.');
      },
    });
  }

  // ---------- Approve Action ----------
  openApproveModal(ssuCase: SsuCase): void {
    this.targetCase.set(ssuCase);
    this.approveNotes.set('');
    this.showApproveModal.set(true);
  }

  confirmApprove(): void {
    const target = this.targetCase();
    if (!target) return;

    this.approveSaving.set(true);
    const dto = { decisionNotes: this.approveNotes().trim() || undefined };
    this.api.approveCase(target.id, dto).subscribe({
      next: () => {
        this.approveSaving.set(false);
        this.showApproveModal.set(false);
        this.load(1, this.pageSize());
        this.messageService.add({
          severity: 'success',
          summary: 'Case Approved',
          detail: `Case ${target.caseNumber} has been approved.`,
        });
      },
      error: (err: ApiError) => {
        this.approveSaving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Approve Failed',
          detail: err.message || 'Could not approve case.',
        });
      },
    });
  }

  // ---------- Reject Action ----------
  openRejectModal(ssuCase: SsuCase): void {
    this.targetCase.set(ssuCase);
    this.rejectNotes.set('');
    this.rejectError.set(null);
    this.showRejectModal.set(true);
  }

  confirmReject(): void {
    const target = this.targetCase();
    if (!target) return;

    const notes = this.rejectNotes().trim();
    if (!notes) {
      this.rejectError.set('Decision notes are required to reject a case.');
      return;
    }

    this.rejectSaving.set(true);
    this.rejectError.set(null);
    this.api.rejectCase(target.id, { decisionNotes: notes }).subscribe({
      next: () => {
        this.rejectSaving.set(false);
        this.showRejectModal.set(false);
        this.load(1, this.pageSize());
        this.messageService.add({
          severity: 'success',
          summary: 'Case Rejected',
          detail: `Case ${target.caseNumber} has been rejected.`,
        });
      },
      error: (err: ApiError) => {
        this.rejectSaving.set(false);
        this.rejectError.set(err.message || 'Could not reject case.');
      },
    });
  }

  // ---------- Close Action ----------
  openCloseModal(ssuCase: SsuCase): void {
    this.targetCase.set(ssuCase);
    this.showCloseModal.set(true);
  }

  confirmClose(): void {
    const target = this.targetCase();
    if (!target) return;

    this.closeSaving.set(true);
    this.api.closeCase(target.id).subscribe({
      next: () => {
        this.closeSaving.set(false);
        this.showCloseModal.set(false);
        this.load(1, this.pageSize());
        this.messageService.add({
          severity: 'success',
          summary: 'Case Closed',
          detail: `Case ${target.caseNumber} has been closed.`,
        });
      },
      error: (err: ApiError) => {
        this.closeSaving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Close Failed',
          detail: err.message || 'Could not close case.',
        });
      },
    });
  }
}
