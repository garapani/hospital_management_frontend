import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { ReportingDashboard } from './reporting-dashboard.js';
import { ReportingApiService } from '../reporting-api.service.js';
import { EventCountRow, ReportingEvent, RevenueRow } from '../reporting.model.js';
import { DirectoryResolverService } from '../../directory/directory-resolver.service.js';

describe('ReportingDashboard', () => {
  const DEFAULT_EVENTS = { items: [], total: 0 };

  function setup(overrides: Partial<Record<keyof ReportingApiService, jest.Mock>> = {}) {
    const reportingApi = {
      getEventCounts: jest.fn().mockReturnValue(of([])),
      getRevenue: jest.fn().mockReturnValue(of([])),
      listEvents: jest.fn().mockReturnValue(of(DEFAULT_EVENTS)),
      ...overrides,
    } as unknown as ReportingApiService;
    const auth = { hasPermission: jest.fn().mockReturnValue(true) } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [ReportingDashboard],
      providers: [
        { provide: ReportingApiService, useValue: reportingApi },
        { provide: AuthService, useValue: auth },
        { provide: DirectoryResolverService, useValue: { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService },
      ],
    });

    const fixture = TestBed.createComponent(ReportingDashboard);
    return { fixture, reportingApi, auth };
  }

  it('loads dashboard aggregates and events page 1 on init', async () => {
    const { fixture, reportingApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(reportingApi.getEventCounts).toHaveBeenCalledTimes(1);
    expect(reportingApi.getRevenue).toHaveBeenCalledTimes(1);
    expect(reportingApi.listEvents).toHaveBeenCalledTimes(1);
    expect(reportingApi.listEvents).toHaveBeenCalledWith({ eventType: undefined, page: 1, limit: 20 });
  });

  it('gates the page content behind the reporting.read permission', async () => {
    const { fixture, auth } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(auth.hasPermission).toHaveBeenCalledWith('reporting.read');
  });

  it('computes per-type event counts and total revenue from dashboard rows', async () => {
    const eventCountRows: EventCountRow[] = [
      { date: '2026-08-01', eventType: 'PaymentRecorded', count: 3 },
      { date: '2026-08-01', eventType: 'OrderPlaced', count: 2 },
      { date: '2026-08-02', eventType: 'PaymentRecorded', count: 5 },
    ];
    const revenueRows: RevenueRow[] = [
      { date: '2026-08-01', totalAmount: 1000 },
      { date: '2026-08-02', totalAmount: 2500 },
    ];
    const { fixture } = setup({
      getEventCounts: jest.fn().mockReturnValue(of(eventCountRows)),
      getRevenue: jest.fn().mockReturnValue(of(revenueRows)),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.eventCountsByType()).toEqual([
      { eventType: 'PaymentRecorded', count: 8 },
      { eventType: 'OrderPlaced', count: 2 },
    ]);
    expect(fixture.componentInstance.totalEvents()).toBe(10);
    expect(fixture.componentInstance.totalRevenue()).toBe(3500);
  });

  it('requests the correct page when the events table lazy-loads a later page', async () => {
    const { fixture, reportingApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onLazyLoad({ first: 20 });

    const call = (reportingApi.listEvents as jest.Mock).mock.calls[1][0];
    expect(call).toEqual({ eventType: undefined, page: 2, limit: 20 });
    expect(fixture.componentInstance.firstRecord()).toBe(20);
  });

  it('reloads the events table at page 1 when an event type filter is applied', async () => {
    const { fixture, reportingApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.onLazyLoad({ first: 20 });

    fixture.componentInstance.eventTypeFilter.set('PaymentRecorded');
    fixture.componentInstance.applyEventFilter();

    expect(fixture.componentInstance.firstRecord()).toBe(0);
    const call = (reportingApi.listEvents as jest.Mock).mock.calls[2][0];
    expect(call).toEqual({ eventType: 'PaymentRecorded', page: 1, limit: 20 });
  });

  it('populates events and totalRecords from the list response', async () => {
    const event: ReportingEvent = {
      id: 'evt-1',
      eventType: 'PaymentRecorded',
      entityId: 'entity-1',
      payload: { amount: 500 },
      occurredAt: '2026-08-01T10:00:00.000Z',
      correlationId: null,
      createdAt: '2026-08-01T10:00:00.000Z',
    };
    const { fixture } = setup({
      listEvents: jest.fn().mockReturnValue(of({ items: [event], total: 1 })),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.events()).toEqual([event]);
    expect(fixture.componentInstance.totalRecords()).toBe(1);
  });

  it('clears the loading flags when the dashboard requests error', async () => {
    const { fixture } = setup({
      getEventCounts: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
      getRevenue: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.eventCountsLoading()).toBe(false);
    expect(fixture.componentInstance.revenueLoading()).toBe(false);
  });

  it('clears the events loading flag when the events request errors', async () => {
    const { fixture } = setup({
      listEvents: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.eventsLoading()).toBe(false);
  });

  describe('exports', () => {
    let openSpy: jest.SpyInstance;
    let clickSpy: jest.Mock;
    let downloadedHref: string;
    let downloadedFilename: string;

    beforeEach(() => {
      URL.createObjectURL = jest.fn().mockReturnValue('blob:fake-url');
      URL.revokeObjectURL = jest.fn();
      openSpy = jest.spyOn(window, 'open').mockReturnValue(null);
      clickSpy = jest.fn();
      downloadedHref = '';
      downloadedFilename = '';
      const realCreateElement = document.createElement.bind(document);
      jest.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
        if (tagName === 'a') {
          return {
            set href(value: string) {
              downloadedHref = value;
            },
            set download(value: string) {
              downloadedFilename = value;
            },
            click: clickSpy,
          } as unknown as HTMLAnchorElement;
        }
        return realCreateElement(tagName, options);
      });
    });

    afterEach(() => {
      openSpy.mockRestore();
      jest.restoreAllMocks();
    });

    const csvBlob = new Blob(['a,b'], { type: 'text/csv' });
    const pdfBlob = new Blob(['%PDF-fake'], { type: 'application/pdf' });
    const xlsxBlob = new Blob(['PK'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    it('exports events as CSV using the current event type filter, then downloads it', async () => {
      const { fixture, reportingApi } = setup({
        exportEventsCsv: jest.fn().mockReturnValue(of(csvBlob)),
      });
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.componentInstance.eventTypeFilter.set('OrderPlaced');

      fixture.componentInstance.exportEventsCsv();
      await fixture.whenStable();

      expect(reportingApi.exportEventsCsv).toHaveBeenCalledWith('OrderPlaced');
      expect(clickSpy).toHaveBeenCalled();
      expect(downloadedHref).toBe('blob:fake-url');
      expect(downloadedFilename).toBe('reporting-events.csv');
      expect(fixture.componentInstance.exportingEventsCsv()).toBe(false);
    });

    it('exports events as PDF and opens it in a new tab', async () => {
      const { fixture, reportingApi } = setup({
        exportEventsPdf: jest.fn().mockReturnValue(of(pdfBlob)),
      });
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance.exportEventsPdf();
      await fixture.whenStable();

      expect(reportingApi.exportEventsPdf).toHaveBeenCalledWith(undefined);
      expect(openSpy).toHaveBeenCalledWith('blob:fake-url', '_blank');
      expect(fixture.componentInstance.exportingEventsPdf()).toBe(false);
    });

    it('exports events as Excel, then downloads it', async () => {
      const { fixture, reportingApi } = setup({
        exportEventsExcel: jest.fn().mockReturnValue(of(xlsxBlob)),
      });
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance.exportEventsExcel();
      await fixture.whenStable();

      expect(reportingApi.exportEventsExcel).toHaveBeenCalledWith(undefined);
      expect(clickSpy).toHaveBeenCalled();
      expect(fixture.componentInstance.exportingEventsExcel()).toBe(false);
    });

    it('exports revenue as CSV, then downloads it', async () => {
      const { fixture, reportingApi } = setup({
        exportRevenueCsv: jest.fn().mockReturnValue(of(csvBlob)),
      });
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance.exportRevenueCsv();
      await fixture.whenStable();

      expect(reportingApi.exportRevenueCsv).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(fixture.componentInstance.exportingRevenueCsv()).toBe(false);
    });

    it('exports revenue as Excel, then downloads it', async () => {
      const { fixture, reportingApi } = setup({
        exportRevenueExcel: jest.fn().mockReturnValue(of(xlsxBlob)),
      });
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance.exportRevenueExcel();
      await fixture.whenStable();

      expect(reportingApi.exportRevenueExcel).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(fixture.componentInstance.exportingRevenueExcel()).toBe(false);
    });

    it('toasts an error and clears loading when an export fails', async () => {
      const { fixture } = setup({
        exportEventsCsv: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
      });
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance.exportEventsCsv();
      await fixture.whenStable();

      expect(fixture.componentInstance.exportingEventsCsv()).toBe(false);
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });
});
