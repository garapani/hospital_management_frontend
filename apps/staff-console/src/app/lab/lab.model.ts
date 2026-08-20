import { LabRequisitionStatus, LabTest, LabTestComponent } from './lab-api.service.js';

export const LAB_REQUISITION_STATUSES: LabRequisitionStatus[] = [
  'Pending',
  'SampleCollected',
  'ResultsEntered',
  'Verified',
  'Cancelled',
];

const STATUS_SEVERITY: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
  Pending: 'warn',
  SampleCollected: 'info',
  ResultsEntered: 'info',
  Verified: 'success',
  Cancelled: 'danger',
};

export function labRequisitionStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
  return STATUS_SEVERITY[status] ?? 'secondary';
}

export function labTestPrice(test: LabTest): string {
  return test.price === null ? 'Not priced' : `₹${test.price}`;
}

export function componentReferenceRange(component: LabTestComponent): string {
  if (component.referenceRangeText) {
    return component.referenceRangeText;
  }
  const low = component.referenceRangeLow ?? '';
  const high = component.referenceRangeHigh ?? '';
  if (low !== '' && high !== '') {
    return `${low} – ${high}`;
  }
  if (low !== '') {
    return `≥ ${low}`;
  }
  if (high !== '') {
    return `≤ ${high}`;
  }
  return '';
}
