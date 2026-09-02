import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { StockRequisitionDetail } from './stock-requisition-detail.js';
import { InventoryApiService, StockRequisitionDetail as StockRequisitionDetailModel } from '../inventory-api.service.js';
import { MasterDataApiService } from '../../master-data/master-data-api.service.js';
import { Department } from '../../master-data/master-data.model.js';
import { DirectoryResolverService } from '../../directory/directory-resolver.service.js';

const directoryResolverProvider = {
  provide: DirectoryResolverService,
  useValue: { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService,
};

describe('StockRequisitionDetail', () => {
  const requisition: StockRequisitionDetailModel = {
    id: 'req-1',
    departmentId: 'dept-1',
    requestedBy: 'account-1',
    requisitionNumber: 'REQ-2026-0001',
    status: 'Pending',
    notes: null,
    cancelReason: null,
    createdAt: '2026-01-12T09:00:00.000Z',
    updatedAt: '2026-01-12T09:00:00.000Z',
    items: [
      {
        id: 'rqi-1',
        requisitionId: 'req-1',
        itemId: 'item-1',
        requestedQuantity: '10',
        fulfilledQuantity: '4',
        createdAt: '2026-01-12T09:00:00.000Z',
        updatedAt: '2026-01-12T09:00:00.000Z',
      },
    ],
  };

  function setup() {
    const inventoryApi = {
      getRequisition: jest.fn().mockReturnValue(of(requisition)),
      fulfillRequisitionItem: jest.fn().mockReturnValue(of({ id: 'rqi-1' })),
      cancelRequisition: jest.fn().mockReturnValue(of({ ...requisition, status: 'Cancelled' })),
    } as unknown as InventoryApiService;
    const masterDataApi = {
      listDepartments: jest.fn().mockReturnValue(of([{ id: 'dept-1', departmentName: 'Pharmacy' } as Department])),
    } as unknown as MasterDataApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;
    const activatedRoute = {
      paramMap: of(convertToParamMap({ id: 'req-1' })),
    } as unknown as ActivatedRoute;

    TestBed.configureTestingModule({
      imports: [StockRequisitionDetail],
      providers: [
        provideRouter([]),
        { provide: InventoryApiService, useValue: inventoryApi },
        { provide: MasterDataApiService, useValue: masterDataApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
        directoryResolverProvider,
      ],
    });

    const fixture = TestBed.createComponent(StockRequisitionDetail);
    return { fixture, inventoryApi, masterDataApi };
  }

  it('loads the requisition and departments from the route param', async () => {
    const { fixture, inventoryApi, masterDataApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inventoryApi.getRequisition).toHaveBeenCalledWith('req-1');
    expect(masterDataApi.listDepartments).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.requisition()?.requisitionNumber).toBe('REQ-2026-0001');
    expect(fixture.componentInstance.departmentName('dept-1')).toBe('Pharmacy');
  });

  it('computes the remaining quantity from string quantities', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    expect(fixture.componentInstance.remaining(requisition.items[0])).toBe(6);
  });

  it('opens the fulfill dialog with the remaining quantity pre-filled', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    fixture.componentInstance.openFulfillDialog(requisition.items[0]);

    expect(fixture.componentInstance.showFulfillDialog()).toBe(true);
    expect(fixture.componentInstance.fulfillQuantity()).toBe(6);
  });

  it('submits the fulfill request and reloads the requisition on success', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openFulfillDialog(requisition.items[0]);
    fixture.componentInstance.setFulfillQuantity('6');
    fixture.componentInstance.confirmFulfill();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inventoryApi.fulfillRequisitionItem).toHaveBeenCalledWith('rqi-1', { quantity: 6 });
    expect(fixture.componentInstance.showFulfillDialog()).toBe(false);
    expect(fixture.componentInstance.fulfilling()).toBe(false);
    expect(inventoryApi.getRequisition).toHaveBeenCalledTimes(2);
  });

  it('does not submit when the quantity exceeds the remaining amount', () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();

    fixture.componentInstance.openFulfillDialog(requisition.items[0]);
    fixture.componentInstance.setFulfillQuantity('99');
    expect(fixture.componentInstance.canFulfill()).toBe(false);

    fixture.componentInstance.confirmFulfill();

    expect(inventoryApi.fulfillRequisitionItem).not.toHaveBeenCalled();
  });

  it('shows a not-found state and clears the loading flag when the request errors', async () => {
    const { fixture, inventoryApi } = setup();
    (inventoryApi.getRequisition as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.notFound()).toBe(true);
  });

  it('allows fulfilling a PartiallyFulfilled requisition, not just a Pending one', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    expect(fixture.componentInstance.isFulfillable('Pending')).toBe(true);
    expect(fixture.componentInstance.isFulfillable('PartiallyFulfilled')).toBe(true);
    expect(fixture.componentInstance.isFulfillable('Fulfilled')).toBe(false);
    expect(fixture.componentInstance.isFulfillable('Cancelled')).toBe(false);
  });

  it('cancels the requisition and reloads', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCancelModal();
    fixture.componentInstance.cancelReason.set('Department no longer needs the item');
    fixture.componentInstance.confirmCancel();
    await fixture.whenStable();

    expect(inventoryApi.cancelRequisition).toHaveBeenCalledWith('req-1', 'Department no longer needs the item');
    expect(fixture.componentInstance.showCancelModal()).toBe(false);
  });

  it('shows an error and keeps the dialog open when fulfill fails', async () => {
    const { fixture, inventoryApi } = setup();
    (inventoryApi.fulfillRequisitionItem as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openFulfillDialog(requisition.items[0]);
    fixture.componentInstance.confirmFulfill();

    expect(fixture.componentInstance.fulfilling()).toBe(false);
    expect(fixture.componentInstance.showFulfillDialog()).toBe(true);
    expect(fixture.componentInstance.fulfillError()).toBeTruthy();
  });
});
