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
import { MessageModule } from 'primeng/message';
import { ApiError } from '@org/api-client';
import { TenantsApiService } from '../tenants-api.service.js';
import { packageDisplayName, packageSeverity, Tenant, tenantStatusSeverity } from '../tenant.model.js';

interface SelectOption {
  label: string;
  value: string;
}

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
    MessageModule,
  ],
  selector: 'hms-tenant-list',
  templateUrl: './tenant-list.html',
})
export class TenantList {
  private readonly tenantsApi = inject(TenantsApiService);

  readonly tenants = signal<Tenant[]>([]);
  readonly loading = signal(false);

  readonly tenantStatusSeverity = tenantStatusSeverity;
  readonly packageDisplayName = packageDisplayName;
  readonly packageSeverity = packageSeverity;

  // Provision modal state. Roles are NOT picked here anymore — the package decides which roles
  // are enabled (backend auto-enables the package's default roles); departments are not seeded
  // at provision time.
  readonly showProvisionModal = signal(false);
  readonly provisionForm = signal<{ hospitalId: string; hospitalName: string; packageCode: string }>({
    hospitalId: '',
    hospitalName: '',
    packageCode: 'basic',
  });
  readonly provisionLoading = signal(false);
  readonly provisionError = signal<string | null>(null);

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
      error: () => this.loading.set(false),
    });
  }

  openProvisionModal(): void {
    this.provisionForm.set({ hospitalId: '', hospitalName: '', packageCode: 'basic' });
    this.provisionError.set(null);
    this.showProvisionModal.set(true);

    if (this.packageOptions().length === 0) {
      this.tenantsApi.listPackages().subscribe({
        next: (packages) => {
          this.packageOptions.set(packages.map((p) => ({ label: p.name, value: p.code })));
        },
        error: () => {
          this.provisionError.set('Could not load packages. Please try again.');
        },
      });
    }
  }

  submitProvision(): void {
    this.provisionLoading.set(true);
    this.provisionError.set(null);
    this.tenantsApi.provision(this.provisionForm()).subscribe({
      next: () => {
        this.provisionLoading.set(false);
        this.showProvisionModal.set(false);
        this.load();
      },
      error: (error: ApiError) => {
        this.provisionLoading.set(false);
        // Never fail silently — surface the backend's message so a failed provision is visible.
        this.provisionError.set(error.message || 'Could not provision the tenant. Please try again.');
      },
    });
  }

  constructor() {
    this.load();
  }
}
