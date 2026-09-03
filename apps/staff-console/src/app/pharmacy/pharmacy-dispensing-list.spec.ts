import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { PharmacyDispensingList } from './pharmacy-dispensing-list.js';
import { PharmacyDispensingApiService } from './pharmacy-dispensing-api.service.js';
import { InventoryApiService } from '../inventory/inventory-api.service.js';
import { DirectoryResolverService } from '../directory/directory-resolver.service.js';

describe('PharmacyDispensingList', () => {
  function setup() {
    const pharmacyApi = {
      list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
      listPendingItems: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } })),
      create: jest.fn().mockReturnValue(of({})),
    } as unknown as PharmacyDispensingApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;
    const inventoryApi = {
      listCategories: jest.fn().mockReturnValue(of([])),
      listSubCategories: jest.fn().mockReturnValue(of([])),
      listItemsBySubCategory: jest.fn().mockReturnValue(of([])),
    } as unknown as InventoryApiService;
    const directoryResolver = { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService;

    TestBed.configureTestingModule({
      imports: [PharmacyDispensingList],
      providers: [
        provideRouter([]),
        { provide: PharmacyDispensingApiService, useValue: pharmacyApi },
        { provide: AuthService, useValue: auth },
        { provide: InventoryApiService, useValue: inventoryApi },
        { provide: DirectoryResolverService, useValue: directoryResolver },
      ],
    });

    const fixture = TestBed.createComponent(PharmacyDispensingList);
    return { fixture, pharmacyApi, inventoryApi, directoryResolver };
  }

  it('loads the first page of dispensings on init', async () => {
    const { fixture, pharmacyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(pharmacyApi.list).toHaveBeenCalledTimes(1);
    const call = (pharmacyApi.list as jest.Mock).mock.calls[0][0];
    expect(call.page).toBe(1);
    expect(call.limit).toBe(fixture.componentInstance.pageSize());
    expect(fixture.componentInstance.dispensings()).toEqual([]);
  });

  it('requests the correct page when the table lazy-loads a later page', async () => {
    const { fixture, pharmacyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onLazyLoad({ first: 20 });

    const call = (pharmacyApi.list as jest.Mock).mock.calls[1][0];
    expect(call.page).toBe(3);
    expect(fixture.componentInstance.firstRecord()).toBe(20);
  });

  it('resets to page 1 when filters are applied', async () => {
    const { fixture, pharmacyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.onLazyLoad({ first: 20 });

    fixture.componentInstance.applyFilters();

    expect(fixture.componentInstance.firstRecord()).toBe(0);
    const call = (pharmacyApi.list as jest.Mock).mock.calls[2][0];
    expect(call.page).toBe(1);
  });

  it('passes the active filters to the list request', async () => {
    const { fixture, pharmacyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.orderItemIdFilter.set('order-1');
    fixture.componentInstance.statusFilter.set('Pending');
    fixture.componentInstance.applyFilters();

    const call = (pharmacyApi.list as jest.Mock).mock.calls[1][0];
    expect(call.orderItemId).toBe('order-1');
    expect(call.status).toBe('Pending');
  });

  it('loads pending Pharmacy order items and resolves patient names when the create modal opens', async () => {
    const { fixture, pharmacyApi, directoryResolver } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (pharmacyApi.listPendingItems as jest.Mock).mockReturnValue(
      of({
        data: [{ id: 'item-1', itemDescription: 'Paracetamol 500mg', patientId: 'patient-9' }],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      }),
    );
    (directoryResolver.resolve as jest.Mock).mockReturnValue(of('Jane Doe'));

    fixture.componentInstance.openCreateModal();
    await fixture.whenStable();

    expect(pharmacyApi.listPendingItems).toHaveBeenCalledWith({ status: 'Pending', limit: 50 });
    expect(directoryResolver.resolve).toHaveBeenCalledWith('patient', 'patient-9');
    expect(fixture.componentInstance.orderItemOptions()).toEqual([
      { label: 'Jane Doe — Paracetamol 500mg', value: 'item-1' },
    ]);
    expect(fixture.componentInstance.orderItemsLoading()).toBe(false);
  });

  it('loads categories for the inventory item picker when the create modal opens', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (inventoryApi.listCategories as jest.Mock).mockReturnValue(of([{ id: 'cat-1', name: 'Analgesics' }]));

    fixture.componentInstance.openCreateModal();
    await fixture.whenStable();

    expect(inventoryApi.listCategories).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.dialogCategories()).toEqual([{ id: 'cat-1', name: 'Analgesics' }]);
  });

  it('cascades sub-categories then items as the picker selections change, resetting the chosen inventory item', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (inventoryApi.listSubCategories as jest.Mock).mockReturnValue(of([{ id: 'sub-1', name: 'Tablets' }]));
    (inventoryApi.listItemsBySubCategory as jest.Mock).mockReturnValue(of([{ id: 'item-1', name: 'Paracetamol' }]));

    fixture.componentInstance.createForm.set({ orderItemId: '', inventoryItemId: 'stale', quantity: 1 });
    fixture.componentInstance.onCategoryChange('cat-1');
    await Promise.resolve();

    expect(inventoryApi.listSubCategories).toHaveBeenCalledWith('cat-1');
    expect(fixture.componentInstance.dialogSubCategories()).toEqual([{ id: 'sub-1', name: 'Tablets' }]);
    expect(fixture.componentInstance.createForm().inventoryItemId).toBe('');

    fixture.componentInstance.onSubCategoryChange('sub-1');
    await Promise.resolve();

    expect(inventoryApi.listItemsBySubCategory).toHaveBeenCalledWith('sub-1');
    expect(fixture.componentInstance.dialogInventoryItems()).toEqual([{ id: 'item-1', name: 'Paracetamol' }]);

    fixture.componentInstance.onInventoryItemChange('item-1');
    expect(fixture.componentInstance.createForm().inventoryItemId).toBe('item-1');
  });

  it('creates a dispensing and reloads the first page', async () => {
    const { fixture, pharmacyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.createForm.set({ orderItemId: 'order-1', inventoryItemId: 'inv-1', quantity: 2 });
    fixture.componentInstance.submitCreate();

    expect(pharmacyApi.create).toHaveBeenCalledWith({ orderItemId: 'order-1', inventoryItemId: 'inv-1', quantity: 2 });
    expect(fixture.componentInstance.showCreateModal()).toBe(false);
    expect(fixture.componentInstance.firstRecord()).toBe(0);
  });

  it('clears the loading flag when the list request errors', async () => {
    const { fixture, pharmacyApi } = setup();
    (pharmacyApi.list as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('clears the saving flag and keeps the modal open when create errors', async () => {
    const { fixture, pharmacyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (pharmacyApi.create as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.showCreateModal.set(true);
    fixture.componentInstance.submitCreate();

    expect(fixture.componentInstance.saving()).toBe(false);
    expect(fixture.componentInstance.showCreateModal()).toBe(true);
  });

  it('resets filters back to empty and reloads page 1', async () => {
    const { fixture, pharmacyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.orderItemIdFilter.set('order-1');
    fixture.componentInstance.statusFilter.set('Pending');
    fixture.componentInstance.applyFilters();

    fixture.componentInstance.resetFilters();

    expect(fixture.componentInstance.orderItemIdFilter()).toBe('');
    expect(fixture.componentInstance.statusFilter()).toBe('');
    expect(fixture.componentInstance.firstRecord()).toBe(0);
    const lastCall = (pharmacyApi.list as jest.Mock).mock.calls.at(-1)[0];
    expect(lastCall.orderItemId).toBeUndefined();
    expect(lastCall.status).toBeUndefined();
    expect(lastCall.page).toBe(1);
  });
});

