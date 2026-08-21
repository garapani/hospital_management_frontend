import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { TenantsApiService, ProvisionResult } from '../tenants-api.service.js';
import { packageDisplayName, packageSeverity, Tenant, tenantStatusSeverity } from '../tenant.model.js';

interface SelectOption {
  label: string;
  value: string;
}

interface ProvisionForm {
  hospitalId: string;
  hospitalName: string;
  packageCode: string;
  adminUsername: string;
  adminEmail: string;
  adminPassword: string;
}

const EMPTY_FORM: ProvisionForm = {
  hospitalId: '',
  hospitalName: '',
  packageCode: 'basic',
  adminUsername: '',
  adminEmail: '',
  adminPassword: '',
};

@Component({
  imports: [
    DatePipe,
    RouterModule,
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    FormsModule,
    InputTextModule,
    SelectModule,
  ],
  selector: 'hms-tenant-list',
  templateUrl: './tenant-list.html',
})
export class TenantList {
  private readonly tenantsApi = inject(TenantsApiService);
  private readonly messageService = inject(MessageService);

  readonly tenants = signal<Tenant[]>([]);
  readonly loading = signal(false);

  readonly tenantStatusSeverity = tenantStatusSeverity;
  readonly packageDisplayName = packageDisplayName;
  readonly packageSeverity = packageSeverity;

  // Provision modal state. Roles are NOT picked here anymore — the package decides which roles
  // are enabled (backend auto-enables the package's default roles); only the initial Hospital
  // Admin account is bootstrapped here (optional fields — the backend generates one otherwise).
  readonly showProvisionModal = signal(false);
  readonly provisionForm = signal<ProvisionForm>({ ...EMPTY_FORM });
  readonly provisionLoading = signal(false);
  /** Set when provision succeeds and the backend generated/handed back admin credentials. */
  readonly provisionResult = signal<ProvisionResult | null>(null);

  readonly packageOptions = signal<SelectOption[]>([]);

  // GET /tenants returns the full, unpaginated tenant list (platform-scale hospital counts
  // are small) — the table below paginates client-side rather than issuing paged requests.
  private load(): void {
    this.loading.set(true);
    this.tenantsApi.list().subscribe({
      next: (tenants) => {
        this.tenants.set(tenants);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load tenants',
        });
      },
    });
  }

  openProvisionModal(): void {
    this.provisionForm.set({ ...EMPTY_FORM });
    this.provisionResult.set(null);
    this.showProvisionModal.set(true);

    if (this.packageOptions().length === 0) {
      this.tenantsApi.listPackages().subscribe({
        next: (packages) => {
          this.packageOptions.set(packages.map((p) => ({ label: p.name, value: p.code })));
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Could not load packages. Please try again.',
          });
        },
      });
    }
  }

  submitProvision(): void {
    this.provisionLoading.set(true);
    const form = this.provisionForm();
    this.tenantsApi
      .provision({
        hospitalId: form.hospitalId,
        hospitalName: form.hospitalName,
        packageCode: form.packageCode,
        adminUsername: form.adminUsername || undefined,
        adminEmail: form.adminEmail || undefined,
        adminPassword: form.adminPassword || undefined,
      })
      .subscribe({
        next: (result) => {
          this.provisionLoading.set(false);
          if (result.adminCredentials) {
            // Show the bootstrap credentials — they are the tenant's first login, so keep them
            // on screen until the platform admin copies them.
            this.provisionResult.set(result);
            return;
          }
          this.showProvisionModal.set(false);
          this.load();
          this.messageService.add({
            severity: 'success',
            summary: 'Tenant provisioned',
            detail: `${result.hospitalName} is live on ${packageDisplayName(result.packageCode)}.`,
          });
        },
        error: (error: ApiError) => {
          this.provisionLoading.set(false);
          // Toast, not silence — a failed provision must be visible (was a silent no-op before).
          this.messageService.add({
            severity: 'error',
            summary: 'Provision failed',
            detail: error.message || 'Could not provision the tenant. Please try again.',
          });
        },
      });
  }

  closeProvision(): void {
    this.showProvisionModal.set(false);
    if (this.provisionResult()) {
      this.provisionResult.set(null);
      this.load();
    }
  }

  constructor() {
    this.load();
  }
}
