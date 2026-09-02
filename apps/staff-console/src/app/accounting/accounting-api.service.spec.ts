import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { AccountingApiService } from './accounting-api.service.js';

describe('AccountingApiService', () => {
  let service: AccountingApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://gateway.example/api' },
        { provide: TENANT_ID, useValue: 'demo' },
      ],
    });
    service = TestBed.inject(AccountingApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists chart-of-accounts entries', () => {
    let result: unknown;
    service.listAccounts().subscribe((res) => (result = res));

    const req = httpMock.expectOne('https://gateway.example/api/accounting/accounts');
    const accounts = [{ id: 'a1', accountCode: '1000', name: 'Cash', type: 'Asset', parentAccountId: null, isActive: true }];
    req.flush(accounts);
    expect(result).toEqual(accounts);
  });

  it('creates an account with the given DTO', () => {
    service.createAccount({ accountCode: '2000', name: 'Accounts Payable', type: 'Liability' }).subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/accounting/accounts');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ accountCode: '2000', name: 'Accounts Payable', type: 'Liability' });
    req.flush({});
  });

  it('lists journals with status/date filters', () => {
    service.listJournals({ status: 'Posted', from: '2026-01-01', to: '2026-01-31' }).subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/accounting/journals',
    );
    expect(req.request.params.get('status')).toBe('Posted');
    expect(req.request.params.get('from')).toBe('2026-01-01');
    expect(req.request.params.get('to')).toBe('2026-01-31');
    req.flush({ data: [], total: 0 });
  });

  it('creates a journal with lines', () => {
    const dto = {
      entryDate: '2026-08-23',
      narration: 'Opening balance',
      lines: [
        { accountId: 'a1', debit: 1000 },
        { accountId: 'a2', credit: 1000 },
      ],
    };
    service.createJournal(dto).subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/accounting/journals');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({});
  });

  it('posts a journal', () => {
    service.postJournal('j1').subscribe();

    const req = httpMock.expectOne('https://gateway.example/api/accounting/journals/j1/post');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('fetches the trial balance with an optional date range', () => {
    service.trialBalance('2026-01-01', '2026-01-31').subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/accounting/reports/trial-balance',
    );
    expect(req.request.params.get('from')).toBe('2026-01-01');
    expect(req.request.params.get('to')).toBe('2026-01-31');
    req.flush([]);
  });

  it('fetches the balance sheet as-of a date', () => {
    service.balanceSheet('2026-08-23').subscribe();

    const req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/accounting/reports/balance-sheet',
    );
    expect(req.request.params.get('asOf')).toBe('2026-08-23');
    req.flush({ assets: [], liabilitiesAndEquity: [], totalAssets: 0, totalLiabilitiesAndEquity: 0 });
  });

  const csvBlob = new Blob(['a,b'], { type: 'text/csv' });
  const pdfBlob = new Blob(['%PDF-fake'], { type: 'application/pdf' });
  const xlsxBlob = new Blob(['PK'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  it('exports the trial balance as CSV/PDF/Excel with the date range', () => {
    service.exportTrialBalanceCsv('2026-01-01', '2026-01-31').subscribe();
    let req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/accounting/reports/trial-balance/export.csv',
    );
    expect(req.request.params.get('from')).toBe('2026-01-01');
    expect(req.request.params.get('to')).toBe('2026-01-31');
    req.flush(csvBlob);

    service.exportTrialBalancePdf('2026-01-01', '2026-01-31').subscribe();
    req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/accounting/reports/trial-balance/export.pdf',
    );
    req.flush(pdfBlob);

    service.exportTrialBalanceExcel('2026-01-01', '2026-01-31').subscribe();
    req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/accounting/reports/trial-balance/export.xlsx',
    );
    req.flush(xlsxBlob);
  });

  it('exports the income statement as CSV/PDF/Excel with the date range', () => {
    service.exportIncomeStatementCsv('2026-01-01', '2026-01-31').subscribe();
    let req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/accounting/reports/income-statement/export.csv',
    );
    expect(req.request.params.get('from')).toBe('2026-01-01');
    expect(req.request.params.get('to')).toBe('2026-01-31');
    req.flush(csvBlob);

    service.exportIncomeStatementPdf('2026-01-01', '2026-01-31').subscribe();
    req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/accounting/reports/income-statement/export.pdf',
    );
    req.flush(pdfBlob);

    service.exportIncomeStatementExcel('2026-01-01', '2026-01-31').subscribe();
    req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/accounting/reports/income-statement/export.xlsx',
    );
    req.flush(xlsxBlob);
  });

  it('exports the balance sheet as CSV/PDF/Excel as-of a date', () => {
    service.exportBalanceSheetCsv('2026-08-23').subscribe();
    let req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/accounting/reports/balance-sheet/export.csv',
    );
    expect(req.request.params.get('asOf')).toBe('2026-08-23');
    req.flush(csvBlob);

    service.exportBalanceSheetPdf('2026-08-23').subscribe();
    req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/accounting/reports/balance-sheet/export.pdf',
    );
    req.flush(pdfBlob);

    service.exportBalanceSheetExcel('2026-08-23').subscribe();
    req = httpMock.expectOne(
      (r: HttpRequest<unknown>) => r.url === 'https://gateway.example/api/accounting/reports/balance-sheet/export.xlsx',
    );
    req.flush(xlsxBlob);
  });
});
