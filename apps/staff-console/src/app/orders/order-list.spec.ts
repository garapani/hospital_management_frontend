import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { OrderList } from './order-list.js';
import { OrdersApiService } from './orders-api.service.js';

describe('OrderList', () => {
  function setup(queryParams: Record<string, string> = {}) {
    const ordersApi = {
      list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
      create: jest.fn().mockReturnValue(of({ id: 'order-1' })),
    } as unknown as OrdersApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;
    const activatedRoute = {
      queryParamMap: of(convertToParamMap(queryParams)),
    } as unknown as ActivatedRoute;

    TestBed.configureTestingModule({
      imports: [OrderList],
      providers: [
        provideRouter([]),
        { provide: OrdersApiService, useValue: ordersApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    });

    const fixture = TestBed.createComponent(OrderList);
    return { fixture, ordersApi };
  }

  it('does not fetch orders until a patient ID is provided (backend requires patientId)', async () => {
    const { fixture, ordersApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(ordersApi.list).not.toHaveBeenCalled();
    expect(fixture.componentInstance.orders()).toEqual([]);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('loads page 1 for the filtered patient', async () => {
    const { fixture, ordersApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.patientIdFilter.set('patient-1');
    fixture.componentInstance.applyFilter();

    expect(ordersApi.list).toHaveBeenCalledTimes(1);
    const call = (ordersApi.list as jest.Mock).mock.calls[0][0];
    expect(call.patientId).toBe('patient-1');
    expect(call.page).toBe(1);
    expect(call.limit).toBe(fixture.componentInstance.pageSize());
  });

  it('requests the correct page when the table lazy-loads a later page', async () => {
    const { fixture, ordersApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.patientIdFilter.set('patient-1');
    fixture.componentInstance.applyFilter();
    fixture.componentInstance.onLazyLoad({ first: 20 });

    const call = (ordersApi.list as jest.Mock).mock.calls[1][0];
    expect(call.page).toBe(3);
    expect(fixture.componentInstance.firstRecord()).toBe(20);
  });

  it('resets to page 1 when the filter is re-applied', async () => {
    const { fixture, ordersApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.patientIdFilter.set('patient-1');
    fixture.componentInstance.onLazyLoad({ first: 20 });
    fixture.componentInstance.applyFilter();

    expect(fixture.componentInstance.firstRecord()).toBe(0);
    const call = (ordersApi.list as jest.Mock).mock.calls[1][0];
    expect(call.page).toBe(1);
  });

  it('pre-fills the filter and create form and opens the modal when navigated with a patientId query param', () => {
    const { fixture } = setup({ patientId: 'patient-9' });

    expect(fixture.componentInstance.patientIdFilter()).toBe('patient-9');
    expect(fixture.componentInstance.showCreateModal()).toBe(true);
    expect(fixture.componentInstance.createForm().patientId).toBe('patient-9');
  });

  it('does not open the create modal when no patientId query param is present', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance.showCreateModal()).toBe(false);
  });

  it('clears the loading flag when the list request errors', async () => {
    const { fixture, ordersApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (ordersApi.list as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.patientIdFilter.set('patient-1');
    fixture.componentInstance.applyFilter();

    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('adds and removes item rows in the create form', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.createForm().items.length).toBe(1);
    fixture.componentInstance.addItemRow();
    expect(fixture.componentInstance.createForm().items.length).toBe(2);
    fixture.componentInstance.removeItemRow(0);
    expect(fixture.componentInstance.createForm().items.length).toBe(1);
  });

  it('does not submit an incomplete form', async () => {
    const { fixture, ordersApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.createForm.set({ patientId: '', items: [] });
    fixture.componentInstance.submitCreate();

    expect(ordersApi.create).not.toHaveBeenCalled();
  });

  it('submits a trimmed create payload and closes the modal on success', async () => {
    const { fixture, ordersApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.createForm.set({
      patientId: 'patient-1',
      orderedBy: 'Dr. X',
      notes: '',
      items: [
        { itemType: 'Lab', itemDescription: 'CBC', priority: 'STAT' },
        { itemType: 'Radiology', itemDescription: 'Chest X-Ray', priority: 'Routine' },
      ],
    });
    fixture.componentInstance.submitCreate();

    expect(ordersApi.create).toHaveBeenCalledWith({
      patientId: 'patient-1',
      items: [
        { itemType: 'Lab', itemDescription: 'CBC', priority: 'STAT' },
        { itemType: 'Radiology', itemDescription: 'Chest X-Ray', priority: 'Routine' },
      ],
      orderedBy: 'Dr. X',
    });
    expect(fixture.componentInstance.showCreateModal()).toBe(false);
    expect(fixture.componentInstance.saving()).toBe(false);
  });

  it('clears the saving flag and keeps the modal open when create errors', async () => {
    const { fixture, ordersApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (ordersApi.create as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.createForm.set({
      patientId: 'patient-1',
      items: [{ itemType: 'Lab', itemDescription: 'CBC' }],
    });
    fixture.componentInstance.showCreateModal.set(true);
    fixture.componentInstance.submitCreate();

    expect(fixture.componentInstance.saving()).toBe(false);
    expect(fixture.componentInstance.showCreateModal()).toBe(true);
  });
});
