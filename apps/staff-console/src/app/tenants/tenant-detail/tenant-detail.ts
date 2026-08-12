import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TenantsApiService } from '../tenants-api.service.js';
import { Tenant, tenantStatusSeverity } from '../tenant.model.js';

@Component({
  imports: [DatePipe, RouterModule, ButtonModule, TagModule],
  selector: 'hms-tenant-detail',
  templateUrl: './tenant-detail.html',
})
export class TenantDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly tenantsApi = inject(TenantsApiService);

  readonly tenant = signal<Tenant | null>(null);
  readonly loading = signal(true);
  readonly actionLoading = signal(false);

  readonly tenantStatusSeverity = tenantStatusSeverity;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadTenant(id);
      }
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
