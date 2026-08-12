import { Appointment } from './appointments-api.service.js';

const STATUS_SEVERITY: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
  Scheduled: 'info',
  Completed: 'success',
  NoShow: 'warn',
  Cancelled: 'danger',
};

export function appointmentStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
  return STATUS_SEVERITY[status] ?? 'secondary';
}

export function appointmentDisplayName(appointment: Pick<Appointment, 'firstName' | 'lastName'>): string {
  return `${appointment.firstName} ${appointment.lastName}`.trim();
}

export const APPOINTMENT_STATUSES = ['Scheduled', 'Completed', 'NoShow', 'Cancelled'];
