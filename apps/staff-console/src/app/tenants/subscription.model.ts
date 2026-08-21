export type BillingCycle = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'canceled';

/** The platform's own SaaS subscription for a hospital tenant — never visible to the tenant. */
export interface Subscription {
  id: string;
  tenantId: string;
  packageCode: string;
  billingCycle: BillingCycle;
  /** Denormalized list price in ₹ for one cycle, fixed at subscribe time. */
  pricePerCycle: number;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
}

export type InvoiceStatus = 'open' | 'paid';

/** A platform billing invoice for one subscription period. */
export interface SubscriptionInvoice {
  id: string;
  subscriptionId: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  status: InvoiceStatus;
  issuedAt: string;
  paidAt: string | null;
}
