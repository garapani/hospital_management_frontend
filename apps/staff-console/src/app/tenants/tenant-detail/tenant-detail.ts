import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AuditRecord } from '../../audit/audit.model.js';
import { TenantsApiService } from '../tenants-api.service.js';
import { SubscriptionsApiService } from '../subscriptions-api.service.js';
import { BillingCycle, Subscription, SubscriptionInvoice } from '../subscription.model.js';
import { BrandingApiService } from '../../branding/branding-api.service.js';
import { isValidHexColor, TenantBranding } from '../../branding/branding.model.js';
import {
  BlockedRole,
  Package,
  packageDisplayName,
  packageSeverity,
  Tenant,
  TenantRoleOption,
  tenantStatusLabel,
  tenantStatusSeverity,
} from '../tenant.model.js';

interface SelectOption {
  label: string;
  value: string;
}

@Component({
  imports: [
    DatePipe,
    DecimalPipe,
    RouterModule,
    ButtonModule,
    TagModule,
    ToggleSwitchModule,
    SelectModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    FormsModule,
    MessageModule,
  ],
  selector: 'hms-tenant-detail',
  templateUrl: './tenant-detail.html',
})
export class TenantDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tenantsApi = inject(TenantsApiService);
  private readonly subscriptionsApi = inject(SubscriptionsApiService);
  private readonly brandingApi = inject(BrandingApiService);
  private readonly messageService = inject(MessageService);

  readonly tenant = signal<Tenant | null>(null);
  readonly loading = signal(true);
  readonly actionLoading = signal(false);

  readonly packageOptions = signal<SelectOption[]>([]);
  /** Full package catalog (incl. defaultRoleNames) for the role annotations. */
  readonly packages = signal<Package[]>([]);
  readonly packageDraft = signal('');
  readonly packageSaving = signal(false);
  readonly packageError = signal<string | null>(null);
  readonly packageDirty = computed(
    () => this.packageDraft() !== '' && this.packageDraft() !== this.tenant()?.packageCode,
  );
  /** Whether the drafted package is an upgrade or a downgrade relative to the current one. */
  readonly packageDirection = computed<'upgrade' | 'downgrade'>(() => {
    const rank = { basic: 0, standard: 1, enterprise: 2 };
    const from = this.tenant()?.packageCode ?? 'basic';
    const to = this.packageDraft();
    return (rank[to as keyof typeof rank] ?? 0) >= (rank[from as keyof typeof rank] ?? 0)
      ? 'upgrade'
      : 'downgrade';
  });
  readonly showPackageConfirm = signal(false);

  readonly packageDisplayName = packageDisplayName;
  readonly packageSeverity = packageSeverity;

  readonly roles = signal<TenantRoleOption[]>([]);
  readonly rolesLoading = signal(true);
  readonly rolesSaving = signal(false);
  /** Working copy of the toggles; only written back to the server on Save. */
  readonly draft = signal<Record<string, boolean>>({});
  readonly blocked = signal<BlockedRole[]>([]);
  readonly rolesError = signal<string | null>(null);

  /** Roles a hospital tenant may actually hold — cross-tenant roles (Super Admin) are hidden:
   *  they are platform-only and the backend rejects enabling them anyway. */
  readonly assignableRoles = computed(() => this.roles().filter((role) => !role.isCrossTenant));

  readonly dirty = computed(() => {
    const draft = this.draft();
    return this.roles().some((role) => draft[role.id] !== role.enabled);
  });
  readonly enabledCount = computed(
    () => Object.values(this.draft()).filter(Boolean).length,
  );

  readonly tenantStatusSeverity = tenantStatusSeverity;
  readonly tenantStatusLabel = tenantStatusLabel;

  // Archive / restore / purge (deletion & retention).
  readonly archiveLoading = signal(false);
  readonly showArchiveConfirm = signal(false);
  readonly showPurgeConfirm = signal(false);
  /** Typed confirmation for the irreversible purge. */
  readonly purgeTypedId = signal('');
  readonly purgeSaving = signal(false);

  /** Platform-side history: audit events whose record is this tenant (created, package changes,
   *  suspension events) — from the platform tenant's own audit schema. */
  readonly history = signal<AuditRecord[]>([]);
  readonly historyLoading = signal(false);

  // Billing: the platform's own SaaS subscription + invoices for this tenant (public schema,
  // never visible to the hospital itself).
  readonly subscription = signal<Subscription | null>(null);
  readonly subscriptionLoading = signal(true);
  readonly subscriptionActionLoading = signal(false);
  readonly billingCycleDraft = signal<BillingCycle>('monthly');
  readonly showCancelConfirm = signal(false);
  readonly billingCycleOptions: SelectOption[] = [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Annual', value: 'annual' },
  ];

  readonly invoices = signal<SubscriptionInvoice[]>([]);
  readonly invoicesLoading = signal(true);
  readonly invoiceActionLoading = signal(false);
  readonly markPaidLoadingId = signal<string | null>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadTenant(id);
        this.loadRoles(id);
        this.loadHistory(id);
        this.loadSubscription(id);
        this.loadInvoices(id);
        this.loadBranding(id);
      }
    });
    this.loadPackages();
  }

  private loadSubscription(id: string): void {
    this.subscriptionLoading.set(true);
    this.subscriptionsApi.getSubscription(id).subscribe({
      next: (subscription) => {
        this.subscription.set(subscription);
        this.billingCycleDraft.set(subscription?.billingCycle ?? 'monthly');
        this.subscriptionLoading.set(false);
      },
      error: () => {
        this.subscriptionLoading.set(false);
      },
    });
  }

  private loadInvoices(id: string): void {
    this.invoicesLoading.set(true);
    this.subscriptionsApi.listInvoices(id).subscribe({
      next: (invoices) => {
        this.invoices.set(invoices);
        this.invoicesLoading.set(false);
      },
      error: () => {
        this.invoicesLoading.set(false);
      },
    });
  }

  /** Starts a subscription, or (when one already exists) updates its billing cycle/price. */
  subscribeTenant(): void {
    const current = this.tenant();
    if (!current) return;
    this.subscriptionActionLoading.set(true);
    this.subscriptionsApi.subscribe(current.hospitalId, this.billingCycleDraft()).subscribe({
      next: (subscription) => {
        this.subscriptionActionLoading.set(false);
        this.subscription.set(subscription);
        this.messageService.add({
          severity: 'success',
          summary: 'Subscription updated',
          detail: `${current.hospitalName} is now on the ${subscription.billingCycle} cycle at ₹${subscription.pricePerCycle}.`,
        });
      },
      error: () => {
        this.subscriptionActionLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Subscribe failed',
          detail: 'Could not update the subscription. Please try again.',
        });
      },
    });
  }

  requestCancelSubscription(): void {
    this.showCancelConfirm.set(true);
  }

  cancelSubscription(): void {
    const current = this.tenant();
    if (!current) return;
    this.subscriptionActionLoading.set(true);
    this.subscriptionsApi.cancel(current.hospitalId).subscribe({
      next: (subscription) => {
        this.subscriptionActionLoading.set(false);
        this.showCancelConfirm.set(false);
        this.subscription.set(subscription);
        this.messageService.add({
          severity: 'success',
          summary: 'Subscription canceled',
          detail: `${current.hospitalName}'s subscription was canceled.`,
        });
      },
      error: () => {
        this.subscriptionActionLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Cancel failed',
          detail: 'Could not cancel the subscription. Please try again.',
        });
      },
    });
  }

  issueInvoice(): void {
    const current = this.tenant();
    if (!current) return;
    this.invoiceActionLoading.set(true);
    this.subscriptionsApi.issueInvoice(current.hospitalId).subscribe({
      next: (invoice) => {
        this.invoiceActionLoading.set(false);
        this.invoices.update((list) => [invoice, ...list]);
        this.messageService.add({
          severity: 'success',
          summary: 'Invoice issued',
          detail: `₹${invoice.amount} invoice issued for the current period.`,
        });
      },
      error: (error: ApiError) => {
        this.invoiceActionLoading.set(false);
        this.messageService.add({
          severity: error.status === 409 ? 'warn' : 'error',
          summary: error.status === 409 ? 'Invoice already exists' : 'Issue failed',
          detail: error.message || 'Could not issue the invoice. Please try again.',
        });
      },
    });
  }

  markPaid(invoiceId: string): void {
    this.markPaidLoadingId.set(invoiceId);
    this.subscriptionsApi.markInvoicePaid(invoiceId).subscribe({
      next: (updated) => {
        this.markPaidLoadingId.set(null);
        this.invoices.update((list) =>
          list.map((invoice) => (invoice.id === updated.id ? updated : invoice)),
        );
        const current = this.tenant();
        if (current) {
          this.loadSubscription(current.hospitalId);
        }
        this.messageService.add({
          severity: 'success',
          summary: 'Invoice marked paid',
          detail: `₹${updated.amount} invoice marked paid. The subscription period has advanced.`,
        });
      },
      error: () => {
        this.markPaidLoadingId.set(null);
        this.messageService.add({
          severity: 'error',
          summary: 'Mark paid failed',
          detail: 'Could not mark the invoice paid. Please try again.',
        });
      },
    });
  }

  private loadHistory(id: string): void {
    this.historyLoading.set(true);
    this.tenantsApi.history(id).subscribe({
      next: (result) => {
        this.history.set(result.data);
        this.historyLoading.set(false);
      },
      error: () => {
        this.historyLoading.set(false);
      },
    });
  }

  /** Human label for a platform-history event (package changes are the common update). */
  readonly historyEventLabel = (event: AuditRecord): string => {
    const diff = event.diff as { field?: string }[] | undefined;
    if (event.action === 'create') {
      return 'Tenant provisioned';
    }
    if (event.action === 'update' && diff?.[0]?.field === 'packageCode') {
      return 'Package changed';
    }
    return 'Tenant record updated';
  };

  private loadPackages(): void {
    if (this.packageOptions().length > 0) {
      return;
    }
    this.tenantsApi.listPackages().subscribe({
      next: (packages) => {
        this.packages.set(packages);
        this.packageOptions.set(packages.map((p) => ({ label: p.name, value: p.code })));
        this.packageDraft.set(this.tenant()?.packageCode ?? packages[0]?.code ?? '');
      },
      error: () => {
        this.packageError.set('Could not load packages.');
      },
    });
  }

  /**
   * Annotates a role with whether the tenant's current package enables it by default, so the
   * console shows what the package provides vs. what was enabled manually.
   */
  readonly roleAnnotation = (
    roleName: string,
  ): { label: string; severity: 'info' | 'secondary' } => {
    const pkg = this.packages().find((p) => p.code === this.tenant()?.packageCode);
    const included = pkg?.defaultRoleNames.includes(roleName) ?? false;
    return included
      ? { label: `Included in ${pkg?.name ?? ''}`, severity: 'info' }
      : { label: 'Manual', severity: 'secondary' };
  };

  /** Opens the confirmation step — a package change affects every user's permissions. */
  savePackage(): void {
    if (!this.packageDirty()) {
      return;
    }
    this.showPackageConfirm.set(true);
  }

  confirmPackageChange(): void {
    const current = this.tenant();
    if (!current || !this.packageDirty()) {
      return;
    }
    this.showPackageConfirm.set(false);
    this.packageSaving.set(true);
    this.packageError.set(null);
    this.tenantsApi.setPackage(current.hospitalId, this.packageDraft()).subscribe({
      next: (updated) => {
        this.packageSaving.set(false);
        this.tenant.set(updated);
        this.packageDraft.set(updated.packageCode);
        this.loadHistory(current.hospitalId);
        this.messageService.add({
          severity: 'success',
          summary: 'Package updated',
          detail: `${current.hospitalName} is now on ${packageDisplayName(updated.packageCode)}. Takes effect at each user's next login.`,
        });
      },
      error: () => {
        this.packageSaving.set(false);
        this.packageError.set('Could not change package. Please try again.');
        this.messageService.add({
          severity: 'error',
          summary: 'Package update failed',
          detail: 'Could not change the package. Please try again.',
        });
      },
    });
  }

  private loadRoles(id: string): void {
    this.rolesLoading.set(true);
    this.tenantsApi.listRoles(id).subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.resetDraft(roles);
        this.rolesLoading.set(false);
      },
      error: () => {
        this.rolesError.set('Could not load roles for this hospital.');
        this.rolesLoading.set(false);
      },
    });
  }

  private resetDraft(roles: TenantRoleOption[]): void {
    this.draft.set(
      Object.fromEntries(roles.map((role) => [role.id, role.enabled])),
    );
    this.blocked.set([]);
    this.rolesError.set(null);
  }

  toggleRole(roleId: string, enabled: boolean): void {
    this.draft.update((current) => ({ ...current, [roleId]: enabled }));
  }

  revertRoles(): void {
    this.resetDraft(this.roles());
  }

  saveRoles(): void {
    const current = this.tenant();
    if (!current) return;
    const draft = this.draft();
    const roleIds = this.roles()
      .filter((role) => draft[role.id])
      .map((role) => role.id);

    this.rolesSaving.set(true);
    this.blocked.set([]);
    this.rolesError.set(null);

    this.tenantsApi.setRoles(current.hospitalId, roleIds).subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.resetDraft(roles);
        this.rolesSaving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Roles updated',
          detail: `${this.enabledCount()} of ${this.assignableRoles().length} roles are now enabled for ${current.hospitalName}.`,
        });
      },
      error: (error: ApiError) => {
        this.rolesSaving.set(false);
        // 409 means one or more roles are still assigned; the body names who holds them so the
        // administrator can reassign those accounts rather than guess.
        const body = error.body as { blocked?: BlockedRole[] } | undefined;
        if (error.status === 409 && body?.blocked?.length) {
          this.blocked.set(body.blocked);
          this.messageService.add({
            severity: 'warn',
            summary: 'Roles not saved',
            detail: `${body.blocked.length} role(s) are still held by staff accounts. Reassign them first.`,
          });
          return;
        }
        this.rolesError.set('Could not update roles. Please try again.');
        this.messageService.add({
          severity: 'error',
          summary: 'Roles update failed',
          detail: 'Could not update roles. Please try again.',
        });
      },
    });
  }

  private loadTenant(id: string): void {
    this.loading.set(true);
    this.tenantsApi.getOne(id).subscribe({
      next: (t) => {
        this.tenant.set(t);
        // Re-sync regardless of load order: loadPackages() seeds the draft from
        // tenant()?.packageCode, which is still null whenever /packages resolves first, so it
        // falls back to the first package option. Also covers a params-only navigation between
        // two tenants, where the draft would otherwise keep the previous tenant's code.
        this.packageDraft.set(t.packageCode);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  suspend(): void {
    const current = this.tenant();
    if (!current) return;
    this.actionLoading.set(true);
    this.tenantsApi.suspend(current.hospitalId).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.loadTenant(current.hospitalId);
        this.loadHistory(current.hospitalId);
        this.messageService.add({
          severity: 'success',
          summary: 'Tenant suspended',
          detail: `${current.hospitalName} can no longer log in.`,
        });
      },
      error: () => {
        this.actionLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Suspend failed',
          detail: 'Could not suspend the tenant. Please try again.',
        });
      },
    });
  }

  reactivate(): void {
    const current = this.tenant();
    if (!current) return;
    this.actionLoading.set(true);
    this.tenantsApi.reactivate(current.hospitalId).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.loadTenant(current.hospitalId);
        this.loadHistory(current.hospitalId);
        this.messageService.add({
          severity: 'success',
          summary: 'Tenant reactivated',
          detail: `${current.hospitalName} can log in again.`,
        });
      },
      error: () => {
        this.actionLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Reactivate failed',
          detail: 'Could not reactivate the tenant. Please try again.',
        });
      },
    });
  }

  /** Opens the confirmation for archive (soft-delete: reversible). */
  requestArchive(): void {
    this.showArchiveConfirm.set(true);
  }

  archive(): void {
    const current = this.tenant();
    if (!current) return;
    this.archiveLoading.set(true);
    this.tenantsApi.archive(current.hospitalId).subscribe({
      next: () => {
        this.archiveLoading.set(false);
        this.showArchiveConfirm.set(false);
        this.loadTenant(current.hospitalId);
        this.loadHistory(current.hospitalId);
        this.messageService.add({
          severity: 'success',
          summary: 'Tenant archived',
          detail: `${current.hospitalName} can no longer log in. Schema and data are kept — restore anytime.`,
        });
      },
      error: () => {
        this.archiveLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Archive failed',
          detail: 'Could not archive the tenant. Please try again.',
        });
      },
    });
  }

  restore(): void {
    const current = this.tenant();
    if (!current) return;
    this.actionLoading.set(true);
    this.tenantsApi.restore(current.hospitalId).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.loadTenant(current.hospitalId);
        this.loadHistory(current.hospitalId);
        this.messageService.add({
          severity: 'success',
          summary: 'Tenant restored',
          detail: `${current.hospitalName} can log in again.`,
        });
      },
      error: () => {
        this.actionLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Restore failed',
          detail: 'Could not restore the tenant. Please try again.',
        });
      },
    });
  }

  /** Opens the purge dialog (typed confirmation required). Only shown for archived tenants. */
  requestPurge(): void {
    this.purgeTypedId.set('');
    this.showPurgeConfirm.set(true);
  }

  purge(): void {
    const current = this.tenant();
    if (!current) return;
    if (this.purgeTypedId() !== current.hospitalId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Confirmation mismatch',
        detail: `Type ${current.hospitalId} exactly to confirm the purge.`,
      });
      return;
    }
    this.purgeSaving.set(true);
    this.tenantsApi.purge(current.hospitalId, this.purgeTypedId()).subscribe({
      next: () => {
        this.purgeSaving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Tenant purged',
          detail: `${current.hospitalName} and all its data were permanently deleted.`,
        });
        this.router.navigate(['/platform/tenants']);
      },
      error: (error: ApiError) => {
        this.purgeSaving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Purge failed',
          detail: error.message || 'Could not purge the tenant. Please try again.',
        });
      },
    });
  }

  // ---------- Branding ----------
  readonly branding = signal<TenantBranding | null>(null);
  readonly brandingLoading = signal(true);
  readonly brandingForm = signal<{
    displayName: string;
    primaryColor: string;
    tagline: string;
    description: string;
    footerText: string;
    supportText: string;
  }>({
    displayName: '',
    primaryColor: '',
    tagline: '',
    description: '',
    footerText: '',
    supportText: '',
  });
  readonly brandingSaving = signal(false);
  readonly brandingError = signal<string | null>(null);
  readonly logoUploading = signal(false);
  readonly logoRemoving = signal(false);
  readonly isValidHexColor = isValidHexColor;

  private loadBranding(id: string): void {
    this.brandingLoading.set(true);
    this.brandingApi.getForAdmin(id).subscribe({
      next: (branding) => {
        this.branding.set(branding);
        this.brandingForm.set({
          displayName: branding.displayName ?? '',
          primaryColor: branding.primaryColor ?? '',
          tagline: branding.tagline ?? '',
          description: branding.description ?? '',
          footerText: branding.footerText ?? '',
          supportText: branding.supportText ?? '',
        });
        this.brandingLoading.set(false);
      },
      error: () => {
        this.brandingLoading.set(false);
      },
    });
  }

  saveBranding(): void {
    const current = this.tenant();
    if (!current) return;
    const form = this.brandingForm();
    if (form.primaryColor && !isValidHexColor(form.primaryColor)) {
      this.brandingError.set('Primary color must be a 6-digit hex code, e.g. #006D77.');
      return;
    }
    this.brandingSaving.set(true);
    this.brandingError.set(null);
    this.brandingApi
      .upsert(current.hospitalId, {
        displayName: form.displayName.trim() || null,
        primaryColor: form.primaryColor || null,
        tagline: form.tagline.trim() || null,
        description: form.description.trim() || null,
        footerText: form.footerText.trim() || null,
        supportText: form.supportText.trim() || null,
      })
      .subscribe({
        next: (branding) => {
          this.brandingSaving.set(false);
          this.branding.set(branding);
          this.messageService.add({
            severity: 'success',
            summary: 'Branding saved',
            detail: `${current.hospitalName}'s branding was updated.`,
          });
        },
        error: (error: ApiError) => {
          this.brandingSaving.set(false);
          this.brandingError.set(error.message || 'Could not save branding. Please try again.');
        },
      });
  }

  resetBranding(): void {
    const current = this.tenant();
    if (!current) return;
    this.brandingSaving.set(true);
    this.brandingError.set(null);
    this.brandingApi
      .upsert(current.hospitalId, {
        displayName: null,
        primaryColor: null,
        tagline: null,
        description: null,
        footerText: null,
        supportText: null,
      })
      .subscribe({
        next: (branding) => {
          this.brandingSaving.set(false);
          this.branding.set(branding);
          this.brandingForm.set({
            displayName: '',
            primaryColor: '',
            tagline: '',
            description: '',
            footerText: '',
            supportText: '',
          });
          this.messageService.add({
            severity: 'success',
            summary: 'Branding reset',
            detail: `${current.hospitalName} now shows the default Vaidya brand.`,
          });
        },
        error: (error: ApiError) => {
          this.brandingSaving.set(false);
          this.brandingError.set(error.message || 'Could not reset branding. Please try again.');
        },
      });
  }

  onLogoFileSelected(event: Event): void {
    const current = this.tenant();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!current || !file) return;

    this.logoUploading.set(true);
    this.brandingApi.uploadLogo(current.hospitalId, file).subscribe({
      next: (branding) => {
        this.logoUploading.set(false);
        this.branding.set(branding);
        this.messageService.add({
          severity: 'success',
          summary: 'Logo uploaded',
          detail: `${current.hospitalName}'s logo was updated.`,
        });
      },
      error: (error: ApiError) => {
        this.logoUploading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Logo upload failed',
          detail: error.message || 'Please try again with a PNG, JPEG, WebP, or SVG under 2MB.',
        });
      },
    });
  }

  removeLogo(): void {
    const current = this.tenant();
    if (!current) return;
    this.logoRemoving.set(true);
    this.brandingApi.removeLogo(current.hospitalId).subscribe({
      next: (branding) => {
        this.logoRemoving.set(false);
        this.branding.set(branding);
        this.messageService.add({
          severity: 'success',
          summary: 'Logo removed',
          detail: `${current.hospitalName} now shows the default brand mark.`,
        });
      },
      error: (error: ApiError) => {
        this.logoRemoving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Remove failed',
          detail: error.message || 'Could not remove the logo. Please try again.',
        });
      },
    });
  }
}
