import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuthService } from '@org/auth';
import { RadiologyRequisitionsList } from './radiology-requisitions-list.js';
import { RadiologyApiService } from './radiology-api.service.js';

describe('RadiologyRequisitionsList', () => {
  function setup(queryParams: Record<string, string> = {}) {
    const radiologyApi = {
      list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
    } as unknown as RadiologyApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;
    const activatedRoute = {
      queryParamMap: of(convertToParamMap(queryParams)),
    } as unknown as ActivatedRoute;

    TestBed.configureTestingModule({
      imports: [RadiologyRequisitionsList],
      providers: [
        provideRouter([]),
        { provide: RadiologyApiService, useValue: radiologyApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
        MessageService,
      ],
    });

    const fixture = TestBed.createComponent(RadiologyRequisitionsList);
    return { fixture, radiologyApi };
  }

  it('loads requisitions on init, page 1', async () => {
    const { fixture, radiologyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(radiologyApi.list).toHaveBeenCalledTimes(1);
    const call = (radiologyApi.list as jest.Mock).mock.calls[0][0];
    expect(call.page).toBe(1);
    expect(call.limit).toBe(fixture.componentInstance.pageSize());
    expect(fixture.componentInstance.requisitions()).toEqual([]);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('requests the correct page when the table lazy-loads a later page', async () => {
    const { fixture, radiologyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onLazyLoad({ first: 20 });

    const call = (radiologyApi.list as jest.Mock).mock.calls[1][0];
    expect(call.page).toBe(3);
    expect(fixture.componentInstance.firstRecord()).toBe(20);
  });

  it('resets to page 1 and applies filters', async () => {
    const { fixture, radiologyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.statusFilter.set('Scanned');
    fixture.componentInstance.orderItemIdFilter.set('order-item-7');
    fixture.componentInstance.applyFilters();

    expect(fixture.componentInstance.firstRecord()).toBe(0);
    const call = (radiologyApi.list as jest.Mock).mock.calls[1][0];
    expect(call.page).toBe(1);
    expect(call.status).toBe('Scanned');
    expect(call.orderItemId).toBe('order-item-7');
  });

  it('pre-fills the orderItemId filter from the query param and includes it in the initial load', () => {
    const { fixture, radiologyApi } = setup({ orderItemId: 'order-item-1' });
    fixture.detectChanges();

    expect(fixture.componentInstance.orderItemIdFilter()).toBe('order-item-1');
    const call = (radiologyApi.list as jest.Mock).mock.calls[0][0];
    expect(call.orderItemId).toBe('order-item-1');
  });

  it('refetches when the orderItemId query param changes on a reused component instance', async () => {
    const queryParamMap$ = new Subject<ReturnType<typeof convertToParamMap>>();
    const radiologyApi = {
      list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
    } as unknown as RadiologyApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;
    const activatedRoute = { queryParamMap: queryParamMap$ } as unknown as ActivatedRoute;
    TestBed.configureTestingModule({
      imports: [RadiologyRequisitionsList],
      providers: [
        provideRouter([]),
        { provide: RadiologyApiService, useValue: radiologyApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
        MessageService,
      ],
    });
    const fixture = TestBed.createComponent(RadiologyRequisitionsList);

    queryParamMap$.next(convertToParamMap({ orderItemId: 'order-item-A' }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect((radiologyApi.list as jest.Mock).mock.calls[0][0].orderItemId).toBe('order-item-A');

    queryParamMap$.next(convertToParamMap({ orderItemId: 'order-item-B' }));
    await fixture.whenStable();

    expect(radiologyApi.list).toHaveBeenCalledTimes(2);
    expect((radiologyApi.list as jest.Mock).mock.calls[1][0].orderItemId).toBe('order-item-B');
    expect(fixture.componentInstance.orderItemIdFilter()).toBe('order-item-B');
  });

  it('clears the loading flag when the list request errors', async () => {
    const { fixture, radiologyApi } = setup();
    (radiologyApi.list as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
  });
});
