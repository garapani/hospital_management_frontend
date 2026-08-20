import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OrderDetail } from './order-detail.js';
import { OrdersApiService, OrderWithItems } from './orders-api.service.js';

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

  function setup() {
    const ordersApi = {
      getById: jest.fn().mockReturnValue(of(order)),
    } as unknown as OrdersApiService;
    const activatedRoute = { paramMap: of(convertToParamMap({ id: 'order-1' })) } as unknown as ActivatedRoute;

    TestBed.configureTestingModule({
      imports: [OrderDetail],
      providers: [
        provideRouter([]),
        { provide: OrdersApiService, useValue: ordersApi },
        { provide: ActivatedRoute, useValue: activatedRoute },
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
      ],
    });
    const fixture = TestBed.createComponent(OrderDetail);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
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
