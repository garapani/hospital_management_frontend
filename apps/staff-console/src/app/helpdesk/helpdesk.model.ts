export type HelpdeskTicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export const HELPDESK_TICKET_PRIORITIES: HelpdeskTicketPriority[] = ['Low', 'Medium', 'High', 'Urgent'];
export type HelpdeskTicketStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';

export type Severity = 'success' | 'warn' | 'danger' | 'info' | 'secondary';

export function helpdeskStatusSeverity(status: string | null): Severity {
  switch (status) {
    case 'Open':
      return 'warn';
    case 'InProgress':
      return 'info';
    case 'Resolved':
    case 'Closed':
      return 'success';
    default:
      return 'secondary';
  }
}

export interface HelpdeskTicket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string | null;
  priority: HelpdeskTicketPriority;
  status: HelpdeskTicketStatus;
  requesterAccountId: string;
  /** Backend-joined display name (accounts.displayName) — null only if the account was hard-deleted. */
  requesterName: string | null;
  assigneeAccountId: string | null;
  assigneeName: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
}

export interface CreateTicketDto {
  title: string;
  description: string;
  category?: string;
  priority?: HelpdeskTicketPriority;
}

export interface TicketListResult {
  data: HelpdeskTicket[];
  total: number;
}
