import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { AppointmentList } from './appointment-list.js';
import { AppointmentsApiService } from './appointments-api.service.js';

describe('AppointmentList', () => {
  function setup(queryParams: Record<string, string> = {}) {
    const appointmentsApi = {
      list: jest.fn().mockReturnValue(of([])),
      create: jest.fn().mockReturnValue(of({})),
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

  it("loads today's appointments on init", async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(appointmentsApi.list).toHaveBeenCalledTimes(1);
    const call = (appointmentsApi.list as jest.Mock).mock.calls[0][0];
    expect(call.date).toBe(fixture.componentInstance.dateFilter());
    expect(fixture.componentInstance.appointments()).toEqual([]);
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
});
