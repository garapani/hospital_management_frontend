import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { FractionApiService } from './fraction-api.service.js';
import { CreateEntryDto, CreateRuleDto, FractionEntry, FractionRule } from './fraction.model.js';
import { EntityName } from '../directory/entity-name.js';

const EMPTY_RULE_FORM: CreateRuleDto = { doctorId: '', fractionPercent: 0 };
const EMPTY_ENTRY_FORM: CreateEntryDto = { invoiceId: '', doctorId: '' };

@Component({
  imports: [DecimalPipe, DatePipe, FormsModule, TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, InputNumberModule, TabsModule, EntityName],
  selector: 'hms-fraction-console',
  templateUrl: './fraction-console.html',
})
export class FractionConsole {
  private readonly api = inject(FractionApiService);
  private readonly messageService = inject(MessageService);
  private readonly auth = inject(AuthService);

  // Doctor holds fraction.read only (to see their own revenue share), not fraction.manage — the
  // mutating controls below must stay hidden for that role, not just backend-rejected.
  readonly canManage = this.auth.hasPermission('fraction.manage');

  readonly rules = signal<FractionRule[]>([]);
  readonly rulesLoading = signal(false);
  readonly showRuleModal = signal(false);
  readonly ruleForm = signal<CreateRuleDto>(EMPTY_RULE_FORM);
  readonly ruleSaving = signal(false);
  readonly ruleError = signal<string | null>(null);

  readonly entries = signal<FractionEntry[]>([]);
  readonly entriesLoading = signal(false);
  readonly showEntryModal = signal(false);
  readonly entryForm = signal<CreateEntryDto>(EMPTY_ENTRY_FORM);
  readonly entrySaving = signal(false);
  readonly entryError = signal<string | null>(null);

  constructor() {
    this.loadRules();
    this.loadEntries();
  }

  // --- Rules ---

  loadRules(): void {
    this.rulesLoading.set(true);
    this.api.listRules().subscribe({
      next: (result) => {
        this.rules.set(result.data);
        this.rulesLoading.set(false);
      },
      error: () => {
        this.rulesLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load revenue-share rules.' });
      },
    });
  }

  openRuleModal(): void {
    this.ruleForm.set(EMPTY_RULE_FORM);
    this.ruleError.set(null);
    this.showRuleModal.set(true);
  }

  submitRule(): void {
    this.ruleSaving.set(true);
    this.ruleError.set(null);
    this.api.createRule(this.ruleForm()).subscribe({
      next: () => {
        this.ruleSaving.set(false);
        this.showRuleModal.set(false);
        this.loadRules();
        this.messageService.add({ severity: 'success', summary: 'Rule created' });
      },
      error: (err: ApiError) => {
        this.ruleSaving.set(false);
        this.ruleError.set(err.message || 'Failed to save the rule.');
      },
    });
  }

  toggleRuleActive(rule: FractionRule): void {
    const action = rule.isActive ? this.api.deactivateRule(rule.id) : this.api.reactivateRule(rule.id);
    action.subscribe({
      next: () => {
        this.loadRules();
        this.messageService.add({ severity: 'success', summary: rule.isActive ? 'Rule deactivated' : 'Rule reactivated' });
      },
      error: (err: ApiError) => {
        this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message || 'Please try again.' });
      },
    });
  }

  // --- Entries ---

  loadEntries(): void {
    this.entriesLoading.set(true);
    this.api.listEntries().subscribe({
      next: (result) => {
        this.entries.set(result.data);
        this.entriesLoading.set(false);
      },
      error: () => {
        this.entriesLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load recorded shares.' });
      },
    });
  }

  openEntryModal(): void {
    this.entryForm.set(EMPTY_ENTRY_FORM);
    this.entryError.set(null);
    this.showEntryModal.set(true);
  }

  submitEntry(): void {
    this.entrySaving.set(true);
    this.entryError.set(null);
    this.api.recordEntry(this.entryForm()).subscribe({
      next: () => {
        this.entrySaving.set(false);
        this.showEntryModal.set(false);
        this.loadEntries();
        this.messageService.add({ severity: 'success', summary: 'Share recorded' });
      },
      error: (err: ApiError) => {
        this.entrySaving.set(false);
        this.entryError.set(err.message || 'Failed to record the share.');
      },
    });
  }
}
