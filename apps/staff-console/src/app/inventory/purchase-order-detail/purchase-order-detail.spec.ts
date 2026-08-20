import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PurchaseOrderDetail } from './purchase-order-detail.js';
import { InventoryApiService, PurchaseOrderDetail as PurchaseOrderDetailModel } from '../inventory-api.service.js';

describe('PurchaseOrderDetail', () => {
  const purchaseOrder: PurchaseOrderDetailModel = {
    id: 'po-1',
    vendorId: 'vendor-1',
    purchaseOrderNumber: 'PO-2026-0001',
    orderedBy: 'account-1',
    orderedAt: '2026-01-10T09:00:00.000Z',
    status: 'PartiallyReceived',
    notes: null,
    cancelReason: null,
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-01-10T09:00:00.000Z',
    items: [
      {
        id: 'poi-1',
        purchaseOrderId: 'po-1',
        itemId: 'item-1',
        orderedQuantity: '10',
        receivedQuantity: '4',
        unitCost: '5.5',
        createdAt: '2026-01-10T09:00:00.000Z',
        updatedAt: '2026-01-10T09:00:00.000Z',
      },
    ],
  };

  function setup() {
    const inventoryApi = {
      getPurchaseOrder: jest.fn().mockReturnValue(of(purchaseOrder)),
    } as unknown as InventoryApiService;
    const activatedRoute = {
      paramMap: of(convertToParamMap({ id: 'po-1' })),
    } as unknown as ActivatedRoute;

    TestBed.configureTestingModule({
      imports: [PurchaseOrderDetail],
      providers: [
        provideRouter([]),
        { provide: InventoryApiService, useValue: inventoryApi },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    });

    const fixture = TestBed.createComponent(PurchaseOrderDetail);
    return { fixture, inventoryApi };
  }

  it('loads the purchase order from the route param', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inventoryApi.getPurchaseOrder).toHaveBeenCalledWith('po-1');
    expect(fixture.componentInstance.purchaseOrder()?.purchaseOrderNumber).toBe('PO-2026-0001');
  });

  it('computes line totals from string quantities', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    const line = purchaseOrder.items[0];
    expect(fixture.componentInstance.lineTotal(line)).toBe(55);
  });

  it('clears the loading flag when the request errors', async () => {
    const { fixture, inventoryApi } = setup();
    (inventoryApi.getPurchaseOrder as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
  });
});
