import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { StockRequisitionList } from './stock-requisition-list.js';
import { InventoryApiService, StockRequisition } from '../inventory-api.service.js';
import { MasterDataApiService } from '../../master-data/master-data-api.service.js';
import { Department } from '../../master-data/master-data.model.js';

describe('StockRequisitionList', () => {
  function setup() {
    const inventoryApi = {
      listRequisitions: jest
        .fn()
        .mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
    } as unknown as InventoryApiService;
    const masterDataApi = {
      listDepartments: jest.fn().mockReturnValue(of([])),
    } as unknown as MasterDataApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [StockRequisitionList],
      providers: [
        { provide: InventoryApiService, useValue: inventoryApi },
        { provide: MasterDataApiService, useValue: masterDataApi },
        { provide: AuthService, useValue: auth },
      ],
    });

    const fixture = TestBed.createComponent(StockRequisitionList);
    return { fixture, inventoryApi, masterDataApi };
  }

  it('loads departments on init and does not fetch requisitions before a department is selected', async () => {
    const { fixture, inventoryApi, masterDataApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(masterDataApi.listDepartments).toHaveBeenCalledTimes(1);
    expect(inventoryApi.listRequisitions).not.toHaveBeenCalled();
    expect(fixture.componentInstance.hasSearched()).toBe(false);
  });

  it('fetches page 1 when a department is selected', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onDepartmentFilterChange('dept-1');

    expect(fixture.componentInstance.hasSearched()).toBe(true);
    expect(fixture.componentInstance.firstRecord()).toBe(0);
    const call = (inventoryApi.listRequisitions as jest.Mock).mock.calls[0][0];
    expect(call.departmentId).toBe('dept-1');
    expect(call.page).toBe(1);
    expect(call.limit).toBe(fixture.componentInstance.pageSize());
  });

  it('requests the correct page when the table lazy-loads a later page', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.onDepartmentFilterChange('dept-1');

    fixture.componentInstance.onLazyLoad({ first: 20 });

    const call = (inventoryApi.listRequisitions as jest.Mock).mock.calls[1][0];
    expect(call.page).toBe(3);
    expect(fixture.componentInstance.firstRecord()).toBe(20);
  });

  it('clears the table when the department filter is cleared', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.onDepartmentFilterChange('dept-1');
    fixture.componentInstance.requisitions.set([{ id: 'req-1' } as StockRequisition]);

    fixture.componentInstance.onDepartmentFilterChange('');

    expect(fixture.componentInstance.requisitions()).toEqual([]);
    expect(fixture.componentInstance.totalRecords()).toBe(0);
    expect(inventoryApi.listRequisitions).toHaveBeenCalledTimes(1);
  });

  it('resolves a department name from the loaded department catalog', () => {
    const { fixture, masterDataApi } = setup();
    (masterDataApi.listDepartments as jest.Mock).mockReturnValue(
      of([{ id: 'dept-1', departmentName: 'Pharmacy' } as Department]),
    );
    fixture.detectChanges();
    fixture.componentInstance.departments.set([
      { id: 'dept-1', departmentName: 'Pharmacy' } as Department,
    ]);

    expect(fixture.componentInstance.departmentName('dept-1')).toBe('Pharmacy');
    expect(fixture.componentInstance.departmentName('missing')).toBe('missing');
  });

  it('clears the loading flag when the list request errors', async () => {
    const { fixture, inventoryApi } = setup();
    (inventoryApi.listRequisitions as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onDepartmentFilterChange('dept-1');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
  });
});
