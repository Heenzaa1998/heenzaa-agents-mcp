---
name: add-feature
description: Scaffold a new feature in src/features/<name>/ following this repo's established contracts/service/repository pattern, wire it to a route with observeRoute, keep the route -> service -> repository -> DB span chain intact, and add the matching unit tests. Use when adding a new domain feature, a new API route backed by business logic, or a new table-backed capability. Do not use for pure UI/copy changes.
---

# Add a feature

This repo has exactly one reference feature: `src/features/subscribers/`. Read it before
writing anything — it is the shape every new feature must match. This skill records that
shape so you do not have to re-derive it.

## Before you start

Follow the repo's own workflow rules in `AGENTS.md`:

1. A new feature is **never** trivial. Write a design doc in `docs/design/` from
   `docs/templates/design-doc.md` first.
2. Confirm the feature name (singular concept, plural directory — `subscribers`, not
   `subscriber`) and what it stores before generating files.
3. Only then create files.

## The shape

```text
src/features/<feature>/
  contracts.ts     Zod schemas + inferred input types. No I/O.
  repository.ts    DB access only. Every method wrapped in withDatabaseSpan.
  service.ts       Business rules. Wrapped in withSpan. Parses input via contracts.
src/server/db/schema.ts    add the table here, export the Record type
src/app/api/<feature>/route.ts   thin handler wrapped in observeRoute
tests/unit/<feature>-schema.test.ts
tests/unit/<feature>-service.test.ts
```

## Rules that are easy to get wrong

**contracts.ts** — schemas only. Trim and normalize here (`.trim()`, lowercase emails),
so the service and repository can trust their input. Export both the schema and
`z.infer<>` type.

**repository.ts** — export a `type <Feature>Repository = { ... }` describing the methods,
then a `const <feature>Repository: <Feature>Repository` implementing it. The type is what
lets the service accept a test double. Every method body is wrapped in `withDatabaseSpan`
with `{ operation, summary, table }` and sets a low-cardinality count attribute
(`app.<feature>.found`, `app.<feature>.created`) — never an id or user value as a metric.

**service.ts** — the signature takes `input: unknown` and a repository parameter that
defaults to the real one:

```ts
export async function createThing(
  input: unknown,
  repository: ThingWriter = thingRepository,
): Promise<ThingRecord> {
```

Use `Pick<ThingRepository, "create" | "findBy...">` for that parameter type so tests only
have to stub what is used. Parse with the contract schema *inside* the span. Wrap the body
in `withSpan("<feature>.<operation>", { attributes: { "app.feature": "<feature>",
"app.operation": "<verb>_<noun>" } }, async (span) => { ... })`.

Throw `AppError` with a `code` and `statusCode` for expected failures (duplicate, not
found). Do not throw bare `Error` for anything the route should turn into a 4xx.
Catch driver-level races too — see `isUniqueConstraintError` in the subscribers service —
because a uniqueness pre-check does not survive concurrent requests.

**route.ts** — thin. Parse the request, call the service, return `NextResponse.json`.
Always `export const runtime = "nodejs"` and always wrap in `observeRoute({ method, route },
handler)`. The `route` value is the literal path pattern, not the resolved URL — it becomes
a metric label, so it must stay low-cardinality. Never put business logic or a try/catch
here: `observeRoute` already converts thrown `AppError`s into responses and records the
span status.

**The span chain must stay unbroken:** `observeRoute` (route span) -> `withSpan` (service
span) -> `withDatabaseSpan` (repository span) -> driver span. If a layer calls the next one
outside its span callback, the chain breaks and the trace becomes useless. Keep every call
inside the `async (span) => { ... }` body.

**schema.ts** — add the table and export its record type
(`export type ThingRecord = typeof things.$inferSelect`). Then run:

```bash
pnpm db:generate
pnpm db:migrate
```

Never hand-write files in `drizzle/` — they are generated.

## Tests

Two files, mirroring the subscribers tests:

- `tests/unit/<feature>-schema.test.ts` — contract accepts valid input, rejects each
  invalid case, and applies its transforms (trim, lowercase).
- `tests/unit/<feature>-service.test.ts` — pass a stub repository object literal for the
  `Pick<...>` parameter. Cover the happy path, the expected-failure path (assert the
  `AppError` `code` and `statusCode`, not the message text), and the driver-race path.

Service tests need no database — that is the whole point of the injectable repository.
If a test needs a real DB, the layering is wrong.

## Verify before finishing

```bash
pnpm check
```

Add `pnpm e2e` if you added or changed a route, and `pnpm observability:test` if you
touched anything in the span chain.

## Finish

Write the change record in `docs/changes/` from `docs/templates/change-record.md` and
commit it together with the code, as `AGENTS.md` requires.
