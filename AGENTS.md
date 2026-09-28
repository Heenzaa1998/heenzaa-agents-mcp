# AGENTS.md

This file is the authoritative rulebook for this repository.
`CLAUDE.md` is a short orientation file that points here; it does not override anything below.

## Purpose

This repository is a lean, production-ready Next.js App Router starter with:

- `pnpm`
- Tailwind CSS v4 + shadcn/ui
- Zod
- Drizzle ORM + Drizzle Kit
- Pino logging
- `prom-client` metrics
- OpenTelemetry tracing with Grafana Tempo
- Vitest + Playwright
- Production Docker targets

Optimize for maintainability. Keep the codebase shallow, explicit, and easy to operate.

## Working Defaults

- Use `pnpm`, not `npm` or `yarn`.
- Prefer small, direct changes over introducing new abstraction layers.
- Preserve the current architecture before adding new folders or patterns.
- Keep route handlers and pages thin.
- Put business logic in features, infra in `src/server`, and UI in `src/components`.
- If a change affects routes or UI copy, keep the home page (`/`) and `src/content/site.ts` in step with it.

## Workflow Rules

**Design first. Plan before you build.**

For any change beyond a trivial one, follow this order:

1. **Understand** the current behavior. Read the relevant files before proposing changes.
2. **Write a design doc** in `docs/design/` using `docs/templates/design-doc.md`.
   Name it `YYYY-MM-DD-<slug>.md`. State the problem, the options considered,
   the chosen approach and why, the files you expect to touch, and how you will verify it.
3. **Ask before assuming.** If two readings of the request lead to materially
   different work, ask. Do not guess and start coding.
4. **Then implement**, following the plan. If reality forces a deviation,
   record the deviation rather than silently rewriting the plan.
5. **Verify** using the Safe Change Checklist below.
6. **Record the change** in `docs/changes/` using `docs/templates/change-record.md`.

A design doc is required when the change:

- adds or modifies a route, page, or API contract
- alters the database schema or adds a migration
- touches observability (tracing, metrics, logging)
- changes `Dockerfile`, CI, or runtime assumptions
- adds a dependency or changes the folder structure

It is not required for typo fixes, small copy edits, formatting, or patch bumps.
Those still need a change record.

## Documentation Rules

**Every change gets written down in `docs/`.**

- `docs/design/` holds the plan, written *before* the work.
- `docs/changes/` holds what actually happened, written *after* the work.
- `docs/templates/` holds the templates for both. Copy them; do not invent new formats.
- One task produces one matching pair. A task small enough to skip the design doc
  still produces a change record.
- Link the two documents to each other so a reader can go from plan to outcome.
- Explain *why*, not *what*. The diff already shows what changed.
- Keep docs in the same commit as the code they describe. Do not batch them up
  to write later.
- If a change makes an existing doc wrong, fix that doc in the same commit.

See `docs/README.md` for the full conventions.

## Project Shape

```text
src/
  app/               pages, layouts, route handlers
  components/        reusable UI and site shell components
  content/           product copy: brand name, tools, pipeline, connect steps
  features/          feature contracts, services, repositories
  server/            env, logging, db, tracing, metrics, http helpers
.claude/             agent settings, hooks, and the add-feature skill
docs/                design docs and change records
drizzle/             generated migrations
ops/                 local Grafana + Tempo config
scripts/             smoke tests and local automation
tests/
  unit/              Vitest tests
  e2e/               Playwright tests
```

## Architecture Rules

- Keep `src/app` thin:
  parse input, call a service, return a stable response.
- Keep feature logic in `src/features/<feature>`:
  contracts, service, repository should evolve together.
- Keep shared infra in `src/server`:
  env parsing, db wiring, error handling, logging, tracing, metrics.
- Keep generated migration artifacts out of runtime source:
  use `drizzle/`, not `src/`.
- Do not introduce repository/service/controller layers everywhere unless there is a real need.

## UI Rules

- The site is the product "Heenzaa Studio" with a dark studio theme. The starter template's
  look is gone on purpose; do not bring it back.
- Colours come only from the tokens in `src/app/globals.css`. One accent (lime `--primary`)
  is reserved for primary actions and active state, so generated media carries the colour.
  Status colours are `success`, `warning` and `destructive`.
- Type: `font-display` (Space Grotesk) for headings, the default sans (Inter) for text,
  `font-mono` (JetBrains Mono) for tool names, keys and endpoints.
- Keep base styles inside `@layer base`. Unlayered CSS outranks every Tailwind utility.
- Reuse `src/components/site-header.tsx`, `site-footer.tsx`, `copy-button.tsx` and the
  primitives in `src/components/ui/` before adding new components.
- The site is bilingual (Thai default, English). Every user-facing string lives in
  `src/content/i18n/en.ts` and `th.ts`; never hardcode copy in components. `th` must have
  exactly the keys of `en` (the `Dictionary` type and `tests/unit/i18n.test.ts` enforce it).
  Pages read the language with `getDictionary()` from `src/server/i18n.ts`.
- Do not letter-space Thai text. Use the `.eyebrow` class for small uppercase labels; it
  drops the tracking on Thai pages.
- Language-independent data (brand name, tool names, showcase images) lives in
  `src/content/site.ts`. Showcase art in `public/showcase/` is public on purpose and must
  never be the owner's private generations.
- Public pages (`/`) must never show the owner's generations; anything private lives
  behind the gallery session (`/gallery`, `/projects`). Private pages call
  `requireGallerySession()` and every server action re-checks the session itself.
- Money is shown in baht from stored KIE credits times the owner-set rate (settings table);
  never store baht amounts. Format with `formatBaht` / `formatCredits` from `src/lib/format.ts`.
- The project uses `typedRoutes`. When passing href values from data objects into `next/link`, use `Route` typing/casts where needed.

## Observability Rules

- Preserve the tracing chain:
  route span -> service span -> repository span -> DB span
- Do not add noisy spans with unstable names or high-cardinality attributes.
- Respect `OTEL_TRACE_IGNORE_PATHS`. `/metrics` is intentionally ignored by default.
- Keep request correlation intact:
  request IDs and trace IDs must continue to flow into logs.
- If changing observability behavior, verify both app behavior and trace export behavior.

Relevant files:

- `instrumentation.ts`
- `proxy.ts`
- `src/server/http/observed-route.ts`
- `src/server/observability/*`
- `src/server/logger.ts`

## Database Rules

- The database is Neon Postgres, accessed with Neon's HTTP driver (`@neondatabase/serverless`
  via `drizzle-orm/neon-http`). There is no local database file.
- `DATABASE_URL` is required at runtime (pooled URL). Migrations use `DATABASE_URL_UNPOOLED`
  when set. On Vercel both come from the Neon integration; locally, pull them with `vercel env pull`.
- Dev, preview and production currently share one Neon branch, so local runs write to
  production data. Clean up test rows, or give dev its own Neon branch.
- Schema lives in `src/server/db/schema.ts`.
- Use Drizzle migrations for schema changes:
  run `pnpm db:generate` and `pnpm db:migrate`
- Keep sample subscriber flow working unless explicitly replacing it.

## Docker Rules

- Production image is defined in `Dockerfile`.
- Use the `runner` target for the app and the `migrator` target for schema migrations.
- The runtime image depends on Next.js standalone output from `next.config.ts`.
- If Docker-related files change, validate both image build and container startup.

Recommended validation:

```bash
docker build --target runner -t nextjs-drizzle:prod .
docker build --target migrator -t nextjs-drizzle:migrator .
docker run --rm -e DATABASE_URL_UNPOOLED=postgresql://... nextjs-drizzle:migrator
docker run --rm -p 3000:3000 -e DATABASE_URL=postgresql://... nextjs-drizzle:prod
```

## Commands

Core workflow:

```bash
pnpm dev
pnpm check
pnpm e2e
pnpm db:migrate
pnpm observability:test
```

Use these expectations:

- Run `pnpm check` for any code change.
- Run `pnpm e2e` when changing pages, route handlers, or end-to-end flows.
- Run `pnpm observability:test` when changing tracing, metrics, logging, or Tempo wiring.
- Run Docker build/run checks when changing `Dockerfile`, `next.config.ts`, or runtime container assumptions.

## Tests

- Unit tests cover page rendering, feature logic, contracts, and trace-path behavior.
- E2E tests cover:
  home page, gallery sign-in redirect, `/api/health`, `/metrics`
- If you add a new user-visible route or significantly change copy/structure, update tests accordingly.

## Skills

- This repo ships one skill: `.claude/skills/add-feature/`. Use it whenever you add a
  feature under `src/features/`, a new API route backed by business logic, or a new
  table-backed capability. It records the contracts/service/repository shape and the
  span-chain rules so they do not have to be re-derived from `subscribers` each time.
- If other relevant project or machine-local skills are available in the current
  environment, use them.
- Do not commit or vendor `.agents` contents into this repo unless explicitly requested.

## Tooling for agents

- `.claude/settings.json` is committed and applies to everyone working in this repo.
  It allowlists read-only verification commands (`pnpm check`, `pnpm lint`,
  `pnpm typecheck`, `pnpm test`, `git status|diff|log|show`) so they run without a
  prompt, and denies force-push, `git reset --hard`, and `rm -rf /`.
  Anything that writes or deploys still prompts.
- A `PostToolUse` hook runs `node_modules/.bin/tsc --noEmit` after any `.ts`/`.tsx`
  file is written or edited, so type errors surface immediately instead of at the end.
  It no-ops when dependencies are not installed. It calls the local binary rather than
  `pnpm` because `pnpm` is not always on `PATH`.
- Put personal overrides in `.claude/settings.local.json`; it is gitignored.

## Safe Change Checklist

Before finishing substantial work, verify what applies:

- `pnpm check`
- `pnpm e2e`
- `pnpm observability:test`
- Docker build/run checks
- migration generation/application if schema changed
- a design doc exists in `docs/design/` for non-trivial work
- a change record is written in `docs/changes/` and committed alongside the code

## Avoid

- Do not switch package managers.
- Do not move business logic into route files.
- Do not bypass env validation.
- Do not add heavy enterprise abstractions without a concrete problem.
- Do not break the public docs/demo pages while changing internal code.
- Do not start implementing a non-trivial change before writing its design doc.
- Do not land a change without a record in `docs/changes/`.
