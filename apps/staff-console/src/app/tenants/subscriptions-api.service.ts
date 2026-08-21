import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import { BillingCycle, Subscription, SubscriptionInvoice } from './subscription.model.js';

/** Platform-side billing: the vendor's own SaaS subscriptions/invoices for hospital tenants
 *  (public schema, `system-admin.tenants.manage`-gated) — distinct from `TenantsApiService`,
 *  which manages the tenants themselves. */
@Injectable({ providedIn: 'root' })
export class SubscriptionsApiService {
  private readonly api = inject(ApiClientService);

  /** Active subscription for the tenant, or `null` if it has never subscribed. */
  getSubscription(hospitalId: string): Observable<Subscription | null> {
    return this.api.get<Subscription | null>(
      `/platform/billing/tenants/${hospitalId}/subscription`,
    );
  }

  /** Starts a subscription, or updates the cycle/price of an existing one (same period). */
  subscribe(hospitalId: string, billingCycle: BillingCycle): Observable<Subscription> {
    return this.api.post<Subscription>(`/platform/billing/tenants/${hospitalId}/subscribe`, {
      billingCycle,
    });
  }

  cancel(hospitalId: string): Observable<Subscription> {
    return this.api.post<Subscription>(`/platform/billing/tenants/${hospitalId}/cancel`, {});
  }

  /** Issues an invoice for the subscription's current period. 409 if one is already open. */
  issueInvoice(hospitalId: string): Observable<SubscriptionInvoice> {
    return this.api.post<SubscriptionInvoice>(
      `/platform/billing/tenants/${hospitalId}/invoices`,
      {},
    );
  }

  listInvoices(hospitalId: string): Observable<SubscriptionInvoice[]> {
    return this.api.get<SubscriptionInvoice[]>(`/platform/billing/tenants/${hospitalId}/invoices`);
  }

  /** Marks an invoice paid; the backend advances the subscription to its next period. */
  markInvoicePaid(invoiceId: string): Observable<SubscriptionInvoice> {
    return this.api.post<SubscriptionInvoice>(`/platform/billing/invoices/${invoiceId}/paid`, {});
  }
}
