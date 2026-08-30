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

export function invoiceReference(invoice: Invoice): string {
  return `${invoice.financialYear}-${invoice.invoiceNumber}`;
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
