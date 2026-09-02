import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ConfirmationService, Confirmation } from 'primeng/api';
import { AuthService } from '@org/auth';
import { OrderDetail } from './order-detail.js';
import { OrdersApiService, OrderWithItems } from './orders-api.service.js';
import { DirectoryResolverService } from '../directory/directory-resolver.service.js';
import { LabApiService } from '../lab/lab-api.service.js';
import { RadiologyApiService } from '../radiology/radiology-api.service.js';

const auth = { hasPermission: () => true } as unknown as AuthService;
const directoryResolverProvider = {
  provide: DirectoryResolverService,
  useValue: { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService,
};
function makeLabApiStub(): LabApiService {
  return {
    listCategories: jest.fn().mockReturnValue(of([{ id: 'cat-1', name: 'Hematology' }])),
    listTestsByCategory: jest.fn().mockReturnValue(of([{ id: 'test-1', name: 'CBC', specimenType: 'Blood' }])),
    createRequisition: jest.fn().mockReturnValue(of({ id: 'req-1' })),
  } as unknown as LabApiService;
}
function makeRadiologyApiStub(): RadiologyApiService {
  return {
    listImagingTypes: jest.fn().mockReturnValue(of([{ id: 'type-1', name: 'X-Ray' }])),
    listItemsByType: jest.fn().mockReturnValue(of([{ id: 'item-1', name: 'Chest X-Ray' }])),
    create: jest.fn().mockReturnValue(of({ id: 'req-1' })),
  } as unknown as RadiologyApiService;
}

describe('OrderDetail', () => {
  const order: OrderWithItems = {
    id: 'order-1',
    patientId: 'patient-1',
    sourceAppointmentId: null,
    sourceAdmissionId: null,
    orderedBy: 'account-1',
    orderedAt: '2026-08-12T10:00:00Z',
    notes: 'Fasting required',
    createdAt: '2026-08-12T10:00:00Z',
    updatedAt: '2026-08-12T10:00:00Z',
    items: [
      {
        id: 'item-1',
        orderId: 'order-1',
        itemType: 'Lab',
        itemDescription: 'CBC',
        priority: 'STAT',
        status: 'Pending',
        completedBy: null,
        completedAt: null,
        cancelReason: null,
        createdAt: '2026-08-12T10:00:00Z',
        updatedAt: '2026-08-12T10:00:00Z',
      },
      {
        id: 'item-2',
        orderId: 'order-1',
        itemType: 'Radiology',
        itemDescription: 'Chest X-Ray',
        priority: 'Routine',
        status: 'Completed',
        completedBy: 'account-2',
        completedAt: '2026-08-12T11:00:00Z',
        cancelReason: null,
        createdAt: '2026-08-12T10:00:00Z',
        updatedAt: '2026-08-12T11:00:00Z',
      },
    ],
  };

  function setup(ordersApiOverrides: Partial<OrdersApiService> = {}) {
    const ordersApi = {
      getById: jest.fn().mockReturnValue(of(order)),
      completeItem: jest.fn().mockReturnValue(of({ ...order.items[0], status: 'Completed' })),
      cancelItem: jest.fn().mockReturnValue(of({ ...order.items[0], status: 'Cancelled', cancelReason: 'Duplicate' })),
      ...ordersApiOverrides,
    } as unknown as OrdersApiService;
    const activatedRoute = { paramMap: of(convertToParamMap({ id: 'order-1' })) } as unknown as ActivatedRoute;
    const labApi = makeLabApiStub();
    const radiologyApi = makeRadiologyApiStub();

    TestBed.configureTestingModule({
      imports: [OrderDetail],
      providers: [
        provideRouter([]),
        { provide: OrdersApiService, useValue: ordersApi },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: AuthService, useValue: auth },
        { provide: LabApiService, useValue: labApi },
        { provide: RadiologyApiService, useValue: radiologyApi },
        directoryResolverProvider,
      ],
    });

    const fixture = TestBed.createComponent(OrderDetail);
    return { fixture, ordersApi, labApi, radiologyApi };
  }

  it('loads the order with its line items', async () => {
    const { fixture, ordersApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(ordersApi.getById).toHaveBeenCalledWith('order-1');
    expect(fixture.componentInstance.order()).toEqual(order);
    expect(fixture.componentInstance.order()?.items.length).toBe(2);
    expect(fixture.componentInstance.order()?.items[1].status).toBe('Completed');
  });

  it('clears the loading flag when the initial load errors', async () => {
    const ordersApi = {
      getById: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
    } as unknown as OrdersApiService;
    const activatedRoute = { paramMap: of(convertToParamMap({ id: 'order-1' })) } as unknown as ActivatedRoute;
    TestBed.configureTestingModule({
      imports: [OrderDetail],
      providers: [
        provideRouter([]),
        { provide: OrdersApiService, useValue: ordersApi },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: AuthService, useValue: auth },
        { provide: LabApiService, useValue: makeLabApiStub() },
        { provide: RadiologyApiService, useValue: makeRadiologyApiStub() },
        directoryResolverProvider,
      ],
    });
    const fixture = TestBed.createComponent(OrderDetail);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('shows a not-found state on a 404', async () => {
    const ordersApi = {
      getById: jest.fn().mockReturnValue(throwError(() => ({ status: 404 }))),
    } as unknown as OrdersApiService;
    const activatedRoute = { paramMap: of(convertToParamMap({ id: 'missing' })) } as unknown as ActivatedRoute;
    TestBed.configureTestingModule({
      imports: [OrderDetail],
      providers: [
        provideRouter([]),
        { provide: OrdersApiService, useValue: ordersApi },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: AuthService, useValue: auth },
        { provide: LabApiService, useValue: makeLabApiStub() },
        { provide: RadiologyApiService, useValue: makeRadiologyApiStub() },
        directoryResolverProvider,
      ],
    });
    const fixture = TestBed.createComponent(OrderDetail);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.notFound()).toBe(true);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('completes a pending item once the user confirms', async () => {
    const { fixture, ordersApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    jest.spyOn(confirmationService, 'confirm').mockImplementation((c: Confirmation) => {
      c.accept?.();
      return confirmationService;
    });

    fixture.componentInstance.completeItem(order.items[0]);
    await fixture.whenStable();

    expect(ordersApi.completeItem).toHaveBeenCalledWith('order-1', 'item-1');
    expect(fixture.componentInstance.order()?.items[0].status).toBe('Completed');
  });

  it('cancels a pending item with the entered reason', async () => {
    const { fixture, ordersApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCancelModal(order.items[0]);
    fixture.componentInstance.cancelReason.set('Duplicate');
    fixture.componentInstance.confirmCancelItem();
    await fixture.whenStable();

    expect(ordersApi.cancelItem).toHaveBeenCalledWith('order-1', 'item-1', 'Duplicate');
    expect(fixture.componentInstance.order()?.items[0].status).toBe('Cancelled');
    expect(fixture.componentInstance.showCancelModal()).toBe(false);
  });

  it('does not cancel an item without a reason', async () => {
    const { fixture, ordersApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCancelModal(order.items[0]);
    fixture.componentInstance.confirmCancelItem();

    expect(ordersApi.cancelItem).not.toHaveBeenCalled();
  });

  it('navigates back to the orders list', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.componentInstance.goBack();

    expect(navigateSpy).toHaveBeenCalledWith(['/clinical/orders']);
  });

  it('cascades category -> test for the lab requisition picker and pre-fills specimenType from the selected test', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openLabRequisitionModal(order.items[0]);
    await fixture.whenStable();
    expect(labApi.listCategories).toHaveBeenCalledTimes(1);

    fixture.componentInstance.onLabCategoryChange('cat-1');
    await fixture.whenStable();
    expect(labApi.listTestsByCategory).toHaveBeenCalledWith('cat-1');

    fixture.componentInstance.onLabTestChange('test-1');
    expect(fixture.componentInstance.labSpecimenType()).toBe('Blood');
  });

  it('creates a lab requisition against the item that opened the modal', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openLabRequisitionModal(order.items[0]);
    fixture.componentInstance.labTestId.set('test-1');
    fixture.componentInstance.labSpecimenType.set('Blood');
    fixture.componentInstance.submitLabRequisition();
    await fixture.whenStable();

    expect(labApi.createRequisition).toHaveBeenCalledWith({ orderItemId: 'item-1', testId: 'test-1', specimenType: 'Blood' });
    expect(fixture.componentInstance.showLabRequisitionModal()).toBe(false);
  });

  it('does not submit a lab requisition without a test or specimen type', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openLabRequisitionModal(order.items[0]);
    fixture.componentInstance.submitLabRequisition();

    expect(labApi.createRequisition).not.toHaveBeenCalled();
  });

  it('cascades imaging type -> item for the radiology requisition picker', async () => {
    const { fixture, radiologyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openRadiologyRequisitionModal(order.items[1]);
    await fixture.whenStable();
    expect(radiologyApi.listImagingTypes).toHaveBeenCalledTimes(1);

    fixture.componentInstance.onRadiologyImagingTypeChange('type-1');
    await fixture.whenStable();
    expect(radiologyApi.listItemsByType).toHaveBeenCalledWith('type-1');
  });

  it('creates a radiology requisition against the item that opened the modal', async () => {
    const { fixture, radiologyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openRadiologyRequisitionModal(order.items[1]);
    fixture.componentInstance.radiologyImagingItemId.set('item-1');
    fixture.componentInstance.submitRadiologyRequisition();
    await fixture.whenStable();

    expect(radiologyApi.create).toHaveBeenCalledWith({ orderItemId: 'item-2', imagingItemId: 'item-1' });
    expect(fixture.componentInstance.showRadiologyRequisitionModal()).toBe(false);
  });

  it('surfaces an error toast and keeps the modal open when creating a lab requisition fails', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (labApi.createRequisition as jest.Mock).mockReturnValue(
      throwError(() => ({ status: 409, message: 'Order item already has a non-cancelled requisition' })),
    );

    fixture.componentInstance.openLabRequisitionModal(order.items[0]);
    fixture.componentInstance.labTestId.set('test-1');
    fixture.componentInstance.labSpecimenType.set('Blood');
    fixture.componentInstance.submitLabRequisition();
    await fixture.whenStable();

    expect(fixture.componentInstance.labRequisitionSaving()).toBe(false);
    expect(fixture.componentInstance.showLabRequisitionModal()).toBe(true);
  });
});
