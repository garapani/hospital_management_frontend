import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TenantDetail } from './tenant-detail.js';
import { TenantsApiService } from '../tenants-api.service.js';
import { Tenant } from '../tenant.model.js';

describe('TenantDetail package change', () => {
  function setup() {
    const tenant: Tenant = {
      hospitalId: 'h1',
      hospitalName: 'Demo Hospital',
      status: 'active',
      packageCode: 'basic',
      createdAt: '',
      updatedAt: '',
    };
    const tenantsApi = {
      getOne: jest.fn().mockReturnValue(of(tenant)),
      listRoles: jest.fn().mockReturnValue(of([])),
      listPackages: jest.fn().mockReturnValue(
        of([
          { code: 'basic', name: 'Basic', description: null, modules: [], createdAt: '' },
          { code: 'standard', name: 'Standard', description: null, modules: [], createdAt: '' },
          { code: 'enterprise', name: 'Enterprise', description: null, modules: [], createdAt: '' },
        ]),
      ),
      setPackage: jest.fn().mockReturnValue(of({ ...tenant, packageCode: 'standard' })),
      setRoles: jest.fn().mockReturnValue(of([])),
      suspend: jest.fn().mockReturnValue(of(tenant)),
      reactivate: jest.fn().mockReturnValue(of(tenant)),
    } as unknown as TenantsApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;

    TestBed.configureTestingModule({
      imports: [TenantDetail],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of({ get: () => 'h1' }) },
        },
        { provide: TenantsApiService, useValue: tenantsApi },
        { provide: MessageService, useValue: messageService },
      ],
    });

    const fixture = TestBed.createComponent(TenantDetail);
    return { fixture, tenantsApi, messageService };
  }

  it('opens a confirmation instead of calling the API when saving a package change', async () => {
    const { fixture, tenantsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.packageDraft.set('standard');
    fixture.componentInstance.savePackage();

    expect(fixture.componentInstance.showPackageConfirm()).toBe(true);
    expect(tenantsApi.setPackage).not.toHaveBeenCalled();
    expect(fixture.componentInstance.packageDirection()).toBe('upgrade');
  });

  it('applies the change and toasts success only after confirmation', async () => {
    const { fixture, tenantsApi, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.packageDraft.set('enterprise');
    fixture.componentInstance.savePackage();
    fixture.componentInstance.confirmPackageChange();
    await fixture.whenStable();

    expect(tenantsApi.setPackage).toHaveBeenCalledWith('h1', 'enterprise');
    expect(fixture.componentInstance.tenant()?.packageCode).toBe('standard');
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Package updated' }),
    );
  });

  it('flags a downgrade direction so the confirmation warns accordingly', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.tenant.update((t) => (t ? { ...t, packageCode: 'enterprise' } : t));
    fixture.componentInstance.packageDraft.set('basic');
    expect(fixture.componentInstance.packageDirection()).toBe('downgrade');
  });
});
