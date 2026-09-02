import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '@org/auth';
import { ApiError } from '@org/api-client';
import { catchError, forkJoin, of } from 'rxjs';

import { HelpdeskApiService } from './helpdesk-api.service.js';
import { HelpdeskTicket, HelpdeskTicketPriority } from './helpdesk.model.js';
import { UsersApiService, DirectoryEntry } from '../users/users-api.service.js';

/** Every role holding helpdesk.manage — the only accounts a ticket can be assigned to
 *  (seed-rbac-catalog.ts). /accounts/directory requires a single role per call, so this picker
 *  merges three lookups. */
const ASSIGNABLE_ROLES = ['Helpdesk Agent', 'Hospital Admin', 'Super Admin'];

@Component({
  selector: 'hms-helpdesk-ticket-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TagModule, SelectModule, DialogModule, ToastModule],
  providers: [MessageService],
  templateUrl: './helpdesk-ticket-detail.html',
})
export class HelpdeskTicketDetail implements OnInit {
  private readonly api = inject(HelpdeskApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  readonly auth = inject(AuthService);

  readonly ticket = signal<HelpdeskTicket | null>(null);
  readonly loading = signal(true);
  readonly actionLoading = signal(false);
  readonly canManage = this.auth.hasPermission('helpdesk.manage');

  readonly showAssignModal = signal(false);
  readonly assigneeOptions = signal<DirectoryEntry[]>([]);
  readonly assigneeOptionsLoading = signal(false);
  readonly selectedAssigneeId = signal('');
  readonly assigning = signal(false);

  ngOnInit(): void {
    // Subscribes to paramMap (not route.snapshot) so a route-reuse navigation between two
    // /helpdesk/:id URLs (e.g. browser back/forward) refetches instead of leaving a stale ticket.
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.load(id);
      }
    });
  }

  load(id: string): void {
    this.loading.set(true);
    this.api.getById(id).subscribe({
      next: (ticket) => {
        this.ticket.set(ticket);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load the ticket.' });
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/helpdesk']);
  }

  openAssignModal(): void {
    this.selectedAssigneeId.set(this.ticket()?.assigneeAccountId ?? '');
    this.showAssignModal.set(true);
    this.assigneeOptionsLoading.set(true);
    forkJoin(
      ASSIGNABLE_ROLES.map((role) => this.usersApi.listDirectory(role).pipe(catchError(() => of([] as DirectoryEntry[])))),
    ).subscribe((results) => {
      const byId = new Map<string, DirectoryEntry>();
      for (const entries of results) {
        for (const entry of entries) byId.set(entry.id, entry);
      }
      this.assigneeOptions.set(Array.from(byId.values()));
      this.assigneeOptionsLoading.set(false);
    });
  }

  submitAssign(): void {
    const id = this.ticket()?.id;
    const assigneeAccountId = this.selectedAssigneeId();
    if (!id || !assigneeAccountId) return;

    this.assigning.set(true);
    this.api.assign(id, assigneeAccountId).subscribe({
      next: (updated) => {
        this.ticket.set(updated);
        this.assigning.set(false);
        this.showAssignModal.set(false);
        this.messageService.add({ severity: 'success', summary: 'Ticket assigned' });
      },
      error: (err: ApiError) => {
        this.assigning.set(false);
        this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message || 'Failed to assign the ticket.' });
      },
    });
  }

  start(): void {
    this.runAction((id) => this.api.start(id), 'Ticket started');
  }

  resolveTicket(): void {
    this.runAction((id) => this.api.resolve(id), 'Ticket resolved');
  }

  close(): void {
    this.runAction((id) => this.api.close(id), 'Ticket closed');
  }

  private runAction(action: (id: string) => ReturnType<HelpdeskApiService['start']>, successSummary: string): void {
    const id = this.ticket()?.id;
    if (!id) return;

    this.actionLoading.set(true);
    action(id).subscribe({
      next: (updated) => {
        this.ticket.set(updated);
        this.actionLoading.set(false);
        this.messageService.add({ severity: 'success', summary: successSummary });
      },
      error: (err: ApiError) => {
        this.actionLoading.set(false);
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
}
