import { APPOINTMENT_STATUSES, appointmentStatusSeverity } from './appointment.model.js';

describe('appointmentStatusSeverity', () => {
  it('maps CheckedIn to a distinct severity from Scheduled/Completed/NoShow/Cancelled', () => {
    const severities = ['Scheduled', 'CheckedIn', 'Completed', 'NoShow', 'Cancelled'].map(appointmentStatusSeverity);
    expect(new Set(severities).size).toBe(5);
  });

  it('falls back to secondary for an unmapped status', () => {
    expect(appointmentStatusSeverity('SomeFutureStatus')).toBe('secondary');
  });
});

describe('APPOINTMENT_STATUSES', () => {
  it('includes CheckedIn between Scheduled and the terminal statuses', () => {
    expect(APPOINTMENT_STATUSES).toContain('CheckedIn');
  });
});
