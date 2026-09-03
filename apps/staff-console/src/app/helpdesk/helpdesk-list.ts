import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { Observable } from 'rxjs';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { HelpdeskApiService } from './helpdesk-api.service.js';
import { CreateTicketDto, HELPDESK_TICKET_PRIORITIES, HelpdeskTicket, HelpdeskTicketPriority, HelpdeskTicketStatus, helpdeskStatusSeverity } from './helpdesk.model.js';

const DEFAULT_PAGE_SIZE = 20;
const EMPTY_FORM: CreateTicketDto = { title: '', description: '' };

@Component({
  imports: [FormsModule, RouterModule, TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, SelectModule],
  selector: 'hms-helpdesk-list',
  templateUrl: './helpdesk-list.html',
})
export class HelpdeskList {
  private readonly api = inject(HelpdeskApiService);
  private readonly messageService = inject(MessageService);
  readonly auth = inject(AuthService);

  // GET /helpdesk/tickets is helpdesk.read-only on the backend — a create-only role (most staff
  // roles, who can raise a ticket but not browse everyone else's) would otherwise land on this
  // screen (see the OR'd route guard in app.routes.ts) and have every list request 403.
  readonly canRead = this.auth.hasPermission('helpdesk.read');
  // Helpdesk Agent holds helpdesk.read/manage but not helpdesk.create (seed-rbac-catalog.ts) — the
  // New Ticket button needs its own gate, separate from canRead, or that role sees a button whose
  // Save always 403s.
  readonly canCreate = this.auth.hasPermission('helpdesk.create');

  readonly priorities = HELPDESK_TICKET_PRIORITIES;
  readonly statusOptions: { label: string; value: HelpdeskTicketStatus | null }[] = [
    { label: 'All', value: null },
    { label: 'Open', value: 'Open' },
    { label: 'In Progress', value: 'InProgress' },
    { label: 'Resolved', value: 'Resolved' },
    { label: 'Closed', value: 'Closed' },
  ];

  readonly tickets = signal<HelpdeskTicket[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly firstRecord = signal(0);
  readonly searchFilter = signal('');
  readonly statusFilter = signal<HelpdeskTicketStatus | null>(null);

  readonly showCreateModal = signal(false);
  readonly createForm = signal<CreateTicketDto>(EMPTY_FORM);
  readonly createSaving = signal(false);
  readonly createError = signal<string | null>(null);
  readonly actionId = signal<string | null>(null);

  onLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize();
    const page = Math.floor((event.first ?? 0) / rows) + 1;
    this.load(page, rows);
  }

  readonly statusSeverity = helpdeskStatusSeverity;

  applyFilters(): void {
    this.load(1, this.pageSize());
  }

  resetFilters(): void {
    this.searchFilter.set('');
    this.statusFilter.set(null);
    this.applyFilters();
  }

  private load(page: number, limit: number): void {
    this.loading.set(true);
    this.firstRecord.set((page - 1) * limit);
    this.api
      .list({ q: this.searchFilter() || undefined, status: this.statusFilter() ?? undefined, page, limit })
      .subscribe({
        next: (result) => {
          this.tickets.set(result.data);
          this.totalRecords.set(result.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  openCreateModal(): void {
    this.createForm.set(EMPTY_FORM);
    this.createError.set(null);
    this.showCreateModal.set(true);
  }

  submitCreate(): void {
    this.createSaving.set(true);
    this.createError.set(null);
    this.api.create(this.createForm()).subscribe({
      next: (ticket) => {
        this.createSaving.set(false);
        this.showCreateModal.set(false);
        if (this.canRead) {
          this.load(1, this.pageSize());
        }
        this.messageService.add({ severity: 'success', summary: 'Ticket created', detail: ticket.ticketNumber });
      },
      error: (err: ApiError) => {
        this.createSaving.set(false);
        this.createError.set(err.message || 'Failed to create the ticket.');
      },
    });
  }

  start(ticket: HelpdeskTicket): void {
    this.runAction(ticket.id, this.api.start(ticket.id), 'Ticket started');
  }

  resolve(ticket: HelpdeskTicket): void {
    this.runAction(ticket.id, this.api.resolve(ticket.id), 'Ticket resolved');
  }

  close(ticket: HelpdeskTicket): void {
    this.runAction(ticket.id, this.api.close(ticket.id), 'Ticket closed');
  }

  private runAction(id: string, action$: Observable<HelpdeskTicket>, successSummary: string): void {
    this.actionId.set(id);
    action$.subscribe({
      next: () => {
        this.actionId.set(null);
        this.load(1, this.pageSize());
        this.messageService.add({ severity: 'success', summary: successSummary });
      },
      error: (err: ApiError) => {
        this.actionId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message || 'Please try again.' });
      },
    });
  }

  priorityColor(priority: HelpdeskTicketPriority): 'success' | 'info' | 'warn' | 'danger' {
    if (priority === 'Urgent') return 'danger';
    if (priority === 'High') return 'warn';
    if (priority === 'Medium') return 'info';
    return 'success';
  }

  constructor() {
    if (this.canRead) {
      this.load(1, this.pageSize());
    }
  }
}
