import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TenantsApiService } from '../tenants-api.service.js';
import { Tenant, tenantStatusSeverity } from '../tenant.model.js';
import { MasterDataApiService } from '../../master-data/master-data-api.service.js';
import { MultiSelectModule } from 'primeng/multiselect';

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
    MultiSelectModule,
  ],
  selector: 'hms-tenant-list',
  templateUrl: './tenant-list.html',
})
export class TenantList {
  private readonly tenantsApi = inject(TenantsApiService);
  private readonly mdApi = inject(MasterDataApiService);

  readonly tenants = signal<Tenant[]>([]);
  readonly loading = signal(false);

  readonly tenantStatusSeverity = tenantStatusSeverity;

  // Provision modal state
  readonly showProvisionModal = signal(false);
  readonly provisionForm = signal<{hospitalId: string; hospitalName: string; roleIds: string[]; departmentCatalogIds: string[]}>({
    hospitalId: '',
    hospitalName: '',
    roleIds: [],
    departmentCatalogIds: []
  });
  readonly provisionLoading = signal(false);

  // Catalogs for provision modal
  readonly roleOptions = signal<SelectOption[]>([]);
  readonly deptOptions = signal<SelectOption[]>([]);

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
    this.provisionForm.set({ hospitalId: '', hospitalName: '', roleIds: [], departmentCatalogIds: [] });
    this.showProvisionModal.set(true);

    if (this.roleOptions().length === 0) {
      this.mdApi.getRoles().subscribe((res) => {
        this.roleOptions.set(res.map((r) => ({ label: r.name, value: r.id })));
      });
    }
    if (this.deptOptions().length === 0) {
      this.mdApi.listDepartmentCatalogs().subscribe((res) => {
        this.deptOptions.set(res.map((d) => ({ label: d.departmentName, value: d.id })));
      });
    }
  }

  submitProvision(): void {
    this.provisionLoading.set(true);
    this.tenantsApi.provision(this.provisionForm()).subscribe({
      next: () => {
        this.provisionLoading.set(false);
        this.showProvisionModal.set(false);
        this.load();
      },
      error: () => {
        this.provisionLoading.set(false);
        // In a real app we might show a toast here.
      },
    });
  }

  constructor() {
    this.load();
  }
}
