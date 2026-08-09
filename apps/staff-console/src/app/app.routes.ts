import { Route } from '@angular/router';
import { authGuard, permissionGuard } from '@org/auth';
import { AppShell } from './shell/app-shell.js';
import { Login } from './login/login.js';
import { InvoiceList } from './billing/invoice-list/invoice-list.js';
import { InvoiceDetail } from './billing/invoice-detail/invoice-detail.js';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'billing/invoices' },
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
        path: 'billing/invoices',
        component: InvoiceList,
        canActivate: [permissionGuard('billing.manage')],
      },
      {
        path: 'billing/invoices/:id',
        component: InvoiceDetail,
        canActivate: [permissionGuard('billing.manage')],
      },
    ],
  },
];
