import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { PurchaseOrderList } from './purchase-order-list.js';
import { InventoryApiService, PurchaseOrder } from '../inventory-api.service.js';

describe('PurchaseOrderList', () => {
  function setup() {
    const inventoryApi = {
      listVendors: jest.fn().mockReturnValue(of([])),
      listPurchaseOrders: jest
        .fn()
        .mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
      listCategories: jest.fn().mockReturnValue(of([])),
      listSubCategories: jest.fn().mockReturnValue(of([])),
      listItemsBySubCategory: jest.fn().mockReturnValue(of([])),
      createPurchaseOrder: jest.fn().mockReturnValue(of({ id: 'po-1' })),
    } as unknown as InventoryApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [PurchaseOrderList],
      providers: [
        { provide: InventoryApiService, useValue: inventoryApi },
        { provide: AuthService, useValue: auth },
      ],
    });

    const fixture = TestBed.createComponent(PurchaseOrderList);
    return { fixture, inventoryApi };
  }

  it('loads vendors on init and does not fetch orders before a vendor is selected', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inventoryApi.listVendors).toHaveBeenCalledTimes(1);
    expect(inventoryApi.listPurchaseOrders).not.toHaveBeenCalled();
    expect(fixture.componentInstance.hasSearched()).toBe(false);
  });

  it('fetches page 1 when a vendor is selected', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onVendorFilterChange('vendor-1');

    expect(fixture.componentInstance.hasSearched()).toBe(true);
    expect(fixture.componentInstance.firstRecord()).toBe(0);
    const call = (inventoryApi.listPurchaseOrders as jest.Mock).mock.calls[0][0];
    expect(call.vendorId).toBe('vendor-1');
    expect(call.page).toBe(1);
    expect(call.limit).toBe(fixture.componentInstance.pageSize());
  });

  it('requests the correct page when the table lazy-loads a later page', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.onVendorFilterChange('vendor-1');

    fixture.componentInstance.onLazyLoad({ first: 20 });

    const call = (inventoryApi.listPurchaseOrders as jest.Mock).mock.calls[1][0];
    expect(call.page).toBe(3);
    expect(fixture.componentInstance.firstRecord()).toBe(20);
  });

  it('clears the table when the vendor filter is cleared', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.onVendorFilterChange('vendor-1');
    fixture.componentInstance.purchaseOrders.set([{ id: 'po-1' } as PurchaseOrder]);

    fixture.componentInstance.onVendorFilterChange('');

    expect(fixture.componentInstance.purchaseOrders()).toEqual([]);
    expect(fixture.componentInstance.totalRecords()).toBe(0);
    expect(inventoryApi.listPurchaseOrders).toHaveBeenCalledTimes(1);
  });

  it('does not throw when the p-select clear icon emits null, and canAddLine requires a real item', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.onVendorFilterChange('vendor-1');

    expect(() => fixture.componentInstance.onVendorFilterChange(null)).not.toThrow();
    expect(fixture.componentInstance.hasSearched()).toBe(false);
    expect(fixture.componentInstance.vendorFilter()).toBe('');

    fixture.componentInstance.openCreateModal();
    fixture.componentInstance.lineSubCategoryId.set('sub-1');
    fixture.componentInstance.onLineItemChange(null);
    expect(fixture.componentInstance.canAddLine()).toBe(false);
  });

  it('clears the loading flag when the list request errors', async () => {
    const { fixture, inventoryApi } = setup();
    (inventoryApi.listPurchaseOrders as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onVendorFilterChange('vendor-1');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('adds a draft line and submits the create form with the expected payload', async () => {
    const { fixture, inventoryApi } = setup();
    (inventoryApi.listCategories as jest.Mock).mockReturnValue(
      of([{ id: 'cat-1', name: 'Medicines', displaySequence: 1 }]),
    );
    (inventoryApi.listSubCategories as jest.Mock).mockReturnValue(
      of([{ id: 'sub-1', categoryId: 'cat-1', name: 'Tablets', isConsumable: true }]),
    );
    (inventoryApi.listItemsBySubCategory as jest.Mock).mockReturnValue(
      of([{ id: 'item-1', subCategoryId: 'sub-1', name: 'Paracetamol', code: 'PCM-001', unitOfMeasure: 'Tab', salePrice: 5 }]),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.vendorFilter.set('vendor-1');
    fixture.componentInstance.openCreateModal();
    expect(fixture.componentInstance.createVendorId()).toBe('vendor-1');
    expect(inventoryApi.listCategories).toHaveBeenCalled();

    fixture.componentInstance.onLineCategoryChange('cat-1');
    fixture.componentInstance.onLineSubCategoryChange('sub-1');
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.lineItemId.set('item-1');
    fixture.componentInstance.lineQuantity.set(10);
    fixture.componentInstance.lineUnitCost.set(5.5);
    fixture.componentInstance.addLine();

    expect(fixture.componentInstance.createLines()).toEqual([
      expect.objectContaining({ itemId: 'item-1', itemName: 'Paracetamol', orderedQuantity: 10, unitCost: 5.5 }),
    ]);
    expect(fixture.componentInstance.isCreateValid()).toBe(true);

    fixture.componentInstance.createNotes.set('Urgent restock');
    fixture.componentInstance.submitCreate();

    expect(inventoryApi.createPurchaseOrder).toHaveBeenCalledWith({
      vendorId: 'vendor-1',
      notes: 'Urgent restock',
      items: [{ itemId: 'item-1', orderedQuantity: 10, unitCost: 5.5 }],
    });
    expect(fixture.componentInstance.showCreateModal()).toBe(false);
    expect(fixture.componentInstance.saving()).toBe(false);
  });

  it('does not submit when the create form has no lines', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.createVendorId.set('vendor-1');
    fixture.componentInstance.submitCreate();

    expect(inventoryApi.createPurchaseOrder).not.toHaveBeenCalled();
  });

  it('keeps the modal open and clears saving when create errors', async () => {
    const { fixture, inventoryApi } = setup();
    (inventoryApi.createPurchaseOrder as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.showCreateModal.set(true);
    fixture.componentInstance.createVendorId.set('vendor-1');
    fixture.componentInstance.createLines.set([
      { subCategoryId: 'sub-1', itemId: 'item-1', itemName: 'Paracetamol', orderedQuantity: 5, unitCost: 2 },
    ]);
    fixture.componentInstance.submitCreate();

    expect(fixture.componentInstance.saving()).toBe(false);
    expect(fixture.componentInstance.showCreateModal()).toBe(true);
  });
});
