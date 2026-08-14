import { Route } from '@angular/router';
import { permissionGuard, platformGuard, tenantGuard, Permissions } from '@org/auth';
import { AppShell } from './shell/app-shell.js';
import { PlatformShell } from './shell/platform-shell.js';
import { Login } from './login/login.js';
import { rootRedirectGuard } from './root-redirect.guard.js';

export const appRoutes: Route[] = [
  // Bare '' cannot redirect to a fixed URL: the two audiences have different landing pages, and
  // a fixed target would bounce every user of the other audience off a guard.
  { path: '', pathMatch: 'full', canActivate: [rootRedirectGuard], children: [] },
  { path: 'login', component: Login },
  {
    path: '',
    component: PlatformShell,
    canActivate: [platformGuard],
    runGuardsAndResolvers: 'always',
    children: [
      {
        path: 'platform/dashboard',
        loadComponent: () => import('./admin-dashboard/admin-dashboard.js').then((m) => m.AdminDashboard),
      },
      {
        path: 'platform/tenants',
        loadComponent: () => import('./tenants/tenant-list/tenant-list.js').then((m) => m.TenantList),
      },
      {
        path: 'platform/tenants/:id',
        loadComponent: () => import('./tenants/tenant-detail/tenant-detail.js').then((m) => m.TenantDetail),
      },
      {
        path: 'platform/catalog',
        loadComponent: () => import('./global-catalog/global-catalog-list.js').then((m) => m.GlobalCatalogList),
      },
      // Same components as the tenant tree's /admin/users and /admin/audit: both are scoped by the
      // JWT's tenant, so under a platform admin they resolve to platform admins and the platform
      // audit trail with no parameterization.
      {
        path: 'platform/admins',
        loadComponent: () => import('./users/user-list.js').then((m) => m.UserList),
      },
      {
        path: 'platform/admins/:id',
        loadComponent: () => import('./users/user-detail.js').then((m) => m.UserDetail),
      },
      {
        path: 'platform/audit',
        loadComponent: () => import('./audit/audit-list.js').then((m) => m.AuditList),
      },
    ],
  },
  {
    path: '',
    component: AppShell,
    // tenantGuard alone: its first branch already redirects unauthenticated users to /login, so
    // pairing it with authGuard would be redundant and asymmetric with the platform tree above.
    canActivate: [tenantGuard],
    // Angular reuses this parent route node across sibling-to-sibling navigation within the
    // shell and, by default, skips re-running canActivate when the node itself is reused —
    // 'always' forces the guard to actually run on every navigation, not just first entry.
    runGuardsAndResolvers: 'always',
    children: [
      {
        path: 'billing/invoices',
        loadComponent: () => import('./billing/invoice-list/invoice-list.js').then((m) => m.InvoiceList),
        canActivate: [permissionGuard(Permissions.BILLING_MANAGE)],
      },
      {
        path: 'billing/invoices/:id',
        loadComponent: () => import('./billing/invoice-detail/invoice-detail.js').then((m) => m.InvoiceDetail),
        canActivate: [permissionGuard(Permissions.BILLING_MANAGE)],
      },
      {
        path: 'admin/billing-settings',
        loadComponent: () => import('./billing/billing-settings/billing-settings.js').then((m) => m.BillingSettingsComponent),
        canActivate: [permissionGuard(Permissions.MASTER_DATA_MANAGE)],
      },
      {
        path: 'admin/users',
        loadComponent: () => import('./users/user-list.js').then((m) => m.UserList),
        canActivate: [permissionGuard(Permissions.IDENTITY_ACCOUNTS_MANAGE)],
      },
      {
        path: 'admin/users/:id',
        loadComponent: () => import('./users/user-detail.js').then((m) => m.UserDetail),
        canActivate: [permissionGuard(Permissions.IDENTITY_ACCOUNTS_MANAGE)],
      },
      {
        path: 'admin/master-data',
        loadComponent: () => import('./master-data/master-data-list.js').then((m) => m.MasterDataList),
        canActivate: [permissionGuard(Permissions.MASTER_DATA_MANAGE)],
      },
      {
        path: 'admin/audit',
        loadComponent: () => import('./audit/audit-list.js').then((m) => m.AuditList),
        canActivate: [permissionGuard(Permissions.REPORTING_READ)],
      },
      {
        path: 'clinical/patients',
        loadComponent: () => import('./patients/patient-list.js').then((m) => m.PatientList),
        canActivate: [permissionGuard(Permissions.PATIENTS_READ)],
      },
      {
        path: 'clinical/patients/:id',
        loadComponent: () => import('./patients/patient-detail.js').then((m) => m.PatientDetail),
        canActivate: [permissionGuard(Permissions.PATIENTS_READ)],
      },
      {
        path: 'clinical/triage',
        loadComponent: () => import('./triage/triage-list.js').then((m) => m.TriageList),
        canActivate: [permissionGuard(Permissions.TRIAGE_READ)],
      },
      {
        path: 'clinical/triage/:id',
        loadComponent: () => import('./triage/triage-detail.js').then((m) => m.TriageDetail),
        canActivate: [permissionGuard(Permissions.TRIAGE_READ)],
      },
      {
        path: 'clinical/appointments',
        loadComponent: () => import('./appointments/appointment-list.js').then((m) => m.AppointmentList),
        canActivate: [permissionGuard('appointment.read')],
      },
      {
        path: 'clinical/appointments/:id',
        loadComponent: () => import('./appointments/appointment-detail.js').then((m) => m.AppointmentDetail),
        canActivate: [permissionGuard('appointment.read')],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
