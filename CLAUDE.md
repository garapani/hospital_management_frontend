<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# staff-console — Hospital EMR Frontend

Separate git repo from the backend (`../` — `new_hospital`, an independent repository, not a
parent/submodule relationship). Angular ~21.2.19 (approved as "v18+" per
`../new/docs/superpowers/specs/2026-07-30-frontend-framework-architecture-design.md`), CSR only,
signals for state (no NgRx), PrimeNG + Tailwind CSS v4 for components/styling. `staff-console` is
the first of two planned apps (`patient-portal` deferred — no mocks or backend auth path exist for
it yet); this workspace uses the `angular-monorepo`-shaped layout (`apps/`) so a second app can be
added later without restructuring.

**Angular/PrimeNG pinned to v21, not v22 (2026-08-09):** PrimeNG v22 bundles
`@primeui/license-manager` as a direct dependency — PrimeTek relicensed the mainline package
starting at v22 under revenue/dev-count/funding-gated "Community License" terms (see
`node_modules/primeng/LICENSE.md` on a v22 install), not MIT. Verified via npm registry that v18
through v21 mainline releases carry no license-manager dependency and are genuinely MIT
(`primeng@21.1.9`'s own `dependencies` field has none). PrimeNG's Angular peer requirement tracks
its own major 1:1 (`primeng@21.1.9` → `@angular/core ^21.0.7`), so staying free meant pinning
Angular to the matching 21.x line too, not just swapping the PrimeNG version — do not bump either
past v21 without re-checking `primeng`'s own `dependencies` for `@primeui/license-manager` first.

**UI mocks/reference:** `../new/ui-mocks/` (in the backend repo, not copied here) — 10
role-based static HTML clickable prototypes. Treat as a screen-inventory/IA reference and a
reusable interaction-pattern vocabulary (step-bar for multi-step forms, tabs for detail views,
toolbar+search+table for lists, a permission-aware "hide unavailable actions" footer) — the
field-level content is generic placeholder (confirmed by inspection: e.g. Lab's Result Entry form
has no component-name/value/reference-range fields, just generic "Patient/Entity, Status,
Reference/Number, Notes"), not real design. Permission strings shown in the mocks are invented,
not real — the actual gating source is the JWT-embedded permissions from the backend's
`seed-rbac-catalog.ts` (`new/code/apps/api/src/rbac/seed-rbac-catalog.ts` in the backend repo).

## Process

**Default is always the fast track below. The heavyweight `superpowers:*` pipeline
(`brainstorming` → `writing-plans` → `subagent-driven-development`) requires an explicit,
affirmative reason before you invoke it — "this feels like a big/multi-file change" is NOT that
reason.** Before invoking any `superpowers:*` skill on frontend work, stop and re-read this section.

**Fast track (default for ~everything, matching the backend's MVP-fast-track convention
established 2026-08-09 — see the backend repo's `CLAUDE.md`, "The MVP Fast Track"):** implement
directly via `superpowers:test-driven-development` at component/service boundaries (no separate `to-spec` step) →
`superpowers:requesting-code-review` → commit. This covers: a new list/detail/form screen, a UI-only
fix, a styling/design-system pass (however many screens or files it touches — **"redesign the
frontend" / "make it more elegant" is fast-track work**, not a signal to go heavyweight), a shared
CSS/theme-token change, anything where the answer to "does this establish a _new shared library or
service boundary_ other code must integrate against" is no.

**Heavyweight pipeline — only when the answer to that question is yes**, e.g.: introducing a new
shared library (`libs/api-client`, `libs/auth` were built this way), a new cross-cutting service
contract (the auth interceptor's refresh-token protocol), or a decision every future screen must
follow and getting it wrong is expensive to unwind later. If you're not sure, default to fast
track — the fast track's own review step (`superpowers:requesting-code-review`) is the safety net for a
misjudged scope call, and is far cheaper to recover from than an unnecessary heavyweight run.

**Incident (2026-08-09):** a design refresh (navy theme preset + sidebar shell + 3 existing screens
restyled) was run through the full heavyweight pipeline — brainstorming interview, spec, plan,
then `subagent-driven-development`'s per-task implementer+reviewer dispatch (6 tasks) plus a final
whole-branch review and fix wave: ~15 subagent dispatches total for what was, functionally,
template-only changes plus one config file. The task was misjudged as "architectural" because it
touched the shell/theme; the actual bar (new shared library/service boundary) was never met.
`/tdd` + direct implementation would have covered it at a fraction of the cost. This section was
rewritten immediately after to make that judgment call explicit rather than left implicit.

## Shared libraries

`libs/api-client` and `libs/auth` (built 2026-08-09, spec at the backend repo's
`new/docs/superpowers/specs/2026-08-09-frontend-shared-libs-api-client-auth-design.md`) are how
every screen talks to the API Gateway — don't hand-roll `HttpClient` calls or token handling in a
component/service.

- **`ApiClientService`** (`@org/api-client`) — injectable `get`/`post`/`patch`/`delete`, prefixes
  paths with `API_BASE_URL` (provided in `app.config.ts` from `src/environments/environment.ts`,
  swapped for `environment.production.ts` on prod builds via `project.json`'s `fileReplacements` —
  never hardcode a Gateway origin in a component). Errors normalize to `ApiError { status, message,
body }`.
- **`AuthService`** (`@org/auth`) — `login`/`logout`/`hasPermission`/`isAuthenticated`/
  `currentUser` signals. Access token lives in memory only (gone on reload by design); refresh
  token in `sessionStorage`. `hasPermission()` reads JWT claims for UI gating only — it is never a
  security boundary, the backend's `PermissionGuard` is authoritative.
- **`authInterceptor`** (registered once, in `app.config.ts`) — attaches the Bearer token to every
  request, and on a 401 does a single-flight refresh (concurrent 401s share one `/auth/refresh`
  call) then retries the original request **once**. A 401 on the retry, or a failed refresh itself,
  clears the session and redirects to `/login` — don't add per-screen 401 handling, the
  interceptor already owns this.
- `libs/api-client` has zero dependency on `libs/auth` (enforced by import direction, not yet by
  Nx module boundaries) — keeps it reusable by a future `patient-portal` app with different auth.
- **`authGuard`/`permissionGuard`** (also `@org/auth`) — functional `CanActivateFn`s.
  `permissionGuard(permission)` alone covers "not logged in" too (`hasPermission()` is false when
  unauthenticated), so it's the only guard most leaf routes need; `authGuard` is for routes that
  need "logged in" without a specific permission (e.g. a future shared dashboard). **Any parent
  route carrying a guard needs `runGuardsAndResolvers: 'always'`** — Angular's default reuse
  strategy skips re-running `canActivate` on a parent route node when navigating between its
  children, so without this a parent-level `authGuard` only fires on first entry into that
  subtree, not on every subsequent in-shell navigation (see `app.routes.ts`'s shell route).

## Screen-building conventions (established building the Billing Invoice List screen, 2026-08-09)

- **Every `.subscribe(...)` on an API call needs an `error` handler**, not just `next` — a bare
  `.subscribe((result) => ...)` leaves `loading`/`submitting` signals stuck `true` forever on any
  non-2xx response the `authInterceptor` doesn't itself handle (it only intercepts 401). Always
  `.subscribe({ next: ..., error: () => loading.set(false) })` at minimum.
- **A per-domain API service wraps `ApiClientService`, not the component** (e.g.
  `InvoicesApiService` in `apps/staff-console/src/app/billing/`) — keeps HTTP-shape knowledge
  (query params, response shape) out of components and matches `libs/api-client`'s own "thin
  wrapper" design.
- **PrimeNG `p-table` in lazy/server-paginated mode**: set `[lazyLoadOnInit]="false"` and trigger
  the first load explicitly from the component (e.g. in the constructor) — PrimeNG's own
  `lazyLoadOnInit` default fires `onLazyLoad` automatically on init too, so leaving both in place
  double-fetches page 1 on every screen load.
- **A component reading a route param should subscribe to `ActivatedRoute.paramMap`**, not read
  `route.snapshot.paramMap` once in the constructor — Angular's route-reuse strategy can keep the
  same component instance alive across a params-only navigation (e.g. browser back/forward between
  two `billing/invoices/:id` URLs), and a snapshot-only read never re-fetches, silently leaving
  stale data on screen under a changed id.
- **Never pass a params object with possibly-`undefined` values straight to `ApiClientService.get`
  (or `HttpClient` directly)** — Angular's `HttpClient` stringifies an `undefined` value to the
  literal string `"undefined"` in the query string instead of omitting the key, and a backend
  DTO field like `month?: number` sees that as present, not absent. Found in
  `PayrollApiService.listPayslips` (2026-08-22): `month: this.monthFilter() ?? undefined` reached
  the query string as `month=undefined`, which the backend then tried to bind into an integer
  column and 500'd. Every other `*-api.service.ts` in this app already avoids this by building the
  query object conditionally (`if (params.x !== undefined) query['x'] = params.x`) — match that,
  don't spread a raw filters object into `{ params }`.

## Known scaffold gotchas (found getting this workspace running)

- **`tsconfig.json` files are protected** by a global `guard-config.sh` hook — same as the backend
  repo. A legitimate change needs the human partner's explicit go-ahead first (and even then, the
  Edit/Write tools are hard-blocked with no override; the human must apply the change themselves,
  or explicitly ask for a Bash-based write knowing that routes around the guard).
- **The workspace's `tsconfig.base.json`** is set up for a TS-library monorepo (`composite: true`,
  `emitDeclarationOnly: true`, no `dom` lib) — incompatible with Angular's browser build.
  `apps/staff-console/tsconfig.json` overrides `lib`/`composite`/`declarationMap`/
  `emitDeclarationOnly` at the app level rather than changing the shared base (other future
  TS-only libraries in this workspace may still want the base's project-references style).
- **`NX_IGNORE_UNSUPPORTED_TS_SETUP=true`** was needed to get `nx add @nx/angular` past a check for
  the same TS-project-references incompatibility above — safe here since the app-level tsconfig
  override (previous point) actually fixes the real incompatibility; the env var just gets past
  the generator's own overly-broad guard.
- **PrimeNG + Tailwind v4 CSS layering**: `providePrimeNG`'s `theme.options.cssLayer.order` in
  `app.config.ts` (`'tailwind-base, primeng, tailwind-utilities'`) must match the `@layer`
  declaration and `@import ... layer(...)` statements in `src/styles.css` — see that file for the
  working pattern. `@angular/animations` is a required runtime dependency for
  `provideAnimationsAsync()` (PrimeNG components use classic Angular animation triggers
  internally) even though modern Angular deprecates `@angular/animations` in favor of native
  `animate.enter`/`animate.leave` — expect that deprecation warning, it's not a real problem yet.
- **Vite dev-server externalizes anything resolved through `node_modules`** — including
  `@org/api-client`/`@org/auth`, which resolve via the pnpm workspace symlink at
  `node_modules/@org/*` even though the real files live under `libs/`.
  `@angular/build`'s `external-packages-plugin` marks any resolved path matching `/node_modules/`
  as external for the dev server, which skips Angular's AOT/Ivy compiler transform on it — the
  class still has `@Injectable()`/etc. in source but never gets a compiled `ɵprov`, so Angular
  falls back to JIT at runtime and throws (`@angular/compiler` isn't loaded in an AOT-only build).
  Fixed via `prebundle.exclude: ["@org/api-client", "@org/auth"]` on the `serve` target in
  `apps/staff-console/project.json` (dev-server only; production `build` doesn't externalize
  packages this way, so it isn't affected). Any new `@org/*` workspace lib needs the same
  `prebundle.exclude` entry once it's consumed by `staff-console`.
- **Excluding a lib from prebundling means esbuild now expects it in the TS program**: once
  externalization is off, `@angular/build`'s compiler plugin needs the lib's `.ts` files literally
  covered by `apps/staff-console/tsconfig.app.json`'s `include`/`exclude` — TS project
  `references` to a lib's `tsconfig.lib.json` are a _separate_ composite compilation unit and
  don't fold that source into the app's own ts.Program, so Angular's AOT plugin errors with "Files
  containing Angular metadata... must be part of the TypeScript compilation." `tsconfig.app.json`
  now includes `../../libs/auth/src/**/*.ts` and `../../libs/api-client/src/**/*.ts` (with
  matching `*.spec.ts` excludes) for this reason — any new `@org/*` lib needs the same include
  entries. This in turn changes the project's inferred `rootDir` (now spans `apps/staff-console`
  and `libs/`), which trips `tsc --build`'s `--emitDeclarationOnly` validation (TS5011/TS5069)
  unless `rootDir`/`declaration` are set explicitly — see the file for the working values.
- **Theming lives in `app.config.ts`, not per-component CSS.** The preset
  (`definePreset(Aura, {...})` — `OceanBreezePreset` as of 2026-08-12, superseding the original navy
  one) seeds every `primary-*`/`surface-*` Tailwind class used across screens (via
  `tailwindcss-primeui`), plus a set of `glass-*`/`gradient-*` utility classes in `styles.css` for
  the glassmorphism look. A new screen should reuse those classes, not introduce a new color or a
  component-local stylesheet — and if it introduces a new `glass-*`/`gradient-*` class name, that
  class must actually be defined in `styles.css`'s `@layer tailwind-utilities` (an undefined class
  referenced in a template silently renders unstyled; nothing in typecheck/lint/tests catches it).
  See `new/docs/technical-design/Development-Standards.md` §21 for the exact class vocabulary.
- **`apps/staff-console/tsconfig.spec.json` must not set `moduleResolution` to `"node10"`** — it
  extends `tsconfig.base.json` directly (not `./tsconfig.json`), so it inherits
  `customConditions`, and TypeScript hard-errors (TS5098) on that combination regardless of
  installed package versions. This was latent and masked by stale `.tsbuildinfo` incremental-build
  caches for a long time; a `pnpm install` that touches `node_modules` enough to invalidate those
  caches will resurface it as ~40 cascading errors (anything resolved via a package.json `exports`
  map — `@angular/common/http`, `@angular/core/testing`, `primeng/*` — fails to resolve under
  `node10`). Fixed by setting `moduleResolution: "bundler"` (matching `tsconfig.json`'s own
  setting) and adding `"lib": ["es2022", "dom"]` (this file doesn't extend the app tsconfig, so it
  doesn't inherit that lib list either). The same file also inherited `composite: true` from base
  for the same "extends base directly" reason, which requires every transitively-imported file
  (not just `*.spec.ts`) to appear in `include` — broadened to `src/**/*.ts`.

- **Editing a shared lib's source (`libs/auth`, `libs/api-client`) doesn't show up in a plain
  `tsc --noEmit -p apps/staff-console/tsconfig.app.json`** — that tsconfig's `references` point at
  the libs' `tsconfig.lib.json`, and plain `--noEmit` (not `--build`) resolves a referenced
  project's types from its prebuilt `dist/*.d.ts`, not live source, so an edited type (e.g. adding
  a field to `AccessTokenClaims`) silently checks against the stale dist output — confirmed via
  `tsc --noEmit ... --listFiles | grep <file>` showing the `dist/` path, not `src/`. Fixed for that
  session by running `tsc --build apps/staff-console/tsconfig.app.json` once (which rebuilds an
  out-of-date referenced project first), then the plain `--noEmit` runs matched it. After editing
  `libs/auth`/`libs/api-client` source, run the `--build` form (or `pnpm nx test`/whatever target
  actually rebuilds the lib) at least once before trusting a plain `--noEmit` result on the app.

## Git Conventions

Same as the backend repo: conventional commit format (`feat:`, `fix:`, `docs:`, `refactor:`,
`test:`, `chore:`), never `git commit --amend`, never an AI co-authorship trailer, work directly
on `main`.
