import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { LabRequisitionsList } from './lab-requisitions-list.js';
import { LabApiService, LabRequisition } from '../lab-api.service.js';
import { DirectoryResolverService } from '../../directory/directory-resolver.service.js';

const directoryResolverProvider = {
  provide: DirectoryResolverService,
  useValue: { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService,
};

describe('LabRequisitionsList', () => {
  const requisition: LabRequisition = {
    id: 'req-1',
    orderItemId: 'order-item-1',
    patientId: 'patient-1',
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
    } as unknown as LabApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [LabRequisitionsList],
      providers: [
        provideRouter([]),
        { provide: LabApiService, useValue: labApi },
        { provide: AuthService, useValue: auth },
        directoryResolverProvider,
      ],
    });

    const fixture = TestBed.createComponent(LabRequisitionsList);
    return { fixture, labApi };
  }

  it('loads the Pending worklist on init, with no order item id required', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(labApi.listRequisitions).toHaveBeenCalledWith({
      orderItemId: undefined,
      status: 'Pending',
      page: 1,
      limit: fixture.componentInstance.pageSize(),
    });
    expect(fixture.componentInstance.requisitions()).toEqual([requisition]);
  });

  it('filters by order item id when one is entered', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.orderItemIdFilter.set('order-item-1');
    fixture.componentInstance.applyFilters();

    const call = (labApi.listRequisitions as jest.Mock).mock.calls[1][0];
    expect(call).toEqual({ orderItemId: 'order-item-1', status: 'Pending', page: 1, limit: fixture.componentInstance.pageSize() });
  });

  it('filters by status', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.statusFilter.set('Verified');
    fixture.componentInstance.applyFilters();

    const call = (labApi.listRequisitions as jest.Mock).mock.calls[1][0];
    expect(call.status).toBe('Verified');
  });

  it('requests the correct page when the table lazy-loads a later page', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onLazyLoad({ first: 20 });

    const call = (labApi.listRequisitions as jest.Mock).mock.calls[1][0];
    expect(call.page).toBe(3);
    expect(fixture.componentInstance.firstRecord()).toBe(20);
  });

  it('clears the loading flag when the list request errors', async () => {
    const labApiFail = { listRequisitions: jest.fn().mockReturnValue(throwError(() => new Error('boom'))) } as unknown as LabApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;
    TestBed.configureTestingModule({
      imports: [LabRequisitionsList],
      providers: [
        provideRouter([]),
        { provide: LabApiService, useValue: labApiFail },
        { provide: AuthService, useValue: auth },
        directoryResolverProvider,
      ],
    });
    const failingFixture = TestBed.createComponent(LabRequisitionsList);

    failingFixture.detectChanges();
    await failingFixture.whenStable();

    expect(failingFixture.componentInstance.loading()).toBe(false);
  });

  it('resets filters back to default Pending and reloads', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.orderItemIdFilter.set('order-item-1');
    fixture.componentInstance.statusFilter.set('Verified');
    fixture.componentInstance.applyFilters();

    fixture.componentInstance.resetFilters();

    expect(fixture.componentInstance.orderItemIdFilter()).toBe('');
    expect(fixture.componentInstance.statusFilter()).toBe('Pending');
    const lastCall = (labApi.listRequisitions as jest.Mock).mock.calls.at(-1)[0];
    expect(lastCall).toEqual({ orderItemId: undefined, status: 'Pending', page: 1, limit: 10 });
  });
});

