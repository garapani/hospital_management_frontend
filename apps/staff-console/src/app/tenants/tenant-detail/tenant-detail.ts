import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { MessageModule } from 'primeng/message';
import { ApiError } from '@org/api-client';
import { TenantsApiService } from '../tenants-api.service.js';
import {
  BlockedRole,
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
    FormsModule,
    MessageModule,
  ],
  selector: 'hms-tenant-detail',
  templateUrl: './tenant-detail.html',
})
export class TenantDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly tenantsApi = inject(TenantsApiService);

  readonly tenant = signal<Tenant | null>(null);
  readonly loading = signal(true);
  readonly actionLoading = signal(false);

  readonly packageOptions = signal<SelectOption[]>([]);
  readonly packageDraft = signal('');
  readonly packageSaving = signal(false);
  readonly packageError = signal<string | null>(null);
  readonly packageDirty = computed(
    () => this.packageDraft() !== '' && this.packageDraft() !== this.tenant()?.packageCode,
  );

  readonly packageDisplayName = packageDisplayName;
  readonly packageSeverity = packageSeverity;

  readonly roles = signal<TenantRoleOption[]>([]);
  readonly rolesLoading = signal(true);
  readonly rolesSaving = signal(false);
  /** Working copy of the toggles; only written back to the server on Save. */
  readonly draft = signal<Record<string, boolean>>({});
  readonly blocked = signal<BlockedRole[]>([]);
  readonly rolesError = signal<string | null>(null);

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
        this.packageOptions.set(packages.map((p) => ({ label: p.name, value: p.code })));
        this.packageDraft.set(this.tenant()?.packageCode ?? packages[0]?.code ?? '');
      },
      error: () => {
        this.packageError.set('Could not load packages.');
      },
    });
  }

  savePackage(): void {
    const current = this.tenant();
    if (!current || !this.packageDirty()) {
      return;
    }
    this.packageSaving.set(true);
    this.packageError.set(null);
    this.tenantsApi.setPackage(current.hospitalId, this.packageDraft()).subscribe({
      next: (updated) => {
        this.packageSaving.set(false);
        this.tenant.set(updated);
        this.packageDraft.set(updated.packageCode);
      },
      error: () => {
        this.packageSaving.set(false);
        this.packageError.set('Could not change package. Please try again.');
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
      },
      error: (error: ApiError) => {
        this.rolesSaving.set(false);
        // 409 means one or more roles are still assigned; the body names who holds them so the
        // administrator can reassign those accounts rather than guess.
        const body = error.body as { blocked?: BlockedRole[] } | undefined;
        if (error.status === 409 && body?.blocked?.length) {
          this.blocked.set(body.blocked);
          return;
        }
        this.rolesError.set('Could not update roles. Please try again.');
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
      },
      error: () => this.actionLoading.set(false),
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
      },
      error: () => this.actionLoading.set(false),
    });
  }
}
