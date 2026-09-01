import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AuthService } from '@org/auth';
import { ApiError } from '@org/api-client';

import { OrdersApiService, OrderItem, OrderWithItems } from './orders-api.service.js';
import { orderItemStatusSeverity, orderItemTypeSeverity, orderPrioritySeverity } from './order.model.js';
import { EntityName } from '../directory/entity-name.js';

@Component({
  selector: 'hms-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    EntityName,
    RouterModule,
    FormsModule,
    ButtonModule,
    TagModule,
    TableModule,
    DialogModule,
    TextareaModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './order-detail.html',
})
export class OrderDetail implements OnInit {
  private readonly ordersApi = inject(OrdersApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  readonly auth = inject(AuthService);

  readonly order = signal<OrderWithItems | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly actionItemId = signal<string | null>(null);

  readonly showCancelModal = signal(false);
  readonly cancelReason = signal('');
  private cancellingItem: OrderItem | null = null;

  readonly itemStatusSeverity = orderItemStatusSeverity;
  readonly itemTypeSeverity = orderItemTypeSeverity;
  readonly prioritySeverity = orderPrioritySeverity;

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.load(id);
      }
    });
  }

  load(id: string) {
    this.loading.set(true);
    this.notFound.set(false);
    this.ordersApi.getById(id).subscribe({
      next: (data) => {
        this.order.set(data);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.notFound.set(true);
        }
      },
    });
  }

  goBack() {
    this.router.navigate(['/clinical/orders']);
  }

  completeItem(item: OrderItem) {
    const orderId = this.order()?.id;
    if (!orderId) return;

    this.confirmationService.confirm({
      header: 'Complete Order Item',
      message: `Mark "${item.itemDescription}" as completed?`,
      icon: 'pi pi-check-circle',
      acceptButtonProps: { label: 'Complete', severity: 'success' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.actionItemId.set(item.id);
        this.ordersApi.completeItem(orderId, item.id).subscribe({
          next: (updated) => this.applyItemUpdate(updated),
          error: () => {
            this.actionItemId.set(null);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to complete order item' });
          },
        });
      },
    });
  }

  openCancelModal(item: OrderItem) {
    this.cancellingItem = item;
    this.cancelReason.set('');
    this.showCancelModal.set(true);
  }

  confirmCancelItem() {
    const orderId = this.order()?.id;
    const item = this.cancellingItem;
    const reason = this.cancelReason().trim();
    if (!orderId || !item || !reason) return;

    this.actionItemId.set(item.id);
    this.ordersApi.cancelItem(orderId, item.id, reason).subscribe({
      next: (updated) => {
        this.showCancelModal.set(false);
        this.applyItemUpdate(updated);
      },
      error: () => {
        this.actionItemId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to cancel order item' });
      },
    });
  }

  private applyItemUpdate(updated: OrderItem) {
    this.actionItemId.set(null);
    const current = this.order();
    if (!current) return;
    this.order.set({
      ...current,
      items: current.items.map((i) => (i.id === updated.id ? updated : i)),
    });
  }
}
