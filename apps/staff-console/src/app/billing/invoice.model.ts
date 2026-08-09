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
  total: number;
  page: number;
  limit: number;
}

export interface InvoiceReturn {
  id: string;
  invoiceId: string;
  amount: number;
  reason: string;
  returnedBy: string;
  createdAt: string;
}

export interface InvoiceDetail extends Invoice {
  returns: InvoiceReturn[];
}
