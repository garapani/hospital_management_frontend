import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { LabRequisitionsList } from './lab-requisitions-list.js';
import { LabApiService, LabRequisition } from '../lab-api.service.js';

describe('LabRequisitionsList', () => {
  const requisition: LabRequisition = {
    id: 'req-1',
    orderItemId: 'order-item-1',
    testId: 'test-1',
    requisitionNumber: 'LAB-0001',
    specimenType: 'Blood',
    status: 'Pending',
    sampleCollectedBy: null,
    sampleCollectedAt: null,
    verifiedBy: null,
    verifiedAt: null,
    cancelReason: null,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  };

  function setup() {
    const labApi = {
      listRequisitions: jest
        .fn()
        .mockReturnValue(of({ data: [requisition], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } })),
      getRequisition: jest.fn(),
      collectSample: jest.fn(),
      enterResult: jest.fn(),
      verify: jest.fn(),
      listCategories: jest.fn(),
      listTestsByCategory: jest.fn(),
      listComponentsByTest: jest.fn(),
    } as unknown as LabApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [LabRequisitionsList],
      providers: [
        provideRouter([]),
        { provide: LabApiService, useValue: labApi },
        { provide: AuthService, useValue: auth },
      ],
    });

    const fixture = TestBed.createComponent(LabRequisitionsList);
    return { fixture, labApi };
  }

  it('does not call the API on init because orderItemId is required', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(labApi.listRequisitions).not.toHaveBeenCalled();
    expect(fixture.componentInstance.requisitions()).toEqual([]);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('loads requisitions for the applied order item id, page 1', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.orderItemIdFilter.set('order-item-1');
    fixture.componentInstance.applyFilters();

    expect(labApi.listRequisitions).toHaveBeenCalledTimes(1);
    const call = (labApi.listRequisitions as jest.Mock).mock.calls[0][0];
    expect(call).toEqual({ orderItemId: 'order-item-1', page: 1, limit: fixture.componentInstance.pageSize() });
    expect(fixture.componentInstance.requisitions()).toEqual([requisition]);
    expect(fixture.componentInstance.totalRecords()).toBe(1);
    expect(fixture.componentInstance.hasSearched()).toBe(true);
  });

  it('requests the correct page when the table lazy-loads a later page', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.orderItemIdFilter.set('order-item-1');
    fixture.componentInstance.applyFilters();
    fixture.componentInstance.onLazyLoad({ first: 20 });

    const call = (labApi.listRequisitions as jest.Mock).mock.calls[1][0];
    expect(call.page).toBe(3);
    expect(fixture.componentInstance.firstRecord()).toBe(20);
  });

  it('clears the table and skips the API when the order item id is emptied', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.orderItemIdFilter.set('order-item-1');
    fixture.componentInstance.applyFilters();
    fixture.componentInstance.orderItemIdFilter.set('');
    fixture.componentInstance.applyFilters();

    expect(labApi.listRequisitions).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.requisitions()).toEqual([]);
    expect(fixture.componentInstance.totalRecords()).toBe(0);
    expect(fixture.componentInstance.hasSearched()).toBe(false);
  });

  it('clears the loading flag when the list request errors', async () => {
    const { fixture, labApi } = setup();
    (labApi.listRequisitions as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.orderItemIdFilter.set('order-item-1');
    fixture.componentInstance.applyFilters();

    expect(fixture.componentInstance.loading()).toBe(false);
  });
});
