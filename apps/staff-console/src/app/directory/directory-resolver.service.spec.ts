import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DirectoryResolverService } from './directory-resolver.service.js';
import { DirectoryApiService, DirectoryResolveResult } from './directory-api.service.js';

const EMPTY_RESULT: DirectoryResolveResult = {
  patients: {},
  doctors: {},
  wards: {},
  beds: {},
  items: {},
  orderItems: {},
  tests: {},
  imagingItems: {},
  invoices: {},
  employees: {},
  departments: {},
};

describe('DirectoryResolverService', () => {
  function setup(resolveResult: Partial<DirectoryResolveResult> | 'error' = {}) {
    const directoryApi = {
      resolve: jest.fn().mockReturnValue(
        resolveResult === 'error' ? throwError(() => new Error('boom')) : of({ ...EMPTY_RESULT, ...resolveResult }),
      ),
    } as unknown as DirectoryApiService;

    TestBed.configureTestingModule({
      providers: [{ provide: DirectoryApiService, useValue: directoryApi }],
    });

    return { service: TestBed.inject(DirectoryResolverService), directoryApi };
  }

  it('batches multiple resolve calls made in the same tick into a single API call', async () => {
    const { service, directoryApi } = setup({
      patients: { 'patient-1': { displayName: 'Jane Doe', patientNo: 'PAT-1' } },
      doctors: { 'doctor-1': { displayName: 'Dr. Smith' } },
    });

    const results: (string | null)[] = [];
    service.resolve('patient', 'patient-1').subscribe((n) => results.push(n));
    service.resolve('doctor', 'doctor-1').subscribe((n) => results.push(n));

    expect(directoryApi.resolve).not.toHaveBeenCalled();
    await Promise.resolve();
    await Promise.resolve();

    expect(directoryApi.resolve).toHaveBeenCalledTimes(1);
    expect(directoryApi.resolve).toHaveBeenCalledWith({ patientIds: ['patient-1'], doctorIds: ['doctor-1'] });
    expect(results).toContain('Jane Doe (PAT-1)');
    expect(results).toContain('Dr. Smith');
  });

  it('appends patientNo for a resolved patient, but shows other types by name alone', async () => {
    const { service } = setup({
      patients: { 'patient-1': { displayName: 'Jane Doe', patientNo: 'PAT-1' } },
      doctors: { 'doctor-1': { displayName: 'Dr. Smith' } },
      wards: { 'ward-1': { displayName: 'General Ward' } },
    });

    let patientName: string | null = 'unset';
    let doctorName: string | null = 'unset';
    let wardName: string | null = 'unset';
    service.resolve('patient', 'patient-1').subscribe((n) => (patientName = n));
    service.resolve('doctor', 'doctor-1').subscribe((n) => (doctorName = n));
    service.resolve('ward', 'ward-1').subscribe((n) => (wardName = n));
    await Promise.resolve();
    await Promise.resolve();

    expect(patientName).toBe('Jane Doe (PAT-1)');
    expect(doctorName).toBe('Dr. Smith');
    expect(wardName).toBe('General Ward');
  });

  it('resolves the six extended entity types added for the 2026-09-02 raw-UUID sweep', async () => {
    const { service } = setup({
      orderItems: { 'oi-1': { displayName: 'CBC' } },
      tests: { 'test-1': { displayName: 'Complete Blood Count' } },
      imagingItems: { 'img-1': { displayName: 'Chest X-Ray' } },
      invoices: { 'inv-1': { displayName: 'INV-2026-09-02-00001' } },
      employees: { 'emp-1': { displayName: 'Priya Rao (EMP-2026-00001)' } },
      departments: { 'dept-1': { displayName: 'Cardiology' } },
    });

    const results: Record<string, string | null> = {};
    service.resolve('orderItem', 'oi-1').subscribe((n) => (results['orderItem'] = n));
    service.resolve('test', 'test-1').subscribe((n) => (results['test'] = n));
    service.resolve('imagingItem', 'img-1').subscribe((n) => (results['imagingItem'] = n));
    service.resolve('invoice', 'inv-1').subscribe((n) => (results['invoice'] = n));
    service.resolve('employee', 'emp-1').subscribe((n) => (results['employee'] = n));
    service.resolve('department', 'dept-1').subscribe((n) => (results['department'] = n));
    await Promise.resolve();
    await Promise.resolve();

    expect(results['orderItem']).toBe('CBC');
    expect(results['test']).toBe('Complete Blood Count');
    expect(results['imagingItem']).toBe('Chest X-Ray');
    expect(results['invoice']).toBe('INV-2026-09-02-00001');
    expect(results['employee']).toBe('Priya Rao (EMP-2026-00001)');
    expect(results['department']).toBe('Cardiology');
  });

  it('caches a resolved id and never calls the API for it again', async () => {
    const { service, directoryApi } = setup({
      patients: { 'patient-1': { displayName: 'Jane Doe', patientNo: 'PAT-1' } },
    });

    service.resolve('patient', 'patient-1').subscribe();
    await Promise.resolve();
    await Promise.resolve();
    expect(directoryApi.resolve).toHaveBeenCalledTimes(1);

    let cached: string | null = 'unset';
    service.resolve('patient', 'patient-1').subscribe((n) => (cached = n));
    expect(directoryApi.resolve).toHaveBeenCalledTimes(1);
    expect(cached).toBe('Jane Doe (PAT-1)');
  });

  it('resolves null for an id the backend does not return (deleted/cross-tenant/unknown)', async () => {
    const { service } = setup({});

    let value: string | null = 'unset';
    service.resolve('patient', 'missing-id').subscribe((n) => (value = n));
    await Promise.resolve();
    await Promise.resolve();

    expect(value).toBeNull();
  });

  it('resolves null (not an unhandled error) for every pending id when the API call fails', async () => {
    const { service } = setup('error');

    let value: string | null = 'unset';
    service.resolve('ward', 'ward-1').subscribe((n) => (value = n));
    await Promise.resolve();
    await Promise.resolve();

    expect(value).toBeNull();
  });
});
