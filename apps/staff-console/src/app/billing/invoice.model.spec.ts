import { Invoice, invoiceReference, outstandingBalance } from './invoice.model.js';

function fakeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'invoice-1',
    patientId: 'patient-1',
    invoiceNumber: 1,
    financialYear: '2026-27',
    subtotal: 100,
    discountAmount: 0,
    taxableAmount: 100,
    taxAmount: 0,
    totalAmount: 100,
    paidAmount: 0,
    status: 'Unpaid',
    notes: null,
    createdBy: 'account-1',
    createdAt: '2026-08-29T12:00:00.000Z',
    updatedAt: '2026-08-29T12:00:00.000Z',
    ...overrides,
  };
}

describe('invoiceReference', () => {
  it('formats as INV-<created date>-<5-digit zero-padded sequence>', () => {
    const invoice = fakeInvoice({ invoiceNumber: 1, createdAt: '2026-08-29T12:00:00.000Z' });
    expect(invoiceReference(invoice)).toBe('INV-2026-08-29-00001');
  });

  it('pads sequence numbers up to 5 digits without truncating larger ones', () => {
    expect(invoiceReference(fakeInvoice({ invoiceNumber: 42 }))).toBe('INV-2026-08-29-00042');
    expect(invoiceReference(fakeInvoice({ invoiceNumber: 123456 }))).toBe('INV-2026-08-29-123456');
  });
});

describe('outstandingBalance', () => {
  it('is total minus paid', () => {
    expect(outstandingBalance(fakeInvoice({ totalAmount: 500, paidAmount: 200 }))).toBe(300);
  });

  it('never goes negative on an overpaid invoice', () => {
    expect(outstandingBalance(fakeInvoice({ totalAmount: 500, paidAmount: 600 }))).toBe(0);
  });
});
