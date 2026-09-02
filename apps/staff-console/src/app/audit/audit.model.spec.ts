import { auditRecordDirectoryType } from './audit.model.js';

describe('auditRecordDirectoryType', () => {
  it.each([
    ['patients', 'patient'],
    ['accounts', 'doctor'],
    ['wards', 'ward'],
    ['beds', 'bed'],
    ['inventory_items', 'item'],
    ['order_items', 'orderItem'],
    ['lab_tests', 'test'],
    ['radiology_imaging_items', 'imagingItem'],
    ['invoices', 'invoice'],
    ['employees', 'employee'],
    ['departments', 'department'],
  ])('maps table "%s" to directory type "%s"', (tableName, expected) => {
    expect(auditRecordDirectoryType(tableName)).toBe(expected);
  });

  it('returns null for a table not covered by the directory resolver (e.g. journal_entries, helpdesk_tickets)', () => {
    expect(auditRecordDirectoryType('journal_entries')).toBeNull();
    expect(auditRecordDirectoryType('helpdesk_tickets')).toBeNull();
  });
});
