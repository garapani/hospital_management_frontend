import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AuthService } from '@org/auth';
import { ApiError } from '@org/api-client';

import { OrdersApiService, OrderItem, OrderWithItems } from './orders-api.service.js';
import { orderItemStatusSeverity, orderItemTypeSeverity, orderPrioritySeverity } from './order.model.js';
import { EntityName } from '../directory/entity-name.js';
import { LabApiService, LabTest, LabTestCategory } from '../lab/lab-api.service.js';
import { RadiologyApiService } from '../radiology/radiology-api.service.js';
import { RadiologyImagingItem, RadiologyImagingType } from '../radiology/radiology.model.js';

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
    InputTextModule,
    SelectModule,
    TextareaModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './order-detail.html',
})
export class OrderDetail implements OnInit {
  private readonly ordersApi = inject(OrdersApiService);
  private readonly labApi = inject(LabApiService);
  private readonly radiologyApi = inject(RadiologyApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  readonly auth = inject(AuthService);

  // Neither Lab nor Radiology Technician had any UI path to create a requisition at all, despite
  // holding *.requisition.create — this is the only screen that already knows a Pending Lab/
  // Radiology order item's id, so requisition creation lives here rather than duplicating an
  // order-item picker inside the lab/radiology modules themselves.
  readonly showLabRequisitionModal = signal(false);
  readonly labCategories = signal<LabTestCategory[]>([]);
  readonly labTests = signal<LabTest[]>([]);
  readonly labTestsLoading = signal(false);
  readonly labCategoryId = signal('');
  readonly labTestId = signal('');
  readonly labSpecimenType = signal('');
  readonly labRequisitionSaving = signal(false);
  private labRequisitionItem: OrderItem | null = null;

  readonly showRadiologyRequisitionModal = signal(false);
  readonly radiologyImagingTypes = signal<RadiologyImagingType[]>([]);
  readonly radiologyImagingItems = signal<RadiologyImagingItem[]>([]);
  readonly radiologyImagingItemsLoading = signal(false);
  readonly radiologyImagingTypeId = signal('');
  readonly radiologyImagingItemId = signal('');
  readonly radiologyRequisitionSaving = signal(false);
  private radiologyRequisitionItem: OrderItem | null = null;

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

  openLabRequisitionModal(item: OrderItem): void {
    this.labRequisitionItem = item;
    this.labCategoryId.set('');
    this.labTestId.set('');
    this.labSpecimenType.set('');
    this.labTests.set([]);
    this.showLabRequisitionModal.set(true);
    this.labApi.listCategories().subscribe({
      next: (categories) => this.labCategories.set(categories),
      error: () => this.labCategories.set([]),
    });
  }

  onLabCategoryChange(categoryId: string | null): void {
    this.labCategoryId.set(categoryId ?? '');
    this.labTestId.set('');
    this.labSpecimenType.set('');
    this.labTests.set([]);
    if (!categoryId) return;
    this.labTestsLoading.set(true);
    this.labApi.listTestsByCategory(categoryId).subscribe({
      next: (tests) => {
        this.labTests.set(tests);
        this.labTestsLoading.set(false);
      },
      error: () => {
        this.labTests.set([]);
        this.labTestsLoading.set(false);
      },
    });
  }

  onLabTestChange(testId: string | null): void {
    this.labTestId.set(testId ?? '');
    // Pre-fills from the test's catalog default, but stays editable — the DTO accepts a
    // specimenType independent of the test, for the (uncommon but real) case the observed
    // specimen differs from the test's usual one.
    const test = this.labTests().find((t) => t.id === testId);
    this.labSpecimenType.set(test?.specimenType ?? '');
  }

  submitLabRequisition(): void {
    const item = this.labRequisitionItem;
    const testId = this.labTestId();
    const specimenType = this.labSpecimenType().trim();
    if (!item || !testId || !specimenType) return;

    this.labRequisitionSaving.set(true);
    this.labApi.createRequisition({ orderItemId: item.id, testId, specimenType }).subscribe({
      next: () => {
        this.labRequisitionSaving.set(false);
        this.showLabRequisitionModal.set(false);
        this.messageService.add({ severity: 'success', summary: 'Lab requisition created' });
      },
      error: (err: ApiError) => {
        this.labRequisitionSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message || 'Failed to create the requisition.' });
      },
    });
  }

  openRadiologyRequisitionModal(item: OrderItem): void {
    this.radiologyRequisitionItem = item;
    this.radiologyImagingTypeId.set('');
    this.radiologyImagingItemId.set('');
    this.radiologyImagingItems.set([]);
    this.showRadiologyRequisitionModal.set(true);
    this.radiologyApi.listImagingTypes().subscribe({
      next: (types) => this.radiologyImagingTypes.set(types),
      error: () => this.radiologyImagingTypes.set([]),
    });
  }

  onRadiologyImagingTypeChange(imagingTypeId: string | null): void {
    this.radiologyImagingTypeId.set(imagingTypeId ?? '');
    this.radiologyImagingItemId.set('');
    this.radiologyImagingItems.set([]);
    if (!imagingTypeId) return;
    this.radiologyImagingItemsLoading.set(true);
    this.radiologyApi.listItemsByType(imagingTypeId).subscribe({
      next: (items) => {
        this.radiologyImagingItems.set(items);
        this.radiologyImagingItemsLoading.set(false);
      },
      error: () => {
        this.radiologyImagingItems.set([]);
        this.radiologyImagingItemsLoading.set(false);
      },
    });
  }

  submitRadiologyRequisition(): void {
    const item = this.radiologyRequisitionItem;
    const imagingItemId = this.radiologyImagingItemId();
    if (!item || !imagingItemId) return;

    this.radiologyRequisitionSaving.set(true);
    this.radiologyApi.create({ orderItemId: item.id, imagingItemId }).subscribe({
      next: () => {
        this.radiologyRequisitionSaving.set(false);
        this.showRadiologyRequisitionModal.set(false);
        this.messageService.add({ severity: 'success', summary: 'Radiology requisition created' });
      },
      error: (err: ApiError) => {
        this.radiologyRequisitionSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message || 'Failed to create the requisition.' });
      },
    });
  }
}
