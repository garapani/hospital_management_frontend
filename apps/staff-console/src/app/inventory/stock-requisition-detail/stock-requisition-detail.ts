import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '@org/auth';

import { InventoryApiService, StockRequisitionDetail as StockRequisitionDetailModel, StockRequisitionItem } from '../inventory-api.service.js';
import { requisitionLineRemaining, requisitionStatusSeverity } from '../inventory.model.js';
import { MasterDataApiService } from '../../master-data/master-data-api.service.js';
import { Department } from '../../master-data/master-data.model.js';

@Component({
  selector: 'hms-stock-requisition-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TagModule, TableModule, DialogModule, InputTextModule],
  templateUrl: './stock-requisition-detail.html',
})
export class StockRequisitionDetail implements OnInit {
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly masterDataApi = inject(MasterDataApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly requisition = signal<StockRequisitionDetailModel | null>(null);
  readonly departments = signal<Department[]>([]);
  readonly loading = signal(true);

  // Fulfill dialog state (one line at a time).
  readonly showFulfillDialog = signal(false);
  readonly fulfillLine = signal<StockRequisitionItem | null>(null);
  readonly fulfillQuantity = signal(0);
  readonly fulfilling = signal(false);
  readonly fulfillError = signal('');

  readonly statusSeverity = requisitionStatusSeverity;
  readonly remaining = requisitionLineRemaining;

  ngOnInit() {
    this.loadDepartments();
    // Subscribes to paramMap (not route.snapshot) so a route-reuse navigation between two
    // /inventory/requisitions/:id URLs refetches instead of leaving stale data on screen.
    this.route.paramMap.subscribe((params) => {
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
    this.inventoryApi.getRequisition(id).subscribe({
      next: (data) => {
        this.requisition.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
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
}
