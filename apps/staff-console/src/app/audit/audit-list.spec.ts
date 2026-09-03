import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AuditList } from './audit-list.js';
import { AuditApiService } from './audit-api.service.js';
import { toLocalDateTimeString } from '../shared/date.util.js';
import { DirectoryResolverService } from '../directory/directory-resolver.service.js';

const directoryResolverProvider = {
  provide: DirectoryResolverService,
  useValue: { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService,
};

describe('AuditList', () => {
  function setup(searchResult: 'ok' | 'error') {
    const auditApi = {
      search:
        searchResult === 'ok'
          ? jest.fn().mockReturnValue(
              of({
                data: [
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
                ],
                meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
              }),
            )
          : jest
              .fn()
              .mockReturnValue(
                throwError(() => ({ status: 500, message: 'boom' } as ApiError)),
              ),
    } as unknown as AuditApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;

    TestBed.configureTestingModule({
      imports: [AuditList],
      providers: [
        { provide: AuditApiService, useValue: auditApi },
        { provide: MessageService, useValue: messageService },
        directoryResolverProvider,
      ],
    });

    const fixture = TestBed.createComponent(AuditList);
    return { fixture, auditApi, messageService };
  }

  it('searches with the filters and renders the records', async () => {
    const { fixture, auditApi } = setup('ok');
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.applyFilters();
    await fixture.whenStable();

    expect(auditApi.search).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
    );
    expect(fixture.componentInstance.records()).toHaveLength(1);
    expect(fixture.componentInstance.totalRecords()).toBe(1);
  });

  it('toasts search failures instead of failing silently', async () => {
    const { fixture, messageService } = setup('error');
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.applyFilters();
    await fixture.whenStable();

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', summary: 'Search failed' }),
    );
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('defaults the date filters to local wall-clock time, not a UTC-labeled string', async () => {
    const { fixture } = setup('ok');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.filters().endDate).toBe(toLocalDateTimeString(new Date()));
  });

  it('keeps the paginator in sync with the requested page on lazy-load', async () => {
    const { fixture, auditApi } = setup('ok');
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onLazyLoad({ first: 40, rows: 20 });
    await fixture.whenStable();

    expect(fixture.componentInstance.firstRecord()).toBe(40);
    expect(auditApi.search).toHaveBeenCalledWith(expect.objectContaining({ page: 3, limit: 20 }));
  });

  it('detects non-date filters and resets back to defaults', async () => {
    const { fixture, auditApi } = setup('ok');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.hasNonDateFilters()).toBe(false);

    fixture.componentInstance.filters.set({
      ...fixture.componentInstance.filters(),
      tableName: 'accounts',
      action: 'create',
      correlationId: 'c-1',
    });
    expect(fixture.componentInstance.hasNonDateFilters()).toBe(true);

    fixture.componentInstance.resetFilters();
    expect(fixture.componentInstance.hasNonDateFilters()).toBe(false);
    expect(fixture.componentInstance.filters().tableName).toBe('');
    expect(fixture.componentInstance.filters().action).toBe('');
    expect(fixture.componentInstance.filters().correlationId).toBe('');
    expect(fixture.componentInstance.firstRecord()).toBe(0);
    expect(auditApi.search).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20, tableName: undefined, action: undefined, correlationId: undefined }),
    );
  });
});

