import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { AuthService } from '@org/auth';

import { TriageApiService, TriageEntry, CreateTriageEntryDto } from './triage-api.service.js';
import { triageDisplayName, colorCodeSeverity, ARRIVAL_MODES } from './triage.model.js';

@Component({
  selector: 'hms-triage-list',
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
    CheckboxModule,
  ],
  templateUrl: './triage-list.html',
})
export class TriageList {
  private readonly triageApi = inject(TriageApiService);
  readonly auth = inject(AuthService);

  readonly entries = signal<TriageEntry[]>([]);
  readonly loading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageSize = signal(10);
  readonly firstRecord = signal(0);

  readonly showCreateModal = signal(false);
  readonly createForm = signal<CreateTriageEntryDto>({});
  readonly saving = signal(false);

  readonly arrivalModes = ARRIVAL_MODES.map((m) => ({ label: m, value: m }));
  readonly displayName = triageDisplayName;
  readonly colorSeverity = colorCodeSeverity;

  constructor() {
    this.load(0);
  }

  load(first: number): void {
    this.loading.set(true);
    const page = Math.floor(first / this.pageSize()) + 1;
    this.triageApi.listActive({ page, limit: this.pageSize() }).subscribe({
      next: (res) => {
        this.entries.set(res.data);
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

  openCreateModal(): void {
    this.createForm.set({});
    this.showCreateModal.set(true);
  }

  submitCreate(): void {
    this.saving.set(true);
    this.triageApi.create(this.createForm()).subscribe({
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
