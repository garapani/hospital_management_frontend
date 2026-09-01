import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ConfirmationService, Confirmation } from 'primeng/api';
import { AuthService } from '@org/auth';
import { OrderDetail } from './order-detail.js';
import { OrdersApiService, OrderWithItems } from './orders-api.service.js';
import { DirectoryResolverService } from '../directory/directory-resolver.service.js';

const auth = { hasPermission: () => true } as unknown as AuthService;
const directoryResolverProvider = {
  provide: DirectoryResolverService,
  useValue: { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService,
};

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

    TestBed.configureTestingModule({
      imports: [OrderDetail],
      providers: [
        provideRouter([]),
        { provide: OrdersApiService, useValue: ordersApi },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: AuthService, useValue: auth },
        directoryResolverProvider,
      ],
    });

    const fixture = TestBed.createComponent(OrderDetail);
    return { fixture, ordersApi };
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
});
