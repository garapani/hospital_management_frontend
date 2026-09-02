import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import { CreateTicketDto, HelpdeskTicket, HelpdeskTicketPriority, HelpdeskTicketStatus, TicketListResult } from './helpdesk.model.js';

export interface ListTicketsParams {
  status?: HelpdeskTicketStatus;
  priority?: HelpdeskTicketPriority;
  q?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class HelpdeskApiService {
  private readonly apiClient = inject(ApiClientService);

  list(params: ListTicketsParams = {}): Observable<TicketListResult> {
    const query: Record<string, string | number> = {};
    if (params.status) query['status'] = params.status;
    if (params.priority) query['priority'] = params.priority;
    if (params.q) query['q'] = params.q;
    if (params.page !== undefined) query['page'] = params.page;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return this.apiClient.get<TicketListResult>('/helpdesk/tickets', { params: query });
  }

  getById(id: string): Observable<HelpdeskTicket> {
    return this.apiClient.get<HelpdeskTicket>(`/helpdesk/tickets/${id}`);
  }

  create(dto: CreateTicketDto): Observable<HelpdeskTicket> {
    return this.apiClient.post<HelpdeskTicket>('/helpdesk/tickets', dto);
  }

  assign(id: string, assigneeAccountId: string): Observable<HelpdeskTicket> {
    return this.apiClient.post<HelpdeskTicket>(`/helpdesk/tickets/${id}/assign`, { assigneeAccountId });
  }

  start(id: string): Observable<HelpdeskTicket> {
    return this.apiClient.post<HelpdeskTicket>(`/helpdesk/tickets/${id}/start`, {});
  }

  resolve(id: string): Observable<HelpdeskTicket> {
    return this.apiClient.post<HelpdeskTicket>(`/helpdesk/tickets/${id}/resolve`, {});
  }

  close(id: string): Observable<HelpdeskTicket> {
    return this.apiClient.post<HelpdeskTicket>(`/helpdesk/tickets/${id}/close`, {});
  }
}
