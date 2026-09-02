import { toLocalDateString } from '../shared/date.util.js';

export type InvoiceStatus = 'Unpaid' | 'PartiallyPaid' | 'Paid' | 'Cancelled';

export interface Invoice {
  id: string;
  patientId: string;
  invoiceNumber: number;
  financialYear: string;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceListResult {
  data: Invoice[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface InvoiceReturn {
  id: string;
  invoiceId: string;
  amount: number;
  reason: string;
  returnedBy: string;
  createdAt: string;
}

export interface InvoiceWithReturns extends Invoice {
  returns: InvoiceReturn[];
}

// Matches InvoicesService.PAYMENT_MODES (backend/code/apps/api/src/billing/invoices.service.ts) —
// keep in sync if the backend list changes.
export const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Cheque', 'Deposit', 'Insurance'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export interface RecordPaymentDto {
  amount: number;
  paymentMode: PaymentMode;
  sourceDepositId?: string;
}

export interface CreateReturnDto {
  amount: number;
  reason: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMode: string;
  sourceDepositId: string | null;
  receivedBy: string;
  receivedAt: string;
  createdAt: string;
}

export function outstandingBalance(invoice: Invoice): number {
  return Math.max(0, invoice.totalAmount - invoice.paidAmount);
}

// invoiceNumber is a per-financial-year sequence (see InvoicesService.generateInvoiceNumber), so
// it alone isn't unique across years — the creation date disambiguates instead of financialYear
// here, since it's what the reference is actually meant to convey to a human reader.
export function invoiceReference(invoice: Invoice): string {
  const date = toLocalDateString(new Date(invoice.createdAt));
  const sequence = String(invoice.invoiceNumber).padStart(5, '0');
  return `INV-${date}-${sequence}`;
}

const STATUS_SEVERITY: Record<InvoiceStatus, 'success' | 'warn' | 'danger' | 'secondary'> = {
  Paid: 'success',
  PartiallyPaid: 'warn',
  Unpaid: 'danger',
  Cancelled: 'secondary',
};

export function statusSeverity(status: InvoiceStatus): 'success' | 'warn' | 'danger' | 'secondary' {
  return STATUS_SEVERITY[status];
}
