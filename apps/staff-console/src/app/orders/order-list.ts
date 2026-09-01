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
import { TextareaModule } from 'primeng/textarea';
import { AuthService } from '@org/auth';

import { OrdersApiService, Order, CreateOrderDto, CreateOrderItemDto } from './orders-api.service.js';
import { ORDER_ITEM_TYPES, ORDER_PRIORITIES } from './order.model.js';
import { EntityName } from '../directory/entity-name.js';
import { PatientsApiService } from '../patients/patients-api.service.js';

const PATIENT_SEARCH_DEBOUNCE_MS = 300;

function patientLabel(p: { firstName: string; lastName: string; patientNo: string }): string {
  return `${p.firstName} ${p.lastName} (${p.patientNo})`;
}

function emptyItemRow(): CreateOrderItemDto {
  return { itemType: '', itemDescription: '', priority: 'Routine' };
}

@Component({
  selector: 'hms-order-list',
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
    TextareaModule,
    EntityName,
  ],
  templateUrl: './order-list.html',
})
export class OrderList {
  private readonly ordersApi = inject(OrdersApiService);
  private readonly patientsApi = inject(PatientsApiService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageSize = signal(10);
  readonly firstRecord = signal(0);

  // The backend list endpoint requires patientId (orders are always scoped to one patient).
  readonly patientIdFilter = signal('');
  // Name picker, replacing a raw-UUID text filter — a doctor doesn't know a patient's UUID by
  // heart. Searched server-side (unlike Appointments' Doctor/Department pickers, which bulk-load
  // — the patient list can be far larger).
  readonly patientOptions = signal<{ label: string; value: string }[]>([]);
  readonly patientSearching = signal(false);
  private patientSearchTimer?: ReturnType<typeof setTimeout>;

  readonly createPatientOptions = signal<{ label: string; value: string }[]>([]);
  readonly createPatientSearching = signal(false);
  private createPatientSearchTimer?: ReturnType<typeof setTimeout>;

  readonly showCreateModal = signal(false);
  readonly saving = signal(false);
  readonly createForm = signal<CreateOrderDto>({
    patientId: '',
    orderedBy: '',
    notes: '',
    items: [emptyItemRow()],
  });

  readonly itemTypes = ORDER_ITEM_TYPES.map((t) => ({ label: t, value: t }));
  readonly priorities = ORDER_PRIORITIES.map((p) => ({ label: p, value: p }));

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const patientId = params.get('patientId');
      if (patientId) {
        this.patientIdFilter.set(patientId);
        this.seedPatientOption('filter', patientId);
        this.createForm.set({
          patientId,
          orderedBy: '',
          notes: '',
          items: [emptyItemRow()],
        });
        this.showCreateModal.set(true);
        this.load(0);
      }
    });
  }

  /** Seeds a picker's options with the one patient it already has an id for (arriving via a
   *  query param, or already selected in the filter) so the p-select shows a name, not a blank
   *  value, before the user ever opens the dropdown or types a search. */
  private seedPatientOption(target: 'filter' | 'create', patientId: string): void {
    this.patientsApi.getById(patientId).subscribe({
      next: (patient) => {
        const option = { label: patientLabel(patient), value: patient.id };
        if (target === 'filter') this.patientOptions.set([option]);
        else this.createPatientOptions.set([option]);
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

  onCreatePatientSearch(query: string): void {
    clearTimeout(this.createPatientSearchTimer);
    const q = query.trim();
    if (q.length < 2) {
      this.createPatientOptions.set([]);
      return;
    }
    this.createPatientSearchTimer = setTimeout(() => {
      this.createPatientSearching.set(true);
      this.patientsApi.search({ page: 1, limit: 10, q }).subscribe({
        next: (res) => {
          this.createPatientOptions.set(res.data.map((p) => ({ label: patientLabel(p), value: p.id })));
          this.createPatientSearching.set(false);
        },
        error: () => this.createPatientSearching.set(false),
      });
    }, PATIENT_SEARCH_DEBOUNCE_MS);
  }

  load(first: number): void {
    const patientId = this.patientIdFilter().trim();
    if (!patientId) {
      this.orders.set([]);
      this.totalRecords.set(0);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    const page = Math.floor(first / this.pageSize()) + 1;
    this.ordersApi
      .list({ patientId, page, limit: this.pageSize() })
      .subscribe({
        next: (res) => {
          this.orders.set(res.data);
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

  applyFilter(): void {
    this.firstRecord.set(0);
    this.load(0);
  }

  openCreateModal(): void {
    this.createForm.set({
      patientId: this.patientIdFilter() || '',
      orderedBy: '',
      notes: '',
      items: [emptyItemRow()],
    });
    this.createPatientOptions.set(this.patientOptions());
    this.showCreateModal.set(true);
  }

  addItemRow(): void {
    this.createForm.set({
      ...this.createForm(),
      items: [...this.createForm().items, emptyItemRow()],
    });
  }

  removeItemRow(index: number): void {
    this.createForm.set({
      ...this.createForm(),
      items: this.createForm().items.filter((_, i) => i !== index),
    });
  }

  updateItem(index: number, patch: Partial<CreateOrderItemDto>): void {
    this.createForm.set({
      ...this.createForm(),
      items: this.createForm().items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  }

  canSave(): boolean {
    const form = this.createForm();
    if (!form.patientId.trim() || form.items.length === 0) {
      return false;
    }
    return form.items.every((item) => item.itemType.trim() !== '' && item.itemDescription.trim() !== '');
  }

  submitCreate(): void {
    if (!this.canSave()) return;

    const form = this.createForm();
    const payload: CreateOrderDto = {
      patientId: form.patientId.trim(),
      items: form.items.map((item) => ({
        itemType: item.itemType.trim(),
        itemDescription: item.itemDescription.trim(),
        ...(item.priority ? { priority: item.priority } : {}),
      })),
      ...(form.orderedBy?.trim() ? { orderedBy: form.orderedBy.trim() } : {}),
      ...(form.notes?.trim() ? { notes: form.notes.trim() } : {}),
    };

    this.saving.set(true);
    this.ordersApi.create(payload).subscribe({
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
