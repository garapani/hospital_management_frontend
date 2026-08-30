import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AdminDashboard } from './admin-dashboard.js';
import { TenantsApiService } from '../tenants/tenants-api.service.js';
import { UsersApiService } from '../users/users-api.service.js';
import { AuditApiService } from '../audit/audit-api.service.js';

describe('AdminDashboard (platform overview)', () => {
  function setup(overrides: { auditList?: unknown; tenantsList?: unknown } = {}) {
    const tenantsApi = {
      list:
        overrides.tenantsList === 'error'
          ? jest.fn().mockReturnValue(throwError(() => new Error('boom')))
          : jest.fn().mockReturnValue(
              of([
                { hospitalId: 'h1', hospitalName: 'Hospital One', status: 'active', createdAt: '2026-08-01T00:00:00Z' },
                { hospitalId: 'h2', hospitalName: 'Hospital Two', status: 'active', createdAt: '2026-08-02T00:00:00Z' },
                { hospitalId: 'h3', hospitalName: 'Hospital Three', status: 'suspended', createdAt: '2026-08-03T00:00:00Z' },
              ]),
            ),
    } as unknown as TenantsApiService;
    const usersApi = {
      list: jest
        .fn()
        .mockReturnValue(of({ items: [{ id: 'a1', username: 'op1' }], total: 1 })),
    } as unknown as UsersApiService;
    const auditApi = {
      list:
        overrides.auditList === 'error'
          ? jest.fn().mockReturnValue(throwError(() => new Error('boom')))
          : jest
              .fn()
              .mockReturnValue(
                of([
                  {
                    id: 'aud-1',
                    tableName: 'accounts',
                    recordId: 'a1',
                    action: 'create',
                    changedByAccountId: 'admin-1',
                    correlationId: null,
                    diff: [],
                    occurredAt: '2026-08-21T07:00:00.000Z',
                  },
                ]),
              ),
    } as unknown as AuditApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;

    TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [
        provideRouter([]),
        { provide: TenantsApiService, useValue: tenantsApi },
        { provide: UsersApiService, useValue: usersApi },
        { provide: AuditApiService, useValue: auditApi },
        { provide: MessageService, useValue: messageService },
      ],
    });

    const fixture = TestBed.createComponent(AdminDashboard);
    return { fixture, tenantsApi, usersApi, auditApi, messageService };
  }

  it('shows platform stats and never calls the hospital billing API', async () => {
    const { fixture, tenantsApi, usersApi, auditApi } = setup();
    await fixture.whenStable();

    const stats = fixture.componentInstance.stats();
    expect(stats.map((s) => s.title)).toEqual([
      'Total Tenants',
      'Active Tenants',
      'Platform Accounts',
    ]);
    expect(stats[0].value).toBe(3);
    expect(stats[1].value).toBe(2);
    expect(stats[2].value).toBe(1);
    // No Pending Invoices card — that metric is meaningless in the platform tenant (no billing).
    expect(tenantsApi.list).toHaveBeenCalledTimes(1);
    expect(usersApi.list).toHaveBeenCalledTimes(1);
    expect(auditApi.list).toHaveBeenCalledWith(1, 5);
  });

  it('charts tenants by status from real registry data (no fabricated growth history)', async () => {
    const { fixture } = setup();
    await fixture.whenStable();

    const chart = fixture.componentInstance.chartData();
    expect(chart.labels).toEqual(['active', 'suspended']);
    expect(chart.datasets[0].data).toEqual([2, 1]);
  });

  it('renders recent activity with the audit record fields that actually exist', async () => {
    const { fixture } = setup();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.recentAuditLogs()[0].tableName).toBe('accounts');
    expect(fixture.componentInstance.recentAuditLogs()[0].occurredAt).toContain('2026-08-21');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('accounts · create');
  });

  it('toasts a section-scoped error when only the audit trail fails to load, without blanking the rest', async () => {
    const { fixture, messageService } = setup({ auditList: 'error' });
    await fixture.whenStable();

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', summary: 'Could not load recent activity' }),
    );
    expect(fixture.componentInstance.loading()).toBe(false);
    // The other two sources still succeeded — this is the actual regression fix: a single
    // Promise.all used to reject (and discard every already-succeeded result) on this failure.
    expect(fixture.componentInstance.stats().map((s) => s.value)).toEqual([3, 2, 1]);
    expect(fixture.componentInstance.recentAuditLogs()).toEqual([]);
  });

  it('keeps the platform accounts and audit sections intact when only the tenants API fails', async () => {
    const { fixture, messageService } = setup({ tenantsList: 'error' });
    await fixture.whenStable();

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', summary: 'Could not load tenants' }),
    );
    expect(fixture.componentInstance.loading()).toBe(false);
    const stats = fixture.componentInstance.stats();
    expect(stats[0].value).toBe('—');
    expect(stats[2].value).toBe(1);
    expect(fixture.componentInstance.recentAuditLogs()).toHaveLength(1);
  });
});
