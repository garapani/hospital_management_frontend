import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TENANT_ID } from '@org/api-client';
import { PLATFORM_TENANT_ID } from '@org/auth';
import { BrandingService } from './branding.service.js';
import { BrandingApiService } from './branding-api.service.js';
import { TenantBranding } from './branding.model.js';

describe('BrandingService', () => {
  function setup(tenantId: string, overrides: Partial<Record<keyof BrandingApiService, jest.Mock>> = {}) {
    const brandingApi = {
      getPublicBranding: jest.fn().mockReturnValue(
        of({ displayName: 'City Hospital', primaryColor: '#123456', logoUrl: 'https://minio.example/logo.png' } as TenantBranding),
      ),
      ...overrides,
    } as unknown as BrandingApiService;

    TestBed.configureTestingModule({
      providers: [
        { provide: BrandingApiService, useValue: brandingApi },
        { provide: TENANT_ID, useValue: tenantId },
      ],
    });
    const service = TestBed.inject(BrandingService);
    return { service, brandingApi };
  }

  afterEach(() => {
    // applyCssVariables writes directly to document.documentElement — clean up between tests so
    // one test's override can't leak into the next.
    document.documentElement.removeAttribute('style');
  });

  it('never calls the API for the platform tenant, and load() still resolves', async () => {
    const { service, brandingApi } = setup(PLATFORM_TENANT_ID);
    await service.load();
    expect(brandingApi.getPublicBranding).not.toHaveBeenCalled();
    expect(service.displayName()).toBeNull();
  });

  it('applies the fetched branding to the signals for a real tenant', async () => {
    const { service } = setup('demo');
    await service.load();
    expect(service.displayName()).toBe('City Hospital');
    expect(service.logoUrl()).toBe('https://minio.example/logo.png');
    expect(service.primaryColor()).toBe('#123456');
  });

  it('sets --p-primary-600 and --p-primary-color CSS variables to the fetched color', async () => {
    const { service } = setup('demo');
    await service.load();
    expect(document.documentElement.style.getPropertyValue('--p-primary-600')).toBe('#123456');
    expect(document.documentElement.style.getPropertyValue('--p-primary-color')).toBe('#123456');
  });

  it('does not touch CSS variables when the tenant has no configured color', async () => {
    const { service } = setup('demo', {
      getPublicBranding: jest.fn().mockReturnValue(of({ displayName: null, primaryColor: null, logoUrl: null })),
    });
    await service.load();
    expect(document.documentElement.style.getPropertyValue('--p-primary-600')).toBe('');
  });

  it('resolves (never rejects) and keeps the default signals when the fetch errors', async () => {
    const { service } = setup('demo', {
      getPublicBranding: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
    });
    await expect(service.load()).resolves.toBeUndefined();
    expect(service.displayName()).toBeNull();
  });
});
