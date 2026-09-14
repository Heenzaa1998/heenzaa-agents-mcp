# Next.js + Tailwind + Drizzle + Observability

Lean, production-ready starter for a Next.js App Router project with:

- `pnpm`
- Tailwind CSS v4 + shadcn/ui
- Zod
- Drizzle ORM + Drizzle Kit
- Pino logging
- `prom-client` metrics
- OpenTelemetry tracing
- Grafana Tempo local stack
- Vitest + Playwright
- Production Docker targets

The template is intentionally not enterprise-heavy. Route files stay thin, feature logic lives together, infrastructure stays under `src/server`, and observability is included from day one.

## Stack

- Next.js `16.1.6`
- React / React DOM `19.2.4`
- Tailwind CSS `4.2.1`
- shadcn `4.0.0`
- Zod `4.3.6`
- Pino `10.3.1`
- prom-client `15.1.3`
- OpenTelemetry SDK Node `0.213.0`
- Vitest `4.0.18`
- Playwright `1.58.2`
- Drizzle ORM `0.45.1`
- Drizzle Kit `0.31.9`
- libSQL client `0.17.0`

`eslint` is pinned to `9.39.4` because `eslint-config-next@16.1.6` still peers against the `9.x` line.

## Quick Start

```bash
pnpm install
Copy-Item .env.example .env.local
pnpm db:migrate
pnpm exec playwright install chromium
pnpm observability:up
pnpm dev
```

Open:

- App: `http://localhost:3000`
- Grafana: `http://127.0.0.1:3001`
- Tempo API: `http://127.0.0.1:3200`

## Scripts

```bash
pnpm dev                 # start Next.js dev server
pnpm build               # production build
pnpm start               # start production server
pnpm lint                # ESLint
pnpm typecheck           # TypeScript checks
pnpm test                # Vitest once
pnpm e2e                 # migrate, build, and run Playwright
pnpm check               # lint + typecheck + unit tests
pnpm db:generate         # generate migration files from schema changes
pnpm db:migrate          # apply migrations
pnpm db:studio           # Drizzle Studio
pnpm observability:up    # start Grafana + Tempo
pnpm observability:down  # stop Grafana + Tempo and remove volumes
pnpm observability:logs  # tail Grafana + Tempo logs
pnpm observability:test  # verify traces reach Tempo end-to-end
```

## Docker

Build the production image:

```bash
docker build --target runner -t nextjs-drizzle:prod .
```

Build the migration image:

```bash
docker build --target migrator -t nextjs-drizzle:migrator .
```

Run migrations against a mounted SQLite volume:

```bash
docker run --rm -v nextjs-drizzle-data:/app/data nextjs-drizzle:migrator
```

Run the app:

```bash
docker run --rm -p 3000:3000 -v nextjs-drizzle-data:/app/data nextjs-drizzle:prod
```

Docker notes:

- The runtime image uses Next.js `standalone` output.
- The runtime image runs as a non-root user.
- The default container database path is `file:/app/data/local.db`.
- Use the `migrator` target before starting the app when schema changes exist.
- If you move to remote libSQL/Turso, override `DATABASE_URL` and `DATABASE_AUTH_TOKEN`.

## Environment

`.env.example`:

```bash
APP_NAME=Next.js Drizzle Template
DATABASE_URL=file:local.db
DATABASE_AUTH_TOKEN=
LOG_LEVEL=info
METRICS_PREFIX=nextjs_drizzle_
OTEL_TRACING_ENABLED=false
OTEL_SERVICE_NAME=nextjs-drizzle
OTEL_SERVICE_VERSION=0.1.0
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318
OTEL_TRACE_IGNORE_PATHS=/_next/*,/favicon.ico,/metrics
OTEL_TRACE_SAMPLE_RATIO=1
```

Notes:

- Local development defaults to SQLite/libSQL file mode.
- Production can stay on file mode for simple deployments or switch to remote libSQL/Turso later.
- `OTEL_TRACING_ENABLED=false` by default so local app startup works without a collector.

## Project Shape

```text
src/
  app/               pages, layouts, route handlers
  components/        reusable UI and site shell components
  content/           shared content for docs-style pages
  features/          contracts, services, repositories by feature
  server/            env, db, logging, tracing, metrics, http helpers
drizzle/             generated SQL migrations
ops/                 local Grafana + Tempo provisioning
scripts/             smoke tests and local automation
tests/
  unit/              Vitest + Testing Library
  e2e/               Playwright
```

## Architecture Rules

- Keep `src/app` thin.
- Put business rules inside `src/features/<feature>`.
- Put shared infrastructure in `src/server`.
- Keep migration artifacts in `drizzle/`, not under runtime app code.
- Keep observability route -> service -> repository -> DB trace continuity intact.
- Do not introduce heavy controller/service/repository abstraction layers everywhere unless there is a real problem to solve.

## Existing Example Flow

The repo includes a full sample feature: subscribers.

Files involved:

- Route: `src/app/api/subscribers/route.ts`
- Validation contract: `src/features/subscribers/contracts.ts`
- Service: `src/features/subscribers/service.ts`
- Repository: `src/features/subscribers/repository.ts`
- Schema: `src/server/db/schema.ts`
- Client form: `src/components/subscribe-form.tsx`

This is the reference pattern to follow for new features.

## How To Add Database Tables Or Columns

If you want to add new database data structures, the main places are:

### 1. Update the schema

Edit:

- `src/server/db/schema.ts`

This is the source of truth for Drizzle schema definitions.

Examples:

- add a new table
- add a new column
- add indexes or constraints

### 2. Add or update feature code

If the schema change belongs to a feature, update or create:

- `src/features/<feature>/contracts.ts`
- `src/features/<feature>/service.ts`
- `src/features/<feature>/repository.ts`

Typical responsibilities:

- `contracts.ts`: Zod schemas and input/output types
- `service.ts`: business rules and orchestration
- `repository.ts`: Drizzle queries

### 3. Generate and apply migrations

```bash
pnpm db:generate
pnpm db:migrate
```

Generated SQL will be written into:

- `drizzle/`

Do not hand-write schema changes only in SQL and forget the TypeScript schema. The TypeScript schema must stay authoritative.

### 4. Update tests

Usually at least one of these should change:

- `tests/unit/...`
- `tests/e2e/...`

If the new table affects an API or page, test the feature path, not only the schema definition.

## How To Add A New API

If you need a business API endpoint, follow this pattern.

### 1. Create the route handler

Create:

- `src/app/api/<resource>/route.ts`

or, for a nested route:

- `src/app/api/<resource>/<id>/route.ts`

Keep it thin:

- parse request
- call service
- return response

Use the shared observation wrapper:

- `src/server/http/observed-route.ts`

The current example is:

- `src/app/api/subscribers/route.ts`

### 2. Create or update the feature module

Add or update:

- `src/features/<feature>/contracts.ts`
- `src/features/<feature>/service.ts`
- `src/features/<feature>/repository.ts`

Pattern:

- validate input with Zod in `contracts.ts`
- call business logic in `service.ts`
- perform Drizzle queries in `repository.ts`

### 3. Use tracing and logging correctly

The route wrapper already creates the route span and metrics wiring.

Inside the feature service:

- create feature spans with stable names
- add useful low-cardinality attributes
- log structured events through `src/server/logger.ts`

Inside repositories:

- keep DB spans readable
- avoid high-cardinality span names

### 4. Add tests

Usually add:

- a unit test for feature/service logic
- an e2e test for the route

Example places:

- `tests/unit/subscriber-service.test.ts`
- `tests/e2e/home.spec.ts`

### 5. Update docs pages if the route matters to users/operators

If the route is public or operationally important, update:

- `src/content/site.ts`
- `/guide`
- `/operations`

## How To Add A New Frontend Page

If you want to add a user-facing page:

### 1. Create the page route

Create:

- `src/app/<segment>/page.tsx`

Examples already in the repo:

- `src/app/page.tsx`
- `src/app/guide/page.tsx`
- `src/app/operations/page.tsx`

### 2. Reuse the shared layout pieces

Prefer reusing:

- `src/components/site-header.tsx`
- `src/components/site-footer.tsx`
- `src/components/page-shell.tsx`
- `src/components/page-hero.tsx`

This keeps the public site visually coherent.

### 3. Put shared copy/data in the content layer when appropriate

If the page is docs-like or content-heavy, prefer:

- `src/content/site.ts`

instead of hardcoding repeated content in multiple files.

### 4. Use the existing UI stack

- Tailwind CSS v4
- shadcn/ui primitives from `src/components/ui`

Avoid introducing a second UI pattern or a generic admin-theme look that fights the current visual language.

### 5. Respect typed routes

This repo has:

- `typedRoutes: true`

When using `next/link` with href values coming from data objects, use `Route` typing/casts as needed.

### 6. Add tests

For a new visible page:

- add a unit render test if useful
- add an e2e check if the page is important or linked from the main flow

## Where To Put Different Kinds Of Code

- New page UI: `src/app/...` and `src/components/...`
- Shared marketing/docs copy: `src/content/site.ts`
- New business rules: `src/features/<feature>/service.ts`
- New request/response validation: `src/features/<feature>/contracts.ts`
- New SQL queries: `src/features/<feature>/repository.ts`
- Shared db schema: `src/server/db/schema.ts`
- Shared observability code: `src/server/observability/...`
- Shared HTTP helpers: `src/server/http/...`
- Shared env config: `src/server/env.ts`

## Observability

Key pieces:

- `proxy.ts`
  injects request IDs and marks ignored trace paths
- `instrumentation.ts`
  registers the OpenTelemetry SDK
- `src/server/http/observed-route.ts`
  wraps routes for metrics, logging, and tracing
- `src/server/observability/*`
  metrics store, tracing helpers, path ignore logic, request context
- `src/app/metrics/route.ts`
  exposes Prometheus text format

Expected trace shape for the sample flow:

```text
incoming request
  -> app.route span
  -> subscribers.create span
  -> db.subscribers.select span
  -> db.subscribers.insert span
```

## Why `/metrics` Is Not Inside `/api`

This is correct in the current project.

Reason:

- `/metrics` is an operational endpoint, not a business API.
- Prometheus and many monitoring setups conventionally expect the scrape path to be `/metrics`.
- Keeping it at the root avoids unnecessary custom scrape-path configuration.
- In Next.js App Router, a route handler can live anywhere there is a `route.ts`; it does not have to be under `/api`.
- The repo already treats `/api/*` as application/business endpoints such as `/api/subscribers` and `/api/health`, while `/metrics` is infrastructure-facing.

So:

- business/application JSON endpoints -> usually under `/api/...`
- operational scrape endpoint -> `/metrics`

If you moved it to `/api/metrics`, it would still work technically, but it would be a worse default for observability conventions.

## Testing Expectations

Run at least what matches your change:

```bash
pnpm check
pnpm e2e
pnpm observability:test
```

Use this rule of thumb:

- docs/code-structure/UI change -> `pnpm check`
- user-visible page or route change -> `pnpm check` + `pnpm e2e`
- observability change -> `pnpm check` + `pnpm observability:test`
- Docker/runtime change -> Docker build and container startup checks
- schema change -> `pnpm db:generate`, `pnpm db:migrate`, then tests

## Operational Endpoints

- `GET /api/health`
  health JSON for app/database/tracing status
- `GET /metrics`
  Prometheus metrics exposition
- `POST /api/subscribers`
  sample end-to-end feature flow

## Local Observability Workflow

Start local stack:

```bash
pnpm observability:up
```

Verify traces and Tempo wiring:

```bash
pnpm observability:test
```

Stop local stack:

```bash
pnpm observability:down
```

## Notes For Future Changes

- Keep the sample subscriber flow healthy unless intentionally replacing it with another reference feature.
- Keep the public pages `/`, `/guide`, and `/operations` aligned with the actual state of the project.
- If you add new important runtime endpoints, document them here and in the guide/operations pages.
