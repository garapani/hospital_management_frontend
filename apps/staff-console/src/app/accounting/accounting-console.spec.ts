import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessageService, ConfirmationService, Confirmation } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { AccountingConsole } from './accounting-console.js';
import { AccountingApiService } from './accounting-api.service.js';

describe('AccountingConsole', () => {
  function setup(canManage = true) {
    const api = {
      listAccounts: jest.fn().mockReturnValue(of([])),
      createAccount: jest.fn().mockReturnValue(of({})),
      deactivateAccount: jest.fn().mockReturnValue(of({})),
      reactivateAccount: jest.fn().mockReturnValue(of({})),
      listJournals: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })),
      getJournal: jest.fn().mockReturnValue(of({ id: 'j1', lines: [] })),
      createJournal: jest.fn().mockReturnValue(of({ id: 'j1', journalNumber: 'JE-0001' })),
      postJournal: jest.fn().mockReturnValue(of({})),
      trialBalance: jest.fn().mockReturnValue(of([])),
      incomeStatement: jest.fn().mockReturnValue(of({ income: [], expenses: [], netIncome: 0 })),
      balanceSheet: jest.fn().mockReturnValue(
        of({ assets: [], liabilitiesAndEquity: [], totalAssets: 0, totalLiabilitiesAndEquity: 0 }),
      ),
      exportTrialBalanceCsv: jest.fn().mockReturnValue(of(new Blob(['a,b'], { type: 'text/csv' }))),
      exportTrialBalancePdf: jest.fn().mockReturnValue(of(new Blob(['%PDF-fake'], { type: 'application/pdf' }))),
      exportTrialBalanceExcel: jest.fn().mockReturnValue(of(new Blob(['PK'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))),
      exportIncomeStatementCsv: jest.fn().mockReturnValue(of(new Blob(['a,b'], { type: 'text/csv' }))),
      exportIncomeStatementPdf: jest.fn().mockReturnValue(of(new Blob(['%PDF-fake'], { type: 'application/pdf' }))),
      exportIncomeStatementExcel: jest.fn().mockReturnValue(of(new Blob(['PK'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))),
      exportBalanceSheetCsv: jest.fn().mockReturnValue(of(new Blob(['a,b'], { type: 'text/csv' }))),
      exportBalanceSheetPdf: jest.fn().mockReturnValue(of(new Blob(['%PDF-fake'], { type: 'application/pdf' }))),
      exportBalanceSheetExcel: jest.fn().mockReturnValue(of(new Blob(['PK'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))),
    } as unknown as AccountingApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;
    const confirmationService = {
      confirm: jest.fn((c: Confirmation) => c.accept?.()),
    } as unknown as ConfirmationService;
    const auth = { hasPermission: () => canManage } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [AccountingConsole],
      providers: [
        { provide: AccountingApiService, useValue: api },
        { provide: MessageService, useValue: messageService },
        { provide: ConfirmationService, useValue: confirmationService },
        { provide: AuthService, useValue: auth },
      ],
    });

    const fixture = TestBed.createComponent(AccountingConsole);
    return { fixture, api, messageService, confirmationService };
  }

  it('creates a chart-of-accounts entry and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openAccountModal();
    fixture.componentInstance.accountForm.set({ accountCode: '1000', name: 'Cash', type: 'Asset' });
    fixture.componentInstance.submitAccount();
    await fixture.whenStable();

    expect(api.createAccount).toHaveBeenCalledWith({ accountCode: '1000', name: 'Cash', type: 'Asset' });
    expect(fixture.componentInstance.showAccountModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Account created' }));
  });

  it('computes debit/credit totals and refuses to save an unbalanced journal', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.journalLines.set([
      { accountId: 'a1', debit: 100, credit: null, lineNarration: '' },
      { accountId: 'a2', debit: null, credit: 50, lineNarration: '' },
    ]);

    expect(fixture.componentInstance.journalDebitTotal).toBe(100);
    expect(fixture.componentInstance.journalCreditTotal).toBe(50);
    expect(fixture.componentInstance.journalIsBalanced).toBe(false);
  });

  it('resets journal status filter via resetJournalStatusFilter()', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.setJournalStatusFilter('Draft');
    expect(fixture.componentInstance.journalStatusFilter()).toBe('Draft');
    expect(api.listJournals).toHaveBeenCalledWith(expect.objectContaining({ status: 'Draft', page: 1 }));

    fixture.componentInstance.resetJournalStatusFilter();
    expect(fixture.componentInstance.journalStatusFilter()).toBeNull();
    expect(api.listJournals).toHaveBeenCalledWith(expect.objectContaining({ status: undefined, page: 1 }));
  });

  it('treats a floating-point rounding difference as balanced (0.10 + 0.20 vs 0.30)', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.journalLines.set([
      { accountId: 'a1', debit: 0.1, credit: null, lineNarration: '' },
      { accountId: 'a1', debit: 0.2, credit: null, lineNarration: '' },
      { accountId: 'a2', debit: null, credit: 0.3, lineNarration: '' },
    ]);

    expect(fixture.componentInstance.journalIsBalanced).toBe(true);
  });

  it('flags a line carrying both a debit and a credit', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.journalLines.set([{ accountId: 'a1', debit: 100, credit: 100, lineNarration: '' }]);

    expect(fixture.componentInstance.journalHasLineWithBothDebitAndCredit).toBe(true);
  });

  it('flags an amount entered on a line with no account selected, and refuses to submit', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.journalLines.set([
      { accountId: null, debit: 100, credit: null, lineNarration: '' },
      { accountId: 'a2', debit: null, credit: 100, lineNarration: '' },
    ]);

    expect(fixture.componentInstance.journalHasAmountWithoutAccount).toBe(true);

    fixture.componentInstance.submitJournal();
    expect(api.createJournal).not.toHaveBeenCalled();
    expect(fixture.componentInstance.journalError()).toContain('account');
  });

  it('submits a balanced journal entry and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.journalEntryDate.set(new Date('2026-08-23'));
    fixture.componentInstance.journalLines.set([
      { accountId: 'a1', debit: 100, credit: null, lineNarration: '' },
      { accountId: 'a2', debit: null, credit: 100, lineNarration: '' },
    ]);
    fixture.componentInstance.submitJournal();
    await fixture.whenStable();

    expect(api.createJournal).toHaveBeenCalledWith({
      entryDate: '2026-08-23',
      narration: undefined,
      lines: [
        { accountId: 'a1', debit: 100, credit: undefined, lineNarration: undefined },
        { accountId: 'a2', debit: undefined, credit: 100, lineNarration: undefined },
      ],
    });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Journal entry created' }));
  });

  it('confirms before posting a draft journal entry', async () => {
    const { fixture, api, messageService, confirmationService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.postJournal({ id: 'j1', journalNumber: 'JE-0001' } as never);
    await fixture.whenStable();

    expect(confirmationService.confirm).toHaveBeenCalled();
    expect(api.postJournal).toHaveBeenCalledWith('j1');
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Journal posted' }));
  });

  it('confirms before deactivating an account, but not before reactivating one', async () => {
    const { fixture, api, confirmationService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.toggleAccountActive({ id: 'a1', isActive: true, accountCode: '1000', name: 'Cash' } as never);
    expect(confirmationService.confirm).toHaveBeenCalled();
    expect(api.deactivateAccount).toHaveBeenCalledWith('a1');

    fixture.componentInstance.toggleAccountActive({ id: 'a2', isActive: false, accountCode: '2000', name: 'AP' } as never);
    expect(api.reactivateAccount).toHaveBeenCalledWith('a2');
  });

  it('shows an error toast when the journal API call fails', async () => {
    const { fixture, api, messageService } = setup();
    (api.createJournal as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: ApiError) => void }) =>
        handlers.error({ status: 400, message: 'Unbalanced entry', body: null }),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.journalLines.set([
      { accountId: 'a1', debit: 100, credit: null, lineNarration: '' },
      { accountId: 'a2', debit: null, credit: 100, lineNarration: '' },
    ]);
    fixture.componentInstance.submitJournal();
    await fixture.whenStable();

    expect(fixture.componentInstance.journalError()).toBe('Unbalanced entry');
    expect(messageService.add).not.toHaveBeenCalledWith(expect.objectContaining({ summary: 'Journal entry created' }));
  });

  it('loads the trial balance report by default', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.trialBalance).toHaveBeenCalled();
  });

  it('switches report kind and fetches the balance sheet', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.setReportKind('balance-sheet');
    await fixture.whenStable();

    expect(api.balanceSheet).toHaveBeenCalled();
  });

  it('loads journals with page/limit, page 1 on init', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.listJournals).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
  });

  it('hides mutating actions for a read-only user', async () => {
    const { fixture } = setup(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.canManage).toBe(false);
  });

  describe('report exports', () => {
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

    it('exports the currently selected report (trial balance) as CSV, downloading it', async () => {
      const { fixture, api } = setup();
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance.exportReportCsv();
      await fixture.whenStable();

      expect(api.exportTrialBalanceCsv).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(downloadedHref).toBe('blob:fake-url');
      expect(downloadedFilename).toBe('trial-balance.csv');
      expect(fixture.componentInstance.exportingReportCsv()).toBe(false);
    });

    it('exports the currently selected report as PDF, opening it in a new tab', async () => {
      const { fixture, api } = setup();
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance.exportReportPdf();
      await fixture.whenStable();

      expect(api.exportTrialBalancePdf).toHaveBeenCalled();
      expect(openSpy).toHaveBeenCalledWith('blob:fake-url', '_blank');
      expect(fixture.componentInstance.exportingReportPdf()).toBe(false);
    });

    it('exports the currently selected report as Excel, downloading it', async () => {
      const { fixture, api } = setup();
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance.exportReportExcel();
      await fixture.whenStable();

      expect(api.exportTrialBalanceExcel).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(fixture.componentInstance.exportingReportExcel()).toBe(false);
    });

    it('exports the income statement export endpoint when that report kind is selected', async () => {
      const { fixture, api } = setup();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.componentInstance.setReportKind('income-statement');

      fixture.componentInstance.exportReportCsv();
      await fixture.whenStable();

      expect(api.exportIncomeStatementCsv).toHaveBeenCalled();
      expect(api.exportTrialBalanceCsv).not.toHaveBeenCalled();
    });

    it('exports the balance sheet using only the "to" date as asOf when that report kind is selected', async () => {
      const { fixture, api } = setup();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.componentInstance.setReportKind('balance-sheet');
      fixture.componentInstance.reportTo.set(new Date('2026-08-23'));

      fixture.componentInstance.exportReportCsv();
      await fixture.whenStable();

      expect(api.exportBalanceSheetCsv).toHaveBeenCalledWith('2026-08-23');
    });

    it('toasts an error and clears loading when a report export fails', async () => {
      const { fixture, api, messageService } = setup();
      (api.exportTrialBalanceCsv as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance.exportReportCsv();
      await fixture.whenStable();

      expect(fixture.componentInstance.exportingReportCsv()).toBe(false);
      expect(clickSpy).not.toHaveBeenCalled();
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'Failed to generate the export.' }),
      );
    });
  });
});
