import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';

import { OrdersApiService, OrderWithItems } from './orders-api.service.js';
import { orderItemStatusSeverity, orderItemTypeSeverity, orderPrioritySeverity } from './order.model.js';

@Component({
  selector: 'hms-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, TagModule, TableModule],
  templateUrl: './order-detail.html',
})
export class OrderDetail implements OnInit {
  private readonly ordersApi = inject(OrdersApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly order = signal<OrderWithItems | null>(null);
  readonly loading = signal(true);

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
    this.ordersApi.getById(id).subscribe({
      next: (data) => {
        this.order.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goBack() {
    this.router.navigate(['/clinical/orders']);
  }
}
