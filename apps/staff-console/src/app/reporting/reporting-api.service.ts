import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import {
  EventCountRow,
  ReportingEventsResult,
  RevenueRow,
} from './reporting.model.js';

export interface ListEventsParams {
  eventType?: string;
  page?: number;
  limit?: number;
}

/**
 * Thin wrapper over `ApiClientService` for the reporting endpoints. The client
 * already prefixes `/api` and attaches auth/tenant headers, so paths are
 * module-relative only.
 */
@Injectable({ providedIn: 'root' })
export class ReportingApiService {
  private readonly apiClient = inject(ApiClientService);

  getEventCounts(): Observable<EventCountRow[]> {
    return this.apiClient.get<EventCountRow[]>('/reporting/dashboard/event-counts');
  }

  getRevenue(): Observable<RevenueRow[]> {
    return this.apiClient.get<RevenueRow[]>('/reporting/dashboard/revenue');
  }

  listEvents(params: ListEventsParams = {}): Observable<ReportingEventsResult> {
    const query: Record<string, string | number> = {};
    if (params.eventType) {
      query['eventType'] = params.eventType;
    }
    if (params.page !== undefined) {
      query['page'] = params.page;
    }
    if (params.limit !== undefined) {
      query['limit'] = params.limit;
    }
    return this.apiClient.get<ReportingEventsResult>('/reporting/events', {
      params: query,
    });
  }
}
