import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiError } from '@org/api-client';
import { TenantList } from './tenant-list.js';
import { TenantsApiService } from '../tenants-api.service.js';

describe('TenantList', () => {
  function setup(provisionResult: 'ok' | 'error') {
    const tenantsApi = {
      list: jest.fn().mockReturnValue(of([])),
      listPackages: jest.fn().mockReturnValue(
        of([
          { code: 'basic', name: 'Basic', description: null, modules: [], createdAt: '' },
          { code: 'standard', name: 'Standard', description: null, modules: [], createdAt: '' },
        ]),
      ),
      provision:
        provisionResult === 'ok'
          ? jest.fn().mockReturnValue(of({}))
          : jest.fn().mockReturnValue(
              throwError(() => ({ status: 500, message: 'boom' } as ApiError)),
            ),
    } as unknown as TenantsApiService;

    TestBed.configureTestingModule({
      imports: [TenantList],
      providers: [{ provide: TenantsApiService, useValue: tenantsApi }],
    });

    const fixture = TestBed.createComponent(TenantList);
    return { fixture, tenantsApi };
  }

  it('loads tenants and packages on open, with roles auto-enabled by the backend', async () => {
    const { fixture, tenantsApi } = setup('ok');
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openProvisionModal();
    await fixture.whenStable();

    expect(tenantsApi.list).toHaveBeenCalledTimes(1);
    expect(tenantsApi.listPackages).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.packageOptions()).toEqual([
      { label: 'Basic', value: 'basic' },
      { label: 'Standard', value: 'standard' },
    ]);
    // The provision payload carries only package selection — roles are the package's business.
    expect(fixture.componentInstance.provisionForm()).toEqual({
      hospitalId: '',
      hospitalName: '',
      packageCode: 'basic',
    });
  });

  it('provisions with the selected package and reloads on success', async () => {
    const { fixture, tenantsApi } = setup('ok');
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.provisionForm.set({
      hospitalId: 'new_hospital',
      hospitalName: 'New Hospital',
      packageCode: 'standard',
    });
    fixture.componentInstance.submitProvision();
    await fixture.whenStable();

    expect(tenantsApi.provision).toHaveBeenCalledWith({
      hospitalId: 'new_hospital',
      hospitalName: 'New Hospital',
      packageCode: 'standard',
    });
    expect(fixture.componentInstance.showProvisionModal()).toBe(false);
    expect(tenantsApi.list).toHaveBeenCalledTimes(2);
  });

  it('surfaces the backend error instead of failing silently', async () => {
    const { fixture } = setup('error');
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openProvisionModal();
    fixture.componentInstance.provisionForm.set({
      hospitalId: 'dup_hospital',
      hospitalName: 'Dup Hospital',
      packageCode: 'basic',
    });
    fixture.componentInstance.submitProvision();
    await fixture.whenStable();

    expect(fixture.componentInstance.showProvisionModal()).toBe(true);
    expect(fixture.componentInstance.provisionError()).toBe('boom');
  });
});
