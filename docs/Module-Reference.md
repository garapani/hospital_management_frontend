# Module Reference — staff-console feature map

The "where is X" quick reference for `apps/staff-console`. Paths are relative to
`apps/staff-console/src/app/` unless prefixed otherwise. Routes were read from `app.routes.ts`;
every endpoint string is quoted verbatim from the feature's `*-api.service.ts`; permission strings
are `Permissions` entries from `@org/auth` (`libs/auth/src/lib/permissions.ts`) or literals in
templates/components and flagged as such. Every fact in this file was verified against source at
writing time (routes from `app.routes.ts`, endpoints read from the service files, component/UI
claims from template/component reads); nothing is left unverified.

**How to use:** start from the route tables to find which component a URL loads, then read that
module's entry for its API service (endpoints), screens, UI patterns, and cross-feature imports.
Cross-cutting conventions (subscribe-with-error, lazy `p-table`, conditional query params,
`paramMap` subscriptions) are distilled in the cheat-sheet at the bottom.

> Last verified against commit `e97df99` (2026-09-02) — the accounting export work (console + API
> service + specs adding report CSV/PDF/XLSX exports), noted below as an "uncommitted"/"working
> tree" addition in earlier drafts of this doc, has since landed at that commit.

---

## Route inventory (from `app.routes.ts`)

**Shell hierarchy:** bare `''` → `rootRedirectGuard`; then two sibling parent shells —
`PlatformShell` (`platformGuard`, `runGuardsAndResolvers: 'always'`) and `AppShell` (`tenantGuard`,
`runGuardsAndResolvers: 'always'`). `login`/`change-password` sit outside both; `**` → `''`.

### Platform console (PlatformShell)

| Route | Component | Leaf guard |
|---|---|---|
| `/platform/dashboard` | `admin-dashboard/admin-dashboard.ts` → `AdminDashboard` | none (parent only) |
| `/platform/tenants` | `tenants/tenant-list/tenant-list.ts` → `TenantList` | none |
| `/platform/tenants/:id` | `tenants/tenant-detail/tenant-detail.ts` → `TenantDetail` | none |
| `/platform/catalog` | `global-catalog/global-catalog-list.ts` → `GlobalCatalogList` | none |
| `/platform/admins`, `/platform/admins/:id` | `users/user-list.ts`, `users/user-detail.ts` *(reused from tenant tree)* | none |
| `/platform/audit` | `audit/audit-list.ts` → `AuditList` *(reused)* | none |

No leaf `permissionGuard` in the platform tree: reaching it requires `platformGuard`, and a Super
Admin holds every permission (`platform-shell.ts` comment — per-entry checks would be noise). The
reused user/audit components need no parameterization: the JWT's tenant scopes `/accounts` and
`/audit`, so under a platform admin they resolve to platform admins / platform audit
(app.routes.ts route comment).

### Tenant console (AppShell)

| Area (nav section) | Route | Component | Leaf guard |
|---|---|---|---|
| Dashboard | `/dashboard` | `dashboard/dashboard-home.ts` → `DashboardHome` | none (shell only) |
| — | `/notifications` | `notifications/notification-list.ts` → `NotificationList` | none (shell only) |
| Invoices | `/billing/invoices`, `/billing/invoices/:id` | `billing/invoice-list/…`, `billing/invoice-detail/…` | `BILLING_READ` |
| Insurance | `/insurance` | `insurance/insurance-dashboard/…` → `InsuranceDashboard` | `INSURANCE_READ` |
| Accounting | `/accounting` | `accounting/accounting-console.ts` → `AccountingConsole` | `ACCOUNTING_READ` |
| Clinical | `/clinical/patients`, `/:id` | `patients/patient-list.ts`, `patients/patient-detail.ts` | `PATIENTS_READ` |
| Clinical | `/clinical/appointments`, `/:id` | `appointments/appointment-list.ts`, `appointment-detail.ts` | `APPOINTMENTS_READ` |
| Clinical | `/clinical/triage`, `/:id` | `triage/triage-list.ts`, `triage/triage-detail.ts` | `TRIAGE_READ` |
| Clinical | `/clinical/vitals` | `vitals/vital-list.ts` → `VitalList` | `VITALS_READ` |
| Clinical | `/clinical/encounters` | `encounters/encounter-list.ts` → `EncounterList` | `ENCOUNTER_READ` |
| Clinical | `/clinical/nursing` | `nursing/nursing-console.ts` → `NursingConsole` | `NURSING_READ` |
| Clinical | `/clinical/ot` | `ot/ot-list.ts` → `OtList` | `OT_READ` |
| Clinical | `/clinical/maternity` | `maternity/maternity-list.ts` → `MaternityList` | `MATERNITY_READ` |
| Clinical | `/clinical/vaccination` | `vaccination/vaccination-list.ts` → `VaccinationList` | `VACCINATION_READ` |
| Clinical | `/clinical/orders`, `/:id` | `orders/order-list.ts`, `orders/order-detail.ts` | `ORDER_READ` |
| Clinical | `/clinical/lab`, `/clinical/lab/:id` | `lab/lab-requisitions-list/…`, `lab/lab-requisition-detail/…` | `LAB_READ` |
| Clinical | `/clinical/lab/catalog` | `lab/lab-tests/lab-tests.ts` → `LabTests` | `LAB_CATALOG_MANAGE` |
| Clinical | `/clinical/radiology`, `/:id` | `radiology/radiology-requisitions-list.ts`, `radiology-requisition-detail.ts` | `RADIOLOGY_READ` |
| Clinical | `/clinical/radiology/catalog` | `radiology/radiology-catalog.ts` → `RadiologyCatalog` | `RADIOLOGY_CATALOG_MANAGE` |
| Clinical | `/clinical/pharmacy`, `/:id` | `pharmacy/pharmacy-dispensing-list.ts`, `pharmacy-dispensing-detail.ts` | `PHARMACY_READ` |
| Operations | `/admissions`, `/admissions/:id` | `admissions/admission-list.ts`, `admission-detail.ts` | `ADMISSION_READ` |
| Operations | `/admissions/ward-board` *(declared before `/:id`)* | `admissions/ward-board.ts` → `WardBoard` | `ADMISSION_READ` |
| Operations | `/inventory`, `/inventory/purchase-orders`, `/inventory/purchase-orders/:id`, `/inventory/requisitions`, `/inventory/requisitions/:id` | `inventory/` subfolders (5 screens) | `INVENTORY_READ` |
| Operations | `/cssd` | `cssd/cssd-console.ts` → `CssdConsole` | `CSSD_READ` |
| Operations | `/ward-supply` | `ward-supply/ward-supply-console.ts` → `WardSupplyConsole` | `WARD_SUPPLY_READ` |
| Operations | `/fixed-assets` | `fixed-assets/fixed-assets-console.ts` → `FixedAssetsConsole` | `FIXED_ASSET_READ` |
| Back Office | `/fraction` | `fraction/fraction-console.ts` → `FractionConsole` | `FRACTION_READ` |
| Back Office | `/helpdesk` | `helpdesk/helpdesk-list.ts` → `HelpdeskList` | `[HELPDESK_READ, HELPDESK_CREATE]` (OR) |
| Back Office | `/helpdesk/:id` | `helpdesk/helpdesk-ticket-detail.ts` | `HELPDESK_READ` |
| Back Office | `/ssu` | `ssu/ssu-list.ts` → `SsuList` | `SSU_READ` |
| HR & Payroll | `/employees` | `employees/employee-list.ts` → `EmployeeList` | `EMPLOYEE_READ` |
| HR & Payroll | `/payroll` | `payroll/payroll-list.ts` → `PayrollList` | `PAYROLL_READ` |
| Administration | `/reporting` | `reporting/reporting-dashboard/…` → `ReportingDashboard` | `REPORTING_READ` |
| Administration | `/admin/users`, `/admin/users/:id` | `users/user-list.ts`, `users/user-detail.ts` | `IDENTITY_ACCOUNTS_MANAGE` |
| Administration | `/admin/master-data` | `master-data/master-data-list.ts` → `MasterDataList` | `MASTER_DATA_MANAGE` |
| Administration | `/admin/billing-settings` | `billing/billing-settings/billing-settings.ts` | `MASTER_DATA_MANAGE` |
| Administration | `/admin/audit` | `audit/audit-list.ts` → `AuditList` | `AUDIT_READ` |
| Auth | `/login`, `/change-password` | `login/login.ts`, `change-password/change-password.ts` | none |

Sidebar nav links come from `shell/app-shell.html` (tenant; grouped under Dashboard / Clinical /
Operations / Back Office / HR & Payroll / Administration) and `shell/platform-shell.html`
(platform), each gated by literal permission strings. Noteworthy asymmetries: the Vitals nav item
checks `vitals.manage` while the route guard is `vitals.read`; Billing Settings nav item sits under
`master-data.manage` (its route guard); the Dashboard nav item shows for
`appointment.read` OR `nursing.read`.

---

## App shell & shared infrastructure

### shell/
Chrome shared by both consoles. `shell-chrome.ts/.html` (`ShellChrome`): sidebar frame + top bar +
mobile drawer, the app-wide global hosts `<p-toast position="top-right">` and `<p-confirmDialog>`
(backed by root-provided `MessageService`/`ConfirmationService` in `app.config.ts`), notifications
bell (unread badge, recent list, Mark-all-read — data from
`notifications/notifications-api.service.ts` `getSummary()`; refetches on open), user menu
(initials from `displayName ?? roles[0]`, every role listed, Change Password modal →
`AuthService.changeOwnPassword` → `POST /accounts/me/password`, Logout → local `AuthService.logout`),
and `<router-outlet>`. Nav links are projected by the wrapping shell via `<ng-container shellNav>`
(so `app-shell.html` / `platform-shell.html` each own their link set). Branding read from
`branding/branding.service.ts` (logo + `displayName() ?? 'Vaidya'`). Both dropdowns close on
outside click/Escape.

### shared/ (utils)
- `date.util.ts` — `todayLocal()`, `toLocalDateString()`, `toLocalDateTimeString()`: local-timezone
  (IST-correct) date helpers; exists because `toISOString().slice(0,10)` is UTC and wrong for
  Indian mornings. Users: appointments, maternity, vaccination, audit, employees.
- `download-blob.util.ts` — `downloadBlob(blob, filename)`: forced download for CSV/XLSX/PDF
  exports. Users: `accounting/accounting-console.ts`, `reporting/reporting-dashboard/…`.
- `pdf-blob.util.ts` — `openPdfBlobInNewTab(blob)`: object-URL + `window.open` for print/view.
  Users: `patients/patient-detail.ts` (ID label), `lab/lab-requisition-detail` (specimen label,
  report), `radiology/radiology-requisition-detail.ts` (requisition label, report),
  `pharmacy/pharmacy-dispensing-detail.ts` (dispensing label), `accounting/accounting-console.ts`
  (PDF report export), `reporting/reporting-dashboard` (events PDF export).

### directory/ (name resolution, not a routed page)
`entity-name.ts` — `<hms-entity-name type id>` inline component: shows the resolved name, else a
mono raw-`id` fallback; re-resolves on id/type change. `directory-resolver.service.ts` —
`resolve(type, id): Observable<string|null>`: **coalesces every same-JS-tick call into one
`POST /directory/resolve`** (`queueMicrotask` flush — one request per `@for` loop) and caches
resolutions per session. `directory-api.service.ts` — the one endpoint:
`POST /directory/resolve` with parallel `DirectoryResolveRequest` arrays; `DirectoryEntityType` =
`patient | doctor | ward | bed | item | orderItem | test | imagingItem | invoice | employee |
department`. Patients additionally carry `patientNo` (`formatName` → "Asha Verma (PAT-2026-00001)").
Consumers app-wide (patients, appointments, billing, payroll, orders, nursing, admissions, ot,
maternity, vaccination, inventory, ward-supply, pharmacy, lab, radiology, ssu, reporting, audit,
admin-dashboard, tenants, dashboard, insurance).

### branding/
Per-tenant white-label, no component/template. `branding-api.service.ts` — public
`GET /branding` (pre-login, resolved from `x-tenant-id`); platform-admin `GET /platform/tenants/
:hospitalId/branding`, `PUT …/branding`, `POST …/branding/logo` (FormData `file`),
`DELETE …/branding/logo`. `branding.service.ts` — signals (`displayName`, `logoUrl`,
`primaryColor`, `tagline`, `description`, `footerText`, `supportText`); `load()` returns
immediately for `PLATFORM_TENANT_ID` (platform never branded) and otherwise is best-effort;
`applyCssVariables()` rewrites the `--p-primary-*` / `--p-highlight-*` CSS vars from
`buildColorRamp(hex)` (`branding.model.ts` — 50–950 tint/shade ramp, no color lib; all-null
`TenantBranding` = "use default Vaidya"). `provide-branding-bootstrap.ts` — app initializer so the
login page never flashes the default brand. Consumers: `login/login.ts`, `change-password`,
`shell/shell-chrome.ts`; platform-admin CRUD consumed by `tenants/tenant-detail/tenant-detail.ts`.

### Root config files
`main.ts` (bootstrapApplication), `app.ts`/`app.html` (`hms-root` + router-outlet),
`app.config.ts` (providers — see Architecture.md), `app.routes.ts` (route tree above),
`root-redirect.guard.ts` (audience-aware landing). Note: the `Permissions` enum is used only in
`app.routes.ts`; screens/templates gate with literal strings (`'billing.manage'`, …
`'rbac.manage'` in global-catalog — the latter is not in the enum).

### login/
`login.ts` (`hms-login`): one screen for both consoles (`consoleLabel`/`consoleScope` from
`TENANT_ID` vs `PLATFORM_TENANT_ID`). `resolveTenantLandingUrl(authService)` — exact-role table
(`ROLE_LANDING_ROUTES`: Hospital Admin → `/admin/users`; Receptionist/Doctor/Nurse → `/dashboard`;
Inventory/Store Manager → `/inventory`; HR/Payroll Admin → `/employees`; Lab/Radiology Technician →
`/clinical/lab`|`/clinical/radiology`; Pharmacist → `/clinical/pharmacy`; Helpdesk Agent →
`/helpdesk`; Auditor/Compliance → `/admin/audit`; Billing/Accounts Staff → `/billing/invoices`)
then a permission-priority fallback (`TENANT_LANDING_CANDIDATES`); `null` → "no accessible screens"
error. Outcome routing per `LoginOutcome`. `mustChangePassword` → navigate `/change-password` with
`{ state: { username } }`. Branded via `BrandingService`.

### change-password/
`change-password.ts` (`hms-change-password`): unauthenticated onboarding for must-change accounts
(login 403 returns no tokens). Username prefilled from `history.state`. Calls
`AuthService.changeInitialPassword` → `POST /auth/change-password`
`{username, currentPassword, newPassword}` (in the interceptor's `AUTH_ENDPOINTS` — no Bearer, no
refresh-on-401). Own `<p-toast>` (screen is outside the shell), min-8 new password, 401 → "Current
password is incorrect". Deps: `@org/auth`, `../branding/branding.service.js`.

### dashboard/
`dashboard-home.ts` (`DashboardHome`, `/dashboard`): role-shaped widget hub — 12 role booleans
(`isReceptionist`, `isDoctor`, `isNurse`, `isPharmacist`, `isLabTechnician`,
`isRadiologyTechnician`, `isBillingStaff`, `isInventoryManager`, `isHrPayrollAdmin`,
`isHelpdeskAgent`, `isAuditor`, `isHospitalAdmin`) from JWT `roles`; each widget loads only for its
role AND a matching permission (constructor-gated), so a multi-role user sees several sections.
Injects 11 domain API services (appointments, nursing, pharmacy, lab, radiology, invoices,
inventory, payroll, helpdesk, audit, users). Widgets: today's appointments (+status counts), my
appointments (doctor), pending nursing tasks, pending dispensing items, pending lab requisitions,
pending radiology scans, unpaid invoices, low stock, draft payslips, open tickets, recent audit
records, and a Hospital Admin cross-domain snapshot (staff/appointments/tickets counts) — each with
independent loading/error signals. Hospital Admin widget added by commit 071fc82.

### notifications/
`notifications-api.service.ts` — `GET /notifications/summary` → `NotificationSummary
{unreadCount, recentNotifications}` (consumed by shell-chrome, not this page);
`PATCH /notifications/:id/read`; `POST /notifications/mark-all-read`;
`GET /notifications` → `{data, meta}` (page/limit). `notification-list.ts` (`NotificationList`,
`/notifications`, no guard): lazy `p-table` (`[lazyLoadOnInit]="false"`, constructor first load),
per-row + Mark-all-read actions (optimistic local update), type tag + Read/Unread tag. No `@org/*`
imports in the component.

---

## Platform console (Super Admin)

### admin-dashboard
Super Admin landing ("System overview and quick insights"): stat cards, **Tenants by Status** bar
chart (chart.js; data computed live from tenant `status`), recent activity (audit), quick-action
links, recent-tenants table. No module-owned service — injects `tenants/tenants-api.service.ts`
(`GET /tenants`), `users/users-api.service.ts` (`GET /accounts` → `{items,total}.total` as platform
accounts), `audit/audit-api.service.ts` (`list(1,5)` → `GET /audit` recent page). Each source loads
and errors independently (deliberately not one `Promise.all`). UI: client-side `p-table`
(`[paginator]="false"`), `p-tag`, `p-chart type="bar"`, `p-progressSpinner`. Header buttons
("Provision Tenant"/"Create Account") are routerLinks to `/platform/tenants` and `/platform/admins`.
No permission gating. Deps: tenants/users/audit services, `directory/entity-name.js`.

### tenants
Platform tenant lifecycle. `tenants-api.service.ts`: `POST /tenants` (provision; returns tenant +
one-time bootstrap Hospital Admin credentials); `GET /packages`; `PATCH /tenants/:hospitalId/
package` `{packageCode}`; `GET /tenants` (unpaginated); `GET /tenants/:id`;
`PATCH /tenants/:id/suspend|reactivate|archive|restore`; `PATCH /tenants/:id/purge`
`{confirmHospitalId}` → `{purged}`; `GET /tenants/:id/roles`; `PATCH /tenants/:id/roles`
`{roleIds}` (409 → `blocked: BlockedRole[]` warn); audit history `GET /audit` with `{tableName:
'tenants', recordId, startDate, endDate, page, limit}` (wide range — audit search defaults to a
24 h window). `subscriptions-api.service.ts` (platform SaaS billing): `GET /platform/billing/
tenants/:hospitalId/subscription` (→ `Subscription | null`); `POST …/subscribe` `{billingCycle}`;
`POST …/cancel`; `POST …/invoices` (409 if open); `GET …/invoices`;
`POST /platform/billing/invoices/:invoiceId/paid`.
Components: `tenant-list/tenant-list.ts` (`TenantList` — list + provision dialog with package
select; roles chosen by the package, not at provision) and `tenant-detail/tenant-detail.ts`
(`TenantDetail` — **one scrolling page of stacked panels, not tabs**: role toggles with
package/manual annotation, package change, subscription/billing, branding, audit history;
`ngOnInit` subscribes `route.paramMap` and re-syncs drafts per id). Asymmetric destructive UX:
suspend/archive/purge confirm (purge = typed confirmation, disabled until the typed id matches);
reactivate/restore single-click. Deps: `audit/audit.model.js` (types), `branding/*`,
`directory/entity-name.js`, `@org/api-client` — **no `users/` imports** (tenant detail never lists
platform admins).

### global-catalog
Platform catalogs tenants select from — **Departments** (code/name/appointments-applicable/active)
and **Roles** (name/description/priority/cross-tenant/active). No own service: reuses
`master-data/master-data-api.service.ts` — `GET|POST /catalogs/departments`,
`PATCH /catalogs/departments/:id` (+ `/deactivate`, `/reactivate`), `GET|POST /roles`,
`PATCH /roles/:id` (+ `/deactivate`, `/reactivate`). Single `global-catalog-list.ts`: `<p-tabs>`
("Global Departments"/"Global Roles"), two client-side tables, 4 dialogs (add/edit per catalog),
`p-checkbox`, `p-tag`; create 409 → inline already-exists errors; deactivation via
`ConfirmationService.confirm` (reactivation immediate); single in-flight toggle guard. Dept code
and role name immutable on edit ("renaming would break tenant role mappings"). Gating:
`canManage = hasPermission('rbac.manage')` (raw literal — not in the `Permissions` enum); hides
Add buttons, Actions columns and edit controls for non-managers.

---

## Finance & Revenue

### billing
Invoice list + detail + org settings. Files: `billing/invoices-api.service.ts`,
`billing/billing-settings/billing-settings-api.service.ts`, `invoice-list/`, `invoice-detail/`,
`billing-settings/`, `billing/invoice.model.ts` (`statusSeverity`, `invoiceReference`
`INV-<date>-<5-digit seq>`, `outstandingBalance`, `PAYMENT_MODES` incl. Deposit).
Endpoints (`InvoicesApiService`): `GET /billing/invoices` (conditional `patientId/page/limit`);
`GET /billing/invoices/:id` → `InvoiceWithReturns`; `POST /billing/invoices/:id/payments`;
`PATCH /billing/invoices/:id/cancel`; `POST /billing/invoices/:id/returns`.
`BillingSettingsApiService`: `GET /billing/settings` (→ `BillingSettings | null`),
`PATCH /billing/settings`.
- `invoice-list.ts` (`InvoiceList`): lazy `p-table` (`[lazyLoadOnInit]="false"`, first load in
  **constructor**), remote debounced patient-search filter via `PatientsApiService.search`
  (min 2 chars) + Apply.
- `invoice-detail.ts` (`InvoiceDetail`): totals/outstanding grid + details + returns; Record
  Payment / Record Return / Cancel dialogs gated by `billing.manage` + computed
  `canRecordPayment/canReturn/canCancel`; subscribes `route.paramMap` (`switchMap` +
  `takeUntilDestroyed`); guarded refresh drops late responses when the id changed.
- `billing-settings.ts`: three `pInputText` fields — Hospital Legal Name, GSTIN, State Code; Save
  disabled until all present; no local toast (uses shell global).
No blob exports in billing. Deps: `directory/entity-name.js`, `patients/patients-api.service.js`.

### accounting
Chart of accounts + journal entries + financial reports in one three-tab console
(`accounting/accounting-console.ts`; tabs via `<p-tabs>`; reports further selected by
`reportKindOptions` `p-select`: Trial Balance / Income Statement / Balance Sheet).
`accounting-api.service.ts`:
- Accounts: `GET /accounting/accounts`; `POST /accounting/accounts`;
  `PATCH /accounting/accounts/:id`; `PATCH …/:id/deactivate`; `PATCH …/:id/reactivate`.
- Journals: `GET /accounting/journals` (status/from/to/page/limit); `GET /accounting/journals/:id`;
  `POST /accounting/journals`; `POST /accounting/journals/:id/post`.
- Reports: `GET /accounting/reports/trial-balance` (`from`,`to`);
  `GET /accounting/reports/income-statement`; `GET /accounting/reports/balance-sheet` (`asOf`);
  exports via `getBlob` — `GET …/trial-balance|income-statement|balance-sheet/export.csv|.pdf|.xlsx`
  (commit `e97df99`).
UI: journals `p-table` lazy (`[lazyLoadOnInit]="false"`), accounts + report tables non-lazy;
dialogs for account/journal; confirmations through the shell-global `ConfirmationService`;
client-side balanced-journal validation (integer-paise compare — `toPaise()`); local date math
avoids `toISOString()` (IST); exports → `downloadBlob` (CSV/XLSX) + `openPdfBlobInNewTab` (PDF).
Gating: `accounting.manage` (add/deactivate/post; "View only" otherwise). Deps: `@org/auth`,
`shared/pdf-blob.util.js`, `shared/download-blob.util.js`.

### insurance
Payer/policy/claim workflow on one tabbed dashboard (`insurance/insurance-dashboard/
insurance-dashboard.ts`; `<p-tabs>` Payers/Policies/Claims, `activeTab` signal).
`insurance-api.service.ts`:
- Payers: `GET /insurance/payers`; `POST /insurance/payers`; `PATCH /insurance/payers/:id`;
  `PATCH …/:id/deactivate`; `PATCH …/:id/reactivate`.
- Policies: `GET /insurance/policies` (patientId/page/limit); `POST /insurance/policies`;
  `PATCH /insurance/policies/:id/deactivate|reactivate`;
  `GET /insurance/policies/:policyId/coverage` (`{date}` optional).
- Claims: `GET /insurance/claims` (patientId/status/page/limit); `POST /insurance/claims`;
  `POST /insurance/claims/:id/submit`; `POST …/approve` `{amountApproved}`;
  `POST …/reject` `{remarks}`; `POST …/pay`.
Policies + Claims tables lazy (`[lazyLoadOnInit]="false"`); whole body inside
`@if (hasPermission('insurance.read'))`; create/edit/transition buttons gated `insurance.manage`;
status-conditional row actions (Draft→Submit, Submitted→Approve/Reject, Approved→Mark Paid);
approve modal caps amount at `amountClaimed`; coverage check modal with Eligible/Not-Eligible tag;
7 dialogs; `p-message` inline errors. Form modals take raw patient/policy/invoice IDs as free text
(no search pickers). Model severity helpers `claimStatusSeverity`/`payerTypeSeverity`.
Deps: `directory/entity-name.js`, `@org/auth`.

### payroll
Monthly payslip generation. `payroll/payroll-api.service.ts` (whole file):
`POST /payroll/run` `{month, year, allowancePercent?, deductionPercent?, notes?}` → `{count}`;
`GET /payroll/payslips` (page/limit; `month/year/status` appended only `!== undefined` — the file's
comment documents the `"undefined"` stringification bug this avoids);
`POST /payroll/payslips/:id/paid`. `payroll-list.ts`: lazy `p-table`
(`[lazyLoadOnInit]="false"`, constructor load), Run Monthly Payroll dialog, month/year filters,
per-row Mark Paid on Draft slips only; `canManage = hasPermission('payroll.manage')` (computed in
constructor); self-provides `MessageService`/`ConfirmationService` + local `<p-toast>`/
`<p-confirmDialog>` (one of the few screens that does). No payslip detail/print view. Deps:
`directory/entity-name.js` (`type="employee"`), `@org/auth`.

---

## Clinical — Front desk & ambulatory

### patients
Patient Master Index + full patient chart. `patients-api.service.ts` (complete):
`GET /patients` (named `search`; `page/limit` + conditional `q/phoneNumber/patientNo`) →
`PaginatedResponse<Patient>`; `GET /patients/:id`; `POST /patients` (`CreatePatientDto` has
`allowDuplicate?: boolean`); `PATCH /patients/:id`; `POST /patients/check-duplicates` →
`Patient[]`; `getBlob GET /patients/:id/id-label.pdf` (`getIdLabelPdf`).
- `patient-list.ts` (`PatientList`): lazy `p-table` (`[lazyLoadOnInit]="false"`; **first load in
  `ngOnInit`, not the constructor** — the exception to the convention); single free-text `q` search;
  Register Patient dialog (demographics + optional insurance provider/policy + govt ID) gated
  `patients.create`; duplicate-check flow — submit first POSTs `/patients/check-duplicates`; on
  matches an amber "Possible Duplicate Found" panel lists them (View Profile links) with "Register
  as New Patient Anyway" (re-submits with `allowDuplicate: true`); a failed check warns and
  proceeds.
- `patient-detail.ts` (`PatientDetail`): demographics + tabbed chart (`<p-tabs>`: Appointments,
  Admissions, Vitals, Notes, Diagnoses, Prescriptions, Billing & Orders); subscribes
  `route.paramMap`; each tab loads its downstream service gated by the matching permission
  (`vitals.read`, `encounter.read`, `appointment.read`, `admission.read`, `order.read`,
  `billing.manage`), 200 rows each then pages client-side; Print ID Label →
  `openPdfBlobInNewTab`; Book Appointment → `/clinical/appointments?patientId=…&firstName=…`;
  Sign & Lock a note → `updateNote(id, {status:'Signed'})`.
Deps (patient-detail): vitals/encounters/appointments/admissions/orders/billing services + models,
`shared/pdf-blob.util.js`. Widely imported by other modules as the patient-search source.

### appointments
OPD appointment scheduling; registers brand-new patients on the fly. `appointments-api.service.ts`
(complete): `POST /appointments`; `GET /appointments` (conditional `date/doctorId/departmentId/
patientId/status/page/limit`); `GET /appointments/:id`; `PUT /appointments/:id` (update);
`POST /appointments/:id/cancel` `{cancelledRemarks}`; `POST …/check-in`; `POST …/complete`;
`POST …/no-show`. Model: `APPOINTMENT_STATUSES` (Scheduled/CheckedIn/Completed/NoShow/Cancelled),
`APPOINTMENT_TYPES`, `appointmentStatusSeverity`, `appointmentDisplayName`.
- `appointment-list.ts`: lazy `p-table` (constructor first load), date default = `todayLocal()`;
  filters status/doctor/department/patient; New Appointment modal with Existing/New patient
  `p-selectButton` toggle; New-Patient mode duplicates-checks then creates (`allowDuplicate`); row
  status actions (Check-in/Complete/No-show/Cancel) gated `appointment.manage`; subscribes
  `queryParamMap` — the patient-detail "Book Appointment" deep link pre-fills + auto-opens the
  modal. Deps: `users` (`listDirectory('Doctor')`), `master-data` (departments filtered on
  `isAppointmentApplicable`), `patients`, `shared/date.util.js`.
- `appointment-detail.ts`: `paramMap`-driven; edit type/reason; cancel-with-remarks dialog;
  `directory/entity-name.js` for doctor/department names; 404 → notFound.

### triage
ER intake queue. `triage-api.service.ts` (complete): `POST /triage/entries`; `GET /triage/entries`
(paginated — the active queue); `GET /triage/entries/:id`; `PATCH /triage/entries/:id`;
`PATCH /triage/entries/:id/link-patient` `{patientId}`. Model: `ARRIVAL_MODES`
(Walk-in/Ambulance/Police/Referred), `COLOR_CODES` (Red/Orange/Yellow/Green/Blue),
`TRIAGE_STATUSES` (Arrived/Triaged/In Treatment/Discharged/Admitted/Deceased),
`colorCodeSeverity`. `triage-list.ts` lazy `p-table` (constructor load) + New Entry dialog;
`triage-detail.ts` assessment form (acuity/color code/status/discharge remarks) — links a patient
by **raw UUID typed into a text input** (no picker); `saveAssessment` only sends
`triagedBy/triagedAt` on first triage so later edits don't clobber door-to-triage timestamps.
Deps: `@org/auth`, `@org/api-client` only — no cross-feature imports.

### vitals
Patient-scoped vitals ("BP, pulse, temperature, SpO₂, and more"). `vitals-api.service.ts`
(complete): `GET /vitals/patient/:patientId` (unpaginated array); `POST /vitals`;
`PATCH /vitals/:id`; `DELETE /vitals/:id` (`voidVital`). `vital-list.ts`: search-first screen
(no list-all endpoint), readings table + Record Vitals dialog + Void (confirm) — tables are
client-side, **not lazy**; `canManage = hasPermission('vitals.manage')` captured once as a class
field; `MessageService`/`ConfirmationService` render via the shell's global hosts. Deps:
`patients` (search), `@org/auth`. patient-detail's Vitals tab reuses this service (height/weight
carry-forward only — comments warn the old behavior produced fabricated vitals).

### encounters
Per-patient clinical workspace. `encounters-api.service.ts` (complete — 9 methods, no encounter-list
endpoint): notes `POST /encounters/notes`, `PATCH /encounters/notes/:id` (edit drafts; sign via
`{status:'Signed'}` — backend rejects further edits to signed notes),
`GET /encounters/notes/patient/:patientId`; diagnoses `POST /encounters/diagnoses`,
`DELETE /encounters/diagnoses/:id`, `GET /encounters/diagnoses/patient/:patientId`;
prescriptions `POST /encounters/prescriptions`, `DELETE /encounters/prescriptions/:id`,
`GET /encounters/prescriptions/patient/:patientId` (list endpoints paginated with `limit?`).
`encounter-list.ts`: search-first; `<p-tabs>` Notes (card list) / Diagnoses (table) / Prescriptions
(table); add/edit/sign/delete gated `encounter.manage`; sign & delete via `ConfirmationService`
(shell host); all three tabs reload after each mutation; `doctorId` from `currentUser().sub`.
Deps: `patients`, `@org/auth`.

---

## Clinical — Inpatient & care

### admissions
Inpatient ADT ("Admit, transfer and discharge inpatients"). `admissions-api.service.ts` (complete,
9 methods): `POST /admissions`; `GET /admissions` (wardId/patientId/status/page/limit);
`GET /admissions/active` (unpaginated, optional wardId); `GET /admissions/:id`;
`PATCH /admissions/:id/transfer`; `PATCH /admissions/:id/discharge`;
`POST /admissions/discharge-summaries`; `GET /admissions/discharge-summaries/by-admission/
:admissionId`; `PATCH /admissions/discharge-summaries/:id/review` `{reviewedBy}`.
- `admission-list.ts`: lazy table + **All/Active `p-selectbutton` toggle** (the only module using
  it); Active view fetches the full `/admissions/active` array and pages by client-side slice; New
  Admission dialog (server patient search, source, doctor, ward→available-bed cascade).
- `admission-detail.ts`: transfer / discharge / discharge-summary create+review modals; subscribes
  `route.paramMap`; 404 → notFound. Gating: `admission.manage`; deep link "Nursing Tasks / MAR" →
  `/clinical/nursing?admissionId=` (gated `nursing.read`).
- `ward-board.ts`: per-ward bed-occupancy card grid (no p-table); **no auto-refresh** despite
  "Live bed occupancy" — reloads on ward select; defaults to the viewer's ward
  (`currentUser().wardId`) else first active ward.
`admission.model.ts`: `admissionStatusSeverity`, `admissionSourceSeverity`, `summaryReviewSeverity`,
`bedStatusSeverity`, `ADMISSION_STATUSES`/`ADMISSION_SOURCES`. Deps: `directory`, `patients`,
`users` (Doctor directory), `master-data` (wards/beds).

### nursing
Nursing console (`nursing-console.ts`): Tasks / Medication Administration (MAR) / Shift Handoff
tabs (`<p-tabs>`). `nursing-api.service.ts` (complete, 12 methods): tasks
`GET /nursing/tasks` (admissionId/page/limit), `POST /nursing/tasks`,
`POST /nursing/tasks/:id/start|complete|cancel`; administrations `GET /nursing/administrations`,
`POST /nursing/administrations`, `POST /nursing/administrations/:id/administer`,
`POST …/:id/skip` `{notes}`; handoff `GET /nursing/handoff-notes`, `POST /nursing/handoff-notes`,
`POST /nursing/handoff-notes/:id/acknowledge`. Tasks + MAR tables lazy
(`[lazyLoadOnInit]="false"`); handoff = note-card list + standalone `<p-paginator>`; constructor
subscribes `queryParamMap` for the `?admissionId=` deep link (filters all lists + seeds the picker
+ first load); patient picker resolves the single active admission via admissions-api; gating
`nursing.manage` + per-status rules (Start on Pending, Administer/Skip on Scheduled, Acknowledge on
unacknowledged); toasts/confirms via shell hosts. `nursing.model.ts`: NursingTask
(Pending/InProgress/Completed/Cancelled), MedicationAdministration
(Scheduled/Administered/Skipped), ShiftHandoffNote (Day/Evening/Night). Deps: `patients`,
`admissions`, `directory`.

### orders
Patient-scoped order worklist. `orders-api.service.ts` (complete, 5 methods): `POST /orders`;
`GET /orders` (**patientId required** + page/limit); `GET /orders/:id` → `OrderWithItems`;
`PATCH /orders/:orderId/items/:itemId/complete`; `PATCH …/:itemId/cancel` `{cancelReason}`.
- `order-list.ts`: lazy table rendered only when `canSearchPatients` (`patients.read` — a
  Pharmacist has order.read but not patients.read); New Order dialog (multi-line items with
  itemType/description/priority); subscribes `queryParamMap` — `?patientId=` deep link seeds the
  picker and **auto-opens** the modal; no unconditional first load (table waits for a patient).
- `order-detail.ts`: subscribes `route.paramMap`; per-item Complete/Cancel (gated `order.manage`)
  and **Create Lab Requisition / Create Radiology Requisition** dialogs — the only creation path
  for lab/radiology requisitions, gated `lab.requisition.create` / `radiology.requisition.create`
  on Pending items; **self-provides** `MessageService`/`ConfirmationService` (component-scoped
  toast/confirm hosts that shadow the shell's); lab cascade category→test (specimenType prefilled),
  radiology type→item.
`order.model.ts`: `orderItemStatusSeverity/orderItemTypeSeverity/orderPrioritySeverity` +
ORDER_ITEM_TYPES/PRIORITIES/STATUSES. Deps: `directory`, `patients`, `lab`, `radiology`.

### ot
OT surgery scheduling. `ot-api.service.ts` (complete, 6 methods): `GET /ot/surgeries`
(status/patientId/page/limit); `GET /ot/surgeries/:id`; `POST /ot/surgeries`;
`POST /ot/surgeries/:id/start|complete|cancel`. `ot-list.ts`: lazy table
(`[lazyLoadOnInit]="false"`), Schedule Surgery dialog, **surgery detail opens in a dialog** (no
`:id` route); concurrency-safe `loadTrigger → switchMap` pipeline — a newer page cancels the
in-flight request and `firstRecord` updates only when the winning response lands; Start/Cancel on
Scheduled, Complete on InProgress, gated `ot.manage`. Deps: `directory`, `patients`.
`ot.model.ts`: Scheduled/InProgress/Completed/Cancelled + surgeryNumber/surgeonId/
anesthesiologistId.

### maternity
Antenatal records + delivery outcomes. `maternity-api.service.ts` (complete, 4 methods):
`GET /maternity/records` (patientId/admissionId/page/limit); `GET /maternity/records/:id`
(defined, not called by the UI); `POST /maternity/records`; `POST /maternity/records/:id/delivery`.
`maternity-list.ts`: lazy table + New Record + Record Delivery dialogs; Record Delivery is
irreversible (confirm warning, needs date + babyCount ≥ 1); create resolves the patient's single
active admission automatically and requires `admissionId`; `edd: form.edd || undefined` (backend
rejects `''`); delivery-date default seeded with `todayLocal()`; gated `maternity.manage`.
`maternity.model.ts` DELIVERY_TYPES = Normal/C-Section/Instrumental. Deps: `patients`,
`admissions`, `directory`, `shared/date.util.js`.

### vaccination
Vaccination log (append-only). `vaccination-api.service.ts` (complete, 2 methods):
`GET /vaccination/records` (patientId/vaccine/page/limit); `POST /vaccination/records`.
`vaccination-list.ts`: lazy table + Record Vaccination dialog (patient search, vaccine, dose,
administered date defaulted to `todayLocal()`); only button gated `vaccination.manage`; no status
field, no `p-tag`. Deps: `patients`, `directory`, `shared/date.util.js`.

### cssd
Sterile instrument catalog + sterilization cycles console (two tabs). `cssd-api.service.ts`
(complete, 9 methods): instruments `GET /cssd/instruments` (**not paginated**), `POST
/cssd/instruments`, `PATCH /cssd/instruments/:id` (service-only — no edit UI),
`PATCH …/:id/deactivate|reactivate`; cycles `GET /cssd/cycles` (instrumentId/status/page/limit),
`POST /cssd/cycles`, `POST /cssd/cycles/:id/complete` `{sterileHours}` (default 48),
`POST …/:id/fail` `{failureReason}`. `cssd-console.ts`: Instruments table non-lazy, Cycles lazy
(`[lazyLoadOnInit]="false"`); 4 dialogs; instrument options from the in-memory active catalog
("code — name", no EntityName — module is otherwise self-contained); gated `cssd.manage`;
deactivate requires confirm. `cssd.model.ts`: SterilizationMethod Steam/ETO/Chemical, cycle
statuses InProgress/Completed/Failed.

---

## Diagnostics & Pharmacy

### lab
Lab requisition workflow (Pending → SampleCollected → ResultsEntered → Verified, + Cancelled) and
browse-only test catalog. `lab-api.service.ts` (complete): `GET /lab/requisitions`
(orderItemId/status/page/limit); `GET /lab/requisitions/:id`;
`getBlob GET /lab/requisitions/:id/specimen-label.pdf`; `getBlob GET …/:id/report.pdf`;
`POST /lab/requisitions` (created from `orders/order-detail.ts`, not lab screens);
`PATCH /lab/requisitions/:id/collect-sample` (empty body — actor server-side);
`POST /lab/requisitions/:id/results` `{componentId, value, isAbnormal?}`;
`GET /lab/requisitions/:id/results`; `PATCH /lab/requisitions/:id/verify` (empty body);
`PATCH …/:id/cancel` (service exists, **no UI caller**); catalog `GET /lab/categories`,
`GET /lab/categories/:categoryId/tests`, `GET /lab/tests/:testId/components`.
- `lab-requisitions-list.ts`: lazy table (default filter Pending) + Order Item ID / status filters.
- `lab-requisition-detail.ts`: `paramMap`; Collect Sample / Enter Results (dialog; per-component
  POSTs via `concatMap`; live out-of-range warning `computeIsAbnormal`; numeric input only when
  both reference bounds exist; range formatted by `componentReferenceRange`) / Verify
  (confirmDialog — "locks these results permanently"); Print Specimen Label (≠ Cancelled) and View
  Report (Verified) → `openPdfBlobInNewTab`.
- `lab-tests.ts`: catalog browse — categories as `<p-tabs>`, non-lazy test table (name/code/
  specimen/price); **no create/edit UI and no component display**.
Gates: `lab.catalog.manage` (catalog link), `lab.result.enter`, `lab.result.verify`.
`lab.model.ts` LAB_REQUISITION_STATUSES + severity map. Deps: `directory`,
`shared/pdf-blob.util.js`.

### radiology
Imaging requisition workflow (Pending → Scanned → ReportEntered → Verified, + Cancelled) +
browse-only catalog. `radiology-api.service.ts` (complete): `GET /radiology/requisitions`
(orderItemId/status/imagingItemId/page/limit); `GET /radiology/requisitions/:id`;
`getBlob …/requisition-label.pdf`; `getBlob …/report.pdf`; `POST /radiology/requisitions`
(created from orders detail); `PATCH …/:id/mark-scanned` (empty body — actor server-side);
`POST …/:id/report` `{reportText, indication?, reportEnteredBy?}` (reportEnteredBy = JWT sub);
`PATCH …/:id/verify` (empty body); `PATCH …/:id/cancel` `{cancelReason}`; `GET /radiology/types`;
`GET /radiology/types/:imagingTypeId/items`.
- `radiology-requisitions-list.ts`: lazy table; subscribes `queryParamMap` (`?orderItemId=` change
  re-fetches under reuse); status / order-item / imaging-item filters.
- `radiology-requisition-detail.ts`: `paramMap`; Mark Scanned / Enter or Edit Report (dialog,
  reportText required) / Verify (confirmDialog) / Cancel (dialog + reason, non-terminal statuses
  only); Print Requisition Label + View Report → `openPdfBlobInNewTab`.
- `radiology-catalog.ts`: read-only imaging-type `p-select` → item table (name/procedureCode/
  displaySequence/price INR); request-token guard against stale responses.
Gates: `radiology.report.enter`, `radiology.report.verify`, `radiology.requisition.create`
(cancel — gated by the *create* permission), `radiology.catalog.manage` (catalog link); catalog
body wrapped in `hasPermission('radiology.read')`. `radiology.model.ts` RADIOLOGY_STATUSES +
NON_TERMINAL_RADIOLOGY_STATUSES. Deps: `directory`, `shared/pdf-blob.util.js`.

### pharmacy
Pharmacy dispensing. `pharmacy-dispensing-api.service.ts` (complete): `GET /pharmacy/dispensings`
(orderItemId/status/page/limit); `GET /pharmacy/dispensings/pending-items` (pharmacist worklist —
pharmacists lack patient search, per model comment); `GET /pharmacy/dispensings/:id`;
`getBlob …/:id/dispensing-label.pdf`; `POST /pharmacy/dispensings`
`{orderItemId, inventoryItemId, quantity}`; `PATCH …/:id/dispense` (empty body — stock decremented,
confirm warns "cannot be undone… use Reverse afterwards"); `PATCH …/:id/cancel`
`{cancelReason?}` (Pending only); `PATCH …/:id/reverse` `{reversalReason}` (Dispensed only, reason
required).
- `pharmacy-dispensing-list.ts`: lazy table + New Dispensing dialog — order-item picker from the
  pending-items worklist (patient names via DirectoryResolver), inventory cascade
  Category → Sub-category → Item (`switchMap`-cancelled); gated `pharmacy.dispensing.create`.
- `pharmacy-dispensing-detail.ts`: `paramMap`; Dispense / Cancel / Reverse; Print Dispensing Label
  → `openPdfBlobInNewTab`; gates `pharmacy.dispensing.create` (cancel) +
  `pharmacy.dispensing.dispense` (dispense/reverse).
Status model: Pending/Dispensed/Cancelled/Reversed; `quantity` serialized as string by TypeORM.
Deps: `inventory`, `directory` (resolver + entity-name), `shared/pdf-blob.util.js`.

---

## Operations

### inventory
Catalog + purchase orders + stock requisitions (5 screens under subfolders). `inventory-api.service.ts`
(lines 1–203 are interfaces only — methods start at 209):
- Catalog: `GET /inventory/categories`; `POST /inventory/categories`; `GET /inventory/categories/
  :categoryId/sub-categories`; `POST /inventory/sub-categories`; `GET /inventory/sub-categories/
  :subCategoryId/items` (the item-list source — per sub-category, no other filters);
  `POST /inventory/items`; `GET /inventory/vendors`; `POST /inventory/vendors`;
  `GET /inventory/purchase-orders/stock-balances/low-stock` (only stock/balance endpoint).
- Purchase orders: `GET /inventory/purchase-orders` (vendorId/page/limit); `GET
  /inventory/purchase-orders/:id`; `POST /inventory/purchase-orders`;
  `PATCH …/:id/cancel` `{cancelReason}`; `POST /inventory/purchase-orders/items/
  :purchaseOrderItemId/goods-receipt` (quantity/batch/expiry/unit-cost).
- Requisitions: `POST /inventory/requisitions`; `PATCH /inventory/requisitions/:id/cancel`;
  `GET /inventory/requisitions` (departmentId/page/limit); `GET /inventory/requisitions/:id`;
  `POST /inventory/requisitions/items/:stockRequisitionItemId/fulfill` `{quantity}`.
File-header note: numeric columns (reorderLevel, orderedQuantity…) serialize from Postgres as
strings and are copied as-is; `inventory.model.ts` has `requisitionLineRemaining` coercing qty.
- `inventory-item-list/inventory-item-list.ts`: catalog browser — cascading category→sub-category
  selects; Add Category/Sub-category/Item dialogs; **low-stock amber banner** (top 5, "+N more",
  best-effort); non-lazy table; gates `inventory.catalog.manage`.
- `purchase-order-list/purchase-order-list.ts`: **lazy** PO table that **requires a vendor filter**
  (backend 400s without it; first load is user-driven `onVendorFilterChange`, not constructor);
  multi-line New PO dialog; Add Vendor dialog; gates `inventory.purchase-order.create`.
- `purchase-order-detail/purchase-order-detail.ts`: header/status + lines; Cancel Order + per-line
  Record Goods Receipt dialogs; subscribes `route.paramMap` (`takeUntilDestroyed`); gates
  `inventory.purchase-order.create` (cancel) + `inventory.goods-receipt.enter` (receive).
- `stock-requisition-list/stock-requisition-list.ts`: lazy table requiring a department filter;
  multi-line New Requisition; gates `inventory.requisition.create`.
- `stock-requisition-detail/stock-requisition-detail.ts`: lines with remaining-qty math; per-line
  Fulfill dialog (max = remaining) + Cancel; `paramMap`; gates `inventory.requisition.create`
  (cancel) + `inventory.dispatch.fulfill` (fulfill).
Cascading category→sub-category loads app-wide use `Subject` + `switchMap` + `catchError(→EMPTY)`
+ `takeUntilDestroyed` so stale responses can't overwrite newer picks. Deps: `master-data`
(departments), `directory/entity-name.js` (item names).

### ward-supply
Department ("ward") sub-store console. `ward-supply-api.service.ts` (complete):
`GET /ward-supply/stock` (optional departmentId); `GET /ward-supply/transactions`
(departmentId/itemId/transactionType/page/limit); `POST /ward-supply/stock/receive`;
`POST /ward-supply/stock/consume`. `ward-supply-console.ts`: `<p-tabs>` Stock Balances |
Transactions; balances table non-lazy, transactions lazy (`[lazyLoadOnInit]="false"`, constructor
first load); Receive/Consume dialogs sharing one category→sub-category→item cascade (imported from
**`inventory/inventory-api.service.ts`** — cross-module reuse); Receive optional
batchNumber/expiryDate; Consume optional patientId; gated `ward-supply.manage`; toasts via shell.
Deps: `inventory`, `master-data` (Department), `directory/entity-name.js`.
`ward-supply.model.ts`: transaction type 'Receive' | 'Consume'.

### fixed-assets
Fixed-asset register + straight-line depreciation valuation. `fixed-assets-api.service.ts`
(complete): categories `GET /fixed-assets/categories`, `POST /fixed-assets/categories` `{name}`,
`PATCH /fixed-assets/categories/:id/deactivate|reactivate`; assets `GET /fixed-assets`
(categoryId/condition/page/limit), `POST /fixed-assets`,
`GET /fixed-assets/:id/valuation`, `PATCH /fixed-assets/:id/deactivate|reactivate`.
`fixed-assets-console.ts`: `<p-tabs>` Assets | Categories; assets lazy (`[lazyLoadOnInit]="false"`,
constructor first load), categories non-lazy; Register Asset + Valuation dialogs; valuation shows
purchaseCost/salvageValue/usefulLifeYears/monthsInService/annual+accumulated depreciation/bookValue
(INR); deactivate/reactivate via ConfirmationService (confirm on active, immediate on inactive);
gated `fixed-asset.manage`; Valuation ungated. Self-contained (no feature imports).

### fraction
Doctor revenue-share rules + recorded shares. `fraction-api.service.ts` (complete):
`GET /fraction/rules` (optional doctorId); `POST /fraction/rules`;
`PATCH /fraction/rules/:id/deactivate|reactivate`; `GET /fraction/entries` (optional invoiceId);
`POST /fraction/entries`. `fraction-console.ts`: `<p-tabs>` Rules | Recorded Shares; **both tables
non-lazy** (full result sets loaded in the constructor; pagination meta discarded — no
`lazyLoadOnInit` anywhere); New Rule / Record Share dialogs; rule toggle fires immediately with no
ConfirmationService; gating verified at `fraction-console.ts` line ~33:
`canManage = hasPermission('fraction.manage')` with the explicit comment that a doctor holding only
`fraction.read` must not see mutating controls (commit d5ce456); "View only" span otherwise. New
Rule: doctorId required, departmentId optional (null = "All"), fractionPercent 0–100. Deps:
`directory/entity-name.js`.

---

## Support & Back office

### helpdesk
Internal support tickets. `helpdesk-api.service.ts` (complete): `GET /helpdesk/tickets`
(status/priority/q/page/limit); `GET /helpdesk/tickets/:id`; `POST /helpdesk/tickets`; `POST
/helpdesk/tickets/:id/assign` `{assigneeAccountId}`; `POST …/:id/start`; `POST …/:id/resolve`;
`POST …/:id/close`. Status enum value `'InProgress'` (label "In Progress").
- `helpdesk-list.ts`: lazy table; constructor first load **gated `if (this.canRead)`** — a
  create-only role sees the New Ticket button + an explanatory panel and never hits the 403-prone
  GET; separate gates `helpdesk.read` (list/search) vs `helpdesk.create` (New Ticket; the Helpdesk
  Agent role holds read/manage but not create); row lifecycle buttons (Start on Open / Resolve on
  InProgress / Close on Resolved) are **not** permission-gated in the list.
- `helpdesk-ticket-detail.ts`: `paramMap`; Assign (directory picker restricted to
  `ASSIGNABLE_ROLES = ['Helpdesk Agent','Hospital Admin','Super Admin']` — three
  `/accounts/directory` lookups merged with forkJoin + dedupe); Start/Resolve/Close gated
  `helpdesk.manage`; **self-hosts `<p-toast>`** with component-provided `MessageService`.
Deps: `users` (directory), `@org/auth`.

### ssu
Social Service Unit — subsidy/charity-care cases. `ssu-api.service.ts` (complete):
`GET /ssu/cases` (patientId/status/page/limit); `GET /ssu/cases/:id` (defined, **never called** —
no detail component); `POST /ssu/cases`; `POST /ssu/cases/:id/approve` `{decisionNotes?}`;
`POST …/reject` `{decisionNotes}` (required); `POST …/close`. `ssu-list.ts`: lazy table
(`[lazyLoadOnInit]="false"`) + four dialogs (Create / Approve / Reject / Close); the case "detail"
is the table row (Decision/Notes column) — **no row-expansion, no detail route**; concurrency-safe
`loadTrigger → switchMap` (firstRecord set only after the winning response); gated `ssu.manage`;
case-type chips (`COMMON_CASE_TYPES` in ssu-list.ts: Charity Care, Elderly Subsidy, Child Health
Support, Emergency Relief, Chronic Illness Aid); create modal embeds a patient search + raw-id
fallback. Deps: `patients`, `directory/entity-name.js`.

---

## HR & Payroll

### employees
HR employee master (the payroll base). `employees-api.service.ts` (interfaces live in the service
file): `GET /employees` (`q` free-text + page/limit) → `Paginated<T>`; `POST /employees`;
`PATCH /employees/:id`; `PATCH /employees/:id/deactivate|reactivate`. **No `getOne` — no detail
screen.** `employee-list.ts`: lazy table (`[lazyLoadOnInit]="false"`, constructor first load),
server-side `q` search ("name or designation"), one Add/Edit dialog shared for create and edit,
department options from `MasterDataApiService.listDepartments`, `p-datepicker` (PrimeNG v21; no
`p-calendar`), joinDate sent as local `YYYY-MM-DD` (`toLocalDateString`), `email: form.email ||
undefined` (backend `@IsOptional` skips undefined but rejects `''`); deactivation confirms,
reactivation doesn't; gated `employee.manage`. Deps: `master-data`, `shared/date.util.js`.

---

## Administration (tenant)

### users (staff accounts)
Account administration, reused for platform admins. `users-api.service.ts`: `GET /accounts`
(limit/offset → `{items,total}`); `GET /accounts/:id` → `UserWithRoles`; `POST /accounts`
`{username, email, displayName, roleName, password?}` (create; result may carry one-time
`initialPassword`); `PATCH /accounts/:id/deactivate|reactivate|unlock`;
`PATCH /accounts/:id/ward` `{wardId}` (null clears — nurse ward scoping);
`POST /accounts/:id/reset-password` `{password?}` (blank → backend generates, shown once);
`POST /accounts/:id/roles`; `DELETE /accounts/:id/roles/:roleId`; `GET /accounts/roles`;
`GET /accounts/directory` (`{role}` — DirectoryEntityType source for doctor/employee pickers
app-wide). `user-list.ts`: lazy table + create modal (409 → "Username or Email already exists";
holds open to show the generated initial password once). `user-detail.ts`: role assignment
(start/end dates as datetime-local), ward dropdown (active wards only), deactivate/reactivate/
unlock, reset-password dialog; subscribes `route.paramMap`; error redirect via
`router.navigate(['..'], {relativeTo: route})`; **no platform-vs-tenant code branch** — reuse under
`/platform/admins` is deliberate, the JWT tenant scopes `/accounts`. Deps: `master-data` (Ward);
no `@org/auth` import in the module.

### master-data
Tenant master data. `master-data-api.service.ts` (screen + shared):
`GET|POST /departments`, `PATCH /departments/:id/deactivate|reactivate` (no update-dept endpoint);
`GET|POST /wards`, `PATCH /wards/:id/deactivate|reactivate` (no update-ward); `GET /wards/:wardId/
beds`, `GET /beds/:id`, `POST /wards/:wardId/beds`, `PATCH /beds/:id/deactivate|reactivate`; roles
`GET|POST /roles`, `PATCH /roles/:id`, `PATCH /roles/:id/deactivate|reactivate` (consumed by
global-catalog, not this screen); catalogs `GET|POST /catalogs/departments`,
`PATCH /catalogs/departments/:id` (+ deactivate/reactivate) (consumed by global-catalog).
`master-data-list.ts`: `<p-tabs>` with exactly two panels — **Departments** and **Wards**; beds are
managed in a per-ward "Manage Beds" modal; deactivate/reactivate per entity via
`ConfirmationService`; department create supports a parent-department picker +
`isAppointmentApplicable` checkbox; write actions gated `master-data.manage` (read visible to all).
Widely consumed app-wide (admissions, appointments, employees, inventory, ward-supply, users).

### audit
Read-only audit-trail search ("Read-only compliance and debugging view of system events").
`audit-api.service.ts`: `search(query)` → `GET /audit` with conditional params
`startDate/endDate/tableName/action('create'|'update'|'delete')/changedByAccountId/recordId/
correlationId/page/limit` → `PaginatedResponse`; `list(page, limit)` convenience (dashboard use).
`audit-list.ts`: filter state defaults to last 24 h; both dates required ("A bounded date range is
required"); detail modal shows the diff as JSON; `viewRelatedEvents()` refilters by correlationId;
changed-by resolved via `<hms-entity-name type="doctor">` (accounts resolve through the directory's
doctor endpoint); **no `[lazyLoadOnInit]="false"`** — the first page relies on PrimeNG's default
onLazyLoad-on-init (an exception to the convention). `audit.model.ts` `TABLE_TO_DIRECTORY_TYPE`:
patients→patient, accounts→doctor, wards→ward, beds→bed, inventory_items→item, order_items→
orderItem, lab_tests→test, radiology_imaging_items→imagingItem, invoices→invoice, employees→
employee, departments→department; unmapped → raw recordId. Uses `shared/date.util.js`
(`toLocalDateTimeString`). Routes `/admin/audit` (AUDIT_READ) and `/platform/audit` (reuse).

### reporting
Operational metrics + event history. `reporting-api.service.ts`: `GET /reporting/dashboard/
event-counts`; `GET /reporting/dashboard/revenue`; `GET /reporting/events` (eventType/page/limit —
response `{items, total}`, **not** the usual `{data, meta}` envelope); exports `getBlob GET
/reporting/events/export.csv|.pdf|.xlsx` (optional eventType) and `GET /reporting/dashboard/
revenue/export.csv|.xlsx` (**no revenue PDF**). `reporting-dashboard.ts`: `<p-tabs>` Overview /
Events; Overview = Total Events / Total Revenue stat cards + **two plain `p-table`s** (Events-by-
Type counts, Revenue-by-Day) — not charts; Events tab = lazy table
(`[lazyLoadOnInit]="false"`, constructor load) with Event type tag (`eventTypeSeverity`), Subject
resolved via directory (`reportingEventSubjectRef`: patientId/invoiceId/toBedId → patient/invoice/
bed, fallback raw entityId), payload `| json`, Occurred At, correlation id; export buttons —
Events: CSV/PDF/Excel; Revenue: CSV/Excel → `downloadBlob`/`openPdfBlobInNewTab`; body gated
`reporting.read`. `reporting.model.ts`: REPORTING_EVENT_TYPES = OrderPlaced, InvoiceCreated,
PaymentRecorded, DepositReceived, PatientAdmitted, BedTransferred.

---

## Shared libraries

### `@org/api-client` (`libs/api-client/src`)
Exports (`index.ts`): `ApiClientService`, `API_BASE_URL`, `TENANT_ID`, `ApiError`.
`ApiClientService` (`lib/api-client.service.ts`): `get<T>`, `getBlob` (binary), `post<T>`,
`patch<T>`, `put<T>`, `delete<T>`; `options.params?: Record<string, string|number|boolean>`.
URL = `${API_BASE_URL}${path}` — the client adds **no** `/api` (the environment's base URL already
ends in `/api`). Adds header `x-tenant-id` on **every** request, including the auth endpoints the
interceptor skips (backend tenant-context middleware needs it before a JWT exists). Errors
normalize via an arrow-field `normalizeError` → `ApiError { status, message, body }`. Zero
dependency on `@org/auth` (import direction only). Deps: `@angular/common`, `@angular/core`, `rxjs`.

### `@org/auth` (`libs/auth/src`)
Exports: `AuthService`, `authInterceptor`, `authGuard`, `permissionGuard`, `platformGuard`,
`tenantGuard`, `provideAuthBootstrap`, `AccessTokenClaims`, `LoginOutcome`, `decodeAccessToken`,
`Permissions`, `Permission`, `isValidPermission`, `PLATFORM_TENANT_ID`, `PLATFORM_LANDING_URL`,
`TENANT_LANDING_URL`.
- `Permissions` (`permissions.ts`) — typed `as const` mirror of the backend's JWT permission
  strings (`billing.read`, `lab.catalog.manage`, `identity.accounts.manage`,
  `system-admin.tenants.manage`, …) plus `isValidPermission`.
- `AccessTokenClaims` (`access-token-claims.ts`): `sub, hospitalId, roles[], permissions[],
  type:'access', exp?, iat?, wardId?, displayName?`.
- `decodeAccessToken` (`decode-access-token.ts`): base64url → UTF-8 re-decode (TextDecoder) so
  `displayName` survives; validates claims shape; never a signature check. `isTokenExpired(claims,
  bufferSeconds = 30)`.
- `TokenStorage` (`token-storage.ts`): access token in memory; refresh + CSRF tokens in
  `sessionStorage` (`auth.refreshToken`, `auth.csrfToken`).
- `AuthService` (`auth.service.ts`): `claims` signal → `currentUser`, `isAuthenticated` computed,
  `isPlatformAdmin` (hospitalId === PLATFORM_TENANT_ID); `login` → `POST /auth/login` → mapped to a
  `LoginOutcome` (423 locked / 403 mustChangePassword / 401 invalidCredentials / else serverError);
  `changeInitialPassword` → `POST /auth/change-password`; `changeOwnPassword` →
  `POST /accounts/me/password`; single-flight `refreshAccessToken` → `POST /auth/refresh`
  (`shareReplay(1)` + `finalize`); `logout()` local-only (no server endpoint);
  `hasStoredSession()`; `hasPermission(p)`.
- `authInterceptor` (`auth.interceptor.ts`): skips `AUTH_ENDPOINTS` (`/auth/login`, `/auth/refresh`,
  `/auth/change-password`) — attaching `X-CSRF-Token` there instead; Bearer on everything else;
  401 → refresh → retry original request once; retry-401 (or failed refresh) → `clearSession()` →
  `/login`.
- Guards (`auth.guard.ts`): `authGuard`; `permissionGuard(perm | perm[])` with OR semantics →
  `/login` when absent; `platformGuard`/`tenantGuard` audience cross-redirects
  (`PLATFORM_LANDING_URL='/platform/dashboard'`, `TENANT_LANDING_URL='/billing/invoices'` —
  superseded in practice by the role-aware `resolveTenantLandingUrl` in login.ts).
- `provideAuthBootstrap` — silent-refresh app initializer. Deps: `@angular/core`, `@angular/common`,
  `@angular/router`, `@org/api-client`, `rxjs`.

---

## Screen-building conventions cheat-sheet

(Conventions from CLAUDE.md; each confirmed in at least one file — the example path is in
parentheses.)

1. Every `.subscribe()` needs an `error` handler, or `loading` signals stick forever
   (`billing/invoice-list/invoice-list.ts` `load()`).
2. A per-domain `*-api.service.ts` wraps `ApiClientService`; components never call it directly
   (`billing/invoices-api.service.ts`).
3. Lazy/server-paginated `p-table`: `[lazyLoadOnInit]="false"` + explicit first load
   (`billing/invoice-list/invoice-list.html|ts`; constructor normally, `ngOnInit` in patient-list).
4. Route params via `ActivatedRoute.paramMap` subscription, never a snapshot read
   (`billing/invoice-detail/invoice-detail.ts`, `admissions/admission-detail.ts`,
   `inventory/purchase-order-detail/…`, `helpdesk/helpdesk-ticket-detail.ts`). Lists that deep-link
   subscribe `queryParamMap` (`orders/order-list.ts`, `radiology/radiology-requisitions-list.ts`,
   `nursing/nursing-console.ts`).
5. Build query params conditionally — never pass possibly-`undefined` values
   (`payroll/payroll-api.service.ts` `listPayslips`, `billing/invoices-api.service.ts` `list`).
6. `permissionGuard(Permissions.X)` alone covers unauthenticated users; parent shells use
   `platformGuard`/`tenantGuard` + `runGuardsAndResolvers: 'always'` (`app.routes.ts`).
7. Mutating buttons additionally check `hasPermission('<domain>.manage')`; "View only" otherwise
   (`accounting/accounting-console.ts`, `fraction/fraction-console.ts`, `ssu/ssu-list.ts`).
8. Shell-global `MessageService`/`ConfirmationService` hosts in `shell/shell-chrome.html` are the
   default; only a few screens self-provide (`payroll/payroll-list.ts`, `orders/order-detail.ts`,
   `helpdesk/helpdesk-ticket-detail.ts`, `change-password` — the last is outside the shell).
9. Tabs = PrimeNG v21 `<p-tabs>/<p-tab>/<p-tablist>/<p-tabpanels>/<p-tabpanel>`; never legacy
   `p-tabView` (`nursing/nursing-console.html`, `insurance/insurance-dashboard/…`,
   `accounting/accounting-console.html`, `cssd/cssd-console.html`, `master-data/master-data-list.html`).
10. Downloads/prints go through `ApiClientService.getBlob()` + `openPdfBlobInNewTab` /
    `downloadBlob` (`lab/lab-requisition-detail`, `reporting/reporting-dashboard/…`).
11. Calendar dates via `shared/date.util.ts` helpers, not `toISOString()` (IST bug)
    (`maternity/maternity-list.ts`, `vaccination/vaccination-list.ts`, `employees/employee-list.ts`).
12. Raw UUIDs render via `<hms-entity-name>` (batched `POST /directory/resolve`)
    (`billing/invoice-list/invoice-list.html`, `payroll/payroll-list.html`).
13. Severity/display helpers live in per-feature `*.model.ts` alongside types (`invoice.model.ts`,
    `admission.model.ts`, `order.model.ts`, `radiology.model.ts`, `insurance.model.ts`).
14. Reuse `surface-*`/`accent-*`/`nav-*`/`status-rail-*` classes from `src/styles.css`; new custom
    class names must be defined there or they silently render unstyled.
15. Concurrency-safe paging: `loadTrigger → switchMap` + `takeUntilDestroyed`; `firstRecord` updates
    only on the winning response (`ot/ot-list.ts`, `maternity/maternity-list.ts`, `ssu/ssu-list.ts`).
16. Irreversible/expensive actions confirm via `ConfirmationService` (`pharmacy/
    pharmacy-dispensing-detail.ts`, `maternity/maternity-list.ts`, `lab/lab-requisition-detail`,
    `tenants/tenant-detail/tenant-detail.ts` — typed confirmation for purge).

---

## Cross-references

- `CLAUDE.md` — workspace conventions, shared-lib design, scaffold gotchas, process.
- `Architecture.md` — boot, shells, routing, auth session flow, data-access pattern, theming,
  backend relationship.
- Backend counterpart (sibling repo): backend docs `Module-Reference.md` / `Technical-Design.md`
  for the API modules; permission strings originate in the backend's `seed-rbac-catalog.ts`.
