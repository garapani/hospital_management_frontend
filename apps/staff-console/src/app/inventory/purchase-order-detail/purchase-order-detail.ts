import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';

import { InventoryApiService, PurchaseOrderDetail as PurchaseOrderDetailModel, PurchaseOrderItem } from '../inventory-api.service.js';
import { purchaseOrderStatusSeverity } from '../inventory.model.js';

@Component({
  selector: 'hms-purchase-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TagModule, TableModule, DecimalPipe],
  templateUrl: './purchase-order-detail.html',
})
export class PurchaseOrderDetail implements OnInit {
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly purchaseOrder = signal<PurchaseOrderDetailModel | null>(null);
  readonly loading = signal(true);

  readonly statusSeverity = purchaseOrderStatusSeverity;

  ngOnInit() {
    // Subscribes to paramMap (not route.snapshot) so a route-reuse navigation between two
    // /inventory/purchase-orders/:id URLs refetches instead of leaving stale data on screen.
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.load(id);
      }
    });
  }

  load(id: string) {
    this.loading.set(true);
    this.inventoryApi.getPurchaseOrder(id).subscribe({
      next: (data) => {
        this.purchaseOrder.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goBack() {
    this.router.navigate(['/inventory/purchase-orders']);
  }

  /** orderedQuantity/unitCost are numeric columns serialized as strings — coerce before multiplying. */
  lineTotal(line: PurchaseOrderItem): number {
    return Number(line.orderedQuantity) * Number(line.unitCost);
  }
}
