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
parent/submodule relationship). Angular v22 (approved as "v18+" per
`../new/docs/superpowers/specs/2026-07-30-frontend-framework-architecture-design.md`), CSR only,
signals for state (no NgRx), PrimeNG + Tailwind CSS v4 for components/styling. `staff-console` is
the first of two planned apps (`patient-portal` deferred — no mocks or backend auth path exist for
it yet); this workspace uses the `angular-monorepo`-shaped layout (`apps/`) so a second app can be
added later without restructuring.

**UI mocks/reference:** `../new/docs/ui-mocks/` (in the backend repo, not copied here) — 10
role-based static HTML clickable prototypes. Treat as a screen-inventory/IA reference and a
reusable interaction-pattern vocabulary (step-bar for multi-step forms, tabs for detail views,
toolbar+search+table for lists, a permission-aware "hide unavailable actions" footer) — the
field-level content is generic placeholder (confirmed by inspection: e.g. Lab's Result Entry form
has no component-name/value/reference-range fields, just generic "Patient/Entity, Status,
Reference/Number, Notes"), not real design. Permission strings shown in the mocks are invented,
not real — the actual gating source is the JWT-embedded permissions from the backend's
`seed-rbac-catalog.ts` (`new/code/apps/api/src/rbac/seed-rbac-catalog.ts` in the backend repo).

## Process

MVP fast track by default (spec → implement directly with TDD at component/service boundaries →
review → commit), matching the backend's fast-track convention established
2026-08-09 — see the backend repo's `CLAUDE.md` ("The MVP Fast Track") for the full rationale.
Reserve a heavier design pass only for genuinely architectural decisions (shared API-client
library, auth interceptor), not per-screen work.

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
- **Jest + PrimeNG**: `primeng` pulls in `@primeui/license-manager` → `@noble/ed25519`, which ships
  plain `.js` files using ESM `export` syntax. The generated `transformIgnorePatterns` only carves
  out `.mjs` files; `apps/staff-console/jest.config.cts` extends the carve-out to `@noble` too
  (`node_modules/(?!.*(\.mjs$|@noble))` — note `.*` must apply to *both* alternatives, since
  pnpm's flattened path structure puts `@noble` several path segments after `node_modules/`, not
  immediately after it).
- **PrimeNG + Tailwind v4 CSS layering**: `providePrimeNG`'s `theme.options.cssLayer.order` in
  `app.config.ts` (`'tailwind-base, primeng, tailwind-utilities'`) must match the `@layer`
  declaration and `@import ... layer(...)` statements in `src/styles.css` — see that file for the
  working pattern. `@angular/animations` is a required runtime dependency for
  `provideAnimationsAsync()` (PrimeNG components use classic Angular animation triggers
  internally) even though Angular v22 deprecates `@angular/animations` in favor of native
  `animate.enter`/`animate.leave` — expect that deprecation warning, it's not a real problem yet.

## Git Conventions

Same as the backend repo: conventional commit format (`feat:`, `fix:`, `docs:`, `refactor:`,
`test:`, `chore:`), never `git commit --amend`, never an AI co-authorship trailer, work directly
on `main`.
