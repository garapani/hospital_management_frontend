import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { TenantsApiService } from '../tenants-api.service.js';
import {
  BlockedRole,
  Package,
  packageDisplayName,
  packageSeverity,
  Tenant,
  TenantRoleOption,
  tenantStatusSeverity,
} from '../tenant.model.js';

interface SelectOption {
  label: string;
  value: string;
}

@Component({
  imports: [
    DatePipe,
    RouterModule,
    ButtonModule,
    TagModule,
    ToggleSwitchModule,
    SelectModule,
    DialogModule,
    FormsModule,
    MessageModule,
  ],
  selector: 'hms-tenant-detail',
  templateUrl: './tenant-detail.html',
})
export class TenantDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly tenantsApi = inject(TenantsApiService);
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

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadTenant(id);
        this.loadRoles(id);
      }
    });
    this.loadPackages();
  }

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
}
