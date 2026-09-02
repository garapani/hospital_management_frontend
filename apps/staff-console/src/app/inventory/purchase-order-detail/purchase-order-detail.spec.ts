import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { PurchaseOrderDetail } from './purchase-order-detail.js';
import { InventoryApiService, PurchaseOrderDetail as PurchaseOrderDetailModel } from '../inventory-api.service.js';
import { DirectoryResolverService } from '../../directory/directory-resolver.service.js';

const directoryResolverProvider = {
  provide: DirectoryResolverService,
  useValue: { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService,
};

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
      listVendors: jest.fn().mockReturnValue(of([{ id: 'vendor-1', name: 'Acme Pharma', contactPerson: null, phone: null, address: null, createdAt: '', updatedAt: '' }])),
      cancelPurchaseOrder: jest.fn().mockReturnValue(of({ ...purchaseOrder, status: 'Cancelled' })),
      recordGoodsReceipt: jest.fn().mockReturnValue(of({})),
    } as unknown as InventoryApiService;
    const activatedRoute = {
      paramMap: of(convertToParamMap({ id: 'po-1' })),
    } as unknown as ActivatedRoute;
    const auth = { hasPermission: jest.fn().mockReturnValue(true) } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [PurchaseOrderDetail],
      providers: [
        provideRouter([]),
        { provide: InventoryApiService, useValue: inventoryApi },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: AuthService, useValue: auth },
        directoryResolverProvider,
      ],
    });

    const fixture = TestBed.createComponent(PurchaseOrderDetail);
    return { fixture, inventoryApi };
  }

  it('loads the purchase order from the route param and resolves the vendor name', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inventoryApi.getPurchaseOrder).toHaveBeenCalledWith('po-1');
    expect(fixture.componentInstance.purchaseOrder()?.purchaseOrderNumber).toBe('PO-2026-0001');
    expect(fixture.componentInstance.vendorName('vendor-1')).toBe('Acme Pharma');
  });

  it('computes line totals from string quantities', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    const line = purchaseOrder.items[0];
    expect(fixture.componentInstance.lineTotal(line)).toBe(55);
  });

  it('shows a not-found state and clears the loading flag when the request errors', async () => {
    const { fixture, inventoryApi } = setup();
    (inventoryApi.getPurchaseOrder as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.notFound()).toBe(true);
  });

  it('cancels the order and reloads', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCancelModal();
    fixture.componentInstance.cancelReason.set('Vendor discontinued the item');
    fixture.componentInstance.confirmCancel();
    await fixture.whenStable();

    expect(inventoryApi.cancelPurchaseOrder).toHaveBeenCalledWith('po-1', 'Vendor discontinued the item');
    expect(fixture.componentInstance.showCancelModal()).toBe(false);
  });

  it('records a goods receipt for a line and reloads', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    const line = purchaseOrder.items[0];
    fixture.componentInstance.openReceiveModal(line);
    expect(fixture.componentInstance.receiveQuantity()).toBe(6);
    fixture.componentInstance.receiveBatchNumber.set('BATCH-1');
    fixture.componentInstance.confirmReceive();
    await fixture.whenStable();

    expect(inventoryApi.recordGoodsReceipt).toHaveBeenCalledWith(
      'poi-1',
      expect.objectContaining({ batchNumber: 'BATCH-1', receivedQuantity: 6 }),
    );
    expect(fixture.componentInstance.showReceiveModal()).toBe(false);
  });

  it('refuses to record a goods receipt with no batch number', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    fixture.componentInstance.openReceiveModal(purchaseOrder.items[0]);
    fixture.componentInstance.receiveBatchNumber.set('');
    expect(fixture.componentInstance.canReceive()).toBe(false);
  });
});
