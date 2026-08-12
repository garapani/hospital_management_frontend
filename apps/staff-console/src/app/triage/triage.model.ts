import { TriageEntry } from './triage-api.service.js';

export function triageDisplayName(entry: TriageEntry): string {
  if (entry.firstName || entry.lastName) {
    return `${entry.firstName ?? ''} ${entry.lastName ?? ''}`.trim();
  }
  return 'Unknown';
}

const COLOR_CODE_SEVERITY: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
  Red: 'danger',
  Orange: 'warn',
  Yellow: 'warn',
  Green: 'success',
  Blue: 'info',
};

export function colorCodeSeverity(colorCode: string | null): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
  return (colorCode && COLOR_CODE_SEVERITY[colorCode]) || 'secondary';
}

export const ARRIVAL_MODES = ['Walk-in', 'Ambulance', 'Police', 'Referred'];
export const COLOR_CODES = ['Red', 'Orange', 'Yellow', 'Green', 'Blue'];
export const TRIAGE_STATUSES = ['Arrived', 'Triaged', 'In Treatment', 'Discharged', 'Admitted', 'Deceased'];
