import { Component, WritableSignal, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ChartOptions } from 'chart.js';
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
import { EntityName } from '../directory/entity-name.js';

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
    EntityName,
  ],
  selector: 'hms-admin-dashboard',
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboard {
  private readonly tenantsApi = inject(TenantsApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly auditApi = inject(AuditApiService);
  private readonly messageService = inject(MessageService);

  // Each data source loads and errors independently — a failing endpoint blanks only its own
  // section instead of the whole dashboard (this used to be a single `Promise.all`, which
  // rejects, and therefore discards every already-succeeded result, on the first failure).
  private readonly tenants = signal<Tenant[] | null>(null);
  private readonly userCount = signal<number | null>(null);
  readonly recentAuditLogs = signal<AuditRecord[]>([]);

  readonly tenantsLoading = signal(true);
  readonly usersLoading = signal(true);
  readonly auditLoading = signal(true);
  readonly loading = computed(() => this.tenantsLoading() || this.usersLoading() || this.auditLoading());

  readonly stats = computed<StatCard[]>(() => {
    const tenants = this.tenants();
    const userCount = this.userCount();
    const tenantCount = tenants?.length ?? 0;
    const activeTenants = tenants?.filter((t) => t.status === 'active').length ?? 0;
    return [
      {
        title: 'Total Tenants',
        value: tenants === null ? '—' : tenantCount,
        icon: 'pi pi-building',
        color: 'bg-primary-50 text-primary-600',
        trend: tenants === null ? 'Could not load' : `${tenantCount} hospital${tenantCount === 1 ? '' : 's'} on the platform`,
        trendUp: true,
      },
      {
        title: 'Active Tenants',
        value: tenants === null ? '—' : activeTenants,
        icon: 'pi pi-check-circle',
        color: 'bg-emerald-50 text-emerald-600',
        trend:
          tenants === null
            ? 'Could not load'
            : `${tenantCount > 0 ? Math.round((activeTenants / tenantCount) * 100) : 0}% active`,
        trendUp: true,
      },
      {
        title: 'Platform Accounts',
        value: userCount === null ? '—' : userCount,
        icon: 'pi pi-users',
        color: 'bg-sky-50 text-sky-600',
        trend: userCount === null ? 'Could not load' : 'operator accounts in the platform tenant',
        trendUp: true,
      },
    ];
  });

  // Recent tenants — copy before sorting: .sort() mutates in place, and the original order is
  // still needed for the status counts below.
  readonly recentTenants = computed<Tenant[]>(() =>
    [...(this.tenants() ?? [])]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
  );

  // Tenants by status — real data from the registry (no fabricated history).
  readonly chartData = computed(() => {
    const statusCounts = new Map<string, number>();
    for (const tenant of this.tenants() ?? []) {
      const status = tenant.status ?? 'unknown';
      statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
    }
    const statusLabels = [...statusCounts.keys()];
    return {
      labels: statusLabels,
      datasets: [
        {
          label: 'Tenants',
          data: statusLabels.map((label) => statusCounts.get(label) ?? 0),
          backgroundColor: 'rgba(0, 109, 119, 0.75)',
          borderRadius: 4,
        },
      ],
    };
  });

  readonly chartOptions: WritableSignal<ChartOptions<'bar'>> = signal({
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

  constructor() {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.tenantsLoading.set(true);
    this.usersLoading.set(true);
    this.auditLoading.set(true);

    this.tenantsApi.list().subscribe({
      next: (tenants) => {
        this.tenants.set(tenants);
        this.tenantsLoading.set(false);
      },
      error: () => {
        this.tenantsLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Could not load tenants',
          detail: 'Tenant counts and the status chart may be unavailable.',
        });
      },
    });

    this.usersApi.list().subscribe({
      next: (users) => {
        // The list endpoint paginates ({ items, total }) — the dashboard wants the true count of
        // operator accounts, which is `total` (the count query is unbounded).
        this.userCount.set(users?.total ?? 0);
        this.usersLoading.set(false);
      },
      error: () => {
        this.usersLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Could not load platform accounts',
          detail: 'The platform accounts count may be unavailable.',
        });
      },
    });

    this.auditApi.list(1, 5).subscribe({
      next: (audits) => {
        this.recentAuditLogs.set(audits ?? []);
        this.auditLoading.set(false);
      },
      error: () => {
        this.auditLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Could not load recent activity',
          detail: 'The recent audit log may be unavailable.',
        });
      },
    });
  }
}
