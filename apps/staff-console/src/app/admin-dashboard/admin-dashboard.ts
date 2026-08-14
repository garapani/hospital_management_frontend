import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { TenantsApiService } from '../tenants/tenants-api.service.js';
import { UsersApiService } from '../users/users-api.service.js';
import { AuditApiService } from '../audit/audit-api.service.js';
import { InvoicesApiService } from '../billing/invoices-api.service.js';

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
    CardModule,
    ChartModule,
    ProgressSpinnerModule,
    TooltipModule,
  ],
  selector: 'hms-admin-dashboard',
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboard {
  private readonly tenantsApi = inject(TenantsApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly auditApi = inject(AuditApiService);
  private readonly invoicesApi = inject(InvoicesApiService);

  readonly loading = signal(false);
  readonly stats = signal<StatCard[]>([]);
  readonly recentTenants = signal<any[]>([]);
  readonly recentAuditLogs = signal<any[]>([]);
  readonly chartData = signal<any>(null);
  readonly chartOptions = signal<any>(null);
  
  // Activity Heatmap data
  readonly activityDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly hours = [9, 10, 11, 12, 13, 14, 15, 16, 17];
  readonly activityData: Map<string, number> = new Map();

  constructor() {
    this.generateActivityData();
    this.loadDashboard();
  }
  
  generateActivityData(): void {
    // Generate mock activity data for heatmap
    for (const day of this.activityDays) {
      for (const hour of this.hours) {
        const key = `${day}-${hour}`;
        // Random activity count between 0-10
        const count = Math.floor(Math.random() * 11);
        this.activityData.set(key, count);
      }
    }
  }
  
  getActivityCount(day: string, hour: number): number {
    return this.activityData.get(`${day}-${hour}`) || 0;
  }
  
  getActivityColor(day: string, hour: number): string {
    const count = this.getActivityCount(day, hour);
    if (count === 0) return 'bg-slate-200';
    if (count <= 2) return 'bg-blue-200';
    if (count <= 5) return 'bg-blue-400';
    if (count <= 8) return 'bg-blue-600';
    return 'bg-blue-800';
  }

  loadDashboard(): void {
    this.loading.set(true);

    // Load all data in parallel
    Promise.all([
      this.tenantsApi.list().toPromise(),
      this.usersApi.list().toPromise(),
      this.auditApi.list(1, 5).toPromise(),
      this.invoicesApi.listByPage(1, 10).toPromise(),
    ]).then(([tenants, users, audits, invoices]) => {
      const tenantCount = tenants?.length || 0;
      const userCount = users?.length || 0;
      const activeTenants = tenants?.filter((t: any) => t.status === 'active').length || 0;
      const pendingInvoices = invoices?.data.filter((i: any) => i.status === 'pending').length || 0;

      // Calculate stats
      this.stats.set([
        {
          title: 'Total Tenants',
          value: tenantCount,
          icon: 'pi pi-building',
          color: 'bg-primary-50 text-primary-600',
          trend: '+2 this month',
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
          title: 'Staff Accounts',
          value: userCount,
          icon: 'pi pi-users',
          color: 'bg-sky-50 text-sky-600',
          trend: '+5 this week',
          trendUp: true,
        },
        {
          title: 'Pending Invoices',
          value: pendingInvoices,
          icon: 'pi pi-receipt',
          color: 'bg-amber-50 text-amber-600',
          trend: pendingInvoices > 5 ? 'Action needed' : 'All good',
          trendUp: pendingInvoices <= 5,
        },
      ]);

      // Recent tenants
      this.recentTenants.set(
        (tenants || [])
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
      );

      // Recent audit logs
      this.recentAuditLogs.set(audits || []);

      // Chart data for tenant growth (mock data based on actual count)
      this.chartData.set({
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Tenant Growth',
            data: [2, 4, 6, 8, 10, tenantCount],
            backgroundColor: 'rgba(79, 70, 229, 0.12)',
            borderColor: 'rgba(79, 70, 229, 1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
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
    }).catch(() => {
      this.loading.set(false);
    });
  }
}
