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
          { code: 'basic', name: 'Basic', description: null, modules: [], defaultRoleNames: ['Hospital Admin', 'Doctor'], createdAt: '' },
          { code: 'standard', name: 'Standard', description: null, modules: [], defaultRoleNames: ['Hospital Admin', 'Doctor', 'Helpdesk Agent'], createdAt: '' },
          { code: 'enterprise', name: 'Enterprise', description: null, modules: [], defaultRoleNames: [], createdAt: '' },
        ]),
      ),
      setPackage: jest.fn().mockReturnValue(of({ ...tenant, packageCode: 'standard' })),
      setRoles: jest.fn().mockReturnValue(of([])),
      suspend: jest.fn().mockReturnValue(of(tenant)),
      reactivate: jest.fn().mockReturnValue(of(tenant)),
      history: jest.fn().mockReturnValue(
        of({
          data: [
            {
              id: 'aud-1',
              tableName: 'tenants',
              recordId: 'h1',
              action: 'create',
              changedByAccountId: 'admin-1',
              correlationId: null,
              diff: [],
              occurredAt: '2026-08-01T00:00:00.000Z',
            },
            {
              id: 'aud-2',
              tableName: 'tenants',
              recordId: 'h1',
              action: 'update',
              changedByAccountId: 'admin-1',
              correlationId: null,
              diff: [{ field: 'packageCode', before: 'basic', after: 'standard' }],
              occurredAt: '2026-08-10T00:00:00.000Z',
            },
          ],
          meta: { total: 2, page: 1, limit: 50, totalPages: 1 },
        }),
      ),
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

  it('annotates roles with their package membership', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    // Tenant is on Basic; load the packages so the annotation map is populated.
    fixture.componentInstance.ngOnInit();
    await fixture.whenStable();

    expect(fixture.componentInstance.roleAnnotation('Hospital Admin').label).toBe('Included in Basic');
    expect(fixture.componentInstance.roleAnnotation('Hospital Admin').severity).toBe('info');
    expect(fixture.componentInstance.roleAnnotation('Some Manual Role').label).toBe('Manual');
    expect(fixture.componentInstance.roleAnnotation('Some Manual Role').severity).toBe('secondary');
  });

  it('hides cross-tenant roles (Super Admin) from the tenant role toggles', async () => {
    const roles = [
      { id: 'r-super', name: 'Super Admin', description: '', priority: 100, isCrossTenant: true, enabled: false },
      { id: 'r-admin', name: 'Hospital Admin', description: '', priority: 90, isCrossTenant: false, enabled: true },
    ];
    const { fixture, tenantsApi } = setup();
    (tenantsApi.listRoles as jest.Mock).mockReturnValue(of(roles));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.assignableRoles().map((r) => r.name)).toEqual([
      'Hospital Admin',
    ]);
  });

  it('loads the platform history for the tenant on init', async () => {
    const { fixture, tenantsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(tenantsApi.history).toHaveBeenCalledWith('h1');
    expect(fixture.componentInstance.history()).toHaveLength(2);
    expect(fixture.componentInstance.history()[0].tableName).toBe('tenants');
    expect(fixture.componentInstance.history()[1].diff).toEqual([
      { field: 'packageCode', before: 'basic', after: 'standard' },
    ]);
  });
});
