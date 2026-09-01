import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { AppointmentDetail } from './appointment-detail.js';
import { AppointmentsApiService, Appointment } from './appointments-api.service.js';

describe('AppointmentDetail', () => {
  const appointment: Appointment = {
    id: 'appt-1',
    patientId: null,
    firstName: 'Jane',
    lastName: 'Doe',
    contactNumber: '555-1234',
    appointmentDate: '2026-08-12',
    appointmentTime: '10:00',
    doctorId: null,
    departmentId: null,
    appointmentType: 'New Visit',
    status: 'Scheduled',
    reason: 'Checkup',
    cancelledRemarks: null,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  };

  function setup() {
    const appointmentsApi = {
      getById: jest.fn().mockReturnValue(of(appointment)),
      update: jest.fn().mockReturnValue(of({ ...appointment, reason: 'Updated reason' })),
      cancel: jest.fn().mockReturnValue(of({ ...appointment, status: 'Cancelled', cancelledRemarks: 'No show' })),
      checkIn: jest.fn().mockReturnValue(of({ ...appointment, status: 'CheckedIn' })),
    } as unknown as AppointmentsApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;
    const activatedRoute = { paramMap: of(convertToParamMap({ id: 'appt-1' })) } as unknown as ActivatedRoute;

    TestBed.configureTestingModule({
      imports: [AppointmentDetail],
      providers: [
        provideRouter([]),
        { provide: AppointmentsApiService, useValue: appointmentsApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    });

    const fixture = TestBed.createComponent(AppointmentDetail);
    return { fixture, appointmentsApi };
  }

  it('loads the appointment and seeds the edit form from it', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.appointment()).toEqual(appointment);
    expect(fixture.componentInstance.appointmentType()).toBe('New Visit');
  });

  it('clears the loading flag when the initial load errors', async () => {
    const appointmentsApi = {
      getById: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
    } as unknown as AppointmentsApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;
    const activatedRoute = { paramMap: of(convertToParamMap({ id: 'appt-1' })) } as unknown as ActivatedRoute;
    TestBed.configureTestingModule({
      imports: [AppointmentDetail],
      providers: [
        provideRouter([]),
        { provide: AppointmentsApiService, useValue: appointmentsApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    });
    const fixture = TestBed.createComponent(AppointmentDetail);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('saves changes via update', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.reason.set('Updated reason');
    fixture.componentInstance.saveChanges();

    expect(appointmentsApi.update).toHaveBeenCalledWith(
      'appt-1',
      expect.objectContaining({ appointmentType: 'New Visit', reason: 'Updated reason' }),
    );
    expect(fixture.componentInstance.appointment()?.reason).toBe('Updated reason');
  });

  it('clears the saving flag when update errors', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (appointmentsApi.update as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.saveChanges();

    expect(fixture.componentInstance.saving()).toBe(false);
  });

  it('cancels the appointment with remarks and closes the modal', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.cancelRemarks.set('No show');
    fixture.componentInstance.confirmCancel();

    expect(appointmentsApi.cancel).toHaveBeenCalledWith('appt-1', 'No show');
    expect(fixture.componentInstance.appointment()?.status).toBe('Cancelled');
    expect(fixture.componentInstance.showCancelModal()).toBe(false);
  });

  it('clears the cancelling flag and keeps the modal open when cancel errors', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (appointmentsApi.cancel as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.showCancelModal.set(true);
    fixture.componentInstance.cancelRemarks.set('No show');
    fixture.componentInstance.confirmCancel();

    expect(fixture.componentInstance.cancelling()).toBe(false);
    expect(fixture.componentInstance.showCancelModal()).toBe(true);
  });

  it('checks in the appointment and updates the signal', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.checkIn();

    expect(appointmentsApi.checkIn).toHaveBeenCalledWith('appt-1');
    expect(fixture.componentInstance.appointment()?.status).toBe('CheckedIn');
    expect(fixture.componentInstance.checkingIn()).toBe(false);
  });

  it('clears the checkingIn flag when check-in errors', async () => {
    const { fixture, appointmentsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (appointmentsApi.checkIn as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.checkIn();

    expect(fixture.componentInstance.checkingIn()).toBe(false);
  });
});
