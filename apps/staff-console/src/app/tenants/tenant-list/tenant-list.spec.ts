import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
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
          ? jest.fn().mockReturnValue(
              of({ hospitalId: 'h1', hospitalName: 'New Hospital', packageCode: 'basic' }),
            )
          : jest.fn().mockReturnValue(
              throwError(() => ({ status: 500, message: 'boom' } as ApiError)),
            ),
    } as unknown as TenantsApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;

    TestBed.configureTestingModule({
      imports: [TenantList],
      providers: [
        { provide: TenantsApiService, useValue: tenantsApi },
        { provide: MessageService, useValue: messageService },
      ],
    });

    const fixture = TestBed.createComponent(TenantList);
    return { fixture, tenantsApi, messageService };
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

  it('provisions with the selected package, reloads, and toasts success', async () => {
    const { fixture, tenantsApi, messageService } = setup('ok');
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
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Tenant provisioned' }),
    );
  });

  it('toasts the backend error instead of failing silently', async () => {
    const { fixture, messageService } = setup('error');
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
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', summary: 'Provision failed', detail: 'boom' }),
    );
  });
});
