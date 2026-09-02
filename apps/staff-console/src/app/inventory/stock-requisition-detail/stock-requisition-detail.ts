import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { AuthService } from '@org/auth';

import { InventoryApiService, StockRequisitionDetail as StockRequisitionDetailModel, StockRequisitionItem } from '../inventory-api.service.js';
import { requisitionLineRemaining, requisitionStatusSeverity } from '../inventory.model.js';
import { MasterDataApiService } from '../../master-data/master-data-api.service.js';
import { Department } from '../../master-data/master-data.model.js';
import { EntityName } from '../../directory/entity-name.js';

const FULFILLABLE_STATUSES = new Set(['Pending', 'PartiallyFulfilled']);

@Component({
  selector: 'hms-stock-requisition-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TagModule, TableModule, DialogModule, InputTextModule, TextareaModule, EntityName],
  templateUrl: './stock-requisition-detail.html',
})
export class StockRequisitionDetail implements OnInit {
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly masterDataApi = inject(MasterDataApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);

  readonly requisition = signal<StockRequisitionDetailModel | null>(null);
  readonly departments = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  // Fulfill dialog state (one line at a time).
  readonly showFulfillDialog = signal(false);
  readonly fulfillLine = signal<StockRequisitionItem | null>(null);
  readonly fulfillQuantity = signal(0);
  readonly fulfilling = signal(false);
  readonly fulfillError = signal('');

  // Cancel dialog state.
  readonly showCancelModal = signal(false);
  readonly cancelReason = signal('');
  readonly cancelSaving = signal(false);

  readonly statusSeverity = requisitionStatusSeverity;
  readonly remaining = requisitionLineRemaining;

  isFulfillable(status: string): boolean {
    return FULFILLABLE_STATUSES.has(status);
  }

  ngOnInit() {
    this.loadDepartments();
    // Subscribes to paramMap (not route.snapshot) so a route-reuse navigation between two
    // /inventory/requisitions/:id URLs refetches instead of leaving stale data on screen.
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.load(id);
      }
    });
  }

  loadDepartments(): void {
    this.masterDataApi.listDepartments().subscribe({
      next: (departments) => this.departments.set(departments),
      error: () => this.departments.set([]),
    });
  }

  departmentName(departmentId: string): string {
    return this.departments().find((d) => d.id === departmentId)?.departmentName ?? departmentId;
  }

  load(id: string) {
    this.loading.set(true);
    this.notFound.set(false);
    this.inventoryApi.getRequisition(id).subscribe({
      next: (data) => {
        this.requisition.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.requisition.set(null);
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  goBack() {
    this.router.navigate(['/inventory/requisitions']);
  }

  openFulfillDialog(line: StockRequisitionItem) {
    this.fulfillLine.set(line);
    this.fulfillQuantity.set(requisitionLineRemaining(line));
    this.fulfillError.set('');
    this.showFulfillDialog.set(true);
  }

  setFulfillQuantity(value: string): void {
    const quantity = Number(value);
    this.fulfillQuantity.set(Number.isFinite(quantity) ? quantity : 0);
  }

  canFulfill(): boolean {
    const line = this.fulfillLine();
    return line !== null && this.fulfillQuantity() > 0 && this.fulfillQuantity() <= requisitionLineRemaining(line);
  }

  confirmFulfill() {
    const line = this.fulfillLine();
    if (!line || !this.canFulfill()) {
      return;
    }
    this.fulfilling.set(true);
    this.fulfillError.set('');
    this.inventoryApi.fulfillRequisitionItem(line.id, { quantity: this.fulfillQuantity() }).subscribe({
      next: () => {
        this.fulfilling.set(false);
        this.showFulfillDialog.set(false);
        const id = this.requisition()?.id;
        if (id) {
          // Reload so status (Pending -> PartiallyFulfilled/Fulfilled) and quantities refresh.
          this.load(id);
        }
      },
      error: () => {
        this.fulfilling.set(false);
        this.fulfillError.set('Fulfillment failed — check available stock and try again.');
      },
    });
  }

  openCancelModal() {
    this.cancelReason.set('');
    this.showCancelModal.set(true);
  }

  confirmCancel() {
    const id = this.requisition()?.id;
    if (!id) return;
    this.cancelSaving.set(true);
    this.inventoryApi.cancelRequisition(id, this.cancelReason().trim() || undefined).subscribe({
      next: () => {
        this.cancelSaving.set(false);
        this.showCancelModal.set(false);
        this.load(id);
      },
      error: () => this.cancelSaving.set(false),
    });
  }
}
