import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DirectoryResolverService } from './directory-resolver.service.js';
import { DirectoryApiService, DirectoryResolveResult } from './directory-api.service.js';

describe('DirectoryResolverService', () => {
  function setup(resolveResult: DirectoryResolveResult | 'error' = { patients: {}, doctors: {}, wards: {}, beds: {} }) {
    const directoryApi = {
      resolve: jest.fn().mockReturnValue(
        resolveResult === 'error' ? throwError(() => new Error('boom')) : of(resolveResult),
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
      wards: {},
      beds: {},
    });

    const results: (string | null)[] = [];
    service.resolve('patient', 'patient-1').subscribe((n) => results.push(n));
    service.resolve('doctor', 'doctor-1').subscribe((n) => results.push(n));

    expect(directoryApi.resolve).not.toHaveBeenCalled();
    await Promise.resolve();
    await Promise.resolve();

    expect(directoryApi.resolve).toHaveBeenCalledTimes(1);
    expect(directoryApi.resolve).toHaveBeenCalledWith({ patientIds: ['patient-1'], doctorIds: ['doctor-1'] });
    expect(results).toContain('Jane Doe');
    expect(results).toContain('Dr. Smith');
  });

  it('caches a resolved id and never calls the API for it again', async () => {
    const { service, directoryApi } = setup({
      patients: { 'patient-1': { displayName: 'Jane Doe', patientNo: 'PAT-1' } },
      doctors: {}, wards: {}, beds: {},
    });

    service.resolve('patient', 'patient-1').subscribe();
    await Promise.resolve();
    await Promise.resolve();
    expect(directoryApi.resolve).toHaveBeenCalledTimes(1);

    let cached: string | null = 'unset';
    service.resolve('patient', 'patient-1').subscribe((n) => (cached = n));
    expect(directoryApi.resolve).toHaveBeenCalledTimes(1);
    expect(cached).toBe('Jane Doe');
  });

  it('resolves null for an id the backend does not return (deleted/cross-tenant/unknown)', async () => {
    const { service } = setup({ patients: {}, doctors: {}, wards: {}, beds: {} });

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
