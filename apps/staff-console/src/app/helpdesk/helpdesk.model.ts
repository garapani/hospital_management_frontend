export type HelpdeskTicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export const HELPDESK_TICKET_PRIORITIES: HelpdeskTicketPriority[] = ['Low', 'Medium', 'High', 'Urgent'];
export type HelpdeskTicketStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';

export interface HelpdeskTicket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string | null;
  priority: HelpdeskTicketPriority;
  status: HelpdeskTicketStatus;
  requesterAccountId: string;
  assigneeAccountId: string | null;
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
