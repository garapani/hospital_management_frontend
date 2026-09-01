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

/** True when both bounds of a numeric range are set — the entry input can be numeric and the
 *  value can be evaluated against the range. A qualitative component (e.g. a Negative/Positive
 *  result carrying only `referenceRangeText`) has neither bound and stays free text. */
export function hasNumericRange(component: LabTestComponent): boolean {
  return component.referenceRangeLow != null && component.referenceRangeHigh != null;
}

/** Mirrors the backend's `computeIsAbnormal` (`lab-workflow.service.ts`) exactly, so the entry
 *  screen can warn before saving instead of only after a round trip. Falls back to `false` for a
 *  qualitative component or a non-numeric entered value, since the range can't govern either. */
export function computeIsAbnormal(component: LabTestComponent, value: string): boolean {
  if (hasNumericRange(component)) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && value.trim() !== '') {
      return numericValue < Number(component.referenceRangeLow) || numericValue > Number(component.referenceRangeHigh);
    }
  }
  return false;
}
