import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { PharmacyDispensingList } from './pharmacy-dispensing-list.js';
import { PharmacyDispensingApiService } from './pharmacy-dispensing-api.service.js';

describe('PharmacyDispensingList', () => {
  function setup() {
    const pharmacyApi = {
      list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
      create: jest.fn().mockReturnValue(of({})),
    } as unknown as PharmacyDispensingApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [PharmacyDispensingList],
      providers: [
        provideRouter([]),
        { provide: PharmacyDispensingApiService, useValue: pharmacyApi },
        { provide: AuthService, useValue: auth },
      ],
    });

    const fixture = TestBed.createComponent(PharmacyDispensingList);
    return { fixture, pharmacyApi };
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
});
