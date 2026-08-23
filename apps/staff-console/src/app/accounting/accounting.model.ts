export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
export const ACCOUNT_TYPES: AccountType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];

export interface LedgerAccount {
  id: string;
  accountCode: string;
  name: string;
  type: AccountType;
  parentAccountId: string | null;
  isActive: boolean;
}

export interface CreateAccountDto {
  accountCode: string;
  name: string;
  type: AccountType;
  parentAccountId?: string;
}

export interface UpdateAccountDto {
  name?: string;
  type?: AccountType;
  parentAccountId?: string | null;
}

export type JournalStatus = 'Draft' | 'Posted';

export interface JournalLine {
  id: string;
  journalId: string;
  accountId: string;
  debit: number;
  credit: number;
  lineNarration: string | null;
}

export interface JournalEntry {
  id: string;
  journalNumber: string;
  entryDate: string;
  narration: string | null;
  status: JournalStatus;
  postedBy: string | null;
  postedAt: string | null;
  updatedAt: string;
}

export interface JournalWithLines extends JournalEntry {
  lines: JournalLine[];
}

export interface JournalLineInput {
  accountId: string;
  debit?: number;
  credit?: number;
  lineNarration?: string;
}

export interface CreateJournalDto {
  entryDate: string;
  narration?: string;
  lines: JournalLineInput[];
}

export interface JournalListResult {
  data: JournalEntry[];
  total: number;
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debitTotal: number;
  creditTotal: number;
  balance: number;
}

export interface IncomeStatementRow {
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface IncomeStatement {
  income: IncomeStatementRow[];
  expenses: IncomeStatementRow[];
  netIncome: number;
}

export interface BalanceSheetRow {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  amount: number;
}

export interface BalanceSheet {
  assets: BalanceSheetRow[];
  liabilitiesAndEquity: BalanceSheetRow[];
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
}
