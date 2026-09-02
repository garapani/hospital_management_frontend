import { reportingEventSubjectRef } from './reporting.model.js';

describe('reportingEventSubjectRef', () => {
  it.each([
    ['OrderPlaced', { patientId: 'patient-1' }, { type: 'patient', id: 'patient-1' }],
    ['InvoiceCreated', { patientId: 'patient-2' }, { type: 'patient', id: 'patient-2' }],
    ['DepositReceived', { patientId: 'patient-3' }, { type: 'patient', id: 'patient-3' }],
    ['PatientAdmitted', { patientId: 'patient-4' }, { type: 'patient', id: 'patient-4' }],
    ['PaymentRecorded', { invoiceId: 'inv-1' }, { type: 'invoice', id: 'inv-1' }],
    ['InvoiceReturned', { invoiceId: 'inv-2' }, { type: 'invoice', id: 'inv-2' }],
    ['BedTransferred', { fromBedId: 'bed-1', toBedId: 'bed-2' }, { type: 'bed', id: 'bed-2' }],
  ] as const)('resolves %s to its payload subject', (eventType, payload, expected) => {
    expect(reportingEventSubjectRef({ eventType, payload })).toEqual(expected);
  });

  it('returns null for an unrecognized event type', () => {
    expect(reportingEventSubjectRef({ eventType: 'SomethingElse', payload: {} })).toBeNull();
  });

  it('returns null when the expected payload field is missing or not a string', () => {
    expect(reportingEventSubjectRef({ eventType: 'OrderPlaced', payload: {} })).toBeNull();
    expect(reportingEventSubjectRef({ eventType: 'OrderPlaced', payload: { patientId: 42 } })).toBeNull();
  });
});
