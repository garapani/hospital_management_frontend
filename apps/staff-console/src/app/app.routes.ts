import { Route } from '@angular/router';
import { authGuard, permissionGuard } from '@org/auth';
import { AppShell } from './shell/app-shell.js';
import { Login } from './login/login.js';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'tenants' },
  { path: 'login', component: Login },
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    // Angular reuses this parent route node across sibling-to-sibling navigation within the
    // shell and, by default, skips re-running canActivate when the node itself is reused —
    // 'always' forces authGuard to actually run on every navigation, not just first entry.
    runGuardsAndResolvers: 'always',
    children: [
      {
        path: 'tenants',
        loadComponent: () => import('./tenants/tenant-list/tenant-list.js').then((m) => m.TenantList),
        canActivate: [permissionGuard('system-admin.tenants.manage')],
      },
      {
        path: 'tenants/:id',
        loadComponent: () => import('./tenants/tenant-detail/tenant-detail.js').then((m) => m.TenantDetail),
        canActivate: [permissionGuard('system-admin.tenants.manage')],
      },
      {
        path: 'billing/invoices',
        loadComponent: () => import('./billing/invoice-list/invoice-list.js').then((m) => m.InvoiceList),
        canActivate: [permissionGuard('billing.manage')],
      },
      {
        path: 'billing/invoices/:id',
        loadComponent: () => import('./billing/invoice-detail/invoice-detail.js').then((m) => m.InvoiceDetail),
        canActivate: [permissionGuard('billing.manage')],
      },
      {
        path: 'admin/billing-settings',
        loadComponent: () => import('./billing/billing-settings/billing-settings.js').then((m) => m.BillingSettingsComponent),
        canActivate: [permissionGuard('master-data.manage')],
      },
      {
        path: 'admin/users',
        loadComponent: () => import('./users/user-list.js').then((m) => m.UserList),
        canActivate: [permissionGuard('identity.accounts.manage')],
      },
      {
        path: 'admin/users/:id',
        loadComponent: () => import('./users/user-detail.js').then((m) => m.UserDetail),
        canActivate: [permissionGuard('identity.accounts.manage')],
      },
      {
        path: 'admin/master-data',
        loadComponent: () => import('./master-data/master-data-list.js').then((m) => m.MasterDataList),
        canActivate: [permissionGuard('master-data.manage')],
      },
      {
        path: 'admin/global-catalog',
        loadComponent: () => import('./global-catalog/global-catalog-list.js').then((m) => m.GlobalCatalogList),
        // Backend requires master-data.manage on every /catalogs/departments and /roles route
        // (MasterDataController) — Super Admin holds both permissions (seed-rbac-catalog.ts),
        // so gating on this one matches what the API actually enforces.
        canActivate: [permissionGuard('master-data.manage')],
      },
      {
        path: 'admin/audit',
        loadComponent: () => import('./audit/audit-list.js').then((m) => m.AuditList),
        canActivate: [permissionGuard('reporting.read')],
      },
      {
        path: 'clinical/patients',
        loadComponent: () => import('./patients/patient-list.js').then((m) => m.PatientList),
        canActivate: [permissionGuard('patients.read')],
      },
      {
        path: 'clinical/patients/:id',
        loadComponent: () => import('./patients/patient-detail.js').then((m) => m.PatientDetail),
        canActivate: [permissionGuard('patients.read')],
      },
      {
        path: 'clinical/triage',
        loadComponent: () => import('./triage/triage-list.js').then((m) => m.TriageList),
        canActivate: [permissionGuard('triage.read')],
      },
      {
        path: 'clinical/triage/:id',
        loadComponent: () => import('./triage/triage-detail.js').then((m) => m.TriageDetail),
        canActivate: [permissionGuard('triage.read')],
      },
    ],
  },
];
