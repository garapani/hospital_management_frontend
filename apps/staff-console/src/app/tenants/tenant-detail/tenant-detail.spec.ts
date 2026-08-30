import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { TenantDetail } from './tenant-detail.js';
import { TenantsApiService } from '../tenants-api.service.js';
import { SubscriptionsApiService } from '../subscriptions-api.service.js';
import { Tenant } from '../tenant.model.js';
import { Subscription, SubscriptionInvoice } from '../subscription.model.js';
import { BrandingApiService } from '../../branding/branding-api.service.js';

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
      archive: jest.fn().mockReturnValue(of({ ...tenant, status: 'archived' })),
      restore: jest.fn().mockReturnValue(of({ ...tenant, status: 'active' })),
      purge: jest.fn().mockReturnValue(of({ purged: 'h1' })),
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

    const subscription: Subscription = {
      id: 'sub-1',
      tenantId: 'h1',
      packageCode: 'basic',
      billingCycle: 'monthly',
      pricePerCycle: 4999,
      status: 'active',
      currentPeriodStart: '2026-08-01T00:00:00.000Z',
      currentPeriodEnd: '2026-08-31T00:00:00.000Z',
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    const invoice: SubscriptionInvoice = {
      id: 'inv-1',
      subscriptionId: 'sub-1',
      tenantId: 'h1',
      periodStart: '2026-08-01T00:00:00.000Z',
      periodEnd: '2026-08-31T00:00:00.000Z',
      amount: 4999,
      status: 'open',
      issuedAt: '2026-08-01T00:00:00.000Z',
      paidAt: null,
    };
    const subscriptionsApi = {
      getSubscription: jest.fn().mockReturnValue(of(null)),
      listInvoices: jest.fn().mockReturnValue(of([])),
      subscribe: jest.fn().mockReturnValue(of(subscription)),
      cancel: jest.fn().mockReturnValue(of({ ...subscription, status: 'canceled' })),
      issueInvoice: jest.fn().mockReturnValue(of(invoice)),
      markInvoicePaid: jest
        .fn()
        .mockReturnValue(of({ ...invoice, status: 'paid', paidAt: '2026-08-05T00:00:00.000Z' })),
    } as unknown as SubscriptionsApiService;

    const brandingApi = {
      getForAdmin: jest.fn().mockReturnValue(of({ displayName: null, primaryColor: null, logoUrl: null })),
      upsert: jest.fn().mockReturnValue(
        of({ displayName: 'City Hospital', primaryColor: '#006D77', logoUrl: null }),
      ),
      uploadLogo: jest.fn().mockReturnValue(
        of({ displayName: null, primaryColor: null, logoUrl: 'https://minio.example/logo.png' }),
      ),
      removeLogo: jest.fn().mockReturnValue(of({ displayName: null, primaryColor: null, logoUrl: null })),
    } as unknown as BrandingApiService;

    TestBed.configureTestingModule({
      imports: [TenantDetail],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of({ get: () => 'h1' }) },
        },
        { provide: TenantsApiService, useValue: tenantsApi },
        { provide: SubscriptionsApiService, useValue: subscriptionsApi },
        { provide: BrandingApiService, useValue: brandingApi },
        { provide: MessageService, useValue: messageService },
        { provide: Router, useValue: { navigate: jest.fn() } },
      ],
    });

    const fixture = TestBed.createComponent(TenantDetail);
    return { fixture, tenantsApi, subscriptionsApi, brandingApi, messageService, subscription, invoice };
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

  it('re-syncs the package draft when the tenant loads after the package catalog', async () => {
    const tenant: Tenant = {
      hospitalId: 'h1',
      hospitalName: 'Demo Hospital',
      status: 'active',
      packageCode: 'enterprise',
      createdAt: '',
      updatedAt: '',
    };
    const tenantSubject = new Subject<Tenant>();
    const tenantsApi = {
      getOne: jest.fn().mockReturnValue(tenantSubject.asObservable()),
      listRoles: jest.fn().mockReturnValue(of([])),
      listPackages: jest.fn().mockReturnValue(
        of([
          { code: 'basic', name: 'Basic', description: null, modules: [], defaultRoleNames: [], createdAt: '' },
          { code: 'enterprise', name: 'Enterprise', description: null, modules: [], defaultRoleNames: [], createdAt: '' },
        ]),
      ),
      history: jest.fn().mockReturnValue(of({ data: [] })),
    } as unknown as TenantsApiService;
    const subscriptionsApi = {
      getSubscription: jest.fn().mockReturnValue(of(null)),
      listInvoices: jest.fn().mockReturnValue(of([])),
    } as unknown as SubscriptionsApiService;
    const brandingApi = {
      getForAdmin: jest.fn().mockReturnValue(of({ displayName: null, primaryColor: null, logoUrl: null })),
    } as unknown as BrandingApiService;

    TestBed.configureTestingModule({
      imports: [TenantDetail],
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: of({ get: () => 'h1' }) } },
        { provide: TenantsApiService, useValue: tenantsApi },
        { provide: SubscriptionsApiService, useValue: subscriptionsApi },
        { provide: BrandingApiService, useValue: brandingApi },
        { provide: MessageService, useValue: { add: jest.fn() } },
        { provide: Router, useValue: { navigate: jest.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(TenantDetail);

    // listPackages() resolves synchronously (of(...)) before getOne() does (a held-open Subject),
    // reproducing the "packages resolve first" race — packageDraft would wrongly fall back to
    // the first package option (basic) instead of the tenant's actual code (enterprise).
    fixture.detectChanges();
    expect(fixture.componentInstance.packageDraft()).toBe('basic');

    tenantSubject.next(tenant);
    await fixture.whenStable();

    expect(fixture.componentInstance.packageDraft()).toBe('enterprise');
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

  it('archives a tenant after confirmation and toasts', async () => {
    const { fixture, tenantsApi, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.requestArchive();
    fixture.componentInstance.archive();

    expect(tenantsApi.archive).toHaveBeenCalledWith('h1');
    expect(fixture.componentInstance.showArchiveConfirm()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Tenant archived' }),
    );
  });

  it('restores an archived tenant and toasts', async () => {
    const { fixture, tenantsApi, messageService } = setup();
    fixture.componentInstance.tenant.update((t) =>
      t ? { ...t, status: 'archived' } : t,
    );
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.restore();

    expect(tenantsApi.restore).toHaveBeenCalledWith('h1');
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Tenant restored' }),
    );
  });

  it('purges only when the hospitalId is typed exactly, then navigates away', async () => {
    const { fixture, tenantsApi, messageService } = setup();
    fixture.componentInstance.tenant.update((t) =>
      t ? { ...t, status: 'archived' } : t,
    );
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.requestPurge();
    fixture.componentInstance.purgeTypedId.set('wrong-id');
    fixture.componentInstance.purge();
    expect(tenantsApi.purge).not.toHaveBeenCalled();
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warn', summary: 'Confirmation mismatch' }),
    );

    fixture.componentInstance.purgeTypedId.set('h1');
    fixture.componentInstance.purge();
    expect(tenantsApi.purge).toHaveBeenCalledWith('h1', 'h1');
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Tenant purged' }),
    );
  });

  it('loads the subscription and invoices for the tenant on init', async () => {
    const { fixture, subscriptionsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(subscriptionsApi.getSubscription).toHaveBeenCalledWith('h1');
    expect(subscriptionsApi.listInvoices).toHaveBeenCalledWith('h1');
  });

  it('subscribes the tenant on the drafted billing cycle and toasts success', async () => {
    const { fixture, subscriptionsApi, messageService, subscription } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.billingCycleDraft.set('annual');
    fixture.componentInstance.subscribeTenant();
    await fixture.whenStable();

    expect(subscriptionsApi.subscribe).toHaveBeenCalledWith('h1', 'annual');
    expect(fixture.componentInstance.subscription()).toEqual(subscription);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Subscription updated' }),
    );
  });

  it('cancels a subscription only after confirmation', async () => {
    const { fixture, subscriptionsApi, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.requestCancelSubscription();
    expect(fixture.componentInstance.showCancelConfirm()).toBe(true);
    expect(subscriptionsApi.cancel).not.toHaveBeenCalled();

    fixture.componentInstance.cancelSubscription();
    await fixture.whenStable();

    expect(subscriptionsApi.cancel).toHaveBeenCalledWith('h1');
    expect(fixture.componentInstance.showCancelConfirm()).toBe(false);
    expect(fixture.componentInstance.subscription()?.status).toBe('canceled');
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Subscription canceled' }),
    );
  });

  it('issues an invoice and prepends it to the list', async () => {
    const { fixture, subscriptionsApi, messageService, invoice } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.issueInvoice();
    await fixture.whenStable();

    expect(subscriptionsApi.issueInvoice).toHaveBeenCalledWith('h1');
    expect(fixture.componentInstance.invoices()).toEqual([invoice]);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Invoice issued' }),
    );
  });

  it('surfaces a duplicate-invoice 409 as a warning toast', async () => {
    const { fixture, subscriptionsApi, messageService } = setup();
    (subscriptionsApi.issueInvoice as jest.Mock).mockReturnValue(
      throwError(
        () => ({ status: 409, message: 'An open invoice already exists' }) satisfies ApiError,
      ),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.issueInvoice();
    await fixture.whenStable();

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warn', summary: 'Invoice already exists' }),
    );
  });

  it('marks an invoice paid, updates it in place, and reloads the subscription', async () => {
    const { fixture, subscriptionsApi, messageService } = setup();
    (subscriptionsApi.listInvoices as jest.Mock).mockReturnValue(
      of([
        {
          id: 'inv-1',
          subscriptionId: 'sub-1',
          tenantId: 'h1',
          periodStart: '2026-08-01T00:00:00.000Z',
          periodEnd: '2026-08-31T00:00:00.000Z',
          amount: 4999,
          status: 'open',
          issuedAt: '2026-08-01T00:00:00.000Z',
          paidAt: null,
        },
      ]),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.markPaid('inv-1');
    await fixture.whenStable();

    expect(subscriptionsApi.markInvoicePaid).toHaveBeenCalledWith('inv-1');
    expect(fixture.componentInstance.invoices()[0].status).toBe('paid');
    // Reloaded after marking paid — getSubscription is called once on init, once on reload.
    expect(subscriptionsApi.getSubscription).toHaveBeenCalledTimes(2);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Invoice marked paid' }),
    );
  });

  it('loads branding for the tenant on init', async () => {
    const { fixture, brandingApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(brandingApi.getForAdmin).toHaveBeenCalledWith('h1');
    expect(fixture.componentInstance.brandingForm()).toEqual({
      displayName: '',
      primaryColor: '',
      tagline: '',
      description: '',
      footerText: '',
      supportText: '',
    });
  });

  it('rejects saving a malformed primary color without calling the API', async () => {
    const { fixture, brandingApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.brandingForm.set({
      displayName: 'City Hospital',
      primaryColor: 'teal',
      tagline: '',
      description: '',
      footerText: '',
      supportText: '',
    });
    fixture.componentInstance.saveBranding();

    expect(brandingApi.upsert).not.toHaveBeenCalled();
    expect(fixture.componentInstance.brandingError()).toContain('hex');
  });

  it('saves branding and toasts success', async () => {
    const { fixture, brandingApi, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.brandingForm.set({
      displayName: 'City Hospital',
      primaryColor: '#006D77',
      tagline: 'Care, coordinated.',
      description: '',
      footerText: '',
      supportText: '',
    });
    fixture.componentInstance.saveBranding();
    await fixture.whenStable();

    expect(brandingApi.upsert).toHaveBeenCalledWith('h1', {
      displayName: 'City Hospital',
      primaryColor: '#006D77',
      tagline: 'Care, coordinated.',
      description: null,
      footerText: null,
      supportText: null,
    });
    expect(fixture.componentInstance.branding()?.displayName).toBe('City Hospital');
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Branding saved' }),
    );
  });

  it('resets branding to default by clearing all fields', async () => {
    const { fixture, brandingApi, messageService } = setup();
    (brandingApi.upsert as jest.Mock).mockReturnValue(
      of({ displayName: null, primaryColor: null, logoUrl: null, tagline: null, description: null, footerText: null, supportText: null }),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.resetBranding();
    await fixture.whenStable();

    expect(brandingApi.upsert).toHaveBeenCalledWith('h1', {
      displayName: null,
      primaryColor: null,
      tagline: null,
      description: null,
      footerText: null,
      supportText: null,
    });
    expect(fixture.componentInstance.brandingForm()).toEqual({
      displayName: '',
      primaryColor: '',
      tagline: '',
      description: '',
      footerText: '',
      supportText: '',
    });
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Branding reset' }),
    );
  });

  it('uploads a logo from a selected file', async () => {
    const { fixture, brandingApi, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    const file = new File(['fake-bytes'], 'logo.png', { type: 'image/png' });
    const input = { files: [file], value: '' } as unknown as HTMLInputElement;
    fixture.componentInstance.onLogoFileSelected({ target: input } as unknown as Event);
    await fixture.whenStable();

    expect(brandingApi.uploadLogo).toHaveBeenCalledWith('h1', file);
    expect(fixture.componentInstance.branding()?.logoUrl).toBe('https://minio.example/logo.png');
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Logo uploaded' }),
    );
  });

  it('does nothing when the file input change fires with no file selected', async () => {
    const { fixture, brandingApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    const input = { files: [], value: '' } as unknown as HTMLInputElement;
    fixture.componentInstance.onLogoFileSelected({ target: input } as unknown as Event);

    expect(brandingApi.uploadLogo).not.toHaveBeenCalled();
  });

  it('removes the logo and toasts success', async () => {
    const { fixture, brandingApi, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.removeLogo();
    await fixture.whenStable();

    expect(brandingApi.removeLogo).toHaveBeenCalledWith('h1');
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Logo removed' }),
    );
  });
});
