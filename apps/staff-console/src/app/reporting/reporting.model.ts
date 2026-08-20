/**
 * Models mirroring the backend reporting module
 * (`new/code/apps/api/src/reporting`). Field names are copied exactly from the
 * `ReportingEvent` entity and the `ReportingQueryService` result rows.
 */

export interface ReportingEvent {
  id: string;
  eventType: string;
  entityId: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  correlationId: string | null;
  createdAt: string;
}

export interface EventCountRow {
  date: string;
  eventType: string;
  count: number;
}

export interface RevenueRow {
  date: string;
  totalAmount: number;
}

/** Shape of `GET /reporting/events` (not the usual `{ data, meta }` envelope). */
export interface ReportingEventsResult {
  items: ReportingEvent[];
  total: number;
}

export interface EventTypeCount {
  eventType: string;
  count: number;
}

/** Event types published by the backend `ReportingSubscriber`. */
export const REPORTING_EVENT_TYPES = [
  'OrderPlaced',
  'InvoiceCreated',
  'PaymentRecorded',
  'DepositReceived',
  'PatientAdmitted',
  'BedTransferred',
];

const EVENT_TYPE_SEVERITY: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
  OrderPlaced: 'info',
  InvoiceCreated: 'warn',
  PaymentRecorded: 'success',
  DepositReceived: 'success',
  PatientAdmitted: 'info',
  BedTransferred: 'warn',
};

export function eventTypeSeverity(
  eventType: string,
): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
  return EVENT_TYPE_SEVERITY[eventType] ?? 'secondary';
}

/** Sums per-day, per-type counts into a single total per event type, largest first. */
export function aggregateEventCounts(rows: EventCountRow[]): EventTypeCount[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.eventType, (totals.get(row.eventType) ?? 0) + row.count);
  }
  return [...totals.entries()]
    .map(([eventType, count]) => ({ eventType, count }))
    .sort((a, b) => b.count - a.count);
}

export function totalEventCount(rows: EventCountRow[]): number {
  return rows.reduce((total, row) => total + row.count, 0);
}

/** Sums the per-day revenue rows into a single aggregate. */
export function sumRevenue(rows: RevenueRow[]): number {
  return rows.reduce((total, row) => total + row.totalAmount, 0);
}
