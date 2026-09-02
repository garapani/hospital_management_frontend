# Architecture — Hospital EMR Frontend (staff-console)

Angular ~21.2 (CSR only) single-page EMR console for hospital staff, plus a second, still-stub
`patient-portal` app. All state is signal-based (no NgRx). UI is PrimeNG v21 (Aura preset, custom
teal tokens) styled with Tailwind CSS v4. Every screen talks to the backend through two small
workspace libs — `@org/api-client` (typed HTTP wrapper) and `@org/auth` (session/guards) — never
through raw `HttpClient`. The app ships as two consoles behind one router: a per-tenant **staff
console** (hospital workflows) and a subdomain-isolated **platform console** (Super Admin, tenant
provisioning).

```text
 browser app (bootstrapApplication, App)
   │  provideRouter(appRoutes)
   ▼
 lazy-loaded feature route  (loadComponent)          e.g. /billing/invoices → Billing/InvoiceList
   │  guarded by authGuard/permissionGuard/platformGuard/tenantGuard (@org/auth)
   ▼
 per-feature *-api.service   (e.g. InvoicesApiService)     query-param building, DTO shapes
   │
   ▼
 ApiClientService  (@org/api-client)      prefixes API_BASE_URL; adds x-tenant-id header;
   │                                     normalizes errors to ApiError {status, message, body}
   ▼
 authInterceptor   (@org/auth, registered via provideHttpClient(withInterceptors))
   │               attaches Bearer access token; CSRF header on auth endpoints;
   │               401 → single-flight /auth/refresh → one retry → else clear session → /login
   ▼
 Angular HttpClient ── dev: base URL http://localhost:3005/api (environment.ts)
                    ── dev-server proxy: /vaidya → http://localhost:3005 (pathRewrite strips /vaidya)
                    ── prod: same-origin /api (environment.production.ts, placeholder)
   ▼
 NestJS API Gateway :3005  (sibling backend repo ../backend/code)
```

## Workspace layout

Nx 23 `angular-monorepo`-shaped workspace (`apps/` + `libs/`), pnpm workspaces. The `angular-monorepo`
shape was chosen specifically so a second application (`patient-portal`) can be added later without
restructuring.

```text
frontend/
  apps/
    staff-console/          the real app (browser entry, shell, 40+ feature folders under src/app/)
    staff-console-e2e/      Playwright scaffold (single generated example spec; targets: {} in project.json)
    patient-portal/         scaffolded stub — no main.ts/app component yet (only src/app.spec.ts + test-setup.ts)
  libs/
    api-client/  → @org/api-client   Angular-only HTTP wrapper (zero dep on libs/auth)
    auth/        → @org/auth         session state, guards, interceptor (depends on @org/api-client)
  packages/                     (empty TS-lib workspace layout; unused)
  dist/                         build output
  CLAUDE.md, AGENTS.md, package.json, nx.json, tsconfig.base.json, ...
```

`tsconfig.base.json` is the TS-library-monorepo base (`composite`, `emitDeclarationOnly`, no `dom`).
The Angular apps override that at the app level; `apps/staff-console/tsconfig.app.json` additionally
`include`s `../../libs/auth/src/**/*.ts` and `../../libs/api-client/src/**/*.ts` directly into the
app's TS program (AOT needs the libs' source, see CLAUDE.md "Known scaffold gotchas"). Packages
resolve via pnpm `workspace:*` symlinks under `node_modules/@org/*` (root `package.json`
dependencies: `"@org/api-client": "workspace:*"`, `"@org/auth": "workspace:*"`).

Angular/PrimeNG are deliberately pinned to **21.x** (not 22): PrimeNG v22 bundles
`@primeui/license-manager` (Community License); v18–v21 are MIT (`primeng@21.1.9` has no
license-manager dependency). Do not bump either major without re-checking.

## Boot & app shell

`src/main.ts` bootstraps `App` (`src/app/app.ts`) with `appConfig` (`src/app/app.config.ts`).
Provider chain, in registration order:

| Provider | Purpose |
|---|---|
| `provideBrowserGlobalErrorListeners()` | global error capture |
| `provideRouter(appRoutes)` | router with the full route tree |
| `provideAnimationsAsync()` | PrimeNG animation triggers (`@angular/animations` runtime dep is required) |
| `provideHttpClient(withInterceptors([authInterceptor]))` | HTTP + the single registered interceptor |
| `{ provide: API_BASE_URL, useValue: environment.apiBaseUrl }` | from `src/environments/environment.ts` (dev: `http://localhost:3005/api`; prod fileReplacements: `'/api'`) |
| `{ provide: TENANT_ID, useFactory: resolveTenantId }` | subdomain → tenant id; `admin` subdomain → `PLATFORM_TENANT_ID` (`'__platform'`); base domains/IP/localhost → env default (`'demo'` dev); otherwise first hostname segment |
| `provideAuthBootstrap()` | app initializer: silent refresh on startup when a refresh token survived reload |
| `provideBrandingBootstrap()` | app initializer: fetch tenant branding before first paint (platform console skips) |
| `providePrimeNG({ theme: { preset: VaidyaTealPreset, options: { darkModeSelector: false, cssLayer: { name: 'primeng', order: 'tailwind-base, primeng, tailwind-utilities' } } } })` | PrimeNG theming |
| `MessageService` / `ConfirmationService` | global toast + confirm; rendered once in `shell/shell-chrome.html` (`<p-toast>`, `<p-confirmDialog>`) |

Theming lives in `app.config.ts`: `VaidyaTealPreset = definePreset(Aura, {...})` seeds the
`primary-*`/`surface-*` Tailwind color utilities (via `tailwindcss-primeui`) and PrimeNG semantic
tokens. Brand teal `#006D77` is primary `600`; `50` is `#F0FDFD`. (CLAUDE.md calls the preset
"OceanBreeze" — the current code names it `VaidyaTealPreset`; the two describe the same Aura-based
preset after a rename.) The `cssLayer.order` string must match `src/styles.css`'s `@layer
tailwind-base, primeng, tailwind-utilities;` and its layer-annotated `@import`s.

Per-tenant white-labeling overlays this at runtime: `BrandingService.applyCssVariables()` overrides
the `--p-primary-*`/`--p-highlight-*` CSS custom properties from a tenant-chosen hex ramp
(`branding/branding.model.ts` `buildColorRamp`), re-theming PrimeNG and Tailwind classes at once.

**Environment swap / proxy.** Dev (`environment.ts`): `apiBaseUrl: 'http://localhost:3005/api'`,
`tenantId: 'demo'`. Prod (`environment.production.ts`, swapped in by
`apps/staff-console/project.json` build `fileReplacements`): `apiBaseUrl: '/api'` — placeholder
assuming the Gateway is reverse-proxied under the SPA origin (no deploy target exists yet).
`proxy.conf.json` maps dev-server requests under `/vaidya` → `http://localhost:3005` with
`pathRewrite: { '^/vaidya': '' }`. Because the dev `apiBaseUrl` is an absolute URL, dev traffic
currently goes straight to :3005; the `/vaidya` proxy remains as the same-origin route (used by
prod-style `/api` requests if served through the dev server, and kept in sync with the backend
port by commit `60b30ca`).

## Routing & navigation architecture

`src/app/app.routes.ts` declares one lazy-loaded route tree. Three guards partition it:

- `rootRedirectGuard` (`src/app/root-redirect.guard.ts`) on bare `''` — resolves per-audience: platform admin → `PLATFORM_LANDING_URL` (`/platform/dashboard`); tenant user → role-aware landing via `resolveTenantLandingUrl()` from `login/login.ts` (falls back to `/login` if no accessible screen).
- `platformGuard` + `PlatformShell` parent for `platform/*` (Super Admin); wrong audience redirected to the tenant landing, unauthenticated → `/login`.
- `tenantGuard` + `AppShell` parent for everything else; wrong audience redirected to `/platform/dashboard`.

Both shell parents set `runGuardsAndResolvers: 'always'` — Angular's default route-reuse strategy
skips re-running a parent node's `canActivate` on sibling-to-sibling navigation inside the shell, so
`'always'` is required for the shell-level guard to fire on every in-shell navigation, not just
first entry. All feature routes are `loadComponent` lazy chunks.

Leaf routes carry `permissionGuard(Permissions.X)` (`@org/auth`); `Permissions` strings mirror the
backend RBAC JWT catalog (`billing.read`, `lab.catalog.manage`, `identity.accounts.manage`, ...).
`permissionGuard` accepts an array with OR semantics (`/helpdesk` allows
`[HELPDESK_READ, HELPDESK_CREATE]`). `authGuard` exists but is unused by leaf routes —
`permissionGuard` alone already rejects unauthenticated users. `/notifications` and `/dashboard`
have no leaf guard (shell guard only). `login` and `change-password` sit outside both shells
(change-password deliberately unguarded — the backend issues no tokens for must-change-password
accounts). `{ path: '**', redirectTo: '' }` funnels unknown URLs to the root redirect guard.

| Area | Route prefix(es) | Guard |
|---|---|---|
| Auth/onboarding | `/login`, `/change-password` | none |
| Platform (Super Admin) | `/platform/dashboard`, `/platform/tenants(/…)`, `/platform/catalog`, `/platform/admins(/…)`, `/platform/audit` | `platformGuard` (parent) — no leaf guards |
| Tenant shell | everything else | `tenantGuard` (parent) + per-leaf `permissionGuard` |
| Landing resolution | `''` | `rootRedirectGuard` |

The two shells share one chrome component: `shell/shell-chrome.ts/.html` renders the sidebar frame,
top bar (notifications bell with unread count + recent list, user menu with initials, roles,
self-service Change Password dialog), the global `<p-toast>`/`<p-confirmDialog>`, and
`<router-outlet>`. Sidebar `<a>` nav links are **projected in** by the wrapping shell
(`<ng-container shellNav>`), so `app-shell.html` (tenant nav, grouped under Dashboard / Clinical /
Operations / Back Office / HR & Payroll / Administration section labels) and `platform-shell.html`
(platform nav) each own their link set. Every nav link is individually gated by literal permission
strings via `auth.hasPermission('...')` in the template (e.g. Invoices under `billing.read`,
Vitals under `vitals.manage` — note the nav uses the *manage* string while the route guard is
`vitals.read`; Billing Settings under `master-data.manage`, matching its route guard).

## Auth & session flow

Everything lives in `@org/auth` (`libs/auth/src/lib/`):

- **Login** (`AuthService.login`) → `POST /auth/login` `{username, password}` → response
  `{accessToken, refreshToken}` → `decodeAccessToken()` validates claims shape
  (`type === 'access'`, `sub`, `hospitalId`, roles[], permissions[]) and stores them in the
  `claims` signal. Errors map to a `LoginOutcome` discriminated union: 423 → `locked` (with
  `retryAfterSeconds`), 403 + `mustChangePassword: true` → `mustChangePassword` (routes to
  `/change-password` carrying the username in router state; no tokens issued), 401 →
  `invalidCredentials`, anything else → `serverError`. On success the tenant user is sent to the
  role-based landing (`resolveTenantLandingUrl` — ROLE_LANDING_ROUTES by exact seed role name, then
  a permission-priority fallback list); platform admins go to `/platform/dashboard`.
- **Token storage** (`TokenStorage`): access token **in memory only** (lost on reload by design);
  refresh token in `sessionStorage` (`auth.refreshToken`); CSRF token in `sessionStorage`
  (`auth.csrfToken`).
- **Silent bootstrap** (`provideAuthBootstrap`): if a refresh token exists, fire
  `refreshAccessToken()` once before bootstrap completes.
- **Refresh protocol** (`AuthService.refreshAccessToken`, `auth.interceptor.ts`): single-flight —
  concurrent 401s share one in-flight `POST /auth/refresh` (`shareReplay(1)`, `finalize` resets).
  `authInterceptor` skips Bearer/refresh handling entirely for the auth endpoints
  (`/auth/login`, `/auth/refresh`, `/auth/change-password`) and attaches `X-CSRF-Token` there
  instead. Every other request gets `Authorization: Bearer <access>` (+ CSRF header if present). On
  401 the interceptor refreshes, then **retries the original request once**; a 401 on the retry, or
  a failed refresh (which already clears the session internally), calls `clearSession()` and
  redirects to `/login`. Screens therefore never handle 401s themselves.
- **`ApiClientService` adds `x-tenant-id` on every request** (including the auth endpoints the
  interceptor skips) because the backend's tenant-context middleware needs it before a JWT exists.
- **Logout** (`AuthService.logout`) is deliberately local-only: clears tokens + claims and
  navigates to `/login`. No server call — the backend has no `/auth/logout` endpoint and no
  revocation store.
- **Password rotation**: signed-in users change their own password via the shell dialog →
  `POST /accounts/me/password` (`changeOwnPassword`; 400 = wrong current password — deliberately
  not 401, so the interceptor's refresh never fires). Must-change-password onboarding →
  `POST /auth/change-password` with username + current password (`changeInitialPassword`).
- **Guards** (`auth.guard.ts`): `authGuard` (authenticated?), `permissionGuard(perm | perm[])`
  (any permission; false when unauthenticated, so it covers login too; redirects to `/login`),
  `platformGuard` / `tenantGuard` (authenticated + audience cross-check; wrong audience is sent to
  the *other* console's landing, not `/login`). `isPlatformAdmin` is derived from the JWT
  `hospitalId === '__platform'`, not a role name.
- **`hasPermission()`** reads the decoded JWT claims for **UI gating only** — the backend's
  PermissionGuard is the security boundary. This codebase follows that: write actions on screens
  additionally check `hasPermission('...manage')` (e.g. fraction console gated on
  `fraction.manage`), while navigation is driven by `read` perms.

## Data access pattern

Signals only — components declare `signal()`/`computed()`, load in the constructor or
`ngOnInit`, never an NgRx store or service-observable cache (except the auth/branding/directory
root singletons). Layering:

1. **Per-feature `*-api.service.ts`** (one per domain folder) wraps `ApiClientService` — owns the
   HTTP shape: endpoint strings, query-param building, response DTO types (`providedIn: 'root'`).
2. **`ApiClientService`** (`@org/api-client`) — thin `get/getBlob/post/patch/put/delete` over
   `HttpClient`, prefixes `API_BASE_URL`, attaches `x-tenant-id`, and normalizes every error to
   `ApiError { status, message, body }` via a `catchError`.
3. **Components** inject the domain service and subscribe with **both** `next` and `error`
   handlers (a bare `next`-only subscribe leaves `loading` signals stuck on any non-401 failure).

Canonical example: `billing/invoice-list/invoice-list.ts` (list) and
`billing/invoices-api.service.ts` (wrapper).

Server-paginated `p-table` pattern (canonical: `billing/invoice-list/invoice-list.html` +
`invoice-list.ts`): template sets `[lazyLoadOnInit]="false"` and `(onLazyLoad)`, component computes
page from the event (`floor(first / rows) + 1`), calls the service, and **triggers the first load
from the constructor** — PrimeNG's own `lazyLoadOnInit` default would double-fetch page 1.
Detail screens read route params by subscribing to `ActivatedRoute.paramMap` (not
`route.snapshot`) so browser back/forward between two `:id` URLs refetches (see
`billing/invoice-detail/invoice-detail.ts`).

Query-param convention: never spread a raw filters object (Angular stringifies `undefined` to the
literal `"undefined"`); build the query conditionally — `if (params.x !== undefined) query['x'] =
params.x` (see `payroll/payroll-api.service.ts` `listPayslips` and
`billing/invoices-api.service.ts` `list`).

Raw-UUID → name display is a shared concern: `directory/entity-name.ts` (`<hms-entity-name>`,
input `type` + `id`) resolves names through `DirectoryResolverService`, which **coalesces all
`resolve()` calls in the same JS tick into one `POST /directory/resolve`** and caches per session
(`directory/directory-resolver.service.ts`); types are `patient | doctor | ward | bed | item |
orderItem | test | imagingItem | invoice | employee | department`.

## Shared UI & styling vocabulary

`src/styles.css` defines the layer order and the app's utility-class vocabulary (all inside
`@layer tailwind-utilities` so templates can reference them and any *new* name must be defined here
or it silently renders unstyled):

- Surfaces: `.surface-panel`, `.surface-card`, `.surface-modal`, `.surface-input` (solid white on
  slate with crisp borders/shadows — not translucency).
- Accent: `.accent-bg`, `.accent-text` (brand teal `primary-600` actions only; status colors are
  reserved for state).
- Nav: `.nav-item`, `.nav-item-active`, `.nav-section-label`, `.brand-mark`.
- Type: `.page-title`, `.page-subtitle`; fonts: Inter (body), Space Grotesk (`--font-display`),
  JetBrains Mono (clinical/financial digits).
- Tables/dialogs: `.table-header-cell`, plus global safety nets
  `.p-datatable-table-container { overflow-x: auto }` and `.p-dialog { max-width: calc(100vw-2rem) }`.
- Status rails: `.status-rail-success|warn|danger|info|secondary` (3px left border colored from
  `--status-*` CSS vars that mirror PrimeNG severity colors) — driven by the same
  `*StatusSeverity()` helpers that feed `p-tag` severities.

> Note: CLAUDE.md/older docs refer to a `glass-*`/`gradient-*` vocabulary; the current
> `styles.css` contains the `surface-*`/`accent-*`/`nav-*`/`status-rail-*` tokens above instead —
> trust the file, not the older naming.

Document/print & download helpers in `app/shared/` (each with a spec):
- `download-blob.util.ts` — `downloadBlob(blob, filename)` forces a save (CSV/Excel/PDF exports).
  Used by `accounting/accounting-console.ts` (report exports) and
  `reporting/reporting-dashboard/reporting-dashboard.ts`.
- `pdf-blob.util.ts` — `openPdfBlobInNewTab(blob)` opens a PDF (label/report) for print/view.
  Used by `patients/patient-detail.ts` (ID label), `lab/lab-requisition-detail` (verified report),
  `radiology/radiology-requisition-detail.ts` (requisition label + report),
  `pharmacy/pharmacy-dispensing-detail.ts` (dispensing label), `accounting/accounting-console.ts`.
- `date.util.ts` — `todayLocal()` / `toLocalDateString()` / `toLocalDateTimeString()`
  (local-timezone, IST-correct `YYYY-MM-DD`, `YYYY-MM-DDTHH:mm`).

All such binaries are fetched with `ApiClientService.getBlob()` (a plain `get` would JSON-parse the
body).

## Testing & quality

Jest 30 via `@nx/jest` (`jest.config.ts` aggregates projects). App config
`apps/staff-console/jest.config.cts`: `jest-preset-angular` with
`setupZonelessTestEnv({ errorOnUnknownElements: true, errorOnUnknownProperties: true })`
(`src/test-setup.ts`, which also stubs `ResizeObserver` for PrimeNG tabs). Libs use the same
preset via their own `jest.config.cts`. 96 spec files under `apps/staff-console/src/app` plus 6
under `libs/` (102 total). Conventions (verified in code): a `.spec.ts` per component/API service/model at the
file's side; components are tested with mocked injected services (`jest.fn()` + `of(...)`/`throwError`)
and `provideHttpClientTesting()`; guards/interceptor/decode/claims logic in `@org/auth`; pure-model
helpers (invoice.model, triage.model, branding.model…) get unit specs. Examples:
`shell/shell-chrome.spec.ts` (user-menu + password dialog against mocked AuthService),
`auth.guard.spec.ts` (each guard's allow/redirect), `libs/auth/src/lib/auth.interceptor.spec.ts`.
Unit spec `tsconfig.spec.json` sets `moduleResolution: "bundler"` (must not be `node10`).

## Relationship to the backend

Sibling, independently versioned repo at `../backend/code` (NestJS modular monolith). Dev Gateway
at `http://localhost:3005` (proxy path `/vaidya`); API base `/api` is appended by the environment,
so feature services call root-relative paths like `/billing/invoices`. Permission strings are the
**same strings the backend seeds in `seed-rbac-catalog.ts` and embeds in JWT claims** — the
frontend `Permissions` const object in `@org/auth` is a typed mirror; route guards and nav items use
those strings, and any drift shows up as unreachable screens or dead nav links. `PLATFORM_TENANT_ID`
(`'__platform'`) mirrors the backend's reserved platform tenant. Feature folders under
`apps/staff-console/src/app/` mirror backend domain modules 1:1 (billing, lab, radiology,
pharmacy, inventory, accounting, payroll, helpdesk, ssu, fraction, cssd, ward-supply,
fixed-assets, insurance, maternity, vaccination, …) — see `Module-Reference.md` for the endpoint map.

## Recent additions worth knowing

From `git log --oneline -60` at HEAD (folder touched in parentheses):

- Reporting CSV/PDF/Excel export buttons (`reporting/`); Accounting report exports
  CSV/PDF/XLSX (`accounting/`) — `getBlob` + `downloadBlob`/`openPdfBlobInNewTab`.
- Lab/Radiology verified-report PDF download (`lab/`, `radiology/`).
- Dashboard role widgets for 12 roles incl. Hospital Admin snapshot tiles (`dashboard/`).
- Helpdesk assign UI + ticket detail + create-only reachability (`helpdesk/`).
- Print ID label on patient detail; specimen/requisition labels on Lab/Radiology detail; dispensing
  label on Pharmacy detail (`patients/`, `lab/`, `radiology/`, `pharmacy/`).
- hms-entity-name raw-UUID → resolved-name replacement app-wide (`directory/`).
- Admissions ward board + bed-transfer pickers (`admissions/`); Nursing Shift Handoff tab
  (`nursing/`); insurance capture on patient registration (`patients/`); lab out-of-range warning
  at entry (`lab/`); low-stock banner (`inventory/`); booking appointments for new patients
  (`appointments/`); landing-route tables fixed for all seeded roles (`login/`); sign & lock for
  clinical notes (`encounters/`).

---

Last verified against commit `e97df99` (2026-09-02) — the accounting export work noted below as
"uncommitted"/"working tree" in earlier drafts of this doc has since landed at that commit.

Companion: [Module-Reference.md](./Module-Reference.md) — the per-feature "where is X" map.
