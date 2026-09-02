import { Appointment } from './appointments-api.service.js';

const STATUS_SEVERITY: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary' | 'contrast'> = {
  Scheduled: 'info',
  CheckedIn: 'contrast',
  Completed: 'success',
  NoShow: 'warn',
  Cancelled: 'danger',
};

export function appointmentStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' | 'contrast' {
  return STATUS_SEVERITY[status] ?? 'secondary';
}

export function appointmentDisplayName(appointment: Pick<Appointment, 'firstName' | 'lastName'>): string {
  return `${appointment.firstName} ${appointment.lastName}`.trim();
}

export const APPOINTMENT_STATUSES = ['Scheduled', 'CheckedIn', 'Completed', 'NoShow', 'Cancelled'];

// Matches seed-demo-data.ts's 'OPD'/'FollowUp' values — the entity column itself is a free-text
// varchar(50), so this list is a UI convenience, not a backend-enforced enum.
export const APPOINTMENT_TYPES = ['New Visit', 'Follow-up', 'OPD', 'Consultation', 'Procedure', 'Emergency'];
