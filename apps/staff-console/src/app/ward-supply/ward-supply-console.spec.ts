import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { WardSupplyConsole } from './ward-supply-console.js';
import { WardSupplyApiService } from './ward-supply-api.service.js';
import { InventoryApiService, InventoryItemSubCategory } from '../inventory/inventory-api.service.js';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';
import { DirectoryResolverService } from '../directory/directory-resolver.service.js';

const directoryResolverProvider = {
  provide: DirectoryResolverService,
  useValue: { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService,
};

describe('WardSupplyConsole', () => {
  function setup(canManage = true) {
    const api = {
      listBalances: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })),
      listTransactions: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })),
      receiveStock: jest.fn().mockReturnValue(of({})),
      consumeStock: jest.fn().mockReturnValue(of({})),
    } as unknown as WardSupplyApiService;
    const inventoryApi = {
      listCategories: jest.fn().mockReturnValue(of([])),
      listSubCategories: jest.fn().mockReturnValue(of([])),
      listItemsBySubCategory: jest.fn().mockReturnValue(of([])),
    } as unknown as InventoryApiService;
    const masterDataApi = {
      listDepartments: jest.fn().mockReturnValue(of([{ id: 'd1', departmentName: 'Ward A' }])),
    } as unknown as MasterDataApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;
    const auth = { hasPermission: () => canManage } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [WardSupplyConsole],
      providers: [
        { provide: WardSupplyApiService, useValue: api },
        { provide: InventoryApiService, useValue: inventoryApi },
        { provide: MasterDataApiService, useValue: masterDataApi },
        { provide: MessageService, useValue: messageService },
        { provide: AuthService, useValue: auth },
        directoryResolverProvider,
      ],
    });

    const fixture = TestBed.createComponent(WardSupplyConsole);
    return { fixture, api, inventoryApi, masterDataApi, messageService };
  }

  it('loads departments, balances and transactions on init', async () => {
    const { fixture, api, masterDataApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(masterDataApi.listDepartments).toHaveBeenCalled();
    expect(api.listBalances).toHaveBeenCalled();
    expect(api.listTransactions).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
  });

  it('hides Receive/Consume actions for a read-only user', async () => {
    const { fixture } = setup(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.canManage).toBe(false);
  });

  it('receives stock, omitting blank optional fields, and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openReceiveModal();
    fixture.componentInstance.receiveForm.set({
      departmentId: 'd1',
      itemId: 'i1',
      quantity: 10,
      patientId: '',
      remarks: '',
      batchNumber: '',
      expiryDate: '',
    });
    fixture.componentInstance.submitReceive();
    await fixture.whenStable();

    expect(api.receiveStock).toHaveBeenCalledWith({
      departmentId: 'd1',
      itemId: 'i1',
      quantity: 10,
      batchNumber: undefined,
      expiryDate: undefined,
      patientId: undefined,
      remarks: undefined,
    });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Stock received' }));
  });

  it('consumes stock, omitting a blank patientId rather than sending an empty string, and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openConsumeModal();
    fixture.componentInstance.consumeForm.set({
      departmentId: 'd1',
      itemId: 'i1',
      quantity: 5,
      patientId: '',
      remarks: '',
      batchNumber: '',
      expiryDate: '',
    });
    fixture.componentInstance.submitConsume();
    await fixture.whenStable();

    expect(api.consumeStock).toHaveBeenCalledWith({
      departmentId: 'd1',
      itemId: 'i1',
      quantity: 5,
      patientId: undefined,
      remarks: undefined,
    });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Stock consumed' }));
  });

  it('shows an error toast when receiving fails', async () => {
    const { fixture, api } = setup();
    (api.receiveStock as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: ApiError) => void }) =>
        handlers.error({ status: 400, message: 'Invalid item', body: null }),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.receiveForm.set({
      departmentId: 'd1',
      itemId: 'bad',
      quantity: 10,
      patientId: '',
      remarks: '',
      batchNumber: '',
      expiryDate: '',
    });
    fixture.componentInstance.submitReceive();
    await fixture.whenStable();

    expect(fixture.componentInstance.receiveError()).toBe('Invalid item');
  });

  it('cascades category -> sub-category -> item selection in the movement dialogs', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openReceiveModal();
    fixture.componentInstance.onLineCategoryChange('cat1');
    await fixture.whenStable();
    expect(inventoryApi.listSubCategories).toHaveBeenCalledWith('cat1');

    fixture.componentInstance.onLineSubCategoryChange('sub1');
    await fixture.whenStable();
    expect(inventoryApi.listItemsBySubCategory).toHaveBeenCalledWith('sub1');
  });

  it('does not let a slower earlier line-category response overwrite a later one that resolved first', async () => {
    const { fixture, inventoryApi } = setup();
    const firstResponse$ = new Subject<InventoryItemSubCategory[]>();
    const secondResponse$ = new Subject<InventoryItemSubCategory[]>();
    (inventoryApi.listSubCategories as jest.Mock).mockReturnValueOnce(firstResponse$).mockReturnValueOnce(secondResponse$);
    fixture.detectChanges();

    fixture.componentInstance.openReceiveModal();
    fixture.componentInstance.onLineCategoryChange('cat-1');
    fixture.componentInstance.onLineCategoryChange('cat-2');
    secondResponse$.next([{ id: 'sub-2', categoryId: 'cat-2', name: 'Syrups', isConsumable: true, createdAt: '', updatedAt: '' }]);
    firstResponse$.next([{ id: 'sub-1', categoryId: 'cat-1', name: 'Tablets', isConsumable: true, createdAt: '', updatedAt: '' }]);

    expect(fixture.componentInstance.dialogSubCategories()).toEqual([
      { id: 'sub-2', categoryId: 'cat-2', name: 'Syrups', isConsumable: true, createdAt: '', updatedAt: '' },
    ]);
  });

  it('paginates the transactions tab on lazy-load', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onTransactionsLazyLoad({ first: 20, rows: 20 });
    await fixture.whenStable();

    expect(api.listTransactions).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 20 }));
  });

  it('filters by department and resets filter back to all departments', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.departmentIdFilter.set('dept-1');
    fixture.componentInstance.applyFilter();
    expect(api.listBalances).toHaveBeenCalledWith('dept-1');
    expect(api.listTransactions).toHaveBeenCalledWith(expect.objectContaining({ departmentId: 'dept-1' }));

    fixture.componentInstance.resetFilter();
    expect(fixture.componentInstance.departmentIdFilter()).toBe('');
    expect(api.listBalances).toHaveBeenCalledWith(undefined);
    expect(api.listTransactions).toHaveBeenCalledWith(expect.objectContaining({ departmentId: undefined }));
  });
});

