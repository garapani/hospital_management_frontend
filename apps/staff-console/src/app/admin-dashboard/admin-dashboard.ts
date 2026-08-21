import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ChartModule } from 'primeng/chart';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { TenantsApiService } from '../tenants/tenants-api.service.js';
import { UsersApiService } from '../users/users-api.service.js';
import { AuditApiService } from '../audit/audit-api.service.js';
import { AuditRecord } from '../audit/audit.model.js';
import { Tenant } from '../tenants/tenant.model.js';

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: string;
  trendUp?: boolean;
}

@Component({
  imports: [
    DatePipe,
    RouterModule,
    TableModule,
    ButtonModule,
    TagModule,
    ChartModule,
    ProgressSpinnerModule,
  ],
  selector: 'hms-admin-dashboard',
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboard {
  private readonly tenantsApi = inject(TenantsApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly auditApi = inject(AuditApiService);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(false);
  readonly stats = signal<StatCard[]>([]);
  readonly recentTenants = signal<Tenant[]>([]);
  readonly recentAuditLogs = signal<AuditRecord[]>([]);
  readonly chartData = signal<any>(null);
  readonly chartOptions = signal<any>(null);

  constructor() {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);

    // Load all data in parallel. These are platform-scoped: tenants (the whole registry), the
    // platform's operator accounts, and the platform audit trail.
    Promise.all([
      this.tenantsApi.list().toPromise(),
      this.usersApi.list().toPromise(),
      this.auditApi.list(1, 5).toPromise(),
    ])
      .then(([tenants, users, audits]) => {
        const tenantCount = tenants?.length || 0;
        const userCount = users?.length || 0;
        const activeTenants =
          tenants?.filter((t) => t.status === 'active').length || 0;

        // Calculate stats
        this.stats.set([
          {
            title: 'Total Tenants',
            value: tenantCount,
            icon: 'pi pi-building',
            color: 'bg-primary-50 text-primary-600',
            trend: `${tenantCount} hospital${tenantCount === 1 ? '' : 's'} on the platform`,
            trendUp: true,
          },
          {
            title: 'Active Tenants',
            value: activeTenants,
            icon: 'pi pi-check-circle',
            color: 'bg-emerald-50 text-emerald-600',
            trend: `${tenantCount > 0 ? Math.round((activeTenants / tenantCount) * 100) : 0}% active`,
            trendUp: true,
          },
          {
            title: 'Platform Accounts',
            value: userCount,
            icon: 'pi pi-users',
            color: 'bg-sky-50 text-sky-600',
            trend: 'operator accounts in the platform tenant',
            trendUp: true,
          },
        ]);

        // Recent tenants — copy before sorting: .sort() mutates in place, and the original
        // order is still needed for the status counts below.
        this.recentTenants.set(
          [...(tenants || [])]
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            )
            .slice(0, 5),
        );

        // Recent audit logs
        this.recentAuditLogs.set(audits || []);

        // Tenants by status — real data from the registry (no fabricated history).
        const statusCounts = new Map<string, number>();
        for (const tenant of tenants ?? []) {
          const status = tenant.status ?? 'unknown';
          statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
        }
        const statusLabels = [...statusCounts.keys()];
        this.chartData.set({
          labels: statusLabels,
          datasets: [
            {
              label: 'Tenants',
              data: statusLabels.map((label) => statusCounts.get(label) ?? 0),
              backgroundColor: 'rgba(0, 109, 119, 0.75)',
              borderRadius: 4,
            },
          ],
        });

        this.chartOptions.set({
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0,
              },
              grid: {
                color: 'rgba(200, 200, 200, 0.1)',
              },
            },
            x: {
              grid: {
                display: false,
              },
            },
          },
        });

        this.loading.set(false);
      })
      .catch(() => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Dashboard load failed',
          detail: 'Could not load the platform overview. Please try again.',
        });
      });
  }
}
