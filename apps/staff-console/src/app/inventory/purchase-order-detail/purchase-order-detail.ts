import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { AuthService } from '@org/auth';

import { InventoryApiService, InventoryVendor, PurchaseOrderDetail as PurchaseOrderDetailModel, PurchaseOrderItem } from '../inventory-api.service.js';
import { purchaseOrderStatusSeverity } from '../inventory.model.js';

@Component({
  selector: 'hms-purchase-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TagModule, TableModule, DialogModule, InputTextModule, InputNumberModule, TextareaModule, DecimalPipe],
  templateUrl: './purchase-order-detail.html',
})
export class PurchaseOrderDetail implements OnInit {
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);

  readonly purchaseOrder = signal<PurchaseOrderDetailModel | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly vendors = signal<InventoryVendor[]>([]);

  readonly statusSeverity = purchaseOrderStatusSeverity;

  // Cancel dialog state.
  readonly showCancelModal = signal(false);
  readonly cancelReason = signal('');
  readonly cancelSaving = signal(false);

  // Goods receipt dialog state (one line at a time).
  readonly showReceiveModal = signal(false);
  readonly receiveLine = signal<PurchaseOrderItem | null>(null);
  readonly receiveQuantity = signal(0);
  readonly receiveBatchNumber = signal('');
  readonly receiveExpiryDate = signal('');
  readonly receiveUnitCost = signal(0);
  readonly receiving = signal(false);
  readonly receiveError = signal('');

  ngOnInit() {
    this.inventoryApi.listVendors().subscribe({
      next: (vendors) => this.vendors.set(vendors),
      error: () => this.vendors.set([]),
    });
    // Subscribes to paramMap (not route.snapshot) so a route-reuse navigation between two
    // /inventory/purchase-orders/:id URLs refetches instead of leaving stale data on screen.
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.load(id);
      }
    });
  }

  vendorName(vendorId: string): string {
    return this.vendors().find((v) => v.id === vendorId)?.name ?? vendorId;
  }

  load(id: string) {
    this.loading.set(true);
    this.notFound.set(false);
    this.inventoryApi.getPurchaseOrder(id).subscribe({
      next: (data) => {
        this.purchaseOrder.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.purchaseOrder.set(null);
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  goBack() {
    this.router.navigate(['/inventory/purchase-orders']);
  }

  /** orderedQuantity/unitCost are numeric columns serialized as strings — coerce before multiplying. */
  lineTotal(line: PurchaseOrderItem): number {
    return Number(line.orderedQuantity) * Number(line.unitCost);
  }

  lineFullyReceived(line: PurchaseOrderItem): boolean {
    return Number(line.receivedQuantity) >= Number(line.orderedQuantity);
  }

  openCancelModal() {
    this.cancelReason.set('');
    this.showCancelModal.set(true);
  }

  confirmCancel() {
    const id = this.purchaseOrder()?.id;
    if (!id) return;
    this.cancelSaving.set(true);
    this.inventoryApi.cancelPurchaseOrder(id, this.cancelReason().trim() || undefined).subscribe({
      next: () => {
        this.cancelSaving.set(false);
        this.showCancelModal.set(false);
        this.load(id);
      },
      error: () => this.cancelSaving.set(false),
    });
  }

  openReceiveModal(line: PurchaseOrderItem) {
    this.receiveLine.set(line);
    this.receiveQuantity.set(Number(line.orderedQuantity) - Number(line.receivedQuantity));
    this.receiveBatchNumber.set('');
    this.receiveExpiryDate.set('');
    this.receiveUnitCost.set(Number(line.unitCost));
    this.receiveError.set('');
    this.showReceiveModal.set(true);
  }

  canReceive(): boolean {
    return (
      this.receiveLine() !== null &&
      this.receiveQuantity() > 0 &&
      this.receiveBatchNumber().trim() !== '' &&
      this.receiveUnitCost() >= 0
    );
  }

  confirmReceive() {
    const line = this.receiveLine();
    if (!line || !this.canReceive()) return;
    this.receiving.set(true);
    this.receiveError.set('');
    this.inventoryApi
      .recordGoodsReceipt(line.id, {
        batchNumber: this.receiveBatchNumber().trim(),
        expiryDate: this.receiveExpiryDate() || undefined,
        unitCost: this.receiveUnitCost(),
        receivedQuantity: this.receiveQuantity(),
      })
      .subscribe({
        next: () => {
          this.receiving.set(false);
          this.showReceiveModal.set(false);
          const id = this.purchaseOrder()?.id;
          if (id) {
            this.load(id);
          }
        },
        error: () => {
          this.receiving.set(false);
          this.receiveError.set('Goods receipt failed — check the quantity and try again.');
        },
      });
  }
}
