import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { AppointmentList } from './appointment-list.js';
import { AppointmentsApiService, Appointment } from './appointments-api.service.js';

describe('AppointmentList', () => {
  function setup(queryParams: Record<string, string> = {}) {
    const appointmentsApi = {
      list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })),
      create: jest.fn().mockReturnValue(of({})),
      checkIn: jest.fn().mockReturnValue(of({ id: 'appt-1', status: 'CheckedIn' })),
    } as unknown as AppointmentsApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;
    const activatedRoute = {
      queryParamMap: of(convertToParamMap(queryParams)),
    } as unknown as ActivatedRoute;

    TestBed.configureTestingModule({
      imports: [AppointmentList],
      providers: [
        provideRouter([]),
        { provide: AppointmentsApiService, useValue: appointmentsApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    });

    const fixture = TestBed.createComponent(AppointmentList);
    return { fixture, appointmentsApi };
  }

  it("loads today's appointments on init, page 1", async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(appointmentsApi.list).toHaveBeenCalledTimes(1);
    const call = (appointmentsApi.list as jest.Mock).mock.calls[0][0];
    expect(call.date).toBe(fixture.componentInstance.dateFilter());
    expect(call.page).toBe(1);
    expect(call.limit).toBe(fixture.componentInstance.pageSize());
    expect(fixture.componentInstance.appointments()).toEqual([]);
  });

  it('requests the correct page when the table lazy-loads a later page', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onLazyLoad({ first: 20 });

    const call = (appointmentsApi.list as jest.Mock).mock.calls[1][0];
    expect(call.page).toBe(3);
    expect(fixture.componentInstance.firstRecord()).toBe(20);
  });

  it('resets to page 1 when filters are applied', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.onLazyLoad({ first: 20 });

    fixture.componentInstance.applyFilters();

    expect(fixture.componentInstance.firstRecord()).toBe(0);
    const call = (appointmentsApi.list as jest.Mock).mock.calls[2][0];
    expect(call.page).toBe(1);
  });

  it('pre-fills and opens the create modal when navigated with a patientId query param', () => {
    const { fixture } = setup({ patientId: 'patient-1', firstName: 'Jane', lastName: 'Doe', contactNumber: '555-1234' });

    expect(fixture.componentInstance.showCreateModal()).toBe(true);
    expect(fixture.componentInstance.createForm()).toEqual(
      expect.objectContaining({ patientId: 'patient-1', firstName: 'Jane', lastName: 'Doe', contactNumber: '555-1234' }),
    );
  });

  it('does not open the create modal when no patientId query param is present', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance.showCreateModal()).toBe(false);
  });

  it('clears the loading flag when the list request errors', async () => {
    const { fixture, appointmentsApi } = setup();
    (appointmentsApi.list as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('clears the saving flag and keeps the modal open when create errors', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (appointmentsApi.create as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.showCreateModal.set(true);
    fixture.componentInstance.submitCreate();

    expect(fixture.componentInstance.saving()).toBe(false);
    expect(fixture.componentInstance.showCreateModal()).toBe(true);
  });

  it('checks in an appointment and reloads the current page', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.onLazyLoad({ first: 20 });
    const callsBeforeCheckIn = (appointmentsApi.list as jest.Mock).mock.calls.length;

    fixture.componentInstance.checkIn({ id: 'appt-1' } as Appointment);

    expect(appointmentsApi.checkIn).toHaveBeenCalledWith('appt-1');
    expect(fixture.componentInstance.checkInActionId()).toBeNull();
    const call = (appointmentsApi.list as jest.Mock).mock.calls[callsBeforeCheckIn][0];
    expect(call.page).toBe(3);
  });

  it('clears the check-in action flag when check-in errors', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (appointmentsApi.checkIn as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.checkIn({ id: 'appt-1' } as Appointment);

    expect(fixture.componentInstance.checkInActionId()).toBeNull();
  });
});
